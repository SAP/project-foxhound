/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef js_loader_LoadedScript_h
#define js_loader_LoadedScript_h

#include "js/AllocPolicy.h"
#include "js/experimental/JSStencil.h"
#include "js/Transcoding.h"

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/Maybe.h"
#include "mozilla/MaybeOneOf.h"
#include "mozilla/MemoryReporting.h"
#include "mozilla/RefPtr.h"
#include "mozilla/Utf8.h"  // mozilla::Utf8Unit
#include "mozilla/Variant.h"
#include "mozilla/Vector.h"

#include "nsCOMPtr.h"
#include "nsCycleCollectionParticipant.h"
#include "nsICacheInfoChannel.h"  // nsICacheInfoChannel
#include "nsIMemoryReporter.h"

#include "jsapi.h"
#include "ScriptKind.h"
#include "ScriptFetchOptions.h"

class nsIURI;

namespace JS::loader {

class ScriptLoadRequest;

using Utf8Unit = mozilla::Utf8Unit;

void HostAddRefTopLevelScript(const Value& aPrivate);
void HostReleaseTopLevelScript(const Value& aPrivate);

class ClassicScript;
class ModuleScript;
class EventScript;
class LoadContextBase;

// A LoadedScript is a place where the Script is stored once it is loaded. It is
// not unique to a load, and can be shared across loads as long as it is
// properly ref-counted by each load instance.
//
// When the load is not performed, the URI represents the resource to be loaded,
// and it is replaced by the absolute resource location once loaded.
//
// As the LoadedScript can be shared, using the SharedSubResourceCache, it is
// exposed to the memory reporter such that sharing might be accounted for
// properly.
class LoadedScript : public nsIMemoryReporter {
 protected:
  LoadedScript(ScriptKind aKind, mozilla::dom::ReferrerPolicy aReferrerPolicy,
               ScriptFetchOptions* aFetchOptions, nsIURI* aURI);

  LoadedScript(const LoadedScript& aOther);

  template <typename T, typename... Args>
  friend RefPtr<T> mozilla::MakeRefPtr(Args&&... aArgs);

  virtual ~LoadedScript();

 public:
  // When the memory should be reported, register it using RegisterMemoryReport,
  // and make sure to call SizeOfIncludingThis in the enclosing container.
  //
  // Each reported script would be listed under
  // `explicit/js/script/loaded-script/<kind>`.
  void RegisterMemoryReport();
  size_t SizeOfIncludingThis(mozilla::MallocSizeOf aMallocSizeOf) const;

 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS;
  NS_DECL_NSIMEMORYREPORTER;
  NS_DECL_CYCLE_COLLECTION_CLASS(LoadedScript)

  bool IsClassicScript() const { return mKind == ScriptKind::eClassic; }
  bool IsModuleScript() const { return mKind == ScriptKind::eModule; }
  bool IsEventScript() const { return mKind == ScriptKind::eEvent; }
  bool IsImportMapScript() const { return mKind == ScriptKind::eImportMap; }

  inline ClassicScript* AsClassicScript();
  inline ModuleScript* AsModuleScript();

  // Used to propagate Fetch Options to child modules
  ScriptFetchOptions* GetFetchOptions() const { return mFetchOptions; }

  mozilla::dom::ReferrerPolicy ReferrerPolicy() const {
    return mReferrerPolicy;
  }

  nsIURI* GetURI() const { return mURI; }
  void SetBaseURL(nsIURI* aBaseURL) { mBaseURL = aBaseURL; }
  nsIURI* BaseURL() const { return mBaseURL; }

  void AssociateWithScript(JSScript* aScript);

 public:
  // ===========================================================================
  // Encoding of the content provided by the network, or refined by the JS
  // engine.
  template <typename... Ts>
  using Variant = mozilla::Variant<Ts...>;

  template <typename... Ts>
  using VariantType = mozilla::VariantType<Ts...>;

