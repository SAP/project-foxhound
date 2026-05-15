/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "UtilityMediaServiceParent.h"

#include "GeckoProfiler.h"
#include "nsDebugImpl.h"

#include "MediaCodecsSupport.h"
#include "mozilla/RemoteMediaManagerParent.h"

#include "mozilla/gfx/gfxVars.h"

#if defined(XP_WIN) && defined(MOZ_SANDBOX)
#  include "WMF.h"
#  include "WMFDecoderModule.h"
#  include "WMFUtils.h"

#  include "mozilla/sandboxTarget.h"
#  include "mozilla/ipc/UtilityProcessImpl.h"
#endif  // defined(XP_WIN) && defined(MOZ_SANDBOX)

#ifdef MOZ_WIDGET_ANDROID
#  include "mozilla/StaticPrefs_media.h"
#  include "AndroidDecoderModule.h"
#endif

#include "mozilla/ipc/UtilityProcessChild.h"
#include "mozilla/RemoteDecodeUtils.h"

#ifdef MOZ_WMF_MEDIA_ENGINE
#  include "gfxConfig.h"
#  include "mozilla/gfx/DeviceManagerDx.h"
#endif

#ifdef MOZ_WMF_CDM
#  include "mozilla/MFCDMParent.h"
#  include "mozilla/PMFCDM.h"
#endif

