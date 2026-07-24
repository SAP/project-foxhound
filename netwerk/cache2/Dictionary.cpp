/* vim: set ts=2 sts=2 et sw=2: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <stdlib.h>

#include "Dictionary.h"

#include "CacheFileUtils.h"
#include "nsAttrValue.h"
#include "nsContentPolicyUtils.h"
#include "nsString.h"
#include "nsAppDirectoryServiceDefs.h"
#include "nsIAsyncInputStream.h"
#include "nsICacheStorageService.h"
#include "nsICacheStorage.h"
#include "nsICacheEntry.h"
#include "nsICachingChannel.h"
#include "nsICancelable.h"
#include "nsIChannel.h"
#include "nsContentUtils.h"
#include "nsIFile.h"
#include "nsIInputStream.h"
#include "nsILoadContext.h"
#include "nsILoadContextInfo.h"
#include "nsILoadGroup.h"
#include "nsIObserverService.h"
#include "nsIURI.h"
#include "nsIURIMutator.h"
#include "nsInputStreamPump.h"
#include "nsNetUtil.h"
#include "nsServiceManagerUtils.h"
#include "nsSimpleURI.h"
#include "nsStandardURL.h"
#include "nsStreamUtils.h"
#include "nsString.h"
#include "nsThreadUtils.h"
#include "mozilla/Logging.h"

#include "mozilla/Components.h"
#include "mozilla/dom/Document.h"
#include "mozilla/FlowMarkers.h"
#include "mozilla/OriginAttributes.h"
#include "mozilla/Preferences.h"
#include "mozilla/SchedulerGroup.h"
#include "mozilla/StaticPrefs_network.h"
#include "mozilla/glean/NetwerkMetrics.h"

#include "mozilla/net/NeckoCommon.h"
#include "mozilla/net/NeckoParent.h"
#include "mozilla/net/NeckoChild.h"
#include "mozilla/net/URLPatternGlue.h"
#include "mozilla/net/urlpattern_glue.h"

#include "LoadContextInfo.h"
#include "mozilla/ipc/URIUtils.h"
#include "SerializedLoadContext.h"

#include "mozilla/dom/ContentParent.h"
#include "mozilla/dom/InternalRequest.h"
#include "mozilla/ClearOnShutdown.h"

#include "ReferrerInfo.h"

using namespace mozilla;

namespace mozilla {
namespace net {

// Access to all these classes is from MainThread unless otherwise specified

LazyLogModule gDictionaryLog("CompressionDictionaries");

#define DICTIONARY_LOG(args) \
  MOZ_LOG(gDictionaryLog, mozilla::LogLevel::Debug, args)

/**
 * Reference to the DictionaryCache singleton. May be null.
 */
StaticRefPtr<DictionaryCache> gDictionaryCache;
StaticRefPtr<nsICacheStorage> DictionaryCache::sCacheStorage;

// about:cache gets upset about entries that don't fit URL specs, so we need
// to add the trailing '/' to GetPrePath()
static nsresult GetDictPath(nsIURI* aURI, nsACString& aPrePath) {
  if (NS_FAILED(aURI->GetPrePath(aPrePath))) {
    return NS_ERROR_FAILURE;
  }
  aPrePath += '/';
  return NS_OK;
}

DictionaryCacheEntry::DictionaryCacheEntry(const char* aKey) {
  mURI = aKey;
  DICTIONARY_LOG(("Created DictionaryCacheEntry %p, uri=%s", this, aKey));
}

DictionaryCacheEntry::~DictionaryCacheEntry() {
  MOZ_ASSERT(mUsers == 0);
  DICTIONARY_LOG(
      ("Destroyed DictionaryCacheEntry %p, uri=%s, pattern=%s, id=%s", this,
       mURI.get(), mPattern.get(), mId.get()));
  if (mCachedPattern.isSome()) {
    urlpattern_pattern_free(mCachedPattern.ref());
  }
}

DictionaryCacheEntry::DictionaryCacheEntry(const nsACString& aURI,
                                           const nsACString& aPattern,
                                           nsTArray<nsCString>& aMatchDest,
                                           const nsACString& aId,
                                           uint32_t aExpiration,
                                           const Maybe<nsCString>& aHash)
    : mURI(aURI), mExpiration(aExpiration), mPattern(aPattern), mId(aId) {
  ConvertMatchDestToEnumArray(aMatchDest, mMatchDest);
  DICTIONARY_LOG(
      ("Created DictionaryCacheEntry %p, uri=%s, pattern=%s, id=%s, "
       "expiration=%u",
       this, PromiseFlatCString(aURI).get(), PromiseFlatCString(aPattern).get(),
       PromiseFlatCString(aId).get(), aExpiration));
  if (aHash) {
    mHash = aHash.value();
  }
}

NS_IMPL_ISUPPORTS(DictionaryCacheEntry, nsICacheEntryOpenCallback,
                  nsIStreamListener)

// Convert string MatchDest array to enum array
// static
void DictionaryCacheEntry::ConvertMatchDestToEnumArray(
    const nsTArray<nsCString>& aMatchDest,
    nsTArray<dom::RequestDestination>& aMatchEnums) {
  AutoTArray<dom::RequestDestination, 3> temp;
  for (auto& string : aMatchDest) {
    dom::RequestDestination dest =
        dom::StringToEnum<dom::RequestDestination>(string).valueOr(
            dom::RequestDestination::_empty);
    if (dest != dom::RequestDestination::_empty) {
      temp.AppendElement(dest);
    }
  }
  aMatchEnums.SwapElements(temp);
}

// Returns true if the pattern for the dictionary matches the path given.
// Note: we need to verify that this entry has not expired due to 2.2.1 of
// https://datatracker.ietf.org/doc/draft-ietf-httpbis-compression-dictionary/
bool DictionaryCacheEntry::Match(const nsACString& aFilePath,
                                 ExtContentPolicyType aType, uint32_t aNow,
                                 uint32_t& aLongest) {
  if (mHash.IsEmpty()) {
    // We don't have the file yet
    return false;
  }
  if (mNotCached) {
    // Not actually in the cache
    // May not actually be necessary, but good safety valve.
    return false;
  }
  // Not worth checking if we wouldn't use it
  if ((mExpiration == 0 || aNow < mExpiration) &&
      mPattern.Length() > aLongest) {
    // Need to match using match-dest, if it exists
    if (mMatchDest.IsEmpty() ||
        mMatchDest.IndexOf(
            dom::InternalRequest::MapContentPolicyTypeToRequestDestination(
                aType)) != mMatchDest.NoIndex) {
      // Check if we have a cached pattern, otherwise parse and cache it
      if (mCachedPattern.isNothing()) {
        UrlPatternGlue pattern;
        UrlPatternOptions options{};
        const nsCString base(mURI);
        if (!urlpattern_parse_pattern_from_string(&mPattern, &base, options,
                                                  &pattern)) {
          DICTIONARY_LOG(
              ("Failed to parse dictionary pattern %s", mPattern.get()));
          return false;
        }
        mCachedPattern.emplace(pattern);
      }

      UrlPatternInput input = net::CreateUrlPatternInput(aFilePath);
      const nsCString base(mURI);
      bool result =
          net::UrlPatternTest(mCachedPattern.ref(), input, Some(base));
      if (result) {
        aLongest = mPattern.Length();
        DICTIONARY_LOG(("Match: %p   %s to %s, %s (now=%u, expiration=%u)",
                        this, PromiseFlatCString(aFilePath).get(),
                        mPattern.get(), NS_CP_ContentTypeName(aType), aNow,
                        mExpiration));
        DICTIONARY_LOG(("Match: %s (longest %u)", mURI.get(), aLongest));
      }
      return result;
    }  // else failed on match-dest
  }  // else failed on expiration
  return false;
}

void DictionaryCacheEntry::InUse() {
  mUsers++;
  DICTIONARY_LOG(("Dictionary users for %s -- %u Users", mURI.get(), mUsers));
}