  // Type of data this instance holds, which is either provided by the nsChannel
  // or retrieved from the cache.
  enum class DataType : uint8_t {
    // This script haven't yet received the data.
    eUnknown,

    // This script is received as a plain text from the channel.
    // mScriptData holds the text source, and mStencil holds the compiled
    // stencil.
    // mSRIAndSerializedStencil holds the SRI.
    eTextSource,

    // This script is received as a serialized stencil from the channel,
    // mSRIAndSerializedStencil holds the SRI and the serialized stencil, and
    // mStencil holds the decoded stencil.
    eSerializedStencil,

    // This script is cached from the previous load.
    // mStencil holds the cached stencil, and mSRIAndSerializedStencil holds
    // the SRI. mScriptData is unused.
    eCachedStencil,

    // This is a wasm module, which is used when the response mime type essence
    // is application/wasm.
    // mScriptData holds the wasm source as uint8_t from the channel.
    // mStencil and mSRIAndSerializedStencil are unused.
    eWasmBytes,
  };

  // Use a vector backed by the JS allocator for script text so that contents
  // can be transferred in constant time to the JS engine, not copied in linear
  // time.
  template <typename Unit>
  using ScriptTextBuffer = mozilla::Vector<Unit, 0, js::MallocAllocPolicy>;

  using MaybeSourceText =
      mozilla::MaybeOneOf<SourceText<char16_t>, SourceText<Utf8Unit>>;

  // ==== Methods to query the data type ====

  bool IsUnknownDataType() const { return mDataType == DataType::eUnknown; }
  bool IsTextSource() const { return mDataType == DataType::eTextSource; }
  bool IsSerializedStencil() const {
    return mDataType == DataType::eSerializedStencil;
  }
  bool IsCachedStencil() const { return mDataType == DataType::eCachedStencil; }
  bool IsWasmBytes() const { return mDataType == DataType::eWasmBytes; }

  // ==== Methods to convert the data type ====

  void SetUnknownDataType() {
    mDataType = DataType::eUnknown;
    mScriptData.reset();
  }

  void SetTextSource(LoadContextBase* maybeLoadContext) {
    MOZ_ASSERT(IsUnknownDataType());
    mDataType = DataType::eTextSource;
    mScriptData.emplace(VariantType<ScriptTextBuffer<Utf8Unit>>());
  }

  void SetSerializedStencil() {
    MOZ_ASSERT(IsUnknownDataType());
    mDataType = DataType::eSerializedStencil;
  }

  void ConvertToCachedStencil() {
    MOZ_ASSERT(HasStencil());
    SetUnknownDataType();
    mDataType = DataType::eCachedStencil;
  }

  void SetWasmBytes() {
    MOZ_ASSERT(IsUnknownDataType());
    mDataType = DataType::eWasmBytes;
    mScriptData.emplace(VariantType<ScriptTextBuffer<uint8_t>>());
  }

  bool IsUTF16Text() const {
    return mScriptData->is<ScriptTextBuffer<char16_t>>();
  }
  bool IsUTF8Text() const {
    return mScriptData->is<ScriptTextBuffer<Utf8Unit>>();
  }

  // ==== Methods to access the text source ====

  template <typename Unit>
  const ScriptTextBuffer<Unit>& ScriptText() const {
    MOZ_ASSERT(IsTextSource());
    return mScriptData->as<ScriptTextBuffer<Unit>>();
  }
  template <typename Unit>
  ScriptTextBuffer<Unit>& ScriptText() {
    MOZ_ASSERT(IsTextSource());
    return mScriptData->as<ScriptTextBuffer<Unit>>();
  }

  ScriptTextBuffer<uint8_t>& WasmBytes() {
    MOZ_ASSERT(IsWasmBytes());
    return mScriptData->as<ScriptTextBuffer<uint8_t>>();
  }

  size_t ScriptTextLength() const {
    MOZ_ASSERT(IsTextSource());
    return IsUTF16Text() ? ScriptText<char16_t>().length()
                         : ScriptText<Utf8Unit>().length();
  }

