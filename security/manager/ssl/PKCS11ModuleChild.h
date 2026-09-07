/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_psm_PKCS11ModuleChild_h
#define mozilla_psm_PKCS11ModuleChild_h

#if !defined(NIGHTLY_BUILD) || defined(MOZ_NO_SMART_CARDS)
#  error This file should only be used under NIGHTLY_BUILD and when MOZ_NO_SMART_CARDS is not defined.
#endif  // !NIGHTLY_BUILD || MOZ_NO_SMART_CARDS

#include "mozilla/psm/PPKCS11ModuleChild.h"
#include "nsIObserver.h"
#include "nsISupports.h"

namespace mozilla::psm {

class PKCS11ModuleChild final : public PPKCS11ModuleChild {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(PKCS11ModuleChild, override);

  PKCS11ModuleChild() = default;

  nsresult Start(Endpoint<PPKCS11ModuleChild>&& aEndpoint,
                 nsCString&& aProfilePath);

  ipc::IPCResult RecvAddModule(nsCString&& aModuleName,
                               nsCString&& aLibraryPath,
                               uint32_t aMechanismFlags, uint32_t aCipherFlags,
                               AddModuleResolver&& aResolver);

  ipc::IPCResult RecvDeleteModule(nsCString&& aModuleName,
                                  DeleteModuleResolver&& aResolver);

  ipc::IPCResult RecvListModules(ListModulesResolver&& aResolver);

 private:
  nsCOMPtr<nsISerialEventTarget> mTaskQueue;

  ~PKCS11ModuleChild() = default;
};

}  // namespace mozilla::psm

#endif  // mozilla_psm_PKCS11ModuleChild_h