void DictionaryCacheEntry::UseCompleted() {
  MOZ_ASSERT(mUsers > 0);
  mUsers--;
  // Purge mDictionaryData
  if (mUsers == 0) {  // XXX perhaps we should hold it for a bit longer?
    DICTIONARY_LOG(("Clearing Dictionary data for %s", mURI.get()));
    mDictionaryData.clear();
    mDictionaryDataComplete = false;
  } else {
    DICTIONARY_LOG(("Not clearing Dictionary data for %s -- %u Users",
                    mURI.get(), mUsers));
  }
}

// returns aShouldSuspend=true if we should suspend to wait for the prefetch
nsresult DictionaryCacheEntry::Prefetch(
    nsILoadContextInfo* aLoadContextInfo, bool& aShouldSuspend,
    const std::function<void(nsresult)>& aFunc) {
  DICTIONARY_LOG(("Prefetch for %s", mURI.get()));
  // Start reading the cache entry into memory and call completion
  // function when done
  if (mWaitingPrefetch.IsEmpty()) {
    // Note that if the cache entry has been cleared, and we still have active
    // users of it, we'll hold onto that data since we have outstanding requests
    // for it.  Probably we shouldn't allow new requests to use this data (and
    // the WPTs assume we shouldn't).
    if (mDictionaryDataComplete) {
      DICTIONARY_LOG(
          ("Prefetch for %s - already have data in memory (%u users)",
           mURI.get(), mUsers));
      aShouldSuspend = false;
      return NS_OK;
    }

    // We haven't requested it yet from the Cache and don't have it in memory
    // already.
    // We can't use sCacheStorage because we need the correct LoadContextInfo
    nsCOMPtr<nsICacheStorageService> cacheStorageService(
        components::CacheStorage::Service());
    if (!cacheStorageService) {
      aShouldSuspend = false;
      return NS_ERROR_FAILURE;
    }
    nsCOMPtr<nsICacheStorage> cacheStorage;
    nsresult rv = cacheStorageService->DiskCacheStorage(
        aLoadContextInfo, getter_AddRefs(cacheStorage));
    if (NS_FAILED(rv)) {
      aShouldSuspend = false;
      return NS_ERROR_FAILURE;
    }
    // If the file isn't available in the cache, AsyncOpenURIString()
    // will synchronously make a callback to OnCacheEntryAvailable() with
    // nullptr.  We can key off that to fail Prefetch(), and also to
    // remove ourselves from the origin.
    // Use OPEN_ALWAYS to ensure we don't get stalled if this is for some
    // reason a revalidation
    if (NS_FAILED(cacheStorage->AsyncOpenURIString(
            mURI, ""_ns,
            nsICacheStorage::OPEN_READONLY |
                nsICacheStorage::OPEN_COMPLETE_ONLY |
                nsICacheStorage::OPEN_ALWAYS |
                nsICacheStorage::CHECK_MULTITHREADED,
            this)) ||
        mNotCached) {
      DICTIONARY_LOG(("AsyncOpenURIString failed for %s", mURI.get()));
      // For some reason the cache no longer has this entry; fail Prefetch
      // and also remove this from our origin
      aShouldSuspend = false;
      // Remove from origin
      if (mOrigin) {
        mOrigin->RemoveEntry(this);
        mOrigin = nullptr;
      }
      return NS_ERROR_FAILURE;
    }
    mWaitingPrefetch.AppendElement(aFunc);
    DICTIONARY_LOG(("Started Prefetch for %s, anonymous=%d", mURI.get(),
                    aLoadContextInfo->IsAnonymous()));
    aShouldSuspend = true;
    return NS_OK;
  }
  DICTIONARY_LOG(("Prefetch for %s - already waiting", mURI.get()));
  aShouldSuspend = true;
  return NS_OK;
}

void DictionaryCacheEntry::AccumulateHash(const char* aBuf, int32_t aCount) {
  MOZ_ASSERT(NS_IsMainThread());
  if (!mHash.IsEmpty()) {
    if (!mDictionaryData.empty()) {
      // We have data from the cache.... but if we change the hash there will
      // be problems
      // XXX dragons here
      return;
    }
    // accumulating a new hash when we have an existing?
    // XXX probably kill the hash when we get an overwrite; tricky, need to
    // handle loading the old one into ram to decompress the new one.  Also,
    // what if the old one is being used for multiple requests, one of which
    // is an overwrite?   This is an edge case not discussed in the spec - we
    // could separate out a structure for in-flight requests where the data
    // would be used from, so the Entry could be overwritten as needed
    return;  // XXX
  }
  if (!mCrypto) {
    DICTIONARY_LOG(("Calculating new hash for %s", mURI.get()));
    // If mCrypto is null, and mDictionaryData is set, we've already got the
    // data for this dictionary.
    nsresult rv;
    mCrypto = do_CreateInstance(NS_CRYPTO_HASH_CONTRACTID, &rv);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return;
    }
    rv = mCrypto->Init(nsICryptoHash::SHA256);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv), "Cache InitCrypto failed");
  }
  mCrypto->Update(reinterpret_cast<const uint8_t*>(aBuf), aCount);
  DICTIONARY_LOG(("Accumulate Hash %p: %d bytes, total %zu", this, aCount,
                  mDictionaryData.length()));
}

void DictionaryCacheEntry::FinishHash() {
  MOZ_ASSERT(NS_IsMainThread());
  if (mCrypto) {
    mCrypto->Finish(true, mHash);
    mCrypto = nullptr;
    DICTIONARY_LOG(("Hash for %p (%s) is %s", this, mURI.get(), mHash.get()));
    if (mOrigin) {
      DICTIONARY_LOG(("Write on hash"));
      // This will also move us from mPendingEntries to mEntries
      if (NS_FAILED(mOrigin->Write(this))) {
        mOrigin->RemoveEntry(this);
        return;
      }
      if (!mBlocked) {
        mOrigin->FinishAddEntry(this);
      }
    }
  }
}

// Version of metadata entries we expect
static const uint32_t METADATA_VERSION = 1;

// Metadata format:
// |version|hash|pattern|[matchdest|]*||id|expiration|type
//
// * Entries:
// ** CString: URI -- the key, not in the entry
// ** CString: Version (1)
// ** CString: Hash
// ** CString: Pattern
// ** match-dest CString list, terminated by empty string
// *** CString: Match-dest
// ** CString: Id
// ** uint32 as a CString: expiration. If missing, 0 (none)
// ** CString: type -- defaults to 'raw' if missing
// We store strings with a delimiter, and use escapes for delimiters or escape
// characters in the source strings.
//

// Escape the string and append to aOutput
static void EscapeMetadataString(const nsACString& aInput, nsCString& aOutput) {
  // First calculate how much we'll need to append.  Means we'll walk the source
  // twice, but avoids any potential multiple reallocations
  const char* src = aInput.BeginReading();
  size_t len = 1;  // for initial |
  while (*src) {
    if (*src == '|' || *src == '\\') {
      len += 2;
    } else {
      len++;
    }
    src++;
  }
  aOutput.SetCapacity(aOutput.Length() + len);
  src = aInput.BeginReading();

  aOutput.AppendLiteral("|");
  while (*src) {
    if (*src == '|' || *src == '\\') {
      aOutput.AppendLiteral("\\");
    }
    aOutput.Append(*src++);
  }
}

void DictionaryCacheEntry::MakeMetadataEntry(nsCString& aNewValue) {
  aNewValue.AppendLiteral("|"), aNewValue.AppendInt(METADATA_VERSION),
      EscapeMetadataString(mHash, aNewValue);
  EscapeMetadataString(mPattern, aNewValue);
  EscapeMetadataString(mId, aNewValue);
  for (auto& dest : mMatchDest) {
    EscapeMetadataString(dom::GetEnumString(dest), aNewValue);
  }
  // List of match-dest values is terminated by an empty string
  EscapeMetadataString(""_ns, aNewValue);
  // Expiration time, as a CString
  nsAutoCStringN<12> expiration;
  expiration = nsPrintfCString("%u", mExpiration);
  EscapeMetadataString(expiration, aNewValue);
  // We don't store type, since we only support type 'raw'  We can support
  // type in the future by considering missing type as raw without changing the
  // format
}

