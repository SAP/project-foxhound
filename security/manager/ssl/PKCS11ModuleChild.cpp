/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#if !defined(NIGHTLY_BUILD) || defined(MOZ_NO_SMART_CARDS)
#  error This file should only be used under NIGHTLY_BUILD and when MOZ_NO_SMART_CARDS is not defined.
#endif  // !NIGHTLY_BUILD || MOZ_NO_SMART_CARDS

#include "mozilla/psm/PKCS11ModuleChild.h"

#include "PKCS11ModuleDB.h"
#include "mozilla/ipc/Endpoint.h"
#include "nsDebugImpl.h"
#include "NSSCertDBTrustDomain.h"

namespace mozilla::psm {

nsresult PKCS11ModuleChild::Start(Endpoint<PPKCS11ModuleChild>&& aEndpoint,
                                  nsCString&& aProfilePath) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(!mTaskQueue);

  nsDebugImpl::SetMultiprocessMode("PKCS11ModuleChild");

  nsresult rv = NS_CreateBackgroundTaskQueue("PKCS11ModuleChild",
                                             getter_AddRefs(mTaskQueue));
  if (NS_FAILED(rv)) {
    return rv;
  }

  rv = mTaskQueue->Dispatch(NS_NewRunnableFunction(
      "PKCS11ModuleChild::StartBind",
      [self = RefPtr{this}, endpoint = std::move(aEndpoint),
       profilePath = std::move(aProfilePath)]() mutable {
        if (profilePath.IsEmpty()) {
          NS_WARNING(
              "no profile path for utility process: loading PKCS#11 modules "
              "will fail");
        } else {
          SECStatus srv = InitializeNSS(profilePath, NSSDBConfig::ReadWrite,
                                        PKCS11DBConfig::LoadModules);
          if (srv != SECSuccess) {
            NS_WARNING(
                "could not load NSS in utility process: loading PKCS#11 "
                "modules will fail");
          }
        }
        MOZ_ALWAYS_TRUE(endpoint.Bind(self));
      }));
  return rv;
}

ipc::IPCResult PKCS11ModuleChild::RecvAddModule(nsCString&& aModuleName,
                                                nsCString&& aLibraryPath,
                                                uint32_t aMechanismFlags,
                                                uint32_t aCipherFlags,
                                                AddModuleResolver&& aResolver) {
  aResolver(PKCS11ModuleDB::DoAddModule(aModuleName, aLibraryPath,
                                        aMechanismFlags, aCipherFlags));
  return IPC_OK();
}

ipc::IPCResult PKCS11ModuleChild::RecvDeleteModule(
    nsCString&& aModuleName, DeleteModuleResolver&& aResolver) {
  aResolver(PKCS11ModuleDB::DoDeleteModule(aModuleName));
  return IPC_OK();
}

ipc::IPCResult PKCS11ModuleChild::RecvListModules(
    ListModulesResolver&& aResolver) {
  nsTArray<ModuleInfo> modules;
  nsresult rv = PKCS11ModuleDB::DoListModules(modules);
  using Type = std::tuple<const nsresult&, nsTArray<ModuleInfo>&&>;
  aResolver(Type(rv, std::move(modules)));
  return IPC_OK();
}

}  // namespace mozilla::psm
