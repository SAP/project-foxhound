/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/EMEUtils.h"

#include "jsfriendapi.h"
#include "MediaData.h"
#include "KeySystemConfig.h"
#include "mozilla/StaticPrefs_media.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/KeySystemNames.h"
#include "mozilla/dom/UnionTypes.h"
#include "nsContentUtils.h"

#ifdef MOZ_WMF_CDM
#  include "mozilla/PMFCDM.h"
#endif

namespace mozilla {

LogModule* GetEMELog() {
  static LazyLogModule log("EME");
  return log;
}

LogModule* GetEMEVerboseLog() {
  static LazyLogModule log("EMEV");
  return log;
}

void CopyArrayBufferViewOrArrayBufferData(
    const dom::ArrayBufferViewOrArrayBuffer& aBufferOrView,
    nsTArray<uint8_t>& aOutData) {
  aOutData.Clear();
  Unused << dom::AppendTypedArrayDataTo(aBufferOrView, aOutData);
}

bool IsClearkeyKeySystem(const nsAString& aKeySystem) {
  if (StaticPrefs::media_clearkey_test_key_systems_enabled()) {
    return aKeySystem.EqualsLiteral(kClearKeyKeySystemName) ||
           aKeySystem.EqualsLiteral(kClearKeyWithProtectionQueryKeySystemName);
  }
  return aKeySystem.EqualsLiteral(kClearKeyKeySystemName);
}

bool IsWidevineKeySystem(const nsAString& aKeySystem) {
  return aKeySystem.EqualsLiteral(kWidevineKeySystemName);
}

#ifdef MOZ_WMF_CDM
bool IsPlayReadyEnabled() {
  // 1=enabled encrypted and clear, 2=enabled encrytped.
  return StaticPrefs::media_eme_playready_enabled() &&
         (StaticPrefs::media_wmf_media_engine_enabled() == 1 ||
          StaticPrefs::media_wmf_media_engine_enabled() == 2);
}

bool IsPlayReadyKeySystemAndSupported(const nsAString& aKeySystem) {
  if (!IsPlayReadyEnabled()) {
    return false;
  }
  return aKeySystem.EqualsLiteral(kPlayReadyKeySystemName) ||
         aKeySystem.EqualsLiteral(kPlayReadyKeySystemHardware) ||
         aKeySystem.EqualsLiteral(kPlayReadyHardwareClearLeadKeySystemName);
}

bool IsWidevineHardwareDecryptionEnabled() {
  // 1=enabled encrypted and clear, 2=enabled encrytped.
  return StaticPrefs::media_eme_widevine_experiment_enabled() &&
         (StaticPrefs::media_wmf_media_engine_enabled() == 1 ||
          StaticPrefs::media_wmf_media_engine_enabled() == 2);
}

bool IsWidevineExperimentKeySystemAndSupported(const nsAString& aKeySystem) {
  if (!IsWidevineHardwareDecryptionEnabled()) {
    return false;
  }
  return aKeySystem.EqualsLiteral(kWidevineExperimentKeySystemName) ||
         aKeySystem.EqualsLiteral(kWidevineExperiment2KeySystemName);
}

bool IsWMFClearKeySystemAndSupported(const nsAString& aKeySystem) {
  if (!StaticPrefs::media_eme_wmf_clearkey_enabled()) {
    return false;
  }
  // 1=enabled encrypted and clear, 2=enabled encrytped.
  if (StaticPrefs::media_wmf_media_engine_enabled() != 1 &&
      StaticPrefs::media_wmf_media_engine_enabled() != 2) {
    return false;
  }
  return aKeySystem.EqualsLiteral(kClearKeyKeySystemName);
}
#endif

nsString KeySystemToProxyName(const nsAString& aKeySystem) {
  if (IsClearkeyKeySystem(aKeySystem)) {
#ifdef MOZ_WMF_CDM
    if (StaticPrefs::media_eme_wmf_clearkey_enabled()) {
      return u"mfcdm-clearkey"_ns;
    }
#endif
    return u"gmp-clearkey"_ns;
  }
  if (IsWidevineKeySystem(aKeySystem)) {
    return u"gmp-widevinecdm"_ns;
  }
#ifdef MOZ_WMF_CDM
  if (IsPlayReadyKeySystemAndSupported(aKeySystem)) {
    return u"mfcdm-playready"_ns;
  }
  if (IsWidevineExperimentKeySystemAndSupported(aKeySystem)) {
    return u"mfcdm-widevine"_ns;
  }
#endif
  MOZ_ASSERT_UNREACHABLE("Not supported key system!");
  return u""_ns;
}

bool IsHardwareDecryptionSupported(
    const dom::MediaKeySystemConfiguration& aConfig) {
  for (const auto& capabilities : aConfig.mAudioCapabilities) {
    if (capabilities.mRobustness.EqualsLiteral("HW_SECURE_ALL")) {
      return true;
    }
  }
  for (const auto& capabilities : aConfig.mVideoCapabilities) {
    if (capabilities.mRobustness.EqualsLiteral("3000") ||
        capabilities.mRobustness.EqualsLiteral("HW_SECURE_ALL") ||
        capabilities.mRobustness.EqualsLiteral("HW_SECURE_DECODE")) {
      return true;
    }
  }
  return false;
}

bool IsHardwareDecryptionSupported(const KeySystemConfig& aConfig) {
  for (const auto& robustness : aConfig.mAudioRobustness) {
    if (robustness.EqualsLiteral("HW_SECURE_ALL")) {
      return true;
    }
  }
  for (const auto& robustness : aConfig.mVideoRobustness) {
    if (robustness.EqualsLiteral("3000") ||
        robustness.EqualsLiteral("HW_SECURE_ALL") ||
        robustness.EqualsLiteral("HW_SECURE_DECODE")) {
      return true;
    }
  }
  return false;
}

#ifdef MOZ_WMF_CDM
void MFCDMCapabilitiesIPDLToKeySystemConfig(
    const MFCDMCapabilitiesIPDL& aCDMConfig,
    KeySystemConfig& aKeySystemConfig) {
  aKeySystemConfig.mKeySystem = aCDMConfig.keySystem();

  for (const auto& type : aCDMConfig.initDataTypes()) {
    aKeySystemConfig.mInitDataTypes.AppendElement(type);
  }

  for (const auto& type : aCDMConfig.sessionTypes()) {
    aKeySystemConfig.mSessionTypes.AppendElement(type);
  }

  for (const auto& c : aCDMConfig.videoCapabilities()) {
    if (!c.robustness().IsEmpty() &&
        !aKeySystemConfig.mVideoRobustness.Contains(c.robustness())) {
      aKeySystemConfig.mVideoRobustness.AppendElement(c.robustness());
    }
    CryptoSchemeSet schemes;
    for (const auto& scheme : c.encryptionSchemes()) {
      schemes += scheme;
    }
    aKeySystemConfig.mMP4.SetCanDecryptAndDecode(
        NS_ConvertUTF16toUTF8(c.contentType()), Some(schemes));
  }
  for (const auto& c : aCDMConfig.audioCapabilities()) {
    if (!c.robustness().IsEmpty() &&
        !aKeySystemConfig.mAudioRobustness.Contains(c.robustness())) {
      aKeySystemConfig.mAudioRobustness.AppendElement(c.robustness());
    }
    CryptoSchemeSet schemes;
    for (const auto& scheme : c.encryptionSchemes()) {
      schemes += scheme;
    }
    aKeySystemConfig.mMP4.SetCanDecryptAndDecode(
        NS_ConvertUTF16toUTF8(c.contentType()), Some(schemes));
  }
  aKeySystemConfig.mPersistentState = aCDMConfig.persistentState();
  aKeySystemConfig.mDistinctiveIdentifier = aCDMConfig.distinctiveID();
  aKeySystemConfig.mIsHDCP22Compatible = aCDMConfig.isHDCP22Compatible()
                                             ? *aCDMConfig.isHDCP22Compatible()
                                             : false;
  EME_LOG("New Capabilities=%s",
          NS_ConvertUTF16toUTF8(aKeySystemConfig.GetDebugInfo()).get());
}
#endif

bool DoesKeySystemSupportClearLead(const nsAString& aKeySystem) {
  // I believe that Widevine L3 supports clear-lead, but I couldn't find any
  // official documentation to prove that. The only one I can find is that Shaka
  // player mentions the clear lead feature. So we expect L3 should have that as
  // well. But for HWDRM, Widevine L1 and SL3000 needs to rely on special checks
  // to know whether clearlead is supported. That will be implemented by
  // querying for special key system names.
  // https://shaka-project.github.io/shaka-packager/html/documentation.html
#ifdef MOZ_WMF_CDM
  if (aKeySystem.EqualsLiteral(kWidevineExperiment2KeySystemName) ||
      aKeySystem.EqualsLiteral(kPlayReadyHardwareClearLeadKeySystemName)) {
    return true;
  }
#endif
  return aKeySystem.EqualsLiteral(kWidevineKeySystemName);
}

bool CheckIfHarewareDRMConfigExists(
    const nsTArray<dom::MediaKeySystemConfiguration>& aConfigs) {
  bool foundHWDRMconfig = false;
  for (const auto& config : aConfigs) {
    if (IsHardwareDecryptionSupported(config)) {
      foundHWDRMconfig = true;
      break;
    }
  }
  return foundHWDRMconfig;
}

bool DoesKeySystemSupportHardwareDecryption(const nsAString& aKeySystem) {
#ifdef MOZ_WMF_CDM
  if (aKeySystem.EqualsLiteral(kPlayReadyKeySystemHardware) ||
      aKeySystem.EqualsLiteral(kPlayReadyHardwareClearLeadKeySystemName) ||
      aKeySystem.EqualsLiteral(kWidevineExperimentKeySystemName) ||
      aKeySystem.EqualsLiteral(kWidevineExperiment2KeySystemName)) {
    return true;
  }
#endif
  return false;
}

void DeprecationWarningLog(const dom::Document* aDocument,
                           const char* aMsgName) {
  if (!aDocument || !aMsgName) {
    return;
  }
  EME_LOG("DeprecationWarning Logging deprecation warning '%s' to WebConsole.",
          aMsgName);
  nsTHashMap<nsCharPtrHashKey, bool> warnings;
  warnings.InsertOrUpdate(aMsgName, true);
  AutoTArray<nsString, 1> params;
  nsString& uri = *params.AppendElement();
  Unused << aDocument->GetDocumentURI(uri);
  nsContentUtils::ReportToConsole(nsIScriptError::warningFlag, "Media"_ns,
                                  aDocument, nsContentUtils::eDOM_PROPERTIES,
                                  aMsgName, params);
}

}  // namespace mozilla