nsresult DictionaryCacheEntry::Write(nsICacheEntry* aCacheEntry) {
  nsAutoCStringN<2048> metadata;
  MakeMetadataEntry(metadata);
  DICTIONARY_LOG(
      ("DictionaryCacheEntry::Write %s %s", mURI.get(), metadata.get()));
  nsresult rv = aCacheEntry->SetMetaDataElement(mURI.get(), metadata.get());
  if (NS_FAILED(rv)) {
    return rv;
  }
  return aCacheEntry->MetaDataReady();
}

nsresult DictionaryCacheEntry::RemoveEntry(nsICacheEntry* aCacheEntry) {
  DICTIONARY_LOG(("RemoveEntry from metadata for %s", mURI.get()));
  nsresult rv = aCacheEntry->SetMetaDataElement(mURI.BeginReading(), nullptr);
  if (NS_FAILED(rv)) {
    return rv;
  }
  return aCacheEntry->MetaDataReady();
}

// Parse - | for field seperator; \ for escape of | or \ .
static const char* GetEncodedString(const char* aSrc, nsACString& aOutput) {
  // scan the input string and build the output, handling escapes
  aOutput.Truncate();
  MOZ_ASSERT(*aSrc == '|' || *aSrc == 0);
  if (!aSrc || *aSrc != '|') {
    return aSrc;
  }
  aSrc++;
  while (*aSrc) {
    if (*aSrc == '|') {
      break;
    }
    if (*aSrc == '\\') {
      aSrc++;
    }
    aOutput.Append(*aSrc++);
  }
  return aSrc;
}

// Parse metadata from DictionaryOrigin
bool DictionaryCacheEntry::ParseMetadata(const char* aSrc) {
  // Using mHash as a temp for version
  aSrc = GetEncodedString(aSrc, mHash);
  const char* tmp = mHash.get();
  uint32_t version = atoi(tmp);
  if (version != METADATA_VERSION) {
    return false;
  }
  aSrc = GetEncodedString(aSrc, mHash);
  aSrc = GetEncodedString(aSrc, mPattern);
  aSrc = GetEncodedString(aSrc, mId);
  nsAutoCString temp;
  // get match-dest values (list ended with empty string)
  do {
    aSrc = GetEncodedString(aSrc, temp);
    if (!temp.IsEmpty()) {
      dom::RequestDestination dest =
          dom::StringToEnum<dom::RequestDestination>(temp).valueOr(
              dom::RequestDestination::_empty);
      if (dest != dom::RequestDestination::_empty) {
        mMatchDest.AppendElement(dest);
      }
    }
  } while (!temp.IsEmpty());
  if (*aSrc == '|') {
    char* newSrc;
    mExpiration = strtoul(++aSrc, &newSrc, 10);
    aSrc = newSrc;
  }  // else leave default of 0
  // XXX type - we assume and only support 'raw', may be missing
  aSrc = GetEncodedString(aSrc, temp);

  DICTIONARY_LOG(
      ("Parse entry %s: |%s| %s match-dest[0]=%s id=%s", mURI.get(),
       mHash.get(), mPattern.get(),
       mMatchDest.Length() > 0 ? dom::GetEnumString(mMatchDest[0]).get() : "",
       mId.get()));
  return true;
}

void DictionaryCacheEntry::AppendMatchDest(nsACString& aDest) const {
  for (auto& dest : mMatchDest) {
    aDest.Append(dom::GetEnumString(dest));
    aDest.Append(" ");
  }
}

//-----------------------------------------------------------------------------
// nsIStreamListener implementation
//-----------------------------------------------------------------------------

NS_IMETHODIMP
DictionaryCacheEntry::OnStartRequest(nsIRequest* request) {
  DICTIONARY_LOG(("DictionaryCacheEntry %s OnStartRequest", mURI.get()));
  return NS_OK;
}

NS_IMETHODIMP
DictionaryCacheEntry::OnDataAvailable(nsIRequest* request,
                                      nsIInputStream* aInputStream,
                                      uint64_t aOffset, uint32_t aCount) {
  uint32_t n;
  DICTIONARY_LOG(
      ("DictionaryCacheEntry %s OnDataAvailable %u", mURI.get(), aCount));
  return aInputStream->ReadSegments(&DictionaryCacheEntry::ReadCacheData, this,
                                    aCount, &n);
}

/* static */
nsresult DictionaryCacheEntry::ReadCacheData(
    nsIInputStream* aInStream, void* aClosure, const char* aFromSegment,
    uint32_t aToOffset, uint32_t aCount, uint32_t* aWriteCount) {
  DictionaryCacheEntry* self = static_cast<DictionaryCacheEntry*>(aClosure);

  (void)self->mDictionaryData.append(aFromSegment, aCount);
  DICTIONARY_LOG(("Accumulate %p (%s): %d bytes, total %zu", self,
                  self->mURI.get(), aCount, self->mDictionaryData.length()));
  *aWriteCount = aCount;
  return NS_OK;
}

void DictionaryCacheEntry::CleanupOnCacheData(nsresult result) {
  DICTIONARY_LOG(("Unsuspending %zu channels, Dictionary len %zu",
                  mWaitingPrefetch.Length(), mDictionaryData.length()));
  // if we suspended, un-suspend the channel(s)
  for (auto& lambda : mWaitingPrefetch) {
    (lambda)(result);
  }
  mWaitingPrefetch.Clear();

  // If we have a replacement entry waiting, unsuspend its channels too
  if (mReplacement) {
    DICTIONARY_LOG(("Unsuspending %zu replacement channels",
                    mReplacement->mWaitingPrefetch.Length()));
    for (auto& lambda : mReplacement->mWaitingPrefetch) {
      (lambda)(result);
    }
    mReplacement->mWaitingPrefetch.Clear();
  }

  // If we're being replaced by a new entry, swap now
  RefPtr<DictionaryCacheEntry> self;
  if (mReplacement) {
    DICTIONARY_LOG(("*** Replacing entry %p with %p for %s", this,
                    mReplacement.get(), mURI.get()));
    // Make sure we don't destroy ourselves
    self = this;
    mReplacement->mShouldSuspend = false;
    mOrigin->RemoveEntry(this);
    // When mReplacement gets all it's data, it will be added to mEntries
    mReplacement->UnblockAddEntry(mOrigin);
    mOrigin = nullptr;
  }
}

NS_IMETHODIMP
DictionaryCacheEntry::OnStopRequest(nsIRequest* request, nsresult result) {
  DICTIONARY_LOG(("DictionaryCacheEntry %s OnStopRequest", mURI.get()));

  auto cleanup = MakeScopeExit([&] {
    CleanupOnCacheData(result);
    mStopReceived = true;
  });
  if (NS_FAILED(result)) {
    return result;
  }
  mDictionaryDataComplete = true;

  // Validate that the loaded dictionary data matches the stored hash
  if (mHash.IsEmpty()) {
    return NS_OK;
  }
  nsCOMPtr<nsICryptoHash> hasher = do_CreateInstance(NS_CRYPTO_HASH_CONTRACTID);
  if (!hasher) {
    return NS_OK;
  }
  hasher->Init(nsICryptoHash::SHA256);
  hasher->Update(mDictionaryData.begin(),
                 static_cast<uint32_t>(mDictionaryData.length()));
  nsAutoCString computedHash;
  MOZ_ALWAYS_SUCCEEDS(hasher->Finish(true, computedHash));

  if (!computedHash.Equals(mHash)) {
    DICTIONARY_LOG(("Hash mismatch for %s: expected %s, computed %s",
                    mURI.get(), mHash.get(), computedHash.get()));
    result = NS_ERROR_CORRUPTED_CONTENT;
    mDictionaryDataComplete = false;
    mDictionaryData.clear();
    // Remove this corrupted dictionary entry
    DictionaryCache::RemoveDictionaryFor(mURI);
  }

  return result;
}

void DictionaryCacheEntry::UnblockAddEntry(DictionaryOrigin* aOrigin) {
  MOZ_ASSERT(NS_IsMainThread());
  if (!mHash.IsEmpty()) {
    // Already done, we can move to mEntries now
    aOrigin->FinishAddEntry(this);
  }
  mBlocked = false;
}

