/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsAppDirectoryServiceDefs.h"
#include "nsCharSeparatedTokenizer.h"
#include "nsComponentManagerUtils.h"
#include "nsICaptivePortalService.h"
#include "nsIParentalControlsService.h"
#include "nsINetworkLinkService.h"
#include "nsIObserverService.h"
#include "nsIOService.h"
#include "nsNetUtil.h"
#include "nsStandardURL.h"
#include "TRR.h"
#include "TRRService.h"

#include "mozilla/Preferences.h"
#include "mozilla/StaticPrefs_network.h"
#include "mozilla/Telemetry.h"
#include "mozilla/Tokenizer.h"
#include "mozilla/net/rust_helper.h"

#if defined(XP_WIN) && !defined(__MINGW32__)
#  include <shlobj_core.h>  // for SHGetSpecialFolderPathA
#endif                      // XP_WIN

static const char kOpenCaptivePortalLoginEvent[] = "captive-portal-login";
static const char kClearPrivateData[] = "clear-private-data";
static const char kPurge[] = "browser:purge-session-history";
static const char kDisableIpv6Pref[] = "network.dns.disableIPv6";
static const char kRolloutURIPref[] = "doh-rollout.uri";
static const char kRolloutModePref[] = "doh-rollout.mode";

#define TRR_PREF_PREFIX "network.trr."
#define TRR_PREF(x) TRR_PREF_PREFIX x

