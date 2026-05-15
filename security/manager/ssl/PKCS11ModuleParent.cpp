/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#if !defined(NIGHTLY_BUILD) || defined(MOZ_NO_SMART_CARDS)
#  error This file should only be used under NIGHTLY_BUILD and when MOZ_NO_SMART_CARDS is not defined.
#endif  // !NIGHTLY_BUILD || MOZ_NO_SMART_CARDS

#include "mozilla/psm/PKCS11ModuleParent.h"

namespace mozilla::psm {

nsresult PKCS11ModuleParent::BindToUtilityProcess(
    const RefPtr<ipc::UtilityProcessParent>& aUtilityParent) {
  Endpoint<PPKCS11ModuleParent> parentEnd;
  Endpoint<PPKCS11ModuleChild> childEnd;
  nsresult rv = PPKCS11Module::CreateEndpoints(
      ipc::EndpointProcInfo::Current(), aUtilityParent->OtherEndpointProcInfo(),
      &parentEnd, &childEnd);

  if (NS_FAILED(rv)) {
    MOZ_ASSERT_UNREACHABLE("Protocol endpoints failure");
    return NS_ERROR_FAILURE;
  }

  if (!aUtilityParent->SendStartPKCS11ModuleService(std::move(childEnd))) {
    MOZ_ASSERT_UNREACHABLE("StartPKCS11Module service failure");
    return NS_ERROR_FAILURE;
  }

  if (!parentEnd.Bind(this)) {
    MOZ_ASSERT_UNREACHABLE("StartPKCS11Module service failure");
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

}  // namespace mozilla::psm