void DictionaryCacheEntry::WriteOnHash() {
  bool hasHash = false;
  {
    MOZ_ASSERT(NS_IsMainThread());
    if (!mHash.IsEmpty()) {
      hasHash = true;
    }
  }
  if (hasHash && mOrigin) {
    DICTIONARY_LOG(("Write already hashed"));
    mOrigin->Write(this);
  }
}

//-----------------------------------------------------------------------------
// nsICacheEntryOpenCallback implementation
//-----------------------------------------------------------------------------
// Note: we don't care if the entry is stale since we're not loading it; we're
// just saying with have this specific set of bits with this hash available
// to use as a dictionary.

// This may be called on a random thread due to
// nsICacheStorage::CHECK_MULTITHREADED
NS_IMETHODIMP
DictionaryCacheEntry::OnCacheEntryCheck(nsICacheEntry* aEntry,
                                        uint32_t* result) {
  DICTIONARY_LOG(("OnCacheEntryCheck %s", mURI.get()));
  *result = nsICacheEntryOpenCallback::ENTRY_WANTED;
  return NS_OK;
}

NS_IMETHODIMP
DictionaryCacheEntry::OnCacheEntryAvailable(nsICacheEntry* entry, bool isNew,
                                            nsresult status) {
  DICTIONARY_LOG(("OnCacheEntryAvailable %s, result %u, entry %p", mURI.get(),
                  (uint32_t)status, entry));
  if (entry) {
    nsCOMPtr<nsIInputStream> stream;
    entry->OpenInputStream(0, getter_AddRefs(stream));
    if (!stream) {
      return NS_OK;
    }

    RefPtr<nsInputStreamPump> pump;
    nsresult rv = nsInputStreamPump::Create(getter_AddRefs(pump), stream);
    if (NS_FAILED(rv)) {
      return NS_OK;  // just ignore
    }

    rv = pump->AsyncRead(this);
    if (NS_FAILED(rv)) {
      return NS_OK;  // just ignore
    }
    DICTIONARY_LOG(("Waiting for data"));
  } else {
    // XXX Error out any channels waiting on this cache entry.  Also,
    // remove the dictionary entry from the origin.
    mNotCached = true;  // For Prefetch()
    DICTIONARY_LOG(("Prefetched cache entry not available!!!"));

    CleanupOnCacheData(NS_ERROR_CORRUPTED_CONTENT);
    // Remove this corrupted dictionary entry
    DictionaryCache::RemoveDictionaryFor(mURI);
  }

  return NS_OK;
}

//----------------------------------------------------------------------------------

// Read the metadata for an Origin and parse it, creating DictionaryCacheEntrys
// as needed. If aType is TYPE_OTHER, there is no Match() to do
void DictionaryOriginReader::Start(
    bool aCreate, DictionaryOrigin* aOrigin, nsACString& aKey, nsIURI* aURI,
    ExtContentPolicyType aType, DictionaryCache* aCache,
    const std::function<nsresult(bool, DictionaryCacheEntry*)>& aCallback) {
  mOrigin = aOrigin;
  mURI = aURI;
  mType = aType;
  mCallback = aCallback;
  mCache = aCache;

  AUTO_PROFILER_FLOW_MARKER("DictionaryOriginReader::Start", NETWORK,
                            Flow::FromPointer(this));

  // The cache entry is for originattribute extension of
  // META_DICTIONARY_PREFIX, plus key of prepath

  // This also keeps this alive until we get the callback.  We must do this
  // BEFORE we call AsyncOpenURIString, or we may get a callback to
  // OnCacheEntryAvailable before we can do this
  mOrigin->mWaitingCacheRead.AppendElement(this);
  if (mOrigin->mWaitingCacheRead.Length() == 1) {  // was empty
    DICTIONARY_LOG(("DictionaryOriginReader::Start(%s): %p",
                    PromiseFlatCString(aKey).get(), this));
    DictionaryCache::sCacheStorage->AsyncOpenURIString(
        aKey, META_DICTIONARY_PREFIX,
        aCreate
            ? nsICacheStorage::OPEN_NORMALLY |
                  nsICacheStorage::CHECK_MULTITHREADED
            : nsICacheStorage::OPEN_READONLY | nsICacheStorage::OPEN_SECRETLY |
                  nsICacheStorage::CHECK_MULTITHREADED,
        this);
    // This one will get the direct callback to do Match()
  }
  // Else we already have a read for this cache entry pending, just wait
  // for that
}

void DictionaryOriginReader::FinishMatch() {
  RefPtr<DictionaryCacheEntry> result;
  // Don't Match if this was a call from AddEntry()
  if (mType != ExtContentPolicy::TYPE_OTHER) {
    nsCString path;
    mURI->GetPathQueryRef(path);
    result = mOrigin->Match(path, mType);
  }
  DICTIONARY_LOG(("Done with reading origin for %p", mOrigin.get()));
  (mCallback)(true, result);
}

NS_IMPL_ISUPPORTS(DictionaryOriginReader, nsICacheEntryOpenCallback,
                  nsIStreamListener)

//-----------------------------------------------------------------------------
// nsICacheEntryOpenCallback implementation
//-----------------------------------------------------------------------------

// This may be called on a random thread due to
// nsICacheStorage::CHECK_MULTITHREADED
NS_IMETHODIMP DictionaryOriginReader::OnCacheEntryCheck(nsICacheEntry* entry,
                                                        uint32_t* result) {
  *result = nsICacheEntryOpenCallback::ENTRY_WANTED;
  DICTIONARY_LOG(
      ("DictionaryOriginReader::OnCacheEntryCheck this=%p for entry %p", this,
       entry));
  return NS_OK;
}

NS_IMETHODIMP DictionaryOriginReader::OnCacheEntryAvailable(
    nsICacheEntry* aCacheEntry, bool isNew, nsresult result) {
  MOZ_ASSERT(NS_IsMainThread(), "Got cache entry off main thread!");
  DICTIONARY_LOG(
      ("DictionaryOriginReader::OnCacheEntryAvailable this=%p for entry %p",
       this, aCacheEntry));

  if (!aCacheEntry) {
    // Didn't have any dictionaries for this origin, and must have been readonly
    for (auto& reader : mOrigin->mWaitingCacheRead) {
      (reader->mCallback)(true, nullptr);
    }
    mOrigin->mWaitingCacheRead.Clear();
    AUTO_PROFILER_TERMINATING_FLOW_MARKER(
        "DictionaryOriginReader::OnCacheEntryAvailable", NETWORK,
        Flow::FromPointer(this));
    return NS_OK;
  }

  mOrigin->SetCacheEntry(aCacheEntry);
  AUTO_PROFILER_FLOW_MARKER("DictionaryOriginReader::VisitMetaData", NETWORK,
                            Flow::FromPointer(this));
  bool empty = false;
  aCacheEntry->GetIsEmpty(&empty);
  if (!empty) {
    // There's no data in the cache entry, just metadata
    nsCOMPtr<nsICacheEntryMetaDataVisitor> metadata(mOrigin);
    aCacheEntry->VisitMetaData(metadata);
  }  // else new cache entry

  // This list is the only thing keeping us alive
  RefPtr<DictionaryOriginReader> safety(this);
  for (auto& reader : mOrigin->mWaitingCacheRead) {
    reader->FinishMatch();
  }
  mOrigin->mWaitingCacheRead.Clear();
  AUTO_PROFILER_TERMINATING_FLOW_MARKER(
      "DictionaryOriginReader::OnCacheEntryAvailable", NETWORK,
      Flow::FromPointer(this));
  return NS_OK;
}

//-----------------------------------------------------------------------------
// nsIStreamListener implementation
//-----------------------------------------------------------------------------

NS_IMETHODIMP
DictionaryOriginReader::OnStartRequest(nsIRequest* request) {
  DICTIONARY_LOG(("DictionaryOriginReader %p OnStartRequest", this));
  return NS_OK;
}

NS_IMETHODIMP
DictionaryOriginReader::OnDataAvailable(nsIRequest* request,
                                        nsIInputStream* aInputStream,
                                        uint64_t aOffset, uint32_t aCount) {
  DICTIONARY_LOG(
      ("DictionaryOriginReader %p OnDataAvailable %u", this, aCount));
  return NS_OK;
}

