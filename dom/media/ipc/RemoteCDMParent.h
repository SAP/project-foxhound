/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef include_dom_media_ipc_RemoteCDMParent_h
#define include_dom_media_ipc_RemoteCDMParent_h

#include "mozilla/PRemoteCDMActor.h"
#include "mozilla/PRemoteCDMParent.h"

namespace mozilla {

class RemoteCDMParent : public PRemoteCDMParent, public PRemoteCDMActor {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(RemoteCDMParent, final);

  RemoteCDMParent() = default;

  // PRemoteCDMParent
  virtual mozilla::ipc::IPCResult RecvInit(
      const RemoteCDMInitRequestIPDL& request, InitResolver&& aResolver) = 0;

  virtual mozilla::ipc::IPCResult RecvCreateSession(
      RemoteCDMCreateSessionRequestIPDL&& aRequest,
      CreateSessionResolver&& aResolver) = 0;

  virtual mozilla::ipc::IPCResult RecvLoadSession(
      const RemoteCDMLoadSessionRequestIPDL& aRequest,
      LoadSessionResolver&& aResolver) = 0;

  virtual mozilla::ipc::IPCResult RecvUpdateSession(
      const RemoteCDMUpdateSessionRequestIPDL& aRequest,
      UpdateSessionResolver&& aResolver) = 0;

  virtual mozilla::ipc::IPCResult RecvRemoveSession(
      const nsString& aSessionId, RemoveSessionResolver&& aResolver) = 0;

  virtual mozilla::ipc::IPCResult RecvCloseSession(
      const nsString& aSessionId, CloseSessionResolver&& aResolver) = 0;

  virtual mozilla::ipc::IPCResult RecvSetServerCertificate(
      mozilla::Span<uint8_t const> aCertificate,
      SetServerCertificateResolver&& aResolver) = 0;

  // PRemoteCDMActor
  PRemoteCDMParent* AsPRemoteCDMParent() final { return this; }
  RemoteMediaIn GetLocation() const final;

 protected:
  virtual ~RemoteCDMParent() = default;
};

}  // namespace mozilla

#endif  // include_dom_media_ipc_RemoteCDMParent_h
