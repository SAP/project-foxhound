/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#include "RemoteDecoderModule.h"

#ifdef MOZ_AV1
#  include "AOMDecoder.h"
#endif
#include "RemoteAudioDecoder.h"
#include "RemoteMediaDataDecoder.h"
#include "RemoteMediaManagerChild.h"
#include "RemoteVideoDecoder.h"
#include "VideoUtils.h"
#include "gfxConfig.h"
#include "mozilla/RemoteDecodeUtils.h"

namespace mozilla {

using namespace ipc;
using namespace layers;

already_AddRefed<PlatformDecoderModule> RemoteDecoderModule::Create(
    RemoteMediaIn aLocation) {
  MOZ_ASSERT(!XRE_IsGPUProcess() && !XRE_IsRDDProcess(),
             "Should not be created in GPU or RDD process.");
  if (!XRE_IsContentProcess()) {
    // For now, the RemoteDecoderModule is only available in the content
    // process.
    return nullptr;
  }
  return MakeAndAddRef<RemoteDecoderModule>(aLocation);
}

RemoteDecoderModule::RemoteDecoderModule(RemoteMediaIn aLocation)
    : mLocation(aLocation) {}

const char* RemoteDecoderModule::Name() const {
  switch (mLocation) {
    case RemoteMediaIn::Unspecified:
      return "Remote: Unspecified";
    case RemoteMediaIn::RddProcess:
      return "Remote: RddProcess";
    case RemoteMediaIn::GpuProcess:
      return "Remote: GpuProcess";
    case RemoteMediaIn::UtilityProcess_Generic:
      return "Remote: Utility_Generic";
    case RemoteMediaIn::UtilityProcess_AppleMedia:
      return "Remote: Utility_AppleMedia";
    case RemoteMediaIn::UtilityProcess_WMF:
      return "Remote: Utility_WMF";
    case RemoteMediaIn::UtilityProcess_MFMediaEngineCDM:
      return "Remote: Utility_MFMediaEngineCDM";
    default:
      MOZ_CRASH("Missing enum handling");
  }
}

media::DecodeSupportSet RemoteDecoderModule::SupportsMimeType(
    const nsACString& aMimeType, DecoderDoctorDiagnostics* aDiagnostics) const {
  MOZ_CRASH("Deprecated: Use RemoteDecoderModule::Supports");
}  // namespace mozilla

media::DecodeSupportSet RemoteDecoderModule::Supports(
    const SupportDecoderParams& aParams,
    DecoderDoctorDiagnostics* aDiagnostics) const {
  bool supports =
      RemoteMediaManagerChild::Supports(mLocation, aParams, aDiagnostics);
#ifdef MOZ_WMF_CDM
  // This should only be supported by mf media engine cdm process.
  if (aParams.mMediaEngineId &&
      mLocation != RemoteMediaIn::UtilityProcess_MFMediaEngineCDM) {
    supports = false;
  }
#endif
#ifdef ANDROID
  if ((aParams.mCDM && mLocation != RemoteMediaIn::RddProcess) ||
      (!aParams.mCDM && aParams.mConfig.IsAudio() &&
       mLocation != RemoteMediaIn::UtilityProcess_Generic)) {
    supports = false;
  }
#endif
  MOZ_LOG(
      sPDMLog, LogLevel::Debug,
      ("Sandbox %s decoder %s requested type %s", RemoteMediaInToStr(mLocation),
       supports ? "supports" : "rejects", aParams.MimeType().get()));
  if (supports) {
    // TODO: Note that we do not yet distinguish between SW/HW decode support.
    //       Will be done in bug 1754239.
    return media::DecodeSupport::SoftwareDecode;
  }
  return media::DecodeSupportSet{};
}

RefPtr<RemoteDecoderModule::CreateDecoderPromise>
RemoteDecoderModule::AsyncCreateDecoder(const CreateDecoderParams& aParams) {
  if (aParams.mConfig.IsAudio()) {
    // OpusDataDecoder will check this option to provide the same info
    // that IsDefaultPlaybackDeviceMono provides.  We want to avoid calls
    // to IsDefaultPlaybackDeviceMono on RDD because initializing audio
    // backends on RDD will be blocked by the sandbox.
    if (aParams.mConfig.mMimeType.Equals("audio/opus") &&
        IsDefaultPlaybackDeviceMono()) {
      CreateDecoderParams params = aParams;
      params.mOptions += CreateDecoderParams::Option::DefaultPlaybackDeviceMono;
      return RemoteMediaManagerChild::CreateAudioDecoder(params, mLocation);
    }
    return RemoteMediaManagerChild::CreateAudioDecoder(aParams, mLocation);
  }
  return RemoteMediaManagerChild::CreateVideoDecoder(aParams, mLocation);
}

}  // namespace mozilla