NS_IMETHODIMP
DictionaryOriginReader::OnStopRequest(nsIRequest* request, nsresult result) {
  DICTIONARY_LOG(("DictionaryOriginReader %p OnStopRequest", this));
  return NS_OK;
}

// static
already_AddRefed<DictionaryCache> DictionaryCache::GetInstance() {
  // XXX lock?  In practice probably not needed, in theory yes
  if (!gDictionaryCache) {
    gDictionaryCache = new DictionaryCache();
    MOZ_ASSERT(NS_SUCCEEDED(gDictionaryCache->Init()));
  }
  return do_AddRef(gDictionaryCache);
}

nsresult DictionaryCache::Init() {
  if (XRE_IsParentProcess()) {
    nsCOMPtr<nsICacheStorageService> cacheStorageService(
        components::CacheStorage::Service());
    if (!cacheStorageService) {
      return NS_ERROR_FAILURE;
    }
    nsCOMPtr<nsICacheStorage> temp;
    nsresult rv = cacheStorageService->DiskCacheStorage(
        nullptr, getter_AddRefs(temp));  // Don't need a load context
    if (NS_FAILED(rv)) {
      return rv;
    }
    sCacheStorage = temp;
  }
  DICTIONARY_LOG(("Inited DictionaryCache %p", sCacheStorage.get()));
  return NS_OK;
}

// static
void DictionaryCache::Shutdown() {
  gDictionaryCache = nullptr;
  sCacheStorage = nullptr;
}

nsresult DictionaryCache::AddEntry(nsIURI* aURI, const nsACString& aKey,
                                   const nsACString& aPattern,
                                   nsTArray<nsCString>& aMatchDest,
                                   const nsACString& aId,
                                   const Maybe<nsCString>& aHash,
                                   bool aNewEntry, uint32_t aExpiration,
                                   DictionaryCacheEntry** aDictEntry) {
  // Note that normally we're getting an entry in and until all the data
  // has been received, we can't use it.  The Hash being null is a flag
  // that it's not yet valid.
  DICTIONARY_LOG(("AddEntry for %s, pattern %s, id %s, expiration %u",
                  PromiseFlatCString(aKey).get(),
                  PromiseFlatCString(aPattern).get(),
                  PromiseFlatCString(aId).get(), aExpiration));
  // Note that we don't know if there's an entry for this key in the origin
  RefPtr<DictionaryCacheEntry> dict = new DictionaryCacheEntry(
      aKey, aPattern, aMatchDest, aId, aExpiration, aHash);
  dict = AddEntry(aURI, aNewEntry, dict);
  if (dict) {
    *aDictEntry = do_AddRef(dict).take();
    return NS_OK;
  }
  DICTIONARY_LOG(
      ("Failed adding entry for %s", PromiseFlatCString(aKey).get()));
  *aDictEntry = nullptr;
  return NS_ERROR_FAILURE;
}

already_AddRefed<DictionaryCacheEntry> DictionaryCache::AddEntry(
    nsIURI* aURI, bool aNewEntry, DictionaryCacheEntry* aDictEntry) {
  // Note that normally we're getting an entry in and until all the data
  // has been received, we can't use it.  The Hash being null is a flag
  // that it's not yet valid.
  nsCString prepath;
  if (NS_FAILED(GetDictPath(aURI, prepath))) {
    return nullptr;
  }
  DICTIONARY_LOG(
      ("AddEntry: %s, %d, %p", prepath.get(), aNewEntry, aDictEntry));
  // create for the origin if it doesn't exist
  RefPtr<DictionaryCacheEntry> newEntry;
  (void)mDictionaryCache.WithEntryHandle(prepath, [&](auto&& entry) {
    auto& origin = entry.OrInsertWith([&] {
      RefPtr<DictionaryOrigin> origin = new DictionaryOrigin(prepath, nullptr);
      // Create a cache entry for this if it doesn't exist.  Note
      // that the entry we're adding will need to be saved later once
      // we have the cache entry

      // This creates a cycle until the dictionary is removed from the cache
      aDictEntry->SetOrigin(origin);
      DICTIONARY_LOG(("Creating cache entry for origin %s", prepath.get()));

      // Open (and parse metadata) or create
      RefPtr<DictionaryOriginReader> reader = new DictionaryOriginReader();
      // the type is irrelevant; we won't be calling Match()
      reader->Start(
          true, origin, prepath, aURI, ExtContentPolicy::TYPE_OTHER, this,
          [entry = RefPtr(aDictEntry)](
              bool, DictionaryCacheEntry* aDict) {  // XXX avoid so many lambdas
                                                    // which cause allocations
            // Write the dirty entry we couldn't write before once
            // we get the hash
            entry->WriteOnHash();
            return NS_OK;
          });
      // Since this is read asynchronously, we need to either add the entry
      // async once the read is done and it's populated, or we have to handle
      // collisions on the read
      return origin;
    });

    newEntry = origin->AddEntry(aDictEntry, aNewEntry);
    DICTIONARY_LOG(("AddEntry: added %s", prepath.get()));
    return NS_OK;
  });
  return newEntry.forget();
}

nsresult DictionaryCache::RemoveEntry(nsIURI* aURI, const nsACString& aKey) {
  nsCString prepath;
  if (NS_FAILED(GetDictPath(aURI, prepath))) {
    return NS_ERROR_FAILURE;
  }
  DICTIONARY_LOG(("DictionaryCache::RemoveEntry for %s : %s", prepath.get(),
                  PromiseFlatCString(aKey).get()));
  if (auto origin = mDictionaryCache.Lookup(prepath)) {
    return origin.Data()->RemoveEntry(aKey);
  }
  return NS_ERROR_FAILURE;
}

void DictionaryCache::Clear() {
  // There may be active Prefetch()es running, note, and active fetches
  // using dictionaries.  They will stay alive until the channels using
  // them go away.  However, no new requests will see them.

  // This can be used to make the cache return to the state it has at
  // startup, especially useful for tests.
  mDictionaryCache.Clear();
}

void DictionaryCache::CorruptHashForTesting(const nsACString& aURI) {
  DICTIONARY_LOG(("DictionaryCache::CorruptHashForTesting for %s",
                  PromiseFlatCString(aURI).get()));
  nsCOMPtr<nsIURI> uri;
  if (NS_FAILED(NS_NewURI(getter_AddRefs(uri), aURI))) {
    return;
  }
  nsAutoCString prepath;
  if (NS_FAILED(GetDictPath(uri, prepath))) {
    return;
  }
  if (auto origin = mDictionaryCache.Lookup(prepath)) {
    for (auto& entry : origin.Data()->mEntries) {
      if (entry->GetURI().Equals(aURI)) {
        DICTIONARY_LOG(("Corrupting hash for %s",
                        PromiseFlatCString(entry->GetURI()).get()));
        entry->SetHash("CORRUPTED_FOR_TESTING"_ns);
        return;
      }
    }
    for (auto& entry : origin.Data()->mPendingEntries) {
      if (entry->GetURI().Equals(aURI)) {
        DICTIONARY_LOG(("Corrupting hash for %s (pending)",
                        PromiseFlatCString(entry->GetURI()).get()));
        entry->SetHash("CORRUPTED_FOR_TESTING"_ns);
        return;
      }
    }
  }
}

void DictionaryCache::ClearDictionaryDataForTesting(const nsACString& aURI) {
  DICTIONARY_LOG(("DictionaryCache::ClearDictionaryDataForTesting for %s",
                  PromiseFlatCString(aURI).get()));
  nsCOMPtr<nsIURI> uri;
  if (NS_FAILED(NS_NewURI(getter_AddRefs(uri), aURI))) {
    return;
  }
  nsAutoCString prepath;
  if (NS_FAILED(GetDictPath(uri, prepath))) {
    return;
  }
  if (auto origin = mDictionaryCache.Lookup(prepath)) {
    for (auto& entry : origin.Data()->mEntries) {
      if (entry->GetURI().Equals(aURI)) {
        DICTIONARY_LOG(("Clearing data for %s",
                        PromiseFlatCString(entry->GetURI()).get()));
        entry->ClearDataForTesting();
        return;
      }
    }
  }
}