namespace mozilla::ipc {

UtilityMediaServiceParent::UtilityMediaServiceParent(
    nsTArray<gfx::GfxVarUpdate>&& aUpdates)
    : mKind(GetCurrentSandboxingKind()),
      mUtilityMediaServiceParentStart(TimeStamp::Now()) {
  switch (mKind) {
#ifdef MOZ_WMF_MEDIA_ENGINE
    case SandboxingKind::MF_MEDIA_ENGINE_CDM:
      nsDebugImpl::SetMultiprocessMode("MF Media Engine CDM");
      profiler_set_process_name(nsCString("MF Media Engine CDM"));
      break;
#endif
    case SandboxingKind::GENERIC_UTILITY:
      break;
    default:
      nsDebugImpl::SetMultiprocessMode("Utility AudioDecoder");
      profiler_set_process_name(nsCString("Utility AudioDecoder"));
      break;
  }
  gfx::gfxVars::Initialize();
  gfx::gfxVars::ApplyUpdate(aUpdates);
#ifdef MOZ_WMF_MEDIA_ENGINE
  if (mKind == SandboxingKind::MF_MEDIA_ENGINE_CDM) {
    gfx::gfxConfig::Init();
    gfx::DeviceManagerDx::Init();
  }
#endif
}

UtilityMediaServiceParent::~UtilityMediaServiceParent() {
  gfx::gfxVars::Shutdown();
#ifdef MOZ_WMF_MEDIA_ENGINE
  if (mKind == SandboxingKind::MF_MEDIA_ENGINE_CDM) {
    gfx::gfxConfig::Shutdown();
    gfx::DeviceManagerDx::Shutdown();
  }
#endif
#ifdef MOZ_WMF_CDM
  if (mKind == SandboxingKind::MF_MEDIA_ENGINE_CDM) {
    MFCDMParent::Shutdown();
  }
#endif
}

/* static */
void UtilityMediaServiceParent::GenericPreloadForSandbox() {
#if defined(MOZ_SANDBOX) && defined(XP_WIN)
  // Preload AV dlls so we can enable Binary Signature Policy
  // to restrict further dll loads.
  UtilityProcessImpl::LoadLibraryOrCrash(L"mozavcodec.dll");
  UtilityProcessImpl::LoadLibraryOrCrash(L"mozavutil.dll");
#endif  // defined(MOZ_SANDBOX) && defined(XP_WIN)
}

/* static */
void UtilityMediaServiceParent::WMFPreloadForSandbox() {
#if defined(MOZ_SANDBOX) && defined(XP_WIN)
  // mfplat.dll and mf.dll will be preloaded by
  // wmf::MediaFoundationInitializer::HasInitialized()

#  if defined(NS_FREE_PERMANENT_DATA)
  // WMF Shutdown requires this or it will badly crash
  UtilityProcessImpl::LoadLibraryOrCrash(L"ole32.dll");
#  endif  // defined(NS_FREE_PERMANENT_DATA)

  auto rv = wmf::MediaFoundationInitializer::HasInitialized();
  if (!rv) {
    NS_WARNING("Failed to init Media Foundation in the Utility process");
    return;
  }
#endif  // defined(MOZ_SANDBOX) && defined(XP_WIN)
}

void UtilityMediaServiceParent::Start(
    Endpoint<PUtilityMediaServiceParent>&& aEndpoint) {
  MOZ_ASSERT(NS_IsMainThread());

  DebugOnly<bool> ok = std::move(aEndpoint).Bind(this);
  MOZ_ASSERT(ok);

#ifdef MOZ_WIDGET_ANDROID
  if (StaticPrefs::media_utility_android_media_codec_enabled()) {
    AndroidDecoderModule::SetSupportedMimeTypes();
  }
#endif

  auto supported = media::MCSInfo::GetSupportFromFactory();
  (void)SendUpdateMediaCodecsSupported(GetRemoteMediaInFromKind(mKind),
                                       supported);
  PROFILER_MARKER_UNTYPED("UtilityMediaServiceParent::Start", IPC,
                          MarkerOptions(MarkerTiming::IntervalUntilNowFrom(
                              mUtilityMediaServiceParentStart)));
}

mozilla::ipc::IPCResult
UtilityMediaServiceParent::RecvNewContentRemoteMediaManager(
    Endpoint<PRemoteMediaManagerParent>&& aEndpoint,
    const ContentParentId& aParentId) {
  MOZ_ASSERT(NS_IsMainThread());
  if (!RemoteMediaManagerParent::CreateForContent(std::move(aEndpoint),
                                                  aParentId)) {
    return IPC_FAIL_NO_REASON(this);
  }
  return IPC_OK();
}

#ifdef MOZ_WMF_MEDIA_ENGINE
mozilla::ipc::IPCResult UtilityMediaServiceParent::RecvInitVideoBridge(
    Endpoint<PVideoBridgeChild>&& aEndpoint,
    const ContentDeviceData& aContentDeviceData) {
  MOZ_ASSERT(mKind == SandboxingKind::MF_MEDIA_ENGINE_CDM);
  if (!RemoteMediaManagerParent::CreateVideoBridgeToOtherProcess(
          std::move(aEndpoint))) {
    return IPC_FAIL_NO_REASON(this);
  }

  gfx::gfxConfig::Inherit(
      {
          gfx::Feature::HW_COMPOSITING,
          gfx::Feature::D3D11_COMPOSITING,
          gfx::Feature::OPENGL_COMPOSITING,
      },
      aContentDeviceData.prefs());

  if (gfx::gfxConfig::IsEnabled(gfx::Feature::D3D11_COMPOSITING)) {
    if (auto* devmgr = gfx::DeviceManagerDx::Get()) {
      devmgr->ImportDeviceInfo(aContentDeviceData.d3d11());
    }
  }

  (void)SendCompleteCreatedVideoBridge();
  return IPC_OK();
}
#endif

IPCResult UtilityMediaServiceParent::RecvUpdateVar(
    const nsTArray<GfxVarUpdate>& aUpdate) {
  gfx::gfxVars::ApplyUpdate(aUpdate);

  MOZ_ALWAYS_SUCCEEDS(NS_DispatchBackgroundTask(
      NS_NewRunnableFunction(
          "UtilityMediaServiceParent::RecvUpdateVar",
          [self = RefPtr{this}]() {
            NS_DispatchToMainThread(NS_NewRunnableFunction(
                "UtilityMediaServiceParent::UpdateMediaCodecsSupported",
                [self, supported = media::MCSInfo::GetSupportFromFactory(
                           true /* force refresh */)]() {
                  (void)self->SendUpdateMediaCodecsSupported(
                      GetRemoteMediaInFromKind(self->mKind), supported);
                }));
          }),
      nsIEventTarget::DISPATCH_NORMAL));
  return IPC_OK();
}

#ifdef MOZ_WMF_CDM
IPCResult UtilityMediaServiceParent::RecvGetKeySystemCapabilities(
    GetKeySystemCapabilitiesResolver&& aResolver) {
  MOZ_ASSERT(mKind == SandboxingKind::MF_MEDIA_ENGINE_CDM);
  MFCDMParent::GetAllKeySystemsCapabilities()->Then(
      GetCurrentSerialEventTarget(), __func__,
      [aResolver](CopyableTArray<MFCDMCapabilitiesIPDL>&& aCapabilities) {
        aResolver(std::move(aCapabilities));
      },
      [aResolver](nsresult) {
        aResolver(CopyableTArray<MFCDMCapabilitiesIPDL>());
      });
  return IPC_OK();
}

IPCResult UtilityMediaServiceParent::RecvUpdateWidevineL1Path(
    const nsString& aPath) {
  MFCDMParent::SetWidevineL1Path(NS_ConvertUTF16toUTF8(aPath).get());
  return IPC_OK();
}
#endif

}  // namespace mozilla::ipc
