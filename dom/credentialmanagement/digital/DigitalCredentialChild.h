/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_DigitalCredentialChild_h
#define mozilla_dom_DigitalCredentialChild_h

#include "mozilla/dom/PDigitalCredential.h"
#include "mozilla/dom/PDigitalCredentialChild.h"

namespace mozilla::dom {

class DigitalCredentialHandler;

class DigitalCredentialChild final : public PDigitalCredentialChild {
 public:
  NS_INLINE_DECL_REFCOUNTING(DigitalCredentialChild, override);

  DigitalCredentialChild() = default;

  void ActorDestroy(ActorDestroyReason why) override;

  void SetHandler(DigitalCredentialHandler* aHandler);

 private:
  ~DigitalCredentialChild() = default;

  // This pointer will be set in the call to
  // DigitalCredentialHandler::MaybeCreateActor() that creates this object and
  // it will be cleared either in DigitalCredentialChild::ActorDestroy() or in
  // DigitalCredentialHandler::~DigitalCredentialHandler().
  DigitalCredentialHandler* mHandler{};
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_DigitalCredentialChild_h