  // Get source text.  On success |aMaybeSource| will contain either UTF-8 or
  // UTF-16 source; on failure it will remain in its initial state.
  nsresult GetScriptSource(JSContext* aCx, MaybeSourceText* aMaybeSource,
                           LoadContextBase* aMaybeLoadContext);

  void ClearScriptText() {
    MOZ_ASSERT(IsTextSource());
    return IsUTF16Text() ? ScriptText<char16_t>().clearAndFree()
                         : ScriptText<Utf8Unit>().clearAndFree();
  }

  size_t ReceivedScriptTextLength() const {
    MOZ_ASSERT(IsTextSource());
    return mReceivedScriptTextLength;
  }

  void SetReceivedScriptTextLength(size_t aLength) {
    MOZ_ASSERT(IsTextSource());
    mReceivedScriptTextLength = aLength;
  }


  void SetReceivedScriptTaint(const StringTaint& aTaint) {
    mScriptTextTaint = aTaint;
  }

  const StringTaint& Taint() {
    return mScriptTextTaint;
  }

  // ==== Methods to access the serialized data or the SRI part ====
  // mSRIAndSerializedStencil field is shared between two separate consumers.
  // See mSRIAndSerializedStencil comment for more info.

  // ---- For SRI-only consumers ----

  bool CanHaveSRIOnly() const { return IsTextSource() || IsCachedStencil(); }

  bool HasSRI() {
    MOZ_ASSERT(CanHaveSRIOnly());
    return !mSRIAndSerializedStencil.empty();
  }

  TranscodeBuffer& SRI() {
    MOZ_ASSERT(CanHaveSRIOnly());
    return mSRIAndSerializedStencil;
  }

  void DropSRI() {
    MOZ_ASSERT(CanHaveSRIOnly());
    mSRIAndSerializedStencil.clearAndFree();
  }

  // ---- For SRI and serialized Stencil consumers ---

  bool CanHaveSRIAndSerializedStencil() const { return IsSerializedStencil(); }

  TranscodeBuffer& SRIAndSerializedStencil() {
    MOZ_ASSERT(CanHaveSRIAndSerializedStencil());
    return mSRIAndSerializedStencil;
  }
  TranscodeRange SerializedStencil() const {
    MOZ_ASSERT(CanHaveSRIAndSerializedStencil());
    const auto& buf = mSRIAndSerializedStencil;
    auto offset = mSerializedStencilOffset;
    return TranscodeRange(buf.begin() + offset, buf.length() - offset);
  }

  // ---- Methods shared between both consumers ----

  size_t GetSRILength() const {
    MOZ_ASSERT(CanHaveSRIOnly() || CanHaveSRIAndSerializedStencil());
    return mSerializedStencilOffset;
  }
  void SetSRILength(size_t sriLength) {
    MOZ_ASSERT(CanHaveSRIOnly() || CanHaveSRIAndSerializedStencil());
    mSerializedStencilOffset = AlignTranscodingBytecodeOffset(sriLength);
  }

  bool HasNoSRIOrSRIAndSerializedStencil() const {
    MOZ_ASSERT(CanHaveSRIOnly() || CanHaveSRIAndSerializedStencil());
    return mSRIAndSerializedStencil.empty();
  }

  void DropSRIOrSRIAndSerializedStencil() {
    MOZ_ASSERT(CanHaveSRIOnly() || CanHaveSRIAndSerializedStencil());
    mSRIAndSerializedStencil.clearAndFree();
  }

  // ==== Methods to access the stencil ====

  bool HasStencil() const { return mStencil; }

  Stencil* GetStencil() const {
    MOZ_ASSERT(!IsUnknownDataType());
    MOZ_ASSERT(HasStencil());
    return mStencil;
  }

