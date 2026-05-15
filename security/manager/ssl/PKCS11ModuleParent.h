/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_psm_PKCS11ModuleParent_h
#define mozilla_psm_PKCS11ModuleParent_h

#if !defined(NIGHTLY_BUILD) || defined(MOZ_NO_SMART_CARDS)
#  error This file should only be used under NIGHTLY_BUILD and when MOZ_NO_SMART_CARDS is not defined.
#endif  // !NIGHTLY_BUILD || MOZ_NO_SMART_CARDS

#include "mozilla/ProcInfo.h"

#include "mozilla/ipc/UtilityProcessParent.h"
#include "mozilla/psm/PPKCS11ModuleParent.h"

namespace mozilla::psm {

class PKCS11ModuleParent final : public PPKCS11ModuleParent {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(PKCS11ModuleParent, override);

  explicit PKCS11ModuleParent() = default;

  UtilityActorName GetActorName() { return UtilityActorName::Pkcs11Module; }

  nsresult BindToUtilityProcess(
      const RefPtr<ipc::UtilityProcessParent>& aUtilityParent);

 private:
  ~PKCS11ModuleParent() = default;
};

}  // namespace mozilla::psm

#endif  // mozilla_psm_PKCS11ModuleParent_h
