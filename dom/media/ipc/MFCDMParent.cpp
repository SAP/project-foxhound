/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MFCDMParent.h"

#include <mfmediaengine.h>
#include <wtypes.h>
#define INITGUID          // Enable DEFINE_PROPERTYKEY()
#include <propkeydef.h>   // For DEFINE_PROPERTYKEY() definition
#include <propvarutil.h>  // For InitPropVariantFrom*()

#include "mozilla/dom/MediaKeysBinding.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/KeySystemNames.h"
#include "mozilla/ipc/UtilityAudioDecoderChild.h"
#include "mozilla/ipc/UtilityProcessManager.h"
#include "mozilla/ipc/UtilityProcessParent.h"
#include "mozilla/EMEUtils.h"
#include "mozilla/StaticMutex.h"
#include "mozilla/StaticPrefs_media.h"
#include "mozilla/KeySystemConfig.h"
#include "mozilla/WindowsVersion.h"
#include "MFCDMProxy.h"
#include "MFMediaEngineUtils.h"
#include "nsTHashMap.h"
#include "RemoteDecodeUtils.h"       // For GetCurrentSandboxingKind()
#include "SpecialSystemDirectory.h"  // For temp dir
#include "WMFUtils.h"

#ifdef MOZ_WMF_CDM_LPAC_SANDBOX
#  include "sandboxBroker.h"
#endif

using Microsoft::WRL::ComPtr;
using Microsoft::WRL::MakeAndInitialize;