  void SetStencil(Stencil* aStencil) {
    MOZ_ASSERT(aStencil);
    MOZ_ASSERT(!HasStencil());
    mStencil = aStencil;
  }

  void ClearStencil() { mStencil = nullptr; }

  // ==== Methods to access the disk cache reference ====

  // Check the reference to the cache info channel, which is used by the disk
  // cache.
  bool HasDiskCacheReference() const { return !!mCacheEntry; }

  // Drop the reference to the cache info channel.
  void DropDiskCacheReference() { mCacheEntry = nullptr; }

  void DropDiskCacheReferenceAndSRI() {
    DropDiskCacheReference();
    if (IsTextSource()) {
      DropSRI();
    }
  }

  // ==== Other methods ====

  void SetTookLongInPreviousRuns() { mTookLongInPreviousRuns = true; }
  bool TookLongInPreviousRuns() const { return mTookLongInPreviousRuns; }

  /*
   * Set the mBaseURL, based on aChannel.
   * aOriginalURI is the result of aChannel->GetOriginalURI.
   */
  void SetBaseURLFromChannelAndOriginalURI(nsIChannel* aChannel,
                                           nsIURI* aOriginalURI);

  bool IsDirty() const { return mIsDirty; }
  void SetDirty() {
    MOZ_ASSERT(HasCacheEntryId());
    mIsDirty = true;
  }
  void UnsetDirty() {
    MOZ_ASSERT(HasCacheEntryId());
    mIsDirty = false;
  }

  bool HasCacheEntryId() const { return mCacheEntryId != InvalidCacheEntryId; }
  uint64_t CacheEntryId() const {
    MOZ_ASSERT(HasCacheEntryId());
    return mCacheEntryId;
  }
  void SetCacheEntryId(uint64_t aId) {
    mCacheEntryId = aId;

    // mCacheEntryId is 48bits.  Verify no overflow happened.
    MOZ_ASSERT(mCacheEntryId == aId);
  }

  void AddFetchCount() {
    if (mFetchCount < UINT8_MAX) {
      mFetchCount++;
    }
  }

 public:
  // Fields.

  // Determine whether the mScriptData or mSRIAndSerializedStencil is used.
  // See DataType description for more info.
  DataType mDataType;

  // The consumer-defined number of times that this loaded script is used.
  //
  // In DOM ScriptLoader, this is used for counting the number of times that
  // the in-memory-cached script is used, clamped at UINT8_MAX.
  uint8_t mFetchCount = 0;

 private:
  const ScriptKind mKind;

 protected:
  // The referrer policy used for the initial fetch and for fetching any
  // imported modules
  mozilla::dom::ReferrerPolicy mReferrerPolicy;

 public:
  // Offset of the serialized Stencil in mSRIAndSerializedStencil.
  uint32_t mSerializedStencilOffset;

 private:
  static constexpr uint64_t InvalidCacheEntryId = 0;

  // The cache entry ID of this script.
  //
  // 0 if the response doesn't have the corresponding cache entry,
  // or any other failure happened.
  //
  // This value comes from mozilla::net::CacheEntry::mCacheEntryId,
  // which comes from mozilla::net::CacheEntry::GetNextId.
  // It generates sequential IDs from 1 (thus 0 is treated as invalid value),
  // and the ID is valid within single browser session.
  //
  // In order to pack this field with mIsDirty below, we use shorter bits than
  // the original mozilla::net::CacheEntry::mCacheEntryId type (uint64_t).
  //
  // As long as the per-session sequential ID is the sole source of this value,
  // 48 bits should be sufficient.  1000 new IDs per second for 365 days
  // becomes 0x7_57b1_2c00, which is 35 bits.
  uint64_t mCacheEntryId : 48;

  // Set to true in the following situation:
  //   * this is cached in SharedScriptCache
  //   * A behavior around the network request is modified, and
  //     the cache needs validation on the necko side
  //
  // NOTE: In order to pack this with the mCacheEntryId above on windows,
  //       this must be uint64_t.
  uint64_t mIsDirty : 1;

