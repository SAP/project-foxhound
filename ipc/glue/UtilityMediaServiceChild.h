/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef _include_ipc_glue_UtilityMediaServiceChild_h_
#define _include_ipc_glue_UtilityMediaServiceChild_h_

#include "mozilla/ProcInfo.h"
#include "mozilla/ProfilerMarkers.h"
#include "mozilla/RefPtr.h"

#include "mozilla/ipc/Endpoint.h"
#include "mozilla/ipc/UtilityProcessParent.h"
#include "mozilla/ipc/UtilityProcessSandboxing.h"
#include "mozilla/ipc/UtilityMediaService.h"
#include "mozilla/ipc/PUtilityMediaServiceChild.h"
#include "mozilla/gfx/gfxVarReceiver.h"

#ifdef MOZ_WMF_MEDIA_ENGINE
#  include "mozilla/gfx/GPUProcessListener.h"
#endif

#include "PDMFactory.h"

namespace mozilla::ipc {

class UtilityMediaServiceChildShutdownObserver : public nsIObserver {
 public:
  explicit UtilityMediaServiceChildShutdownObserver(SandboxingKind aKind)
      : mSandbox(aKind) {};

  NS_DECL_ISUPPORTS

  NS_IMETHOD Observe(nsISupports* aSubject, const char* aTopic,
                     const char16_t* aData) override;

 private:
  virtual ~UtilityMediaServiceChildShutdownObserver() = default;

  const SandboxingKind mSandbox;
};

// This controls performing audio decoding on the utility process and it is
// intended to live on the main process side
class UtilityMediaServiceChild final : public PUtilityMediaServiceChild,
                                       public gfx::gfxVarReceiver
#ifdef MOZ_WMF_MEDIA_ENGINE
    ,
                                       public gfx::GPUProcessListener
#endif
{
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(UtilityMediaServiceChild, override);
  mozilla::ipc::IPCResult RecvUpdateMediaCodecsSupported(
      const RemoteMediaIn& aLocation,
      const media::MediaCodecsSupported& aSupported);

  UtilityActorName GetActorName() { return GetAudioActorName(mSandbox); }

  nsresult BindToUtilityProcess(RefPtr<UtilityProcessParent> aUtilityParent);

  void ActorDestroy(ActorDestroyReason aReason) override;

  void Bind(Endpoint<PUtilityMediaServiceChild>&& aEndpoint);

  static void Shutdown(SandboxingKind aKind);

  static RefPtr<UtilityMediaServiceChild> GetSingleton(SandboxingKind aKind);

  void OnVarChanged(const nsTArray<gfx::GfxVarUpdate>& aVar) override;

#ifdef MOZ_WMF_MEDIA_ENGINE
  mozilla::ipc::IPCResult RecvCompleteCreatedVideoBridge();

  void OnCompositorUnexpectedShutdown() override;

  // True if creating a video bridge sucessfully. Currently only used for media
  // engine cdm.
  bool CreateVideoBridge(mozilla::ipc::EndpointProcInfo aOtherProcess);
#endif

#ifdef MOZ_WMF_CDM
  void GetKeySystemCapabilities(dom::Promise* aPromise);

  mozilla::ipc::IPCResult RecvDisableHardwareDRM();
#endif

 private:
  explicit UtilityMediaServiceChild(SandboxingKind aKind);
  ~UtilityMediaServiceChild() = default;

  const SandboxingKind mSandbox;

#ifdef MOZ_WMF_MEDIA_ENGINE
  // True if the utility process has created a video bridge with the GPU prcess.
  // Currently only used for media egine cdm. Main thread only.
  enum class State { None, Creating, Created };
  State mHasCreatedVideoBridge = State::None;
#endif

  TimeStamp mAudioDecoderChildStart;
};

}  // namespace mozilla::ipc

#endif  // _include_ipc_glue_UtilityMediaServiceChild_h_