namespace mozilla {

// See
// https://source.chromium.org/chromium/chromium/src/+/main:media/cdm/win/media_foundation_cdm_util.cc;l=26-40;drc=503535015a7b373cc6185c69c991e01fda5da571
#ifndef EME_CONTENTDECRYPTIONMODULE_ORIGIN_ID
DEFINE_PROPERTYKEY(EME_CONTENTDECRYPTIONMODULE_ORIGIN_ID, 0x1218a3e2, 0xcfb0,
                   0x4c98, 0x90, 0xe5, 0x5f, 0x58, 0x18, 0xd4, 0xb6, 0x7e,
                   PID_FIRST_USABLE);
#endif

#define MFCDM_PARENT_LOG(msg, ...)                                     \
  EME_LOG("MFCDMParent[%p, Id=%" PRIu64 "]@%s: " msg, this, this->mId, \
          __func__, ##__VA_ARGS__)
#define MFCDM_PARENT_SLOG(msg, ...) \
  EME_LOG("MFCDMParent@%s: " msg, __func__, ##__VA_ARGS__)

#define MFCDM_RETURN_IF_FAILED(x)                       \
  do {                                                  \
    HRESULT rv = x;                                     \
    if (MOZ_UNLIKELY(FAILED(rv))) {                     \
      MFCDM_PARENT_SLOG("(" #x ") failed, rv=%lx", rv); \
      return rv;                                        \
    }                                                   \
  } while (false)

#define MFCDM_RETURN_BOOL_IF_FAILED(x)                  \
  do {                                                  \
    HRESULT rv = x;                                     \
    if (MOZ_UNLIKELY(FAILED(rv))) {                     \
      MFCDM_PARENT_SLOG("(" #x ") failed, rv=%lx", rv); \
      return false;                                     \
    }                                                   \
  } while (false)

#define MFCDM_REJECT_IF(pred, rv)                                      \
  do {                                                                 \
    if (MOZ_UNLIKELY(pred)) {                                          \
      MFCDM_PARENT_LOG("reject for [" #pred "], rv=%x", uint32_t(rv)); \
      aResolver(rv);                                                   \
      return IPC_OK();                                                 \
    }                                                                  \
  } while (false)

#define MFCDM_REJECT_IF_FAILED(op, rv)                                       \
  do {                                                                       \
    HRESULT hr = op;                                                         \
    if (MOZ_UNLIKELY(FAILED(hr))) {                                          \
      MFCDM_PARENT_LOG("(" #op ") failed(hr=%lx), rv=%x", hr, uint32_t(rv)); \
      aResolver(rv);                                                         \
      return IPC_OK();                                                       \
    }                                                                        \
  } while (false)

StaticMutex sFactoryMutex;
static nsTHashMap<nsStringHashKey, ComPtr<IMFContentDecryptionModuleFactory>>
    sFactoryMap;
static CopyableTArray<MFCDMCapabilitiesIPDL> sCapabilities;

// RAIIized PROPVARIANT. See
// third_party/libwebrtc/modules/audio_device/win/core_audio_utility_win.h
class AutoPropVar {
 public:
  AutoPropVar() { PropVariantInit(&mVar); }

  ~AutoPropVar() { Reset(); }

  AutoPropVar(const AutoPropVar&) = delete;
  AutoPropVar& operator=(const AutoPropVar&) = delete;
  bool operator==(const AutoPropVar&) const = delete;
  bool operator!=(const AutoPropVar&) const = delete;

  // Returns a pointer to the underlying PROPVARIANT for use as an out param
  // in a function call.
  PROPVARIANT* Receive() {
    MOZ_ASSERT(mVar.vt == VT_EMPTY);
    return &mVar;
  }

  // Clears the instance to prepare it for re-use (e.g., via Receive).
  void Reset() {
    if (mVar.vt != VT_EMPTY) {
      HRESULT hr = PropVariantClear(&mVar);
      MOZ_ASSERT(SUCCEEDED(hr));
      Unused << hr;
    }
  }

  const PROPVARIANT& get() const { return mVar; }
  const PROPVARIANT* ptr() const { return &mVar; }

 private:
  PROPVARIANT mVar;
};

static MF_MEDIAKEYS_REQUIREMENT ToMFRequirement(
    const KeySystemConfig::Requirement aRequirement) {
  switch (aRequirement) {
    case KeySystemConfig::Requirement::NotAllowed:
      return MF_MEDIAKEYS_REQUIREMENT_NOT_ALLOWED;
    case KeySystemConfig::Requirement::Optional:
      return MF_MEDIAKEYS_REQUIREMENT_OPTIONAL;
    case KeySystemConfig::Requirement::Required:
      return MF_MEDIAKEYS_REQUIREMENT_REQUIRED;
  }
};

static inline LPCWSTR InitDataTypeToString(const nsAString& aInitDataType) {
  // The strings are defined in https://www.w3.org/TR/eme-initdata-registry/
  if (aInitDataType.EqualsLiteral("webm")) {
    return L"webm";
  } else if (aInitDataType.EqualsLiteral("cenc")) {
    return L"cenc";
  } else if (aInitDataType.EqualsLiteral("keyids")) {
    return L"keyids";
  } else {
    return L"unknown";
  }
}

// The HDCP value follows the feature value in
// https://docs.microsoft.com/en-us/uwp/api/windows.media.protection.protectioncapabilities.istypesupported?view=winrt-19041
// - 1 (on without HDCP 2.2 Type 1 restriction)
// - 2 (on with HDCP 2.2 Type 1 restriction)
static nsString GetHdcpPolicy(const dom::HDCPVersion& aMinHdcpVersion) {
  if (aMinHdcpVersion == dom::HDCPVersion::_2_2 ||
      aMinHdcpVersion == dom::HDCPVersion::_2_3) {
    return nsString(u"hdcp=2");
  }
  return nsString(u"hdcp=1");
}

static void BuildCapabilitiesArray(
    const nsTArray<MFCDMMediaCapability>& aCapabilities,
    AutoPropVar& capabilitiesPropOut) {
  PROPVARIANT* capabilitiesArray = (PROPVARIANT*)CoTaskMemAlloc(
      sizeof(PROPVARIANT) * aCapabilities.Length());
  for (size_t idx = 0; idx < aCapabilities.Length(); idx++) {
    ComPtr<IPropertyStore> capabilitiesProperty;
    RETURN_VOID_IF_FAILED(
        PSCreateMemoryPropertyStore(IID_PPV_ARGS(&capabilitiesProperty)));

    AutoPropVar contentType;
    auto* var = contentType.Receive();
    var->vt = VT_BSTR;
    var->bstrVal = SysAllocString(aCapabilities[idx].contentType().get());
    RETURN_VOID_IF_FAILED(
        capabilitiesProperty->SetValue(MF_EME_CONTENTTYPE, contentType.get()));

    AutoPropVar robustness;
    var = robustness.Receive();
    var->vt = VT_BSTR;
    var->bstrVal = SysAllocString(aCapabilities[idx].robustness().get());
    RETURN_VOID_IF_FAILED(
        capabilitiesProperty->SetValue(MF_EME_ROBUSTNESS, robustness.get()));

    capabilitiesArray[idx].vt = VT_UNKNOWN;
    capabilitiesArray[idx].punkVal = capabilitiesProperty.Detach();
  }
  auto* var = capabilitiesPropOut.Receive();
  var->vt = VT_VARIANT | VT_VECTOR;
  var->capropvar.cElems = aCapabilities.Length();
  var->capropvar.pElems = capabilitiesArray;
}

static HRESULT BuildCDMAccessConfig(const MFCDMInitParamsIPDL& aParams,
                                    ComPtr<IPropertyStore>& aConfig) {
  ComPtr<IPropertyStore> mksc;  // EME MediaKeySystemConfiguration
  MFCDM_RETURN_IF_FAILED(PSCreateMemoryPropertyStore(IID_PPV_ARGS(&mksc)));

  // Init type. If we don't set `MF_EME_INITDATATYPES` then we won't be able
  // to create CDM module on Windows 10, which is not documented officially.
  BSTR* initDataTypeArray =
      (BSTR*)CoTaskMemAlloc(sizeof(BSTR) * aParams.initDataTypes().Length());
  for (size_t i = 0; i < aParams.initDataTypes().Length(); i++) {
    initDataTypeArray[i] =
        SysAllocString(InitDataTypeToString(aParams.initDataTypes()[i]));
  }
  AutoPropVar initDataTypes;
  PROPVARIANT* var = initDataTypes.Receive();
  var->vt = VT_VECTOR | VT_BSTR;
  var->cabstr.cElems = static_cast<ULONG>(aParams.initDataTypes().Length());
  var->cabstr.pElems = initDataTypeArray;
  MFCDM_RETURN_IF_FAILED(
      mksc->SetValue(MF_EME_INITDATATYPES, initDataTypes.get()));

  // Audio capabilities
  AutoPropVar audioCapabilities;
  BuildCapabilitiesArray(aParams.audioCapabilities(), audioCapabilities);
  MFCDM_RETURN_IF_FAILED(
      mksc->SetValue(MF_EME_AUDIOCAPABILITIES, audioCapabilities.get()));

  // Video capabilities
  AutoPropVar videoCapabilities;
  BuildCapabilitiesArray(aParams.videoCapabilities(), videoCapabilities);
  MFCDM_RETURN_IF_FAILED(
      mksc->SetValue(MF_EME_VIDEOCAPABILITIES, videoCapabilities.get()));

  // Persist state
  AutoPropVar persistState;
  InitPropVariantFromUInt32(ToMFRequirement(aParams.persistentState()),
                            persistState.Receive());
  MFCDM_RETURN_IF_FAILED(
      mksc->SetValue(MF_EME_PERSISTEDSTATE, persistState.get()));

  // Distintive Id
  AutoPropVar distinctiveID;
  InitPropVariantFromUInt32(ToMFRequirement(aParams.distinctiveID()),
                            distinctiveID.Receive());
  MFCDM_RETURN_IF_FAILED(
      mksc->SetValue(MF_EME_DISTINCTIVEID, distinctiveID.get()));

  aConfig.Swap(mksc);
  return S_OK;
}

static HRESULT BuildCDMProperties(const nsString& aOrigin,
                                  ComPtr<IPropertyStore>& aProps) {
  MOZ_ASSERT(!aOrigin.IsEmpty());

  ComPtr<IPropertyStore> props;
  MFCDM_RETURN_IF_FAILED(PSCreateMemoryPropertyStore(IID_PPV_ARGS(&props)));

  AutoPropVar origin;
  MFCDM_RETURN_IF_FAILED(
      InitPropVariantFromString(aOrigin.get(), origin.Receive()));
  MFCDM_RETURN_IF_FAILED(
      props->SetValue(EME_CONTENTDECRYPTIONMODULE_ORIGIN_ID, origin.get()));

  // TODO: support client token?

  // TODO: CDM store path per profile?
  nsCOMPtr<nsIFile> dir;
  if (NS_FAILED(GetSpecialSystemDirectory(OS_TemporaryDirectory,
                                          getter_AddRefs(dir)))) {
    return E_ACCESSDENIED;
  }
  if (NS_FAILED(dir->AppendNative(nsDependentCString("mfcdm")))) {
    return E_ACCESSDENIED;
  }
  nsresult rv = dir->Create(nsIFile::DIRECTORY_TYPE, 0700);
  if (rv != NS_ERROR_FILE_ALREADY_EXISTS && NS_FAILED(rv)) {
    return E_ACCESSDENIED;
  }
  nsAutoString cdmStorePath;
  if (NS_FAILED(dir->GetPath(cdmStorePath))) {
    return E_ACCESSDENIED;
  }

  AutoPropVar path;
  MFCDM_RETURN_IF_FAILED(
      InitPropVariantFromString(cdmStorePath.get(), path.Receive()));
  MFCDM_RETURN_IF_FAILED(
      props->SetValue(MF_CONTENTDECRYPTIONMODULE_STOREPATH, path.get()));

  aProps.Swap(props);
  return S_OK;
}

static HRESULT CreateContentDecryptionModule(
    ComPtr<IMFContentDecryptionModuleFactory> aFactory,
    const nsString& aKeySystem, const MFCDMInitParamsIPDL& aParams,
    ComPtr<IMFContentDecryptionModule>& aCDMOut) {
  // Get access object to CDM.
  ComPtr<IPropertyStore> accessConfig;
  RETURN_IF_FAILED(BuildCDMAccessConfig(aParams, accessConfig));

  AutoTArray<IPropertyStore*, 1> configs = {accessConfig.Get()};
  ComPtr<IMFContentDecryptionModuleAccess> cdmAccess;
  RETURN_IF_FAILED(aFactory->CreateContentDecryptionModuleAccess(
      aKeySystem.get(), configs.Elements(), configs.Length(), &cdmAccess));

  // Get CDM.
  ComPtr<IPropertyStore> cdmProps;
  RETURN_IF_FAILED(BuildCDMProperties(aParams.origin(), cdmProps));
  ComPtr<IMFContentDecryptionModule> cdm;
  RETURN_IF_FAILED(
      cdmAccess->CreateContentDecryptionModule(cdmProps.Get(), &cdm));
  aCDMOut.Swap(cdm);
  return S_OK;
}

// Wrapper function for IMFContentDecryptionModuleFactory::IsTypeSupported.
static bool IsTypeSupported(
    const ComPtr<IMFContentDecryptionModuleFactory>& aFactory,
    const nsString& aKeySystem, const nsString* aContentType = nullptr) {
  nsString keySystem;
  // Widevine's factory only takes original key system string.
  if (IsWidevineExperimentKeySystemAndSupported(aKeySystem)) {
    keySystem.AppendLiteral(u"com.widevine.alpha");
  }
  // kPlayReadyHardwareClearLeadKeySystemName is our custom key system name,
  // we should use kPlayReadyKeySystemHardware which is the real key system
  // name.
  else if (aKeySystem.EqualsLiteral(kPlayReadyHardwareClearLeadKeySystemName)) {
    keySystem.AppendLiteral(kPlayReadyKeySystemHardware);
  } else {
    keySystem = aKeySystem;
  }
  return aFactory->IsTypeSupported(
      keySystem.get(), aContentType ? aContentType->get() : nullptr);
}

static nsString MapKeySystem(const nsString& aKeySystem) {
  // When website requests HW secure robustness for video by original Widevine
  // key system name, it would be mapped to this key system which is for HWDRM.
  if (IsWidevineKeySystem(aKeySystem)) {
    return nsString(u"com.widevine.alpha.experiment");
  }
  // kPlayReadyHardwareClearLeadKeySystemName is our custom key system name,
  // we should use kPlayReadyKeySystemHardware which is the real key system
  // name.
  if (aKeySystem.EqualsLiteral(kPlayReadyHardwareClearLeadKeySystemName)) {
    return NS_ConvertUTF8toUTF16(kPlayReadyKeySystemHardware);
  }
  return aKeySystem;
}

/* static */
void MFCDMParent::SetWidevineL1Path(const char* aPath) {
  nsAutoCString path(aPath);
  path.AppendLiteral("\\Google.Widevine.CDM.dll");
  sWidevineL1Path = CreateBSTRFromConstChar(path.get());
  MFCDM_PARENT_SLOG("Set Widevine L1 dll path=%ls\n", sWidevineL1Path);
}

void MFCDMParent::Register() {
  MOZ_ASSERT(!sRegisteredCDMs.Contains(this->mId));
  sRegisteredCDMs.InsertOrUpdate(this->mId, this);
  MFCDM_PARENT_LOG("Registered!");
}

void MFCDMParent::Unregister() {
  MOZ_ASSERT(sRegisteredCDMs.Contains(this->mId));
  sRegisteredCDMs.Remove(this->mId);
  MFCDM_PARENT_LOG("Unregistered!");
}

MFCDMParent::MFCDMParent(const nsAString& aKeySystem,
                         RemoteDecoderManagerParent* aManager,
                         nsISerialEventTarget* aManagerThread)
    : mKeySystem(aKeySystem),
      mManager(aManager),
      mManagerThread(aManagerThread),
      mId(sNextId++),
      mKeyMessageEvents(aManagerThread),
      mKeyChangeEvents(aManagerThread),
      mExpirationEvents(aManagerThread) {
  MOZ_ASSERT(IsPlayReadyKeySystemAndSupported(aKeySystem) ||
             IsWidevineExperimentKeySystemAndSupported(aKeySystem) ||
             IsWidevineKeySystem(mKeySystem) ||
             IsWMFClearKeySystemAndSupported(aKeySystem));
  MOZ_ASSERT(aManager);
  MOZ_ASSERT(aManagerThread);
  MOZ_ASSERT(XRE_IsUtilityProcess());
  MOZ_ASSERT(GetCurrentSandboxingKind() ==
             ipc::SandboxingKind::MF_MEDIA_ENGINE_CDM);
  MFCDM_PARENT_LOG("MFCDMParent created");
  mIPDLSelfRef = this;
  Register();

  mKeyMessageListener = mKeyMessageEvents.Connect(
      mManagerThread, this, &MFCDMParent::SendOnSessionKeyMessage);
  mKeyChangeListener = mKeyChangeEvents.Connect(
      mManagerThread, this, &MFCDMParent::SendOnSessionKeyStatusesChanged);
  mExpirationListener = mExpirationEvents.Connect(
      mManagerThread, this, &MFCDMParent::SendOnSessionKeyExpiration);

  RETURN_VOID_IF_FAILED(GetOrCreateFactory(mKeySystem, mFactory));
}

void MFCDMParent::ShutdownCDM() {
  AssertOnManagerThread();
  if (!mCDM) {
    return;
  }
  auto rv = mCDM->SetPMPHostApp(nullptr);
  if (FAILED(rv)) {
    MFCDM_PARENT_LOG("Failed to clear PMP Host App, rv=%lx", rv);
  }
  SHUTDOWN_IF_POSSIBLE(mCDM);
  mCDM = nullptr;
  MFCDM_PARENT_LOG("Shutdown CDM completed");
}

void MFCDMParent::Destroy() {
  AssertOnManagerThread();
  mKeyMessageEvents.DisconnectAll();
  mKeyChangeEvents.DisconnectAll();
  mExpirationEvents.DisconnectAll();
  mKeyMessageListener.DisconnectIfExists();
  mKeyChangeListener.DisconnectIfExists();
  mExpirationListener.DisconnectIfExists();
  if (mPMPHostWrapper) {
    mPMPHostWrapper->Shutdown();
    mPMPHostWrapper = nullptr;
  }
  ShutdownCDM();
  mFactory = nullptr;
  for (auto& iter : mSessions) {
    iter.second->Close();
  }
  mSessions.clear();
  mIPDLSelfRef = nullptr;
}

MFCDMParent::~MFCDMParent() {
  MFCDM_PARENT_LOG("MFCDMParent detroyed");
  Unregister();
}

/* static */
LPCWSTR MFCDMParent::GetCDMLibraryName(const nsString& aKeySystem) {
  if (IsWMFClearKeySystemAndSupported(aKeySystem) ||
      StaticPrefs::media_eme_wmf_use_mock_cdm_for_external_cdms()) {
    return L"wmfclearkey.dll";
  }
  // PlayReady is a built-in CDM on Windows, no need to load external library.
  if (IsPlayReadyKeySystemAndSupported(aKeySystem)) {
    return L"";
  }
  if (IsWidevineExperimentKeySystemAndSupported(aKeySystem) ||
      IsWidevineKeySystem(aKeySystem)) {
    return sWidevineL1Path ? sWidevineL1Path : L"L1-not-found";
  }
  return L"Unknown";
}

/* static */
void MFCDMParent::Shutdown() {
  sFactoryMap.Clear();
  sCapabilities.Clear();
}

/* static */
HRESULT MFCDMParent::GetOrCreateFactory(
    const nsString& aKeySystem,
    ComPtr<IMFContentDecryptionModuleFactory>& aFactoryOut) {
  StaticMutexAutoLock lock(sFactoryMutex);
  auto rv = sFactoryMap.MaybeGet(aKeySystem);
  if (!rv) {
    MFCDM_PARENT_SLOG("No factory %s, creating...",
                      NS_ConvertUTF16toUTF8(aKeySystem).get());
    ComPtr<IMFContentDecryptionModuleFactory> factory;
    MFCDM_RETURN_IF_FAILED(LoadFactory(aKeySystem, factory));
    sFactoryMap.InsertOrUpdate(aKeySystem, factory);
    aFactoryOut.Swap(factory);
  } else {
    aFactoryOut = *rv;
  }
  return S_OK;
}

/* static */
HRESULT MFCDMParent::LoadFactory(
    const nsString& aKeySystem,
    ComPtr<IMFContentDecryptionModuleFactory>& aFactoryOut) {
  LPCWSTR libraryName = GetCDMLibraryName(aKeySystem);
  const bool loadFromPlatform = wcslen(libraryName) == 0;
  MFCDM_PARENT_SLOG("Load factory for %s (libraryName=%ls)",
                    NS_ConvertUTF16toUTF8(aKeySystem).get(), libraryName);

  MFCDM_PARENT_SLOG("Create factory for %s",
                    NS_ConvertUTF16toUTF8(aKeySystem).get());
  ComPtr<IMFContentDecryptionModuleFactory> cdmFactory;
  if (loadFromPlatform) {
    ComPtr<IMFMediaEngineClassFactory4> clsFactory;
    MFCDM_RETURN_IF_FAILED(CoCreateInstance(CLSID_MFMediaEngineClassFactory,
                                            nullptr, CLSCTX_INPROC_SERVER,
                                            IID_PPV_ARGS(&clsFactory)));
    MFCDM_RETURN_IF_FAILED(clsFactory->CreateContentDecryptionModuleFactory(
        MapKeySystem(aKeySystem).get(), IID_PPV_ARGS(&cdmFactory)));
    aFactoryOut.Swap(cdmFactory);
    MFCDM_PARENT_SLOG("Created factory for %s from platform!",
                      NS_ConvertUTF16toUTF8(aKeySystem).get());
    return S_OK;
  }

  HMODULE handle = LoadLibraryW(libraryName);
  if (!handle) {
    MFCDM_PARENT_SLOG("Failed to load library %ls! (error=%lx)", libraryName,
                      GetLastError());
    return E_FAIL;
  }
  MFCDM_PARENT_SLOG("Loaded external library '%ls'", libraryName);

  using DllGetActivationFactoryFunc =
      HRESULT(WINAPI*)(_In_ HSTRING, _COM_Outptr_ IActivationFactory**);
  DllGetActivationFactoryFunc pDllGetActivationFactory =
      (DllGetActivationFactoryFunc)GetProcAddress(handle,
                                                  "DllGetActivationFactory");
  if (!pDllGetActivationFactory) {
    MFCDM_PARENT_SLOG("Failed to get activation function!");
    return E_FAIL;
  }

  // The follow classID format is what Widevine's DLL expects
  // "<key_system>.ContentDecryptionModuleFactory". In addition, when querying
  // factory, need to use original Widevine key system name.
  nsString stringId;
  if (StaticPrefs::media_eme_wmf_use_mock_cdm_for_external_cdms() ||
      IsWMFClearKeySystemAndSupported(aKeySystem)) {
    stringId.AppendLiteral("org.w3.clearkey");
  } else if (IsWidevineExperimentKeySystemAndSupported(aKeySystem) ||
             IsWidevineKeySystem(aKeySystem)) {
    // Widevine's DLL expects "<key_system>.ContentDecryptionModuleFactory" for
    // the class Id.
    stringId.AppendLiteral("com.widevine.alpha.ContentDecryptionModuleFactory");
  }
  MFCDM_PARENT_SLOG("Query factory by classId '%s'",
                    NS_ConvertUTF16toUTF8(stringId).get());
  ScopedHString classId(stringId);
  ComPtr<IActivationFactory> pFactory = NULL;
  MFCDM_RETURN_IF_FAILED(
      pDllGetActivationFactory(classId.Get(), pFactory.GetAddressOf()));

  ComPtr<IInspectable> pInspectable;
  MFCDM_RETURN_IF_FAILED(pFactory->ActivateInstance(&pInspectable));
  MFCDM_RETURN_IF_FAILED(pInspectable.As(&cdmFactory));
  aFactoryOut.Swap(cdmFactory);
  MFCDM_PARENT_SLOG("Created factory for %s from external library!",
                    NS_ConvertUTF16toUTF8(aKeySystem).get());
  return S_OK;
}

static nsString GetRobustnessStringForKeySystem(const nsString& aKeySystem,
                                                const bool aIsHWSecure,
                                                const bool aIsVideo = true) {
  if (IsPlayReadyKeySystemAndSupported(aKeySystem)) {
    // Audio doesn't support SL3000.
    return aIsHWSecure && aIsVideo ? nsString(u"3000") : nsString(u"2000");
  }
  if (IsWidevineExperimentKeySystemAndSupported(aKeySystem)) {
    return aIsHWSecure ? nsString(u"HW_SECURE_ALL")
                       : nsString(u"SW_SECURE_DECODE");
  }
  return nsString(u"");
}

// Use IMFContentDecryptionModuleFactory::IsTypeSupported() to get DRM
// capabilities. The query string is based on following, they are pretty much
// equivalent.
// https://learn.microsoft.com/en-us/uwp/api/windows.media.protection.protectioncapabilities.istypesupported?view=winrt-22621
// https://learn.microsoft.com/en-us/windows/win32/api/mfmediaengine/nf-mfmediaengine-imfextendeddrmtypesupport-istypesupportedex
static bool FactorySupports(ComPtr<IMFContentDecryptionModuleFactory>& aFactory,
                            const nsString& aKeySystem,
                            const nsCString& aVideoCodec,
                            const nsCString& aAudioCodec = nsCString(""),
                            const nsString& aAdditionalFeatures = nsString(u""),
                            bool aIsHWSecure = false) {
  // Create query string, MP4 is the only container supported.
  nsString contentType(u"video/mp4;codecs=\"");
  MOZ_ASSERT(!aVideoCodec.IsEmpty());
  contentType.AppendASCII(aVideoCodec);
  if (!aAudioCodec.IsEmpty()) {
    contentType.AppendLiteral(u",");
    contentType.AppendASCII(aAudioCodec);
  }
  // These features are required to call IsTypeSupported(). We only care about
  // codec and encryption scheme so hardcode the rest.
  contentType.AppendLiteral(
      u"\";features=\"decode-bpp=8,"
      "decode-res-x=1920,decode-res-y=1080,"
      "decode-bitrate=10000000,decode-fps=30,");
  if (!aAdditionalFeatures.IsEmpty()) {
    contentType.Append(aAdditionalFeatures);
  }
  // `encryption-robustness` is for Widevine only.
  if (IsWidevineExperimentKeySystemAndSupported(aKeySystem) ||
      IsWidevineKeySystem(aKeySystem)) {
    if (aIsHWSecure) {
      contentType.AppendLiteral(u"encryption-robustness=HW_SECURE_ALL");
    } else {
      contentType.AppendLiteral(u"encryption-robustness=SW_SECURE_DECODE");
    }
  }
  contentType.AppendLiteral(u"\"");
  // End of the query string

  // PlayReady doesn't implement IsTypeSupported properly, so it requires us to
  // use another way to check the capabilities.
  if (IsPlayReadyKeySystemAndSupported(aKeySystem) &&
      StaticPrefs::media_eme_playready_istypesupportedex()) {
    ComPtr<IMFMediaEngineClassFactory> spFactory;
    ComPtr<IMFExtendedDRMTypeSupport> spDrmTypeSupport;
    MFCDM_RETURN_BOOL_IF_FAILED(
        CoCreateInstance(CLSID_MFMediaEngineClassFactory, NULL,
                         CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&spFactory)));
    MFCDM_RETURN_BOOL_IF_FAILED(spFactory.As(&spDrmTypeSupport));
    BSTR keySystem = aIsHWSecure
                         ? CreateBSTRFromConstChar(kPlayReadyKeySystemHardware)
                         : CreateBSTRFromConstChar(kPlayReadyKeySystemName);
    MF_MEDIA_ENGINE_CANPLAY canPlay;
    spDrmTypeSupport->IsTypeSupportedEx(SysAllocString(contentType.get()),
                                        keySystem, &canPlay);
    const bool support =
        canPlay !=
        MF_MEDIA_ENGINE_CANPLAY::MF_MEDIA_ENGINE_CANPLAY_NOT_SUPPORTED;
    MFCDM_PARENT_SLOG("IsTypeSupportedEx=%d (key-system=%ls, content-type=%s)",
                      support, keySystem,
                      NS_ConvertUTF16toUTF8(contentType).get());
    return support;
  }

  // Checking capabilies from CDM's IsTypeSupported. Widevine implements this
  // method well.
  bool support = IsTypeSupported(aFactory, aKeySystem, &contentType);
  MFCDM_PARENT_SLOG("IsTypeSupport=%d (key-system=%s, content-type=%s)",
                    support, NS_ConvertUTF16toUTF8(aKeySystem).get(),
                    NS_ConvertUTF16toUTF8(contentType).get());
  return support;
}

static nsresult IsHDCPVersionSupported(
    ComPtr<IMFContentDecryptionModuleFactory>& aFactory,
    const nsString& aKeySystem, const dom::HDCPVersion& aMinHdcpVersion) {
  nsresult rv = NS_OK;
  // Codec doesn't matter when querying the HDCP policy, so use H264.
  if (!FactorySupports(aFactory, aKeySystem, nsCString("avc1"),
                       KeySystemConfig::EMECodecString(""),
                       GetHdcpPolicy(aMinHdcpVersion))) {
    rv = NS_ERROR_DOM_MEDIA_CDM_HDCP_NOT_SUPPORT;
  }
  return rv;
}

static bool IsKeySystemHWSecure(
    const nsAString& aKeySystem,
    const nsTArray<MFCDMMediaCapability>& aCapabilities) {
  if (IsPlayReadyKeySystemAndSupported(aKeySystem)) {
    if (aKeySystem.EqualsLiteral(kPlayReadyKeySystemHardware) ||
        aKeySystem.EqualsLiteral(kPlayReadyHardwareClearLeadKeySystemName)) {
      return true;
    }
    for (const auto& capabilities : aCapabilities) {
      if (capabilities.robustness().EqualsLiteral("3000")) {
        return true;
      }
    }
  }
  if (IsWidevineExperimentKeySystemAndSupported(aKeySystem) ||
      IsWidevineKeySystem(aKeySystem)) {
    // We only support Widevine HWDRM.
    return true;
  }
  return false;
}

/* static */
RefPtr<MFCDMParent::CapabilitiesPromise>
MFCDMParent::GetAllKeySystemsCapabilities() {
  MOZ_ASSERT(NS_IsMainThread());
  nsCOMPtr<nsISerialEventTarget> backgroundTaskQueue;
  if (NS_FAILED(NS_CreateBackgroundTaskQueue(
          __func__, getter_AddRefs(backgroundTaskQueue)))) {
    MFCDM_PARENT_SLOG(
        "Failed to create task queue for all key systems capabilities!");
    return CapabilitiesPromise::CreateAndReject(NS_ERROR_DOM_MEDIA_FATAL_ERR,
                                                __func__);
  }

  RefPtr<CapabilitiesPromise::Private> p =
      new CapabilitiesPromise::Private(__func__);
  Unused << backgroundTaskQueue->Dispatch(NS_NewRunnableFunction(__func__, [p] {
    MFCDM_PARENT_SLOG("GetAllKeySystemsCapabilities");
    if (sCapabilities.IsEmpty()) {
      enum SecureLevel : bool {
        Software = false,
        Hardware = true,
      };
      const nsTArray<std::pair<nsString, SecureLevel>> kKeySystems{
          std::pair<nsString, SecureLevel>(
              NS_ConvertUTF8toUTF16(kPlayReadyKeySystemName),
              SecureLevel::Software),
          std::pair<nsString, SecureLevel>(
              NS_ConvertUTF8toUTF16(kPlayReadyKeySystemHardware),
              SecureLevel::Hardware),
          std::pair<nsString, SecureLevel>(
              NS_ConvertUTF8toUTF16(kPlayReadyHardwareClearLeadKeySystemName),
              SecureLevel::Hardware),
          std::pair<nsString, SecureLevel>(
              NS_ConvertUTF8toUTF16(kWidevineExperimentKeySystemName),
              SecureLevel::Hardware),
          std::pair<nsString, SecureLevel>(
              NS_ConvertUTF8toUTF16(kWidevineExperiment2KeySystemName),
              SecureLevel::Hardware),
      };
      for (const auto& keySystem : kKeySystems) {
        // Only check the capabilites if the relative prefs for the key system
        // are ON.
        if (IsPlayReadyKeySystemAndSupported(keySystem.first) ||
            IsWidevineExperimentKeySystemAndSupported(keySystem.first)) {
          MFCDMCapabilitiesIPDL* c = sCapabilities.AppendElement();
          GetCapabilities(keySystem.first, keySystem.second, nullptr, *c);
        }
      }
    }
    p->Resolve(sCapabilities, __func__);
  }));
  return p;
}

/* static */
void MFCDMParent::GetCapabilities(const nsString& aKeySystem,
                                  const bool aIsHWSecure,
                                  IMFContentDecryptionModuleFactory* aFactory,
                                  MFCDMCapabilitiesIPDL& aCapabilitiesOut) {
  aCapabilitiesOut.keySystem() = aKeySystem;
  // WMF CDMs usually require these. See
  // https://source.chromium.org/chromium/chromium/src/+/main:media/cdm/win/media_foundation_cdm_factory.cc;l=69-73;drc=b3ca5c09fa0aa07b7f9921501f75e43d80f3ba48
  aCapabilitiesOut.persistentState() = KeySystemConfig::Requirement::Required;
  aCapabilitiesOut.distinctiveID() = KeySystemConfig::Requirement::Required;

  // Return empty capabilites for SWDRM on Windows 10 because it has the process
  // leaking problem.
  if (!IsWin11OrLater() && !aIsHWSecure) {
    return;
  }

  ComPtr<IMFContentDecryptionModuleFactory> factory = aFactory;
  if (!factory) {
    RETURN_VOID_IF_FAILED(GetOrCreateFactory(aKeySystem, factory));
  }

  // Widevine requires codec type to be four CC, PlayReady is fine with both.
  static auto convertCodecToFourCC =
      [](const KeySystemConfig::EMECodecString& aCodec) {
        if (aCodec.Equals(KeySystemConfig::EME_CODEC_H264)) {
          return "avc1"_ns;
        }
        if (aCodec.Equals(KeySystemConfig::EME_CODEC_VP8)) {
          return "vp80"_ns;
        }
        if (aCodec.Equals(KeySystemConfig::EME_CODEC_VP9)) {
          return "vp09"_ns;
        }
        if (aCodec.Equals(KeySystemConfig::EME_CODEC_HEVC)) {
          return "hev1"_ns;
        }
        // TODO : support AV1?
        if (aCodec.Equals(KeySystemConfig::EME_CODEC_AAC)) {
          return "mp4a"_ns;
        }
        if (aCodec.Equals(KeySystemConfig::EME_CODEC_OPUS)) {
          return "Opus"_ns;
        }
        if (aCodec.Equals(KeySystemConfig::EME_CODEC_VORBIS)) {
          return "vrbs"_ns;
        }
        if (aCodec.Equals(KeySystemConfig::EME_CODEC_FLAC)) {
          return "fLaC"_ns;
        }
        MOZ_ASSERT_UNREACHABLE("Unsupported codec");
        return "none"_ns;
      };

  // TODO : add AV1
  static nsTArray<KeySystemConfig::EMECodecString> kVideoCodecs({
      KeySystemConfig::EME_CODEC_H264,
      KeySystemConfig::EME_CODEC_VP8,
      KeySystemConfig::EME_CODEC_VP9,
      KeySystemConfig::EME_CODEC_HEVC,
  });

  // Remember supported video codecs.
  // It will be used when collecting audio codec and encryption scheme
  // support.
  nsTArray<KeySystemConfig::EMECodecString> supportedVideoCodecs;
  for (const auto& codec : kVideoCodecs) {
    if (codec == KeySystemConfig::EME_CODEC_HEVC &&
        !StaticPrefs::media_wmf_hevc_enabled()) {
      continue;
    }
    if (FactorySupports(factory, aKeySystem, convertCodecToFourCC(codec),
                        KeySystemConfig::EMECodecString(""), nsString(u""),
                        aIsHWSecure)) {
      MFCDMMediaCapability* c =
          aCapabilitiesOut.videoCapabilities().AppendElement();
      c->contentType() = NS_ConvertUTF8toUTF16(codec);
      c->robustness() =
          GetRobustnessStringForKeySystem(aKeySystem, aIsHWSecure);
      MFCDM_PARENT_SLOG("%s: +video:%s", __func__, codec.get());
      supportedVideoCodecs.AppendElement(codec);
    }
  }
  if (supportedVideoCodecs.IsEmpty()) {
    // Return a capabilities with no codec supported.
    return;
  }

  static nsTArray<KeySystemConfig::EMECodecString> kAudioCodecs({
      KeySystemConfig::EME_CODEC_AAC,
      KeySystemConfig::EME_CODEC_FLAC,
      KeySystemConfig::EME_CODEC_OPUS,
      KeySystemConfig::EME_CODEC_VORBIS,
  });
  for (const auto& codec : kAudioCodecs) {
    if (FactorySupports(
            factory, aKeySystem, convertCodecToFourCC(supportedVideoCodecs[0]),
            convertCodecToFourCC(codec), nsString(u""), aIsHWSecure)) {
      MFCDMMediaCapability* c =
          aCapabilitiesOut.audioCapabilities().AppendElement();
      c->contentType() = NS_ConvertUTF8toUTF16(codec);
      c->robustness() = GetRobustnessStringForKeySystem(aKeySystem, aIsHWSecure,
                                                        false /* isVideo */);
      MFCDM_PARENT_SLOG("%s: +audio:%s", __func__, codec.get());
    }
  }

  // Collect schemes supported by all video codecs.
  static nsTArray<std::pair<CryptoScheme, nsDependentString>> kSchemes = {
      std::pair<CryptoScheme, nsDependentString>(
          CryptoScheme::Cenc, u"encryption-type=cenc,encryption-iv-size=8,"),
      std::pair<CryptoScheme, nsDependentString>(
          CryptoScheme::Cbcs, u"encryption-type=cbcs,encryption-iv-size=16,")};
  for (auto& scheme : kSchemes) {
    bool ok = true;
    for (auto& codec : supportedVideoCodecs) {
      ok &= FactorySupports(
          factory, aKeySystem, convertCodecToFourCC(codec), nsCString(""),
          scheme.second /* additional feature */, aIsHWSecure);
      if (!ok) {
        break;
      }
    }
    if (ok) {
      aCapabilitiesOut.encryptionSchemes().AppendElement(scheme.first);
      MFCDM_PARENT_SLOG("%s: +scheme:%s", __func__,
                        scheme.first == CryptoScheme::Cenc ? "cenc" : "cbcs");
    }
  }

  static auto RequireClearLead = [](const nsString& aKeySystem) {
    if (aKeySystem.EqualsLiteral(kWidevineExperiment2KeySystemName) ||
        aKeySystem.EqualsLiteral(kPlayReadyHardwareClearLeadKeySystemName)) {
      return true;
    }
    return false;
  };

  // For key system requires clearlead, every codec needs to have clear support.
  // If not, then we will remove the codec from supported codec.
  if (RequireClearLead(aKeySystem)) {
    for (const auto& scheme : aCapabilitiesOut.encryptionSchemes()) {
      nsTArray<KeySystemConfig::EMECodecString> noClearLeadCodecs;
      for (const auto& codec : supportedVideoCodecs) {
        nsAutoString additionalFeature(u"encryption-type=");
        // If we don't specify 'encryption-iv-size', it would use 8 bytes IV as
        // default [1]. If it's not supported, then we will try 16 bytes later.
        // Since PlayReady 4.0 [2], 8 and 16 bytes IV are both supported. But
        // We're not sure if Widevine supports both or not.
        // [1]
        // https://learn.microsoft.com/en-us/windows/win32/api/mfmediaengine/nf-mfmediaengine-imfextendeddrmtypesupport-istypesupportedex
        // [2]
        // https://learn.microsoft.com/en-us/playready/packaging/content-encryption-modes#initialization-vectors-ivs
        if (scheme == CryptoScheme::Cenc) {
          additionalFeature.AppendLiteral(u"cenc-clearlead,");
        } else {
          additionalFeature.AppendLiteral(u"cbcs-clearlead,");
        }
        bool rv =
            FactorySupports(factory, aKeySystem, convertCodecToFourCC(codec),
                            nsCString(""), additionalFeature, aIsHWSecure);
        MFCDM_PARENT_SLOG("clearlead %s IV 8 bytes %s %s",
                          CryptoSchemeToString(scheme), codec.get(),
                          rv ? "supported" : "not supported");
        if (rv) {
          continue;
        }
        // Try 16 bytes IV.
        additionalFeature.AppendLiteral(u"encryption-iv-size=16,");
        rv = FactorySupports(factory, aKeySystem, convertCodecToFourCC(codec),
                             nsCString(""), additionalFeature, aIsHWSecure);
        MFCDM_PARENT_SLOG("clearlead %s IV 16 bytes %s %s",
                          CryptoSchemeToString(scheme), codec.get(),
                          rv ? "supported" : "not supported");
        // Failed on both, so remove the codec from supported codec.
        if (!rv) {
          noClearLeadCodecs.AppendElement(codec);
        }
      }
      for (const auto& codec : noClearLeadCodecs) {
        MFCDM_PARENT_SLOG("%s: -video:%s", __func__, codec.get());
        aCapabilitiesOut.videoCapabilities().RemoveElementsBy(
            [&codec](const MFCDMMediaCapability& aCapbilities) {
              return aCapbilities.contentType() == NS_ConvertUTF8toUTF16(codec);
            });
        supportedVideoCodecs.RemoveElement(codec);
      }
    }
  }

  if (IsHDCPVersionSupported(factory, aKeySystem, dom::HDCPVersion::_2_2) ==
      NS_OK) {
    aCapabilitiesOut.isHDCP22Compatible() = true;
  }

  // TODO: don't hardcode
  aCapabilitiesOut.initDataTypes().AppendElement(u"keyids");
  aCapabilitiesOut.initDataTypes().AppendElement(u"cenc");
  aCapabilitiesOut.sessionTypes().AppendElement(
      KeySystemConfig::SessionType::Temporary);
  aCapabilitiesOut.sessionTypes().AppendElement(
      KeySystemConfig::SessionType::PersistentLicense);
}

mozilla::ipc::IPCResult MFCDMParent::RecvGetCapabilities(
    const bool aIsHWSecure, GetCapabilitiesResolver&& aResolver) {
  MFCDM_REJECT_IF(!mFactory, NS_ERROR_DOM_NOT_SUPPORTED_ERR);
  MFCDMCapabilitiesIPDL capabilities;
  GetCapabilities(mKeySystem, aIsHWSecure, mFactory.Get(), capabilities);
  aResolver(std::move(capabilities));
  return IPC_OK();
}

mozilla::ipc::IPCResult MFCDMParent::RecvInit(
    const MFCDMInitParamsIPDL& aParams, InitResolver&& aResolver) {
  static auto RequirementToStr = [](KeySystemConfig::Requirement aRequirement) {
    switch (aRequirement) {
      case KeySystemConfig::Requirement::Required:
        return "Required";
      case KeySystemConfig::Requirement::Optional:
        return "Optional";
      default:
        return "NotAllowed";
    }
  };

  MFCDM_PARENT_LOG(
      "Creating a CDM (key-system=%s, origin=%s, distinctiveID=%s, "
      "persistentState=%s, "
      "hwSecure=%d)",
      NS_ConvertUTF16toUTF8(mKeySystem).get(),
      NS_ConvertUTF16toUTF8(aParams.origin()).get(),
      RequirementToStr(aParams.distinctiveID()),
      RequirementToStr(aParams.persistentState()),
      IsKeySystemHWSecure(mKeySystem, aParams.videoCapabilities()));
  MOZ_ASSERT(IsTypeSupported(mFactory, mKeySystem));

  MFCDM_REJECT_IF_FAILED(CreateContentDecryptionModule(
                             mFactory, MapKeySystem(mKeySystem), aParams, mCDM),
                         NS_ERROR_FAILURE);
  MOZ_ASSERT(mCDM);
  MFCDM_PARENT_LOG("Created a CDM!");

  // This is only required by PlayReady.
  if (IsPlayReadyKeySystemAndSupported(mKeySystem)) {
    ComPtr<IMFPMPHost> pmpHost;
    ComPtr<IMFGetService> cdmService;
    MFCDM_REJECT_IF_FAILED(mCDM.As(&cdmService), NS_ERROR_FAILURE);
    MFCDM_REJECT_IF_FAILED(
        cdmService->GetService(MF_CONTENTDECRYPTIONMODULE_SERVICE,
                               IID_PPV_ARGS(&pmpHost)),
        NS_ERROR_FAILURE);
    MFCDM_REJECT_IF_FAILED(SUCCEEDED(MakeAndInitialize<MFPMPHostWrapper>(
                               &mPMPHostWrapper, pmpHost)),
                           NS_ERROR_FAILURE);
    MFCDM_REJECT_IF_FAILED(mCDM->SetPMPHostApp(mPMPHostWrapper.Get()),
                           NS_ERROR_FAILURE);
    MFCDM_PARENT_LOG("Set PMPHostWrapper on CDM!");
  }

  aResolver(MFCDMInitIPDL{mId});
  return IPC_OK();
}

mozilla::ipc::IPCResult MFCDMParent::RecvCreateSessionAndGenerateRequest(
    const MFCDMCreateSessionParamsIPDL& aParams,
    CreateSessionAndGenerateRequestResolver&& aResolver) {
  MOZ_ASSERT(mCDM, "RecvInit() must be called and waited on before this call");

  static auto SessionTypeToStr = [](KeySystemConfig::SessionType aSessionType) {
    switch (aSessionType) {
      case KeySystemConfig::SessionType::Temporary:
        return "temporary";
      case KeySystemConfig::SessionType::PersistentLicense:
        return "persistent-license";
      default: {
        MOZ_ASSERT_UNREACHABLE("Unsupported license type!");
        return "invalid";
      }
    }
  };
  MFCDM_PARENT_LOG("Creating session for type '%s'",
                   SessionTypeToStr(aParams.sessionType()));
  UniquePtr<MFCDMSession> session{
      MFCDMSession::Create(aParams.sessionType(), mCDM.Get(), mManagerThread)};
  if (!session) {
    MFCDM_PARENT_LOG("Failed to create CDM session");
    aResolver(NS_ERROR_DOM_MEDIA_CDM_NO_SESSION_ERR);
    return IPC_OK();
  }

  MFCDM_REJECT_IF_FAILED(session->GenerateRequest(aParams.initDataType(),
                                                  aParams.initData().Elements(),
                                                  aParams.initData().Length()),
                         NS_ERROR_DOM_MEDIA_CDM_SESSION_OPERATION_ERR);
  ConnectSessionEvents(session.get());

  // TODO : now we assume all session ID is available after session is
  // created, but this is not always true. Need to remove this assertion and
  // handle cases where session Id is not available yet.
  const auto& sessionId = session->SessionID();
  MOZ_ASSERT(sessionId);
  mSessions.emplace(*sessionId, std::move(session));
  MFCDM_PARENT_LOG("Created a CDM session!");
  aResolver(*sessionId);
  return IPC_OK();
}

mozilla::ipc::IPCResult MFCDMParent::RecvLoadSession(
    const KeySystemConfig::SessionType& aSessionType,
    const nsString& aSessionId, LoadSessionResolver&& aResolver) {
  MOZ_ASSERT(mCDM, "RecvInit() must be called and waited on before this call");

  nsresult rv = NS_OK;
  auto* session = GetSession(aSessionId);
  if (!session) {
    aResolver(NS_ERROR_DOM_MEDIA_CDM_NO_SESSION_ERR);
    return IPC_OK();
  }
  MFCDM_REJECT_IF_FAILED(session->Load(aSessionId),
                         NS_ERROR_DOM_MEDIA_CDM_SESSION_OPERATION_ERR);
  aResolver(rv);
  return IPC_OK();
}

mozilla::ipc::IPCResult MFCDMParent::RecvUpdateSession(
    const nsString& aSessionId, const CopyableTArray<uint8_t>& aResponse,
    UpdateSessionResolver&& aResolver) {
  MOZ_ASSERT(mCDM, "RecvInit() must be called and waited on before this call");
  nsresult rv = NS_OK;
  auto* session = GetSession(aSessionId);
  if (!session) {
    aResolver(NS_ERROR_DOM_MEDIA_CDM_NO_SESSION_ERR);
    return IPC_OK();
  }
  MFCDM_REJECT_IF_FAILED(session->Update(aResponse),
                         NS_ERROR_DOM_MEDIA_CDM_SESSION_OPERATION_ERR);
  aResolver(rv);
  return IPC_OK();
}

mozilla::ipc::IPCResult MFCDMParent::RecvCloseSession(
    const nsString& aSessionId, UpdateSessionResolver&& aResolver) {
  MOZ_ASSERT(mCDM, "RecvInit() must be called and waited on before this call");
  nsresult rv = NS_OK;
  auto* session = GetSession(aSessionId);
  if (!session) {
    aResolver(NS_ERROR_DOM_MEDIA_CDM_NO_SESSION_ERR);
    return IPC_OK();
  }
  MFCDM_REJECT_IF_FAILED(session->Close(),
                         NS_ERROR_DOM_MEDIA_CDM_SESSION_OPERATION_ERR);
  aResolver(rv);
  return IPC_OK();
}

mozilla::ipc::IPCResult MFCDMParent::RecvRemoveSession(
    const nsString& aSessionId, UpdateSessionResolver&& aResolver) {
  MOZ_ASSERT(mCDM, "RecvInit() must be called and waited on before this call");
  nsresult rv = NS_OK;
  auto* session = GetSession(aSessionId);
  if (!session) {
    aResolver(NS_ERROR_DOM_MEDIA_CDM_NO_SESSION_ERR);
    return IPC_OK();
  }
  MFCDM_REJECT_IF_FAILED(session->Remove(),
                         NS_ERROR_DOM_MEDIA_CDM_SESSION_OPERATION_ERR);
  aResolver(rv);
  return IPC_OK();
}

mozilla::ipc::IPCResult MFCDMParent::RecvSetServerCertificate(
    const CopyableTArray<uint8_t>& aCertificate,
    UpdateSessionResolver&& aResolver) {
  MOZ_ASSERT(mCDM, "RecvInit() must be called and waited on before this call");
  nsresult rv = NS_OK;
  MFCDM_PARENT_LOG("Set server certificate");
  MFCDM_REJECT_IF_FAILED(mCDM->SetServerCertificate(
                             static_cast<const BYTE*>(aCertificate.Elements()),
                             aCertificate.Length()),
                         NS_ERROR_DOM_MEDIA_CDM_ERR);
  aResolver(rv);
  return IPC_OK();
}

mozilla::ipc::IPCResult MFCDMParent::RecvGetStatusForPolicy(
    const dom::HDCPVersion& aMinHdcpVersion,
    GetStatusForPolicyResolver&& aResolver) {
  MOZ_ASSERT(mCDM, "RecvInit() must be called and waited on before this call");
  aResolver(IsHDCPVersionSupported(mFactory, mKeySystem, aMinHdcpVersion));
  return IPC_OK();
}

void MFCDMParent::ConnectSessionEvents(MFCDMSession* aSession) {
  // TODO : clear session's event source when the session gets removed.
  mKeyMessageEvents.Forward(aSession->KeyMessageEvent());
  mKeyChangeEvents.Forward(aSession->KeyChangeEvent());
  mExpirationEvents.Forward(aSession->ExpirationEvent());
}

MFCDMSession* MFCDMParent::GetSession(const nsString& aSessionId) {
  AssertOnManagerThread();
  auto iter = mSessions.find(aSessionId);
  if (iter == mSessions.end()) {
    return nullptr;
  }
  return iter->second.get();
}

already_AddRefed<MFCDMProxy> MFCDMParent::GetMFCDMProxy() {
  if (!mCDM) {
    return nullptr;
  }
  RefPtr<MFCDMProxy> proxy = new MFCDMProxy(mCDM.Get(), mId);
  return proxy.forget();
}

/* static */
void MFCDMService::GetAllKeySystemsCapabilities(dom::Promise* aPromise) {
  MOZ_ASSERT(XRE_IsParentProcess());
  const static auto kSandboxKind = ipc::SandboxingKind::MF_MEDIA_ENGINE_CDM;
  LaunchMFCDMProcessIfNeeded(kSandboxKind)
      ->Then(
          GetMainThreadSerialEventTarget(), __func__,
          [promise = RefPtr(aPromise)]() {
            RefPtr<ipc::UtilityAudioDecoderChild> uadc =
                ipc::UtilityAudioDecoderChild::GetSingleton(kSandboxKind);
            if (NS_WARN_IF(!uadc)) {
              promise->MaybeReject(NS_ERROR_FAILURE);
              return;
            }
            uadc->GetKeySystemCapabilities(promise);
          },
          [promise = RefPtr(aPromise)](nsresult aError) {
            promise->MaybeReject(NS_ERROR_FAILURE);
          });
}

/* static */
RefPtr<GenericNonExclusivePromise> MFCDMService::LaunchMFCDMProcessIfNeeded(
    ipc::SandboxingKind aSandbox) {
  MOZ_ASSERT(XRE_IsParentProcess());
  MOZ_ASSERT(aSandbox == ipc::SandboxingKind::MF_MEDIA_ENGINE_CDM);
  RefPtr<ipc::UtilityProcessManager> utilityProc =
      ipc::UtilityProcessManager::GetSingleton();
  if (NS_WARN_IF(!utilityProc)) {
    NS_WARNING("Failed to get UtilityProcessManager");
    return GenericNonExclusivePromise::CreateAndReject(NS_ERROR_FAILURE,
                                                       __func__);
  }

  // Check if the MFCDM process exists or not. If not, launch it.
  if (utilityProc->Process(aSandbox)) {
    return GenericNonExclusivePromise::CreateAndResolve(true, __func__);
  }

  RefPtr<ipc::UtilityAudioDecoderChild> uadc =
      ipc::UtilityAudioDecoderChild::GetSingleton(aSandbox);
  if (NS_WARN_IF(!uadc)) {
    NS_WARNING("Failed to get UtilityAudioDecoderChild");
    return GenericNonExclusivePromise::CreateAndReject(NS_ERROR_FAILURE,
                                                       __func__);
  }
  return utilityProc->StartUtility(uadc, aSandbox)
      ->Then(
          GetMainThreadSerialEventTarget(), __func__,
          [uadc, utilityProc, aSandbox]() {
            RefPtr<ipc::UtilityProcessParent> parent =
                utilityProc->GetProcessParent(aSandbox);
            if (!parent) {
              NS_WARNING("UtilityAudioDecoderParent lost in the middle");
              return GenericNonExclusivePromise::CreateAndReject(
                  NS_ERROR_FAILURE, __func__);
            }

            if (!uadc->CanSend()) {
              NS_WARNING("UtilityAudioDecoderChild lost in the middle");
              return GenericNonExclusivePromise::CreateAndReject(
                  NS_ERROR_FAILURE, __func__);
            }
            return GenericNonExclusivePromise::CreateAndResolve(true, __func__);
          },
          [](nsresult aError) {
            NS_WARNING("Failed to start the MFCDM process!");
            return GenericNonExclusivePromise::CreateAndReject(NS_ERROR_FAILURE,
                                                               __func__);
          });
}

/* static */
void MFCDMService::UpdateWidevineL1Path(nsIFile* aFile) {
  RefPtr<ipc::UtilityProcessManager> utilityProc =
      ipc::UtilityProcessManager::GetSingleton();
  if (NS_WARN_IF(!utilityProc)) {
    NS_WARNING("Failed to get UtilityProcessManager");
    return;
  }

  // If the MFCDM process hasn't been created yet, then we will set the path
  // when creating the process later.
  const auto sandboxKind = ipc::SandboxingKind::MF_MEDIA_ENGINE_CDM;
  if (!utilityProc->Process(sandboxKind)) {
    return;
  }

  // The MFCDM process has been started, we need to update its L1 path and set
  // the permission for LPAC.
  nsString widevineL1Path;
  MOZ_ASSERT(aFile);
  if (NS_WARN_IF(NS_FAILED(aFile->GetTarget(widevineL1Path)))) {
    NS_WARNING("MFCDMService::UpdateWidevineL1Path, Failed to get L1 path!");
    return;
  }

  RefPtr<ipc::UtilityAudioDecoderChild> uadc =
      ipc::UtilityAudioDecoderChild::GetSingleton(sandboxKind);
  if (NS_WARN_IF(!uadc)) {
    NS_WARNING("Failed to get UtilityAudioDecoderChild");
    return;
  }
  Unused << uadc->SendUpdateWidevineL1Path(widevineL1Path);
#ifdef MOZ_WMF_CDM_LPAC_SANDBOX
  SandboxBroker::EnsureLpacPermsissionsOnDir(widevineL1Path);
#endif
}

#undef MFCDM_REJECT_IF_FAILED
#undef MFCDM_REJECT_IF
#undef MFCDM_RETURN_IF_FAILED
#undef MFCDM_RETURN_BOOL_IF_FAILED
#undef MFCDM_PARENT_SLOG
#undef MFCDM_PARENT_LOG

}  // namespace mozilla