// Remove a dictionary if it exists for the key given
// static
void DictionaryCache::RemoveDictionaryFor(const nsACString& aKey) {
  RefPtr<DictionaryCache> cache = GetInstance();
  DICTIONARY_LOG(
      ("Removing dictionary for %s", PromiseFlatCString(aKey).get()));
  NS_DispatchToMainThread(NewRunnableMethod<const nsCString>(
      "DictionaryCache::RemoveDictionaryFor", cache,
      &DictionaryCache::RemoveDictionary, aKey));
}

// Remove a dictionary if it exists for the key given
void DictionaryCache::RemoveDictionary(const nsACString& aKey) {
  DICTIONARY_LOG(
      ("Removing dictionary for %s", PromiseFlatCString(aKey).get()));

  nsCOMPtr<nsIURI> uri;
  if (NS_FAILED(NS_NewURI(getter_AddRefs(uri), aKey))) {
    return;
  }
  nsAutoCString prepath;
  if (NS_SUCCEEDED(GetDictPath(uri, prepath))) {
    if (auto origin = mDictionaryCache.Lookup(prepath)) {
      origin.Data()->RemoveEntry(aKey);
    }
  }
}

// static
void DictionaryCache::RemoveOriginFor(const nsACString& aKey) {
  RefPtr<DictionaryCache> cache = GetInstance();
  DICTIONARY_LOG(
      ("Removing dictionary origin %s", PromiseFlatCString(aKey).get()));
  NS_DispatchToMainThread(NewRunnableMethod<const nsCString>(
      "DictionaryCache::RemoveOriginFor", cache,
      &DictionaryCache::RemoveOriginForInternal, aKey));
}

// Remove a dictionary if it exists for the key given, if it's empty
void DictionaryCache::RemoveOriginForInternal(const nsACString& aKey) {
  nsCOMPtr<nsIURI> uri;
  if (NS_FAILED(NS_NewURI(getter_AddRefs(uri), aKey))) {
    return;
  }
  nsAutoCString prepath;
  if (NS_SUCCEEDED(GetDictPath(uri, prepath))) {
    if (auto origin = mDictionaryCache.Lookup(prepath)) {
      if (MOZ_UNLIKELY(origin.Data()->IsEmpty())) {
        DICTIONARY_LOG(
            ("Removing origin for %s", PromiseFlatCString(aKey).get()));
        // This removes it from the global list and also dooms the entry
        origin.Data()->Clear();
      } else {
        DICTIONARY_LOG(
            ("Origin not empty: %s", PromiseFlatCString(aKey).get()));
      }
    }
  }
}

// Remove a dictionary if it exists for the key given (key should be prepath)
void DictionaryCache::RemoveOrigin(const nsACString& aOrigin) {
  mDictionaryCache.Remove(aOrigin);
}

// Remove a dictionary if it exists for the key given.  Mainthread only.
// Note: due to cookie samesite rules, we need to clean for all ports!
// static
void DictionaryCache::RemoveDictionariesForOrigin(nsIURI* aURI) {
  // There's no PrePathNoPort()
  nsAutoCString temp;
  aURI->GetScheme(temp);
  nsCString origin(temp);
  aURI->GetUserPass(temp);
  origin += "://"_ns + temp;
  aURI->GetHost(temp);
  origin += temp;

  DICTIONARY_LOG(("Removing all dictionaries for origin of %s (%zu)",
                  PromiseFlatCString(origin).get(), origin.Length()));
  RefPtr<DictionaryCache> cache = GetInstance();
  // We can't just use Remove here; the ClearSiteData service strips the
  // port.  We need to clear all that match the host with any port or none.

  // Keep an array of origins to clear since that will want to modify the
  // hash table we're iterating
  AutoTArray<RefPtr<DictionaryOrigin>, 1> toClear;
  for (auto& entry : cache->mDictionaryCache) {
    // We need to drop any port from entry (and origin).  Assuming they're
    // the same up to the / or : in mOrigin, we want to limit the host
    // there.  We also know that entry is https://.
    // Verify that:
    // a) they're equal to that point
    // b) that the next character of mOrigin is '/' or ':', which avoids
    //    issues like matching https://foo.bar to (mOrigin)
    //    https://foo.barsoom.com:666/
    DICTIONARY_LOG(
        ("Possibly removing dictionary origin for %s (vs %s), %zu vs %zu",
         entry.GetData()->mOrigin.get(), PromiseFlatCString(origin).get(),
         entry.GetData()->mOrigin.Length(), origin.Length()));
    if (entry.GetData()->mOrigin.Length() > origin.Length() &&
        (entry.GetData()->mOrigin[origin.Length()] == '/' ||   // no port
         entry.GetData()->mOrigin[origin.Length()] == ':')) {  // port
      // no strncmp() for nsCStrings...
      nsDependentCSubstring host =
          Substring(entry.GetData()->mOrigin, 0,
                    origin.Length());  // not including '/' or ':'
      DICTIONARY_LOG(("Compare %s vs %s", entry.GetData()->mOrigin.get(),
                      PromiseFlatCString(host).get()));
      if (origin.Equals(host)) {
        DICTIONARY_LOG(
            ("RemoveDictionaries: Removing dictionary origin %p for %s",
             entry.GetData().get(), entry.GetData()->mOrigin.get()));
        toClear.AppendElement(entry.GetData());
      }
    }
  }
  // Now clear and doom all the entries
  for (auto& entry : toClear) {
    entry->Clear();
  }
}

// Remove a dictionary if it exists for the key given.  Mainthread only
// static
void DictionaryCache::RemoveAllDictionaries() {
  RefPtr<DictionaryCache> cache = GetInstance();

  DICTIONARY_LOG(("Removing all dictionaries"));
  // Clear contents of all origins without calling DictionaryOrigin::Clear()
  // which would try to modify the hashtable during iteration (causing
  // reentrancy assertion in PLDHashTable).
  // Note: This duplicates logic from DictionaryOrigin::Clear() but avoids
  // the RemoveOrigin() call during iteration. For selective removal, see
  // RemoveDictionariesForOrigin() which uses a collect-then-clear pattern.
  AutoTArray<nsCOMPtr<nsICacheEntry>, 8> entriesToDoom;
  for (auto& origin : cache->mDictionaryCache) {
    DictionaryOrigin* originPtr = origin.GetData();
    DICTIONARY_LOG(("*** Clearing origin %s", originPtr->mOrigin.get()));
    originPtr->mEntries.Clear();
    originPtr->mPendingEntries.Clear();
    originPtr->mPendingRemove.Clear();
    if (originPtr->mEntry) {
      entriesToDoom.AppendElement(originPtr->mEntry);
    }
  }
  // Doom all cache entries asynchronously in one task
  if (!entriesToDoom.IsEmpty()) {
    NS_DispatchBackgroundTask(NS_NewRunnableFunction(
        "DictionaryOrigin::ClearAll", [entries = std::move(entriesToDoom)]() {
          DICTIONARY_LOG(("*** Dooming %zu entries", entries.Length()));
          for (auto& entry : entries) {
            entry->AsyncDoom(nullptr);
          }
        }));
  }
  // Now clear the hashtable after iteration is complete
  cache->mDictionaryCache.Clear();
}

