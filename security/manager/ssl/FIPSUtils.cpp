/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FIPSUtils.h"

#include "nsISupportsImpl.h"
#include "nss.h"
#include "pk11pub.h"
#include "secmod.h"

namespace mozilla {
namespace psm {

NS_IMPL_ISUPPORTS(FIPSUtils, nsIFIPSUtils)

NS_IMETHODIMP
FIPSUtils::GetCanToggleFIPS(bool* aCanToggleFIPS) {
  NS_ENSURE_ARG_POINTER(aCanToggleFIPS);

  if (!NSS_IsInitialized()) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  *aCanToggleFIPS = SECMOD_CanDeleteInternalModule();
  return NS_OK;
}

NS_IMETHODIMP
FIPSUtils::ToggleFIPSMode() {
  if (!NSS_IsInitialized()) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  // The way to toggle FIPS mode in NSS is extremely obscure. Basically, we
  // delete the internal module, and it gets replaced with the opposite module
  // (i.e. if it was FIPS before, then it becomes non-FIPS next).
  // SECMOD_GetInternalModule() returns a pointer to a local copy of the
  // internal module stashed in NSS.  We don't want to delete it since it will
  // cause much pain in NSS.
  SECMODModule* internal = SECMOD_GetInternalModule();
  if (!internal) {
    return NS_ERROR_FAILURE;
  }

  if (SECMOD_DeleteInternalModule(internal->commonName) != SECSuccess) {
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

NS_IMETHODIMP
FIPSUtils::GetIsFIPSEnabled(bool* aIsFIPSEnabled) {
  NS_ENSURE_ARG_POINTER(aIsFIPSEnabled);

  if (!NSS_IsInitialized()) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  *aIsFIPSEnabled = PK11_IsFIPS();
  return NS_OK;
}

}  // namespace psm
}  // namespace mozilla