  // Set to true if executing the top-level script takes long.
  // This can be used for scheduling the script execution in subsequent loads.
  // The threshold of "takes long" is user-defined.
  // See dom::ScriptLoader::EvaluateScript for the example case
  //
  // TODO: Move this into JS::Stencil, and save to the disk cache (bug 2005128)
  uint64_t mTookLongInPreviousRuns : 1;

  RefPtr<ScriptFetchOptions> mFetchOptions;
  nsCOMPtr<nsIURI> mURI;

  // The base URL used for resolving relative module imports.
  nsCOMPtr<nsIURI> mBaseURL;

 public:
  // Holds script source data for non-inline scripts, or raw bytes for wasm
  // modules.
  mozilla::Maybe<Variant<ScriptTextBuffer<char16_t>, ScriptTextBuffer<Utf8Unit>,
                         ScriptTextBuffer<uint8_t>>>
      mScriptData;

  // The length of script source text, set when reading completes. This is used
  // since mScriptData is cleared when the source is passed to the JS engine.
  size_t mReceivedScriptTextLength;


  // The taint corresponding to the script data
  SafeStringTaint mScriptTextTaint;

  // Holds either of the following for non-inline scripts:
  //   * The SRI serialized hash and the paddings, which is calculated when
  //     receiving the source text
  //   * The SRI, padding, and the serialized Stencil, which is received
  //     from necko. The data is laid out according to ScriptBytecodeDataLayout
  //     or, if compression is enabled, ScriptBytecodeCompressedDataLayout.
  TranscodeBuffer mSRIAndSerializedStencil;

  // Holds the stencil for the script.  This field is used in all DataType.
  RefPtr<Stencil> mStencil;

  // The cache info channel used when saving the serialized Stencil to the
  // necko cache.
  //
  // This field is populated if the cache is enabled and this is either
  // IsTextSource() or IsCachedStencil(), and it's cleared after saving to the
  // necko cache, and thus, this field is used only once.
  nsCOMPtr<nsICacheEntryWriteHandle> mCacheEntry;
};

// Provide accessors for any classes `Derived` which is providing the
// `getLoadedScript` function as interface. The accessors are meant to be
// inherited by the `Derived` class.
template <typename Derived>
class LoadedScriptDelegate {
 private:
  // Use a static_cast<Derived> instead of declaring virtual functions. This is
  // meant to avoid relying on virtual table, and improve inlining for non-final
  // classes.
  const LoadedScript* GetLoadedScript() const {
    return static_cast<const Derived*>(this)->getLoadedScript();
  }
  LoadedScript* GetLoadedScript() {
    return static_cast<Derived*>(this)->getLoadedScript();
  }

 public:
  template <typename Unit>
  using ScriptTextBuffer = LoadedScript::ScriptTextBuffer<Unit>;
  using MaybeSourceText = LoadedScript::MaybeSourceText;

  mozilla::dom::ReferrerPolicy ReferrerPolicy() const {
    return GetLoadedScript()->ReferrerPolicy();
  }
  void UpdateReferrerPolicy(mozilla::dom::ReferrerPolicy aReferrerPolicy) {
    GetLoadedScript()->AsModuleScript()->UpdateReferrerPolicy(aReferrerPolicy);
  }

  ScriptFetchOptions* FetchOptions() const {
    return GetLoadedScript()->GetFetchOptions();
  }

  nsIURI* URI() const { return GetLoadedScript()->GetURI(); }

  nsIURI* BaseURL() const { return GetLoadedScript()->BaseURL(); }
  void SetBaseURL(nsIURI* aBaseURL) { GetLoadedScript()->SetBaseURL(aBaseURL); }
  void SetBaseURLFromChannelAndOriginalURI(nsIChannel* aChannel,
                                           nsIURI* aOriginalURI) {
    GetLoadedScript()->SetBaseURLFromChannelAndOriginalURI(aChannel,
                                                           aOriginalURI);
  }