// Return an entry via a callback (async).
// If we don't have the origin in-memory, ask the cache for the origin, and
// when we get it, parse the metadata to build a DictionaryOrigin.
// Once we have a DictionaryOrigin (in-memory or parsed), scan it for matches.
// If it's not in the cache, return nullptr via callback.
void DictionaryCache::GetDictionaryFor(
    nsIURI* aURI, ExtContentPolicyType aType, nsHttpChannel* aChan,
    void (*aSuspend)(nsHttpChannel*),
    const std::function<nsresult(bool, DictionaryCacheEntry*)>& aCallback) {
  // Note: IETF 2.2.3 Multiple Matching Directories
  // We need to return match-dest matches first
  // If no match-dest, then the longest match
  nsCString prepath;
  if (NS_FAILED(GetDictPath(aURI, prepath))) {
    (aCallback)(false, nullptr);
    return;
  }
  // Match immediately if we've already created the origin and read any
  // metadata
  if (auto existing = mDictionaryCache.Lookup(prepath)) {
    if (existing.Data()->mWaitingCacheRead.IsEmpty()) {
      // Find the longest match
      nsCString path;
      RefPtr<DictionaryCacheEntry> result;

      aURI->GetSpec(path);
      DICTIONARY_LOG(("GetDictionaryFor(%s %s)", prepath.get(), path.get()));

      result = existing.Data()->Match(path, aType);
      (aCallback)(false, result);
    } else {
      DICTIONARY_LOG(
          ("GetDictionaryFor(%s): Waiting for metadata read to match",
           prepath.get()));
      // Wait for the metadata read to complete
      RefPtr<DictionaryOriginReader> reader = new DictionaryOriginReader();
      // Must do this before calling start, which can run the callbacks and call
      // Resume
      DICTIONARY_LOG(("Suspending to get Dictionary headers"));
      aSuspend(aChan);
      reader->Start(false, existing.Data(), prepath, aURI, aType, this,
                    aCallback);
    }
    return;
  }
  // We don't have an entry at all.  We need to check if there's an entry
  // on disk for <origin>, unless we know we have all entries in the memory
  // cache.

  // Handle unknown origins by checking the disk cache
  if (!sCacheStorage) {
    (aCallback)(false, nullptr);  // in case we have no disk storage
    return;
  }

  // Sync check to see if the entry exists
  bool exists;
  nsCOMPtr<nsIURI> prepathURI;

  if (NS_SUCCEEDED(NS_MutateURI(new net::nsStandardURL::Mutator())
                       .SetSpec(prepath)
                       .Finalize(prepathURI)) &&
      NS_SUCCEEDED(
          sCacheStorage->Exists(prepathURI, META_DICTIONARY_PREFIX, &exists)) &&
      exists) {
    // To keep track of the callback, we need a new object to get the
    // OnCacheEntryAvailable can resolve the callback.
    DICTIONARY_LOG(("Reading %s for dictionary entries", prepath.get()));
    RefPtr<DictionaryOrigin> origin = new DictionaryOrigin(prepath, nullptr);
    // Add the origin to the list; we'll immediately start a reader which
    // will set mWaitingCacheRead, so future GetDictionaryFor() calls
    // will wait for the metadata to be read before doing Match()
    mDictionaryCache.InsertOrUpdate(prepath, origin);

    RefPtr<DictionaryOriginReader> reader = new DictionaryOriginReader();
    // After Start(), if we drop this ref reader will kill itself on
    // completion; it holds a self-ref
    DICTIONARY_LOG(("Suspending to get Dictionary headers"));
    aSuspend(aChan);
    reader->Start(false, origin, prepath, aURI, aType, this, aCallback);
    return;
  }
  // No dictionaries for origin
  (aCallback)(false, nullptr);
}

//-----------------------------------------------------------------------------
// DictionaryOrigin
//-----------------------------------------------------------------------------
NS_IMPL_ISUPPORTS(DictionaryOrigin, nsICacheEntryMetaDataVisitor)

nsresult DictionaryOrigin::Write(DictionaryCacheEntry* aDictEntry) {
  DICTIONARY_LOG(("DictionaryOrigin::Write %s %p", mOrigin.get(), aDictEntry));
  if (mEntry) {
    return aDictEntry->Write(mEntry);
  }
  // Write it once DictionaryOriginReader creates the entry
  mDeferredWrites = true;
  return NS_OK;
}

void DictionaryOrigin::SetCacheEntry(nsICacheEntry* aEntry) {
  mEntry = aEntry;
  mEntry->SetContentType(nsICacheEntry::CONTENT_TYPE_DICTIONARY);
  if (mDeferredWrites) {
    for (auto& entry : mEntries) {
      if (NS_FAILED(Write(entry))) {
        RemoveEntry(entry);
      }
    }
  }
  mDeferredWrites = false;
  // Handle removes that were pending
  for (auto& remove : mPendingRemove) {
    DICTIONARY_LOG(("Pending RemoveEntry for %s", remove->mURI.get()));
    remove->RemoveEntry(mEntry);
  }
  mPendingRemove.Clear();
}

already_AddRefed<DictionaryCacheEntry> DictionaryOrigin::AddEntry(
    DictionaryCacheEntry* aDictEntry, bool aNewEntry) {
  // Remove any entry for the same item
  for (size_t i = 0; i < mEntries.Length(); i++) {
    if (mEntries[i]->GetURI().Equals(aDictEntry->GetURI())) {
      DictionaryCacheEntry* oldEntry = mEntries[i];
      if (aNewEntry) {
        // We're overwriting an existing entry, perhaps with a new hash.  It
        // might be different, of course.
        // Until we receive and save the new data, we should use the old data.

        // We need to pause this channel, regardless of how it's encoded,
        // until the entry we're replacing has either no users, or has data
        // read in from the cache.  Then we can un-Suspend and start
        // replacing the data in the cache itself.  If there are no current
        // users, and we start replacing the data, we need to remove the
        // old entry so no one tries to use the old data/hash for a new
        // request.

        // Note that when we start replacing data in the cache we need to
        // also remove it from the origin's entry in the cache, in case we
        // exit or crash before we finish replacing the entry and updating
        // the origin's entry with the new hash.

        // Once we've replaced the entry (which will be after we have
        // hash), new requests will use the new data/hash.  I.e. we'll
        // still allow new requests to use the old cache data/hash until
        // the swap occurs.  Once the swap happens, the channels using the
        // old data/hash will still have an mDictDecoding reference to the
        // DictionaryCacheEntry for the old data/hash.

        // XXX possible edge case: if a second request to replace the
        // entry appears. Is this possible, or would the second request
        // for the same URI get subsumed into the older one still in
        // process? I'm guessing it doesn't, so we may need to deal with this

        DICTIONARY_LOG((
            "Replacing dictionary %p for %s: new will be %p", mEntries[i].get(),
            PromiseFlatCString(oldEntry->GetURI()).get(), oldEntry));
        // May be overkill to check HasHash here
        if (mEntries[i]->IsReading() && !aDictEntry->HasHash()) {
          DICTIONARY_LOG(("Old entry is reading data"));
          // If the old entry doesn't already have the data from the
          // dictionary, we'll need to Suspend this channel, and do a
          // replace later.  Remember this new entry so when the current
          // entry has it's data in memory we can un-Suspend the new
          // channel/entry.  When the new entry finishes saving, it will
          // use the mReplacement link to come back and insert itself
          // into mEntries and drop the old entry.  Use an origin link
          // for that since the old entry could in theory get purged and
          // removed from the origin before we finish.
          mEntries[i]->SetReplacement(aDictEntry, this);
          // SetReplacement will also set aDictEntry->mShouldSuspend
          return do_AddRef(aDictEntry);
        } else {
          DICTIONARY_LOG(("Removing old entry, no users or already read data"));
          // We can just replace, there are no users active for the old data.
          // This stops new requests from trying to use the old data we're in
          // the process of replacing Remove the entry from the Origin and
          // Write().
          if (mEntry) {
            mEntries[i]->RemoveEntry(mEntry);
          }
          mEntries.RemoveElementAt(i);
        }
      } else {
        // We're updating an existing entry (on a 304 Not Modified).   Assume
        // the values may have changed (though likely they haven't).  Check Spec
        // XXX
        DICTIONARY_LOG(
            ("Updating dictionary for %s (%p)", mOrigin.get(), oldEntry));
        oldEntry->CopyFrom(aDictEntry);
        // write the entry back if something changed
        // XXX Check if something changed
        oldEntry->Write(mEntry);

        // We don't need to reference the entry
        return nullptr;
      }
      break;
    }
  }

  DICTIONARY_LOG(("New dictionary %sfor %s: %p",
                  aDictEntry->HasHash() ? "" : "(pending) ", mOrigin.get(),
                  aDictEntry));
  if (aDictEntry->HasHash()) {
    mEntries.AppendElement(aDictEntry);
  } else {
    // Still need to receive the data.  When we have the hash, move to
    // mEntries (and Write) using entry->mOrigin
    mPendingEntries.AppendElement(aDictEntry);
    aDictEntry->SetReplacement(nullptr, this);
  }

  // DictionaryCache/caller is responsible for ensure this gets written if
  // needed
  return do_AddRef(aDictEntry);
}

