/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_DigitalCredentialParent_h
#define mozilla_dom_DigitalCredentialParent_h

#include "mozilla/dom/PDigitalCredential.h"
#include "mozilla/dom/PDigitalCredentialParent.h"
#include "mozilla/dom/WindowGlobalParent.h"

namespace mozilla::dom {

class DigitalCredentialParent final : public PDigitalCredentialParent {
  NS_INLINE_DECL_REFCOUNTING(DigitalCredentialParent, override);

 public:
  DigitalCredentialParent() = default;
  virtual void ActorDestroy(ActorDestroyReason aWhy) override;

  mozilla::ipc::IPCResult RecvGetDigitalCredential(
      nsTArray<IPCDigitalCredentialRequest>&& aRequests,
      const GetDigitalCredentialResolver&& aResolver);

  mozilla::ipc::IPCResult RecvCreateDigitalCredential(
      nsTArray<IPCDigitalCredentialRequest>&& aRequests,
      const CreateDigitalCredentialResolver&& aResolver);

  mozilla::ipc::IPCResult RecvCancelOperationInParent();

 private:
  ~DigitalCredentialParent() = default;

  Maybe<GetDigitalCredentialResolver> mGetResolver;
  Maybe<CreateDigitalCredentialResolver> mCreateResolver;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_DigitalCredentialParent_h
