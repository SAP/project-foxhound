/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef _include_ipc_glue_UtilityMediaServiceParent_h_
#define _include_ipc_glue_UtilityMediaServiceParent_h_

#include "mozilla/PRemoteMediaManagerParent.h"
#include "mozilla/ProfilerMarkers.h"

#include "mozilla/ipc/Endpoint.h"
#include "mozilla/ipc/PUtilityMediaServiceParent.h"

#include "mozilla/ipc/UtilityProcessSandboxing.h"

#include "nsThreadManager.h"

namespace mozilla::ipc {

// This is in charge of handling the utility child process side to perform
// audio decoding
class UtilityMediaServiceParent final : public PUtilityMediaServiceParent {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(UtilityMediaServiceParent, override);

  explicit UtilityMediaServiceParent(
      nsTArray<mozilla::gfx::GfxVarUpdate>&& aUpdates);

  static void GenericPreloadForSandbox();
  static void WMFPreloadForSandbox();

  void Start(Endpoint<PUtilityMediaServiceParent>&& aEndpoint);

  mozilla::ipc::IPCResult RecvNewContentRemoteMediaManager(
      Endpoint<PRemoteMediaManagerParent>&& aEndpoint,
      const ContentParentId& aParentId);

#ifdef MOZ_WMF_MEDIA_ENGINE
  mozilla::ipc::IPCResult RecvInitVideoBridge(
      Endpoint<PVideoBridgeChild>&& aEndpoint,
      const ContentDeviceData& aContentDeviceData);
#endif

  IPCResult RecvUpdateVar(const nsTArray<mozilla::gfx::GfxVarUpdate>& aUpdate);

#ifdef MOZ_WMF_CDM
  IPCResult RecvGetKeySystemCapabilities(
      GetKeySystemCapabilitiesResolver&& aResolver);

  IPCResult RecvUpdateWidevineL1Path(const nsString& aPath);
#endif

 private:
  ~UtilityMediaServiceParent();

  const SandboxingKind mKind;
  TimeStamp mUtilityMediaServiceParentStart;
};

}  // namespace mozilla::ipc

#endif  // _include_ipc_glue_UtilityMediaServiceParent_h_