  bool IsUnknownDataType() const {
    return GetLoadedScript()->IsUnknownDataType();
  }
  bool IsTextSource() const { return GetLoadedScript()->IsTextSource(); }
  bool IsSerializedStencil() const {
    return GetLoadedScript()->IsSerializedStencil();
  }
  bool IsCachedStencil() const { return GetLoadedScript()->IsCachedStencil(); }
  bool IsWasmBytes() const { return GetLoadedScript()->IsWasmBytes(); }

  void SetUnknownDataType() { GetLoadedScript()->SetUnknownDataType(); }

  void SetTextSource(LoadContextBase* maybeLoadContext) {
    GetLoadedScript()->SetTextSource(maybeLoadContext);
  }

  void SetWasmBytes() { GetLoadedScript()->SetWasmBytes(); }

  void SetSerializedStencil() { GetLoadedScript()->SetSerializedStencil(); }

  bool IsUTF16Text() const { return GetLoadedScript()->IsUTF16Text(); }
  bool IsUTF8Text() const { return GetLoadedScript()->IsUTF8Text(); }

  template <typename Unit>
  const ScriptTextBuffer<Unit>& ScriptText() const {
    const LoadedScript* loader = GetLoadedScript();
    return loader->ScriptText<Unit>();
  }
  template <typename Unit>
  ScriptTextBuffer<Unit>& ScriptText() {
    LoadedScript* loader = GetLoadedScript();
    return loader->ScriptText<Unit>();
  }

  ScriptTextBuffer<uint8_t>& WasmBytes() {
    LoadedScript* loader = GetLoadedScript();
    return loader->WasmBytes();
  }

  size_t ScriptTextLength() const {
    return GetLoadedScript()->ScriptTextLength();
  }

  size_t ReceivedScriptTextLength() const {
    return GetLoadedScript()->ReceivedScriptTextLength();
  }

  void SetReceivedScriptTextLength(size_t aLength) {
    GetLoadedScript()->SetReceivedScriptTextLength(aLength);
  }

  const StringTaint& Taint() {
    return GetLoadedScript()->Taint();
  }

  void SetReceivedScriptTaint(const StringTaint& aTaint) {
    GetLoadedScript()->SetReceivedScriptTaint(aTaint);
  }

  // Get source text.  On success |aMaybeSource| will contain either UTF-8 or
  // UTF-16 source; on failure it will remain in its initial state.
  nsresult GetScriptSource(JSContext* aCx, MaybeSourceText* aMaybeSource,
                           LoadContextBase* aLoadContext) {
    return GetLoadedScript()->GetScriptSource(aCx, aMaybeSource, aLoadContext);
  }

  void ClearScriptText() { GetLoadedScript()->ClearScriptText(); }

  bool HasNoSRIOrSRIAndSerializedStencil() const {
    return GetLoadedScript()->HasNoSRIOrSRIAndSerializedStencil();
  }

  TranscodeBuffer& SRI() { return GetLoadedScript()->SRI(); }
  TranscodeBuffer& SRIAndSerializedStencil() {
    return GetLoadedScript()->SRIAndSerializedStencil();
  }
  TranscodeRange SerializedStencil() const {
    return GetLoadedScript()->SerializedStencil();
  }

  size_t GetSRILength() const { return GetLoadedScript()->GetSRILength(); }
  void SetSRILength(size_t sriLength) {
    GetLoadedScript()->SetSRILength(sriLength);
  }

  void DropSRIOrSRIAndSerializedStencil() {
    GetLoadedScript()->DropSRIOrSRIAndSerializedStencil();
  }

  bool HasStencil() const { return GetLoadedScript()->HasStencil(); }
  Stencil* GetStencil() const { return GetLoadedScript()->GetStencil(); }
  void SetStencil(Stencil* aStencil) {
    GetLoadedScript()->SetStencil(aStencil);
  }
  void ClearStencil() { GetLoadedScript()->ClearStencil(); }