nsresult DictionaryOrigin::RemoveEntry(const nsACString& aKey) {
  DICTIONARY_LOG(
      ("DictionaryOrigin::RemoveEntry for %s", PromiseFlatCString(aKey).get()));
  RefPtr<DictionaryCacheEntry> hold;
  for (const auto& dict : mEntries) {
    if (dict->GetURI().Equals(aKey)) {
      // Ensure it doesn't disappear on us
      hold = dict;
      DICTIONARY_LOG(("Removing %p", dict.get()));
      mEntries.RemoveElement(dict);
      if (mEntry) {
        hold->RemoveEntry(mEntry);
      } else {
        // We don't have the cache entry yet.  Defer the removal from
        // the entry until we do
        mPendingRemove.AppendElement(hold);
        return NS_OK;
      }
      break;
    }
  }
  if (!hold) {
    DICTIONARY_LOG(("DictionaryOrigin::RemoveEntry (pending) for %s",
                    PromiseFlatCString(aKey).get()));
    for (const auto& dict : mPendingEntries) {
      if (dict->GetURI().Equals(aKey)) {
        // Ensure it doesn't disappear on us
        RefPtr<DictionaryCacheEntry> hold(dict);
        DICTIONARY_LOG(("Removing %p", dict.get()));
        mPendingEntries.RemoveElement(dict);
        break;
      }
    }
  }
  // If this origin has no entries, remove it and doom the entry
  if (IsEmpty()) {
    Clear();
  }
  return hold ? NS_OK : NS_ERROR_FAILURE;
}

void DictionaryOrigin::FinishAddEntry(DictionaryCacheEntry* aEntry) {
  // if aDictEntry is in mPendingEntries, move to mEntries
  if (mPendingEntries.RemoveElement(aEntry)) {
    // We need to give priority to elements fetched most recently if they
    // have an equivalent match length (and dest)
    // XXX insert at the start of entries of this length
    mEntries.InsertElementAt(0, aEntry);
  }
  DICTIONARY_LOG(("FinishAddEntry(%s)", aEntry->mURI.get()));
  if (MOZ_UNLIKELY(MOZ_LOG_TEST(gDictionaryLog, mozilla::LogLevel::Debug))) {
    DumpEntries();
  }
}

void DictionaryOrigin::RemoveEntry(DictionaryCacheEntry* aEntry) {
  DICTIONARY_LOG(("RemoveEntry(%s)", aEntry->mURI.get()));
  if (!mEntries.RemoveElement(aEntry)) {
    mPendingEntries.RemoveElement(aEntry);
  }
  if (MOZ_UNLIKELY(MOZ_LOG_TEST(gDictionaryLog, mozilla::LogLevel::Debug))) {
    DumpEntries();
  }
}

void DictionaryOrigin::DumpEntries() {
  DICTIONARY_LOG(("*** Origin %s ***", mOrigin.get()));
  for (const auto& dict : mEntries) {
    DICTIONARY_LOG(
        ("* %s: pattern %s, id %s, match-dest[0]: %s, hash: %s, expiration: "
         "%u",
         dict->mURI.get(), dict->mPattern.get(), dict->mId.get(),
         dict->mMatchDest.IsEmpty()
             ? ""
             : dom::GetEnumString(dict->mMatchDest[0]).get(),
         dict->mHash.get(), dict->mExpiration));
  }
  DICTIONARY_LOG(("*** Pending ***"));
  for (const auto& dict : mPendingEntries) {
    DICTIONARY_LOG(
        ("* %s: pattern %s, id %s, match-dest[0]: %s, hash: %s, expiration: "
         "%u",
         dict->mURI.get(), dict->mPattern.get(), dict->mId.get(),
         dict->mMatchDest.IsEmpty()
             ? ""
             : dom::GetEnumString(dict->mMatchDest[0]).get(),
         dict->mHash.get(), dict->mExpiration));
  }
}

void DictionaryOrigin::Clear() {
  DICTIONARY_LOG(("*** Clearing origin %s", mOrigin.get()));
  mEntries.Clear();
  mPendingEntries.Clear();
  mPendingRemove.Clear();
  // We may be under a lock; doom this asynchronously
  if (mEntry) {
    // This will attempt to delete the DictionaryOrigin, but we'll do
    // that more directly
    NS_DispatchBackgroundTask(NS_NewRunnableFunction(
        "DictionaryOrigin::Clear", [entry = mEntry, origin(mOrigin)]() {
          DICTIONARY_LOG(("*** Dooming origin %s", origin.get()));
          entry->AsyncDoom(nullptr);
        }));
  }
  gDictionaryCache->RemoveOrigin(mOrigin);
}

// caller will throw this into a RefPtr
DictionaryCacheEntry* DictionaryOrigin::Match(const nsACString& aPath,
                                              ExtContentPolicyType aType) {
  uint32_t longest = 0;
  DictionaryCacheEntry* result = nullptr;
  uint32_t now = mozilla::net::NowInSeconds();

  for (const auto& dict : mEntries) {
    if (dict->Match(aPath, aType, now, longest)) {
      result = dict;
    }
  }
  // XXX if we want to LRU the origins so we can push them out of memory based
  // on LRU, do something like this:
  /*
  if (result) {
    removeFrom(dictionarycase->mDictionaryCacheLRU);
    dictionarycase->mDictionaryCacheLRU.insertFront(this);
  }
  */
  return result;
}

//-----------------------------------------------------------------------------
// DictionaryOrigin::nsICacheEntryMetaDataVisitor
//-----------------------------------------------------------------------------
nsresult DictionaryOrigin::OnMetaDataElement(const char* asciiKey,
                                             const char* asciiValue) {
  DICTIONARY_LOG(("DictionaryOrigin::OnMetaDataElement %s %s",
                  asciiKey ? asciiKey : "", asciiValue));

  // We set the content ID to CONTENT_TYPE_DICTIONARY, ensure that's correct
  if (strcmp(asciiKey, "ctid") == 0) {
    MOZ_ASSERT(strcmp(asciiValue, "7") == 0);
    return NS_OK;
  }
  // All other keys should be URLs for dictionaries
  // If we already have an entry for this key (pending or in the list),
  // don't override it
  for (auto& entry : mEntries) {
    if (entry->GetURI().Equals(asciiKey)) {
      return NS_OK;
    }
  }
  for (auto& entry : mPendingEntries) {
    if (entry->GetURI().Equals(asciiKey)) {
      return NS_OK;
    }
  }
  RefPtr<DictionaryCacheEntry> entry = new DictionaryCacheEntry(asciiKey);
  if (entry->ParseMetadata(asciiValue)) {
    mEntries.AppendElement(entry);
  }
  return NS_OK;
}

// Overall structure:
// Dictionary:
//     DictionaryCache:
//        OriginHashmap:
//           LinkedList: DictionaryCacheEntry
//              Data from cache (sometimes)
//
// Each origin is in the cache as a dictionary-origin entry.  In that
// entry's metadata, we have an LRU-sorted list of dictionary entries to be able
// to build a DictionaryCacheEntry.
// When we offer a dictionary on a load, we'll start prefetching the data into
// the DictionaryCacheEntry for the item in the cache. When the response comes
// in, we'll either use it to decompress, or indicate we no longer care about
// the data. If no one cares about the data, we'll purge it from memory.
//    Hold refs to the data in requests.  When the only ref is in the
//    DictionaryCacheEntry, purge the data. This could also be done via the
//    InUse counter
//
// XXX be careful about thrashing the cache loading and purging, esp with RCWN.
// Note that this makes RCWN somewhat superfluous for loads that have a
// dictionary.
// XXX Perhaps allow a little dwell time in ram if not too large?

// When a load comes in, we need to block decompressing it on having the data
// from the cache if it's dcb or dcz.
// XXX If the cache fails for some reason, we probably should consider
// re-fetching the data without Dictionary-Available.

}  // namespace net
}  // namespace mozilla