namespace mozilla {
namespace net {

#undef LOG
extern mozilla::LazyLogModule gHostResolverLog;
#define LOG(args) MOZ_LOG(gHostResolverLog, mozilla::LogLevel::Debug, args)

TRRService* gTRRService = nullptr;
StaticRefPtr<nsIThread> sTRRBackgroundThread;
static Atomic<TRRService*> sTRRServicePtr;

NS_IMPL_ISUPPORTS(TRRService, nsIObserver, nsISupportsWeakReference)

TRRService::TRRService()
    : mInitialized(false),
      mBlocklistDurationSeconds(60),
      mLock("trrservice"),
      mConfirmationNS("example.com"_ns),
      mCaptiveIsPassed(false),
      mTRRBLStorage("DataMutex::TRRBlocklist"),
      mConfirmationState(CONFIRM_INIT),
      mRetryConfirmInterval(125),
      mTRRFailures(0),
      mParentalControlEnabled(false) {
  MOZ_ASSERT(NS_IsMainThread(), "wrong thread");
}

// static
void TRRService::AddObserver(nsIObserver* aObserver,
                             nsIObserverService* aObserverService) {
  nsCOMPtr<nsIObserverService> observerService;
  if (aObserverService) {
    observerService = aObserverService;
  } else {
    observerService = mozilla::services::GetObserverService();
  }

  if (observerService) {
    observerService->AddObserver(aObserver, NS_CAPTIVE_PORTAL_CONNECTIVITY,
                                 true);
    observerService->AddObserver(aObserver, kOpenCaptivePortalLoginEvent, true);
    observerService->AddObserver(aObserver, kClearPrivateData, true);
    observerService->AddObserver(aObserver, kPurge, true);
    observerService->AddObserver(aObserver, NS_NETWORK_LINK_TOPIC, true);
    observerService->AddObserver(aObserver, NS_DNS_SUFFIX_LIST_UPDATED_TOPIC,
                                 true);
    observerService->AddObserver(aObserver, "xpcom-shutdown-threads", true);
  }
}

// static
bool TRRService::CheckCaptivePortalIsPassed() {
  bool result = false;
  nsCOMPtr<nsICaptivePortalService> captivePortalService =
      do_GetService(NS_CAPTIVEPORTAL_CID);
  if (captivePortalService) {
    int32_t captiveState;
    MOZ_ALWAYS_SUCCEEDS(captivePortalService->GetState(&captiveState));

    if ((captiveState == nsICaptivePortalService::UNLOCKED_PORTAL) ||
        (captiveState == nsICaptivePortalService::NOT_CAPTIVE)) {
      result = true;
    }
    LOG(("TRRService::Init mCaptiveState=%d mCaptiveIsPassed=%d\n",
         captiveState, (int)result));
  }

  return result;
}

constexpr auto kTRRIsAutoDetectedKey = "(auto-detected)"_ns;
constexpr auto kTRRNotAutoDetectedKey = "(default)"_ns;
// static
const nsCString& TRRService::AutoDetectedKey() {
  if (gTRRService && gTRRService->IsUsingAutoDetectedURL()) {
    return kTRRIsAutoDetectedKey.AsString();
  }

  return kTRRNotAutoDetectedKey.AsString();
}

static void RemoveTRRBlocklistFile() {
  MOZ_ASSERT(NS_IsMainThread(), "Getting the profile dir on the main thread");

  nsCOMPtr<nsIFile> file;
  nsresult rv =
      NS_GetSpecialDirectory(NS_APP_USER_PROFILE_50_DIR, getter_AddRefs(file));
  if (NS_FAILED(rv)) {
    return;
  }

  rv = file->AppendNative("TRRBlacklist.txt"_ns);
  if (NS_FAILED(rv)) {
    return;
  }

  // Dispatch an async task that removes the blocklist file from the profile.
  rv = NS_DispatchBackgroundTask(
      NS_NewRunnableFunction("RemoveTRRBlocklistFile::Remove",
                             [file] { file->Remove(false); }),
      NS_DISPATCH_EVENT_MAY_BLOCK);
  if (NS_FAILED(rv)) {
    return;
  }
  Preferences::SetBool("network.trr.blocklist_cleanup_done", true);
}

nsresult TRRService::Init() {
  MOZ_ASSERT(NS_IsMainThread(), "wrong thread");
  if (mInitialized) {
    return NS_OK;
  }
  mInitialized = true;

  AddObserver(this);

  nsCOMPtr<nsIPrefBranch> prefBranch;
  GetPrefBranch(getter_AddRefs(prefBranch));
  if (prefBranch) {
    prefBranch->AddObserver(TRR_PREF_PREFIX, this, true);
    prefBranch->AddObserver(kDisableIpv6Pref, this, true);
    prefBranch->AddObserver(kRolloutURIPref, this, true);
    prefBranch->AddObserver(kRolloutModePref, this, true);
  }

  gTRRService = this;
  sTRRServicePtr = this;

  ReadPrefs(nullptr);

  if (XRE_IsParentProcess()) {
    mCaptiveIsPassed = CheckCaptivePortalIsPassed();

    mParentalControlEnabled = GetParentalControlEnabledInternal();

    nsCOMPtr<nsINetworkLinkService> nls =
        do_GetService(NS_NETWORK_LINK_SERVICE_CONTRACTID);
    if (nls) {
      nsTArray<nsCString> suffixList;
      nls->GetDnsSuffixList(suffixList);
      RebuildSuffixList(std::move(suffixList));
    }

    nsCOMPtr<nsIThread> thread;
    if (NS_FAILED(
            NS_NewNamedThread("TRR Background", getter_AddRefs(thread)))) {
      NS_WARNING("NS_NewNamedThread failed!");
      return NS_ERROR_FAILURE;
    }

    sTRRBackgroundThread = thread;

    if (!StaticPrefs::network_trr_blocklist_cleanup_done()) {
      // Dispatch an idle task to the main thread that gets the profile dir
      // then attempts to delete the blocklist file on a background thread.
      Unused << NS_DispatchToMainThreadQueue(
          NS_NewCancelableRunnableFunction("RemoveTRRBlocklistFile::GetDir",
                                           [] { RemoveTRRBlocklistFile(); }),
          EventQueuePriority::Idle);
    }
  }

  LOG(("Initialized TRRService\n"));
  return NS_OK;
}

// static
bool TRRService::GetParentalControlEnabledInternal() {
  nsCOMPtr<nsIParentalControlsService> pc =
      do_CreateInstance("@mozilla.org/parental-controls-service;1");
  if (pc) {
    bool result = false;
    pc->GetParentalControlsEnabled(&result);
    LOG(("TRRService::GetParentalControlEnabledInternal=%d\n", result));
    return result;
  }

  return false;
}

void TRRService::SetDetectedTrrURI(const nsACString& aURI) {
  // If the user has set a custom URI then we don't want to override that.
  if (mURIPrefHasUserValue) {
    return;
  }

  mURISetByDetection = MaybeSetPrivateURI(aURI);
}

bool TRRService::Enabled(nsIRequest::TRRMode aMode) {
  if (mMode == MODE_TRROFF) {
    return false;
  }
  if (mConfirmationState == CONFIRM_INIT &&
      (!StaticPrefs::network_trr_wait_for_portal() || mCaptiveIsPassed ||
       (mMode == MODE_TRRONLY || aMode == nsIRequest::TRR_ONLY_MODE))) {
    LOG(("TRRService::Enabled => CONFIRM_TRYING\n"));
    mConfirmationState = CONFIRM_TRYING;
  }

  if (mConfirmationState == CONFIRM_TRYING) {
    LOG(("TRRService::Enabled MaybeConfirm()\n"));
    MaybeConfirm();
  }

  if (mConfirmationState != CONFIRM_OK) {
    LOG(("TRRService::Enabled mConfirmationState=%d mCaptiveIsPassed=%d\n",
         (int)mConfirmationState, (int)mCaptiveIsPassed));
  }

  return (mConfirmationState == CONFIRM_OK);
}

void TRRService::GetPrefBranch(nsIPrefBranch** result) {
  MOZ_ASSERT(NS_IsMainThread(), "wrong thread");
  *result = nullptr;
  CallGetService(NS_PREFSERVICE_CONTRACTID, result);
}

bool TRRService::MaybeSetPrivateURI(const nsACString& aURI) {
  bool clearCache = false;
  nsAutoCString newURI(aURI);
  ProcessURITemplate(newURI);

  {
    MutexAutoLock lock(mLock);
    if (mPrivateURI.Equals(newURI)) {
      return false;
    }

    if (!mPrivateURI.IsEmpty()) {
      LOG(("TRRService clearing blocklist because of change in uri service\n"));
      auto bl = mTRRBLStorage.Lock();
      bl->Clear();
      clearCache = true;
    }
    mPrivateURI = newURI;
  }

  // Clear the cache because we changed the URI
  if (clearCache) {
    ClearEntireCache();
  }

  nsCOMPtr<nsIObserverService> obs = mozilla::services::GetObserverService();
  if (obs) {
    obs->NotifyObservers(nullptr, NS_NETWORK_TRR_URI_CHANGED_TOPIC, nullptr);
  }
  return true;
}

nsresult TRRService::ReadPrefs(const char* name) {
  MOZ_ASSERT(NS_IsMainThread(), "wrong thread");

  // Whenever a pref change occurs that would cause us to clear the cache
  // we set this to true then do it at the end of the method.
  bool clearEntireCache = false;

  if (!name || !strcmp(name, TRR_PREF("mode")) ||
      !strcmp(name, kRolloutModePref)) {
    OnTRRModeChange();
  }
  if (!name || !strcmp(name, TRR_PREF("uri")) ||
      !strcmp(name, kRolloutURIPref)) {
    OnTRRURIChange();
  }
  if (!name || !strcmp(name, TRR_PREF("credentials"))) {
    MutexAutoLock lock(mLock);
    Preferences::GetCString(TRR_PREF("credentials"), mPrivateCred);
  }
  if (!name || !strcmp(name, TRR_PREF("confirmationNS"))) {
    MutexAutoLock lock(mLock);
    nsAutoCString old(mConfirmationNS);
    Preferences::GetCString(TRR_PREF("confirmationNS"), mConfirmationNS);
    if (name && !old.IsEmpty() && !mConfirmationNS.Equals(old) &&
        (mConfirmationState > CONFIRM_TRYING) &&
        (mMode == MODE_TRRFIRST || mMode == MODE_TRRONLY)) {
      LOG(("TRR::ReadPrefs: restart confirmationNS state\n"));
      mConfirmationState = CONFIRM_TRYING;
      MaybeConfirm_locked();
    }
  }
  if (!name || !strcmp(name, TRR_PREF("bootstrapAddress"))) {
    MutexAutoLock lock(mLock);
    Preferences::GetCString(TRR_PREF("bootstrapAddress"), mBootstrapAddr);
    clearEntireCache = true;
  }
  if (!name || !strcmp(name, TRR_PREF("blacklist-duration"))) {
    // prefs is given in number of seconds
    uint32_t secs;
    if (NS_SUCCEEDED(
            Preferences::GetUint(TRR_PREF("blacklist-duration"), &secs))) {
      mBlocklistDurationSeconds = secs;
    }
  }
  if (!name || !strcmp(name, kDisableIpv6Pref)) {
    bool tmp;
    if (NS_SUCCEEDED(Preferences::GetBool(kDisableIpv6Pref, &tmp))) {
      mDisableIPv6 = tmp;
    }
  }
  if (!name || !strcmp(name, TRR_PREF("excluded-domains")) ||
      !strcmp(name, TRR_PREF("builtin-excluded-domains"))) {
    MutexAutoLock lock(mLock);
    mExcludedDomains.Clear();

    auto parseExcludedDomains = [this](const char* aPrefName) {
      nsAutoCString excludedDomains;
      Preferences::GetCString(aPrefName, excludedDomains);
      if (excludedDomains.IsEmpty()) {
        return;
      }

      nsCCharSeparatedTokenizer tokenizer(
          excludedDomains, ',', nsCCharSeparatedTokenizer::SEPARATOR_OPTIONAL);
      while (tokenizer.hasMoreTokens()) {
        nsAutoCString token(tokenizer.nextToken());
        LOG(("TRRService::ReadPrefs %s host:[%s]\n", aPrefName, token.get()));
        mExcludedDomains.PutEntry(token);
      }
    };

    parseExcludedDomains(TRR_PREF("excluded-domains"));
    parseExcludedDomains(TRR_PREF("builtin-excluded-domains"));
    clearEntireCache = true;
  }

  // if name is null, then we're just now initializing. In that case we don't
  // need to clear the cache.
  if (name && clearEntireCache) {
    ClearEntireCache();
  }

  return NS_OK;
}

void TRRService::ClearEntireCache() {
  if (!StaticPrefs::network_trr_clear_cache_on_pref_change()) {
    return;
  }
  nsCOMPtr<nsIDNSService> dns = do_GetService(NS_DNSSERVICE_CONTRACTID);
  if (!dns) {
    return;
  }
  dns->ClearCache(true);
}

void TRRService::AddEtcHosts(const nsTArray<nsCString>& aArray) {
  MutexAutoLock lock(mLock);
  for (const auto& item : aArray) {
    LOG(("Adding %s from /etc/hosts to excluded domains", item.get()));
    mEtcHostsDomains.PutEntry(item);
  }
}

void TRRService::ReadEtcHostsFile() {
  if (!StaticPrefs::network_trr_exclude_etc_hosts()) {
    return;
  }

  auto readHostsTask = []() {
    MOZ_ASSERT(!NS_IsMainThread(), "Must not run on the main thread");
#if defined(XP_WIN) && !defined(__MINGW32__)
    // Inspired by libevent/evdns.c
    // Windows is a little coy about where it puts its configuration
    // files.  Sure, they're _usually_ in C:\windows\system32, but
    // there's no reason in principle they couldn't be in
    // W:\hoboken chicken emergency

    nsCString path;
    path.SetLength(MAX_PATH + 1);
    if (!SHGetSpecialFolderPathA(NULL, path.BeginWriting(), CSIDL_SYSTEM,
                                 false)) {
      LOG(("Calling SHGetSpecialFolderPathA failed"));
      return;
    }

    path.SetLength(strlen(path.get()));
    path.Append("\\drivers\\etc\\hosts");
#elif defined(__MINGW32__)
    nsAutoCString path("C:\\windows\\system32\\drivers\\etc\\hosts"_ns);
#else
    nsAutoCString path("/etc/hosts"_ns);
#endif

    LOG(("Reading hosts file at %s", path.get()));
    rust_parse_etc_hosts(&path, [](const nsTArray<nsCString>* aArray) -> bool {
      RefPtr<TRRService> service(sTRRServicePtr);
      if (service && aArray) {
        service->AddEtcHosts(*aArray);
      }
      return !!service;
    });
  };

  Unused << NS_DispatchBackgroundTask(
      NS_NewRunnableFunction("Read /etc/hosts file", readHostsTask),
      NS_DISPATCH_EVENT_MAY_BLOCK);
}

nsresult TRRService::GetURI(nsACString& result) {
  MutexAutoLock lock(mLock);
  result = mPrivateURI;
  return NS_OK;
}

nsresult TRRService::GetCredentials(nsCString& result) {
  MutexAutoLock lock(mLock);
  result = mPrivateCred;
  return NS_OK;
}

uint32_t TRRService::GetRequestTimeout() {
  if (mMode == MODE_TRRONLY) {
    return StaticPrefs::network_trr_request_timeout_mode_trronly_ms();
  }

  return StaticPrefs::network_trr_request_timeout_ms();
}

nsresult TRRService::Start() {
  MOZ_ASSERT(NS_IsMainThread(), "wrong thread");
  if (!mInitialized) {
    return NS_ERROR_NOT_INITIALIZED;
  }
  return NS_OK;
}

TRRService::~TRRService() {
  MOZ_ASSERT(NS_IsMainThread(), "wrong thread");
  LOG(("Exiting TRRService\n"));
  gTRRService = nullptr;
}

nsresult TRRService::DispatchTRRRequest(TRR* aTrrRequest) {
  return DispatchTRRRequestInternal(aTrrRequest, true);
}

nsresult TRRService::DispatchTRRRequestInternal(TRR* aTrrRequest,
                                                bool aWithLock) {
  NS_ENSURE_ARG_POINTER(aTrrRequest);
  if (!StaticPrefs::network_trr_fetch_off_main_thread() ||
      XRE_IsSocketProcess()) {
    return NS_DispatchToMainThread(aTrrRequest);
  }

  RefPtr<TRR> trr = aTrrRequest;
  nsCOMPtr<nsIThread> thread = aWithLock ? TRRThread() : TRRThread_locked();
  if (!thread) {
    return NS_ERROR_FAILURE;
  }

  return thread->Dispatch(trr.forget());
}

already_AddRefed<nsIThread> TRRService::TRRThread() {
  MutexAutoLock lock(mLock);
  return TRRThread_locked();
}

already_AddRefed<nsIThread> TRRService::TRRThread_locked() {
  RefPtr<nsIThread> thread = sTRRBackgroundThread;
  return thread.forget();
}

bool TRRService::IsOnTRRThread() {
  nsCOMPtr<nsIThread> thread;
  {
    MutexAutoLock lock(mLock);
    thread = sTRRBackgroundThread;
  }
  if (!thread) {
    return false;
  }

  return thread->IsOnCurrentThread();
}

NS_IMETHODIMP
TRRService::Observe(nsISupports* aSubject, const char* aTopic,
                    const char16_t* aData) {
  MOZ_ASSERT(NS_IsMainThread(), "wrong thread");
  LOG(("TRR::Observe() topic=%s\n", aTopic));
  if (!strcmp(aTopic, NS_PREFBRANCH_PREFCHANGE_TOPIC_ID)) {
    ReadPrefs(NS_ConvertUTF16toUTF8(aData).get());

    MutexAutoLock lock(mLock);
    if (((mConfirmationState == CONFIRM_INIT) && !mBootstrapAddr.IsEmpty() &&
         (mMode == MODE_TRRONLY)) ||
        (mConfirmationState == CONFIRM_FAILED)) {
      mConfirmationState = CONFIRM_TRYING;
      MaybeConfirm_locked();
    }

  } else if (!strcmp(aTopic, kOpenCaptivePortalLoginEvent)) {
    // We are in a captive portal
    LOG(("TRRservice in captive portal\n"));
    mCaptiveIsPassed = false;
  } else if (!strcmp(aTopic, NS_CAPTIVE_PORTAL_CONNECTIVITY)) {
    nsAutoCString data = NS_ConvertUTF16toUTF8(aData);
    LOG(("TRRservice captive portal was %s\n", data.get()));

    // We should avoid doing calling MaybeConfirm in response to a pref change
    // unless the service is in a TRR=enabled mode.
    if (mMode == MODE_TRRFIRST || mMode == MODE_TRRONLY) {
      if (!mCaptiveIsPassed) {
        if (mConfirmationState != CONFIRM_OK) {
          mConfirmationState = CONFIRM_TRYING;
          MaybeConfirm();
        }
      } else {
        LOG(("TRRservice CP clear when already up!\n"));
      }
      mCaptiveIsPassed = true;
    }

  } else if (!strcmp(aTopic, kClearPrivateData) || !strcmp(aTopic, kPurge)) {
    // flush the TRR blocklist
    auto bl = mTRRBLStorage.Lock();
    bl->Clear();
  } else if (!strcmp(aTopic, NS_DNS_SUFFIX_LIST_UPDATED_TOPIC) ||
             !strcmp(aTopic, NS_NETWORK_LINK_TOPIC)) {
    // nsINetworkLinkService is only available on parent process.
    if (XRE_IsParentProcess()) {
      nsCOMPtr<nsINetworkLinkService> link = do_QueryInterface(aSubject);
      // The network link service notification normally passes itself as the
      // subject, but some unit tests will sometimes pass a null subject.
      if (link) {
        nsTArray<nsCString> suffixList;
        link->GetDnsSuffixList(suffixList);
        RebuildSuffixList(std::move(suffixList));
      }
    }

    if (!strcmp(aTopic, NS_NETWORK_LINK_TOPIC) && mURISetByDetection) {
      // If the URI was set via SetDetectedTrrURI we need to restore it to the
      // default pref when a network link change occurs.
      CheckURIPrefs();
    }
  } else if (!strcmp(aTopic, "xpcom-shutdown-threads")) {
    if (sTRRBackgroundThread) {
      nsCOMPtr<nsIThread> thread;
      {
        MutexAutoLock lock(mLock);
        thread = sTRRBackgroundThread.get();
        sTRRBackgroundThread = nullptr;
      }
      MOZ_ALWAYS_SUCCEEDS(thread->Shutdown());
      sTRRServicePtr = nullptr;
    }
  }
  return NS_OK;
}

void TRRService::RebuildSuffixList(nsTArray<nsCString>&& aSuffixList) {
  if (!StaticPrefs::network_trr_split_horizon_mitigations()) {
    return;
  }

  MutexAutoLock lock(mLock);
  mDNSSuffixDomains.Clear();
  for (const auto& item : aSuffixList) {
    LOG(("TRRService adding %s to suffix list", item.get()));
    mDNSSuffixDomains.PutEntry(item);
  }
}

void TRRService::MaybeConfirm() {
  MutexAutoLock lock(mLock);
  MaybeConfirm_locked();
}

void TRRService::MaybeConfirm_locked() {
  mLock.AssertCurrentThreadOwns();
  if (mMode == MODE_TRROFF || mConfirmer ||
      mConfirmationState != CONFIRM_TRYING) {
    LOG(
        ("TRRService:MaybeConfirm mode=%d, mConfirmer=%p "
         "mConfirmationState=%d\n",
         (int)mMode, (void*)mConfirmer, (int)mConfirmationState));
    return;
  }

  if (mConfirmationNS.Equals("skip") || mMode == MODE_TRRONLY) {
    LOG(("TRRService starting confirmation test %s SKIPPED\n",
         mPrivateURI.get()));
    mConfirmationState = CONFIRM_OK;
  } else {
    LOG(("TRRService starting confirmation test %s %s\n", mPrivateURI.get(),
         mConfirmationNS.get()));
    mConfirmer = new TRR(this, mConfirmationNS, TRRTYPE_NS, ""_ns, false);
    DispatchTRRRequestInternal(mConfirmer, false);
  }
}

bool TRRService::MaybeBootstrap(const nsACString& aPossible,
                                nsACString& aResult) {
  MutexAutoLock lock(mLock);
  if (mMode == MODE_TRROFF || mBootstrapAddr.IsEmpty()) {
    return false;
  }

  nsCOMPtr<nsIURI> url;
  nsresult rv =
      NS_MutateURI(NS_STANDARDURLMUTATOR_CONTRACTID)
          .Apply(NS_MutatorMethod(&nsIStandardURLMutator::Init,
                                  nsIStandardURL::URLTYPE_STANDARD, 443,
                                  mPrivateURI, nullptr, nullptr, nullptr))
          .Finalize(url);
  if (NS_FAILED(rv)) {
    LOG(("TRRService::MaybeBootstrap failed to create URI!\n"));
    return false;
  }

  nsAutoCString host;
  url->GetHost(host);
  if (!aPossible.Equals(host)) {
    return false;
  }
  LOG(("TRRService::MaybeBootstrap: use %s instead of %s\n",
       mBootstrapAddr.get(), host.get()));
  aResult = mBootstrapAddr;
  return true;
}

bool TRRService::IsDomainBlocked(const nsACString& aHost,
                                 const nsACString& aOriginSuffix,
                                 bool aPrivateBrowsing) {
  if (!Enabled(nsIRequest::TRR_DEFAULT_MODE)) {
    return true;
  }

  auto bl = mTRRBLStorage.Lock();
  if (bl->IsEmpty()) {
    return false;
  }

  // use a unified casing for the hashkey
  nsAutoCString hashkey(aHost + aOriginSuffix);
  if (int32_t* val = bl->GetValue(hashkey)) {
    int32_t until = *val + mBlocklistDurationSeconds;
    int32_t expire = NowInSeconds();
    if (until > expire) {
      LOG(("Host [%s] is TRR blocklisted\n", nsCString(aHost).get()));
      return true;
    }

    // the blocklisted entry has expired
    bl->Remove(hashkey);
  }
  return false;
}

// When running in TRR-only mode, the blocklist is not used and it will also
// try resolving the localhost / .local names.
bool TRRService::IsTemporarilyBlocked(const nsACString& aHost,
                                      const nsACString& aOriginSuffix,
                                      bool aPrivateBrowsing,
                                      bool aParentsToo)  // false if domain
{
  if (mMode == MODE_TRRONLY) {
    return false;  // might as well try
  }

  LOG(("Checking if host [%s] is blocklisted", aHost.BeginReading()));

  int32_t dot = aHost.FindChar('.');
  if ((dot == kNotFound) && aParentsToo) {
    // Only if a full host name. Domains can be dotless to be able to
    // blocklist entire TLDs
    return true;
  }

  if (IsDomainBlocked(aHost, aOriginSuffix, aPrivateBrowsing)) {
    return true;
  }

  nsDependentCSubstring domain = Substring(aHost, 0);
  while (dot != kNotFound) {
    dot++;
    domain.Rebind(domain, dot, domain.Length() - dot);

    if (IsDomainBlocked(domain, aOriginSuffix, aPrivateBrowsing)) {
      return true;
    }

    dot = domain.FindChar('.');
  }

  return false;
}

bool TRRService::IsExcludedFromTRR(const nsACString& aHost) {
  // This method may be called off the main thread. We need to lock so
  // mExcludedDomains and mDNSSuffixDomains don't change while this code
  // is running.
  MutexAutoLock lock(mLock);

  return IsExcludedFromTRR_unlocked(aHost);
}

bool TRRService::IsExcludedFromTRR_unlocked(const nsACString& aHost) {
  if (!NS_IsMainThread()) {
    mLock.AssertCurrentThreadOwns();
  }

  int32_t dot = 0;
  // iteratively check the sub-domain of |aHost|
  while (dot < static_cast<int32_t>(aHost.Length())) {
    nsDependentCSubstring subdomain =
        Substring(aHost, dot, aHost.Length() - dot);

    if (mExcludedDomains.GetEntry(subdomain)) {
      LOG(("Subdomain [%s] of host [%s] Is Excluded From TRR via pref\n",
           subdomain.BeginReading(), aHost.BeginReading()));
      return true;
    }
    if (mDNSSuffixDomains.GetEntry(subdomain)) {
      LOG(("Subdomain [%s] of host [%s] Is Excluded From TRR via pref\n",
           subdomain.BeginReading(), aHost.BeginReading()));
      return true;
    }
    if (mEtcHostsDomains.GetEntry(subdomain)) {
      LOG(("Subdomain [%s] of host [%s] Is Excluded From TRR by /etc/hosts\n",
           subdomain.BeginReading(), aHost.BeginReading()));
      return true;
    }

    dot = aHost.FindChar('.', dot + 1);
    if (dot == kNotFound) {
      break;
    }
    dot++;
  }

  return false;
}

void TRRService::AddToBlocklist(const nsACString& aHost,
                                const nsACString& aOriginSuffix,
                                bool privateBrowsing, bool aParentsToo) {
  LOG(("TRR blocklist %s\n", nsCString(aHost).get()));
  nsAutoCString hashkey(aHost + aOriginSuffix);

  // this overwrites any existing entry
  {
    auto bl = mTRRBLStorage.Lock();
    bl->Put(hashkey, NowInSeconds());
  }

  if (aParentsToo) {
    // when given a full host name, verify its domain as well
    int32_t dot = aHost.FindChar('.');
    if (dot != kNotFound) {
      // this has a domain to be checked
      dot++;
      nsDependentCSubstring domain =
          Substring(aHost, dot, aHost.Length() - dot);
      nsAutoCString check(domain);
      if (IsTemporarilyBlocked(check, aOriginSuffix, privateBrowsing, false)) {
        // the domain part is already blocklisted, no need to add this entry
        return;
      }
      // verify 'check' over TRR
      LOG(("TRR: verify if '%s' resolves as NS\n", check.get()));

      // check if there's an NS entry for this name
      RefPtr<TRR> trr =
          new TRR(this, check, TRRTYPE_NS, aOriginSuffix, privateBrowsing);
      DispatchTRRRequest(trr);
    }
  }
}

NS_IMETHODIMP
TRRService::Notify(nsITimer* aTimer) {
  if (aTimer == mRetryConfirmTimer) {
    mRetryConfirmTimer = nullptr;
    if (mConfirmationState == CONFIRM_FAILED) {
      LOG(("TRRService retry NS of %s\n", mConfirmationNS.get()));
      mConfirmationState = CONFIRM_TRYING;
      MaybeConfirm();
    }
  } else {
    MOZ_CRASH("Unknown timer");
  }

  return NS_OK;
}

void TRRService::TRRIsOkay(enum TrrOkay aReason) {
  MOZ_ASSERT_IF(XRE_IsParentProcess(), NS_IsMainThread() || IsOnTRRThread());
  MOZ_ASSERT_IF(XRE_IsSocketProcess(), NS_IsMainThread());

  Telemetry::AccumulateCategoricalKeyed(
      AutoDetectedKey(),
      aReason == OKAY_NORMAL
          ? Telemetry::LABELS_DNS_TRR_SUCCESS2::Fine
          : (aReason == OKAY_TIMEOUT
                 ? Telemetry::LABELS_DNS_TRR_SUCCESS2::Timeout
                 : Telemetry::LABELS_DNS_TRR_SUCCESS2::Bad));
  if (aReason == OKAY_NORMAL) {
    mTRRFailures = 0;
  } else if ((mMode == MODE_TRRFIRST) && (mConfirmationState == CONFIRM_OK)) {
    // only count failures while in OK state
    uint32_t fails = ++mTRRFailures;
    if (fails >= StaticPrefs::network_trr_max_fails()) {
      LOG(("TRRService goes FAILED after %u failures in a row\n", fails));
      mConfirmationState = CONFIRM_FAILED;
      // Fire off a timer and start re-trying the NS domain again
      NS_NewTimerWithCallback(getter_AddRefs(mRetryConfirmTimer), this,
                              mRetryConfirmInterval, nsITimer::TYPE_ONE_SHOT);
      mTRRFailures = 0;  // clear it again
    }
  }
}

AHostResolver::LookupStatus TRRService::CompleteLookup(
    nsHostRecord* rec, nsresult status, AddrInfo* aNewRRSet, bool pb,
    const nsACString& aOriginSuffix, nsHostRecord::TRRSkippedReason aReason) {
  // this is an NS check for the TRR blocklist or confirmationNS check

  MOZ_ASSERT_IF(XRE_IsParentProcess(), NS_IsMainThread() || IsOnTRRThread());
  MOZ_ASSERT_IF(XRE_IsSocketProcess(), NS_IsMainThread());
  MOZ_ASSERT(!rec);

  RefPtr<AddrInfo> newRRSet(aNewRRSet);
  MOZ_ASSERT(newRRSet && newRRSet->IsTRR() == TRRTYPE_NS);

#ifdef DEBUG
  {
    MutexAutoLock lock(mLock);
    MOZ_ASSERT(!mConfirmer || (mConfirmationState == CONFIRM_TRYING));
  }
#endif
  if (mConfirmationState == CONFIRM_TRYING) {
    {
      MutexAutoLock lock(mLock);
      MOZ_ASSERT(mConfirmer);
      mConfirmationState = NS_SUCCEEDED(status) ? CONFIRM_OK : CONFIRM_FAILED;
      LOG(("TRRService finishing confirmation test %s %d %X\n",
           mPrivateURI.get(), (int)mConfirmationState, (unsigned int)status));
      mConfirmer = nullptr;

      if (mConfirmationState == CONFIRM_OK) {
        // A fresh confirmation means previous blocked entries might not
        // be valid anymore.
        auto bl = mTRRBLStorage.Lock();
        bl->Clear();
      }
    }
    if (mConfirmationState == CONFIRM_FAILED) {
      // retry failed NS confirmation
      NS_NewTimerWithCallback(getter_AddRefs(mRetryConfirmTimer), this,
                              mRetryConfirmInterval, nsITimer::TYPE_ONE_SHOT);
      if (mRetryConfirmInterval < 64000) {
        // double the interval up to this point
        mRetryConfirmInterval *= 2;
      }
    } else {
      if (mMode != MODE_TRRONLY) {
        // don't accumulate trronly data here since trronly failures are
        // handled above by trying again, so counting the successes here would
        // skew the numbers
        Telemetry::Accumulate(Telemetry::DNS_TRR_NS_VERFIFIED2,
                              TRRService::AutoDetectedKey(),
                              (mConfirmationState == CONFIRM_OK));
      }
      mRetryConfirmInterval = StaticPrefs::network_trr_retry_timeout_ms();
    }
    return LOOKUP_OK;
  }

  // when called without a host record, this is a domain name check response.
  if (NS_SUCCEEDED(status)) {
    LOG(("TRR verified %s to be fine!\n", newRRSet->Hostname().get()));
  } else {
    LOG(("TRR says %s doesn't resolve as NS!\n", newRRSet->Hostname().get()));
    AddToBlocklist(newRRSet->Hostname(), aOriginSuffix, pb, false);
  }
  return LOOKUP_OK;
}

AHostResolver::LookupStatus TRRService::CompleteLookupByType(
    nsHostRecord*, nsresult, mozilla::net::TypeRecordResultType& aResult,
    uint32_t aTtl, bool aPb) {
  return LOOKUP_OK;
}

#undef LOG

}  // namespace net
}  // namespace mozilla