  void SetTookLongInPreviousRuns() {
    GetLoadedScript()->SetTookLongInPreviousRuns();
  }
  bool TookLongInPreviousRuns() const {
    return GetLoadedScript()->TookLongInPreviousRuns();
  }
};

class ClassicScript final : public LoadedScript {
  ~ClassicScript() = default;

 private:
  // Scripts can be created only by ScriptLoadRequest::NoCacheEntryFound.
  ClassicScript(mozilla::dom::ReferrerPolicy aReferrerPolicy,
                ScriptFetchOptions* aFetchOptions, nsIURI* aURI);

  friend class ScriptLoadRequest;
};

class EventScript final : public LoadedScript {
  ~EventScript() = default;

 public:
  EventScript(mozilla::dom::ReferrerPolicy aReferrerPolicy,
              ScriptFetchOptions* aFetchOptions, nsIURI* aURI);
};

class ImportMapScript final : public LoadedScript {
  ~ImportMapScript() = default;

 public:
  ImportMapScript(mozilla::dom::ReferrerPolicy aReferrerPolicy,
                  ScriptFetchOptions* aFetchOptions, nsIURI* aURI);
};

// A single module script. May be used to satisfy multiple load requests.

class ModuleScript final : public LoadedScript {
  // Those fields are used only after instantiated, and they're reset to
  // null and false when stored into the cache as LoadedScript instance.
  Heap<JSObject*> mModuleRecord;
  Heap<Value> mParseError;
  Heap<Value> mErrorToRethrow;
  bool mForPreload = false;
  bool mHadImportMap = false;

  ~ModuleScript();

 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS_INHERITED(ModuleScript,
                                                         LoadedScript)

 private:
  // Scripts can be created only by ScriptLoadRequest::NoCacheEntryFound.
  ModuleScript(mozilla::dom::ReferrerPolicy aReferrerPolicy,
               ScriptFetchOptions* aFetchOptions, nsIURI* aURI);

  explicit ModuleScript(const LoadedScript& other);

  template <typename T, typename... Args>
  friend RefPtr<T> mozilla::MakeRefPtr(Args&&... aArgs);

  friend class ScriptLoadRequest;

 public:
  // Convert between cacheable LoadedScript instance, which is used by
  // mozilla::dom::SharedScriptCache.
  static already_AddRefed<ModuleScript> FromCache(const LoadedScript& aScript);
  already_AddRefed<LoadedScript> ToCache();

  void SetModuleRecord(Handle<JSObject*> aModuleRecord);
  void SetParseError(const Value& aError);
  void SetErrorToRethrow(const Value& aError);
  void SetForPreload(bool aValue);
  void SetHadImportMap(bool aValue);

  JSObject* ModuleRecord() const { return mModuleRecord; }

  Value ParseError() const { return mParseError; }
  Value ErrorToRethrow() const { return mErrorToRethrow; }
  bool HasParseError() const { return !mParseError.isUndefined(); }
  bool HasErrorToRethrow() const { return !mErrorToRethrow.isUndefined(); }
  bool ForPreload() const { return mForPreload; }
  bool HadImportMap() const { return mHadImportMap; }

  void Shutdown();

  void UnlinkModuleRecord();

  friend void CheckModuleScriptPrivate(LoadedScript*, const Value&);

  void UpdateReferrerPolicy(mozilla::dom::ReferrerPolicy aReferrerPolicy) {
    mReferrerPolicy = aReferrerPolicy;
  }
};

ClassicScript* LoadedScript::AsClassicScript() {
  MOZ_ASSERT(!IsModuleScript());
  return static_cast<ClassicScript*>(this);
}

ModuleScript* LoadedScript::AsModuleScript() {
  MOZ_ASSERT(IsModuleScript());
  return static_cast<ModuleScript*>(this);
}

}  // namespace JS::loader

#endif  // js_loader_LoadedScript_h
