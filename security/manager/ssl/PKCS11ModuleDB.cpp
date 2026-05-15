/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PKCS11ModuleDB.h"

#include "CertVerifier.h"
#include "ScopedNSSTypes.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/glean/SecurityManagerSslMetrics.h"
#include "nsComponentManagerUtils.h"
#include "nsNSSCertHelper.h"
#include "nsNSSComponent.h"
#include "nsNativeCharsetUtils.h"
#include "nsPKCS11Slot.h"
#include "nsServiceManagerUtils.h"
#include "nsThreadUtils.h"
#include "nss.h"
#include "xpcpublic.h"

#if defined(XP_MACOSX)
#  include "nsMacUtilsImpl.h"
#  include "nsIFile.h"
#endif  // defined(XP_MACOSX)

using mozilla::ErrorResult;
using mozilla::dom::Promise;

namespace mozilla {
namespace psm {

NS_IMPL_ISUPPORTS(PKCS11ModuleDB, nsIPKCS11ModuleDB)

StaticRefPtr<PKCS11ModuleDB> sPKCS11ModuleDB;

already_AddRefed<PKCS11ModuleDB> PKCS11ModuleDB::GetSingleton() {
  MOZ_ASSERT(NS_IsMainThread());
  if (!NS_IsMainThread()) {
    return nullptr;
  }

  if (!sPKCS11ModuleDB) {
    sPKCS11ModuleDB = new PKCS11ModuleDB();
    ClearOnShutdown(&sPKCS11ModuleDB);
  }

  return do_AddRef(sPKCS11ModuleDB);
}

// Using the NSS serial task queue avoids threading issues in NSS'
// implementation of module loading and unloading.
nsresult DispatchToNSSTaskQueue(already_AddRefed<nsIRunnable>&& aRunnable) {
  nsCOMPtr<nsIRunnable> runnable(aRunnable);
  nsCOMPtr<nsINSSComponent> nss(do_GetService(PSM_COMPONENT_CONTRACTID));
  if (!nss) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  nsCOMPtr<nsISerialEventTarget> nssTaskQueue;
  nsresult rv = nss->GetNssTaskQueue(getter_AddRefs(nssTaskQueue));
  if (NS_FAILED(rv)) {
    return rv;
  }
  return nssTaskQueue->Dispatch(runnable.forget());
}

// Convert the UTF16 name of the module as it appears to the user to the
// internal representation. For most modules this just involves converting from
// UTF16 to UTF8. For the builtin root module, it also involves mapping from the
// localized name to the internal, non-localized name.
static nsresult NormalizeModuleNameIn(const nsAString& moduleNameIn,
                                      nsCString& moduleNameOut) {
  nsAutoString localizedRootModuleName;
  nsresult rv =
      GetPIPNSSBundleString("RootCertModuleName", localizedRootModuleName);
  if (NS_FAILED(rv)) {
    return rv;
  }
  if (moduleNameIn.Equals(localizedRootModuleName)) {
    moduleNameOut.Assign(kRootModuleName.get());
    return NS_OK;
  }
  moduleNameOut.Assign(NS_ConvertUTF16toUTF8(moduleNameIn));
  return NS_OK;
}

nsresult DoDeleteModule(const nsCString& moduleName) {
  // modType is an output variable. We ignore it.
  int32_t modType;
  SECStatus srv = SECMOD_DeleteModule(moduleName.get(), &modType);
  if (srv != SECSuccess) {
    return NS_ERROR_FAILURE;
  }

  CollectThirdPartyPKCS11ModuleTelemetry();

  return NS_OK;
}

// Delete a PKCS11 module from the user's profile.
NS_IMETHODIMP
PKCS11ModuleDB::DeleteModule(const nsAString& aModuleName, JSContext* aCx,
                             Promise** aPromise) {
  MOZ_ASSERT(NS_IsMainThread());
  if (!NS_IsMainThread()) {
    return NS_ERROR_NOT_SAME_THREAD;
  }
  if (aModuleName.IsEmpty()) {
    return NS_ERROR_INVALID_ARG;
  }

  nsAutoCString moduleNameNormalized;
  nsresult rv = NormalizeModuleNameIn(aModuleName, moduleNameNormalized);
  if (NS_FAILED(rv)) {
    return rv;
  }

  ErrorResult result;
  RefPtr<Promise> promise =
      Promise::Create(xpc::CurrentNativeGlobal(aCx), result);
  if (result.Failed()) {
    return result.StealNSResult();
  }
  auto promiseHolder = MakeRefPtr<nsMainThreadPtrHolder<Promise>>(
      "DeleteModule promise", promise);

  nsCOMPtr<nsIRunnable> runnable(NS_NewRunnableFunction(
      "DeleteModule runnable",
      [promiseHolder = std::move(promiseHolder),
       moduleNameNormalized = std::move(moduleNameNormalized)]() {
        nsresult rv = DoDeleteModule(moduleNameNormalized);
        RefPtr<SharedCertVerifier> certVerifier(GetDefaultCertVerifier());
        if (certVerifier) {
          certVerifier->ClearTrustCache();
        }
        NS_DispatchToMainThread(NS_NewRunnableFunction(
            "DeleteModule callback",
            [rv, promiseHolder = std::move(promiseHolder)] {
              if (NS_SUCCEEDED(rv)) {
                promiseHolder->get()->MaybeResolveWithUndefined();
              } else {
                promiseHolder->get()->MaybeReject(rv);
              }
            }));
      }));

  promise.forget(aPromise);
  return DispatchToNSSTaskQueue(runnable.forget());
}

#if defined(XP_MACOSX)
// Given a path to a module, return the filename in `aFilename`.
nsresult ModulePathToFilename(const nsCString& aModulePath,
                              nsCString& aFilename) {
  nsCOMPtr<nsIFile> file;
  nsresult rv =
      NS_NewLocalFile(NS_ConvertUTF8toUTF16(aModulePath), getter_AddRefs(file));
  NS_ENSURE_SUCCESS(rv, rv);

  nsAutoString filename;
  rv = file->GetLeafName(filename);
  NS_ENSURE_SUCCESS(rv, rv);

  aFilename = NS_ConvertUTF16toUTF8(filename);
  return NS_OK;
}

// Collect the signature type and filename of a third-party PKCS11 module to
// inform future decisions about module loading restrictions on macOS.
void CollectThirdPartyModuleSignatureType(const nsCString& aModulePath) {
  using mozilla::glean::pkcs11::third_party_module_signature_type;
  using mozilla::glean::pkcs11::ThirdPartyModuleSignatureTypeExtra;
  using nsMacUtilsImpl::CodeSignatureTypeToString;

  nsMacUtilsImpl::CodeSignatureType signatureType =
      nsMacUtilsImpl::GetSignatureType(aModulePath);

  nsCString filename;
  nsresult rv = ModulePathToFilename(aModulePath, filename);
  NS_ENSURE_SUCCESS_VOID(rv);

  nsCString signatureTypeStr(CodeSignatureTypeToString(signatureType));
  third_party_module_signature_type.Record(
      Some(ThirdPartyModuleSignatureTypeExtra{
          Some(filename),
          Some(signatureTypeStr),
      }));
}

// Collect the filename of a third-party PKCS11 module to inform future
// decisions about module loading restrictions on macOS.
void CollectThirdPartyModuleFilename(const nsCString& aModulePath) {
  using mozilla::glean::pkcs11::third_party_module_profile_entries;
  nsCString filename;
  nsresult rv = ModulePathToFilename(aModulePath, filename);
  NS_ENSURE_SUCCESS_VOID(rv);
  third_party_module_profile_entries.Add(filename);
}
#endif  // defined(XP_MACOSX)

nsresult DoAddModule(const nsCString& moduleName, const nsCString& libraryPath,
                     uint32_t mechanismFlags, uint32_t cipherFlags) {
  uint32_t internalMechanismFlags =
      SECMOD_PubMechFlagstoInternal(mechanismFlags);
  uint32_t internalCipherFlags = SECMOD_PubCipherFlagstoInternal(cipherFlags);
  SECStatus srv =
      SECMOD_AddNewModule(moduleName.get(), libraryPath.get(),
                          internalMechanismFlags, internalCipherFlags);
  if (srv != SECSuccess) {
    return NS_ERROR_FAILURE;
  }

#if defined(XP_MACOSX)
  CollectThirdPartyModuleSignatureType(libraryPath);
#endif  // defined(XP_MACOSX)

  CollectThirdPartyPKCS11ModuleTelemetry();

  return NS_OK;
}

// Add a new PKCS11 module to the user's profile.
NS_IMETHODIMP
PKCS11ModuleDB::AddModule(const nsAString& aModuleName,
                          const nsAString& aLibraryPath,
                          uint32_t aMechanismFlags, uint32_t aCipherFlags,
                          JSContext* aCx, Promise** aPromise) {
  MOZ_ASSERT(NS_IsMainThread());
  if (!NS_IsMainThread()) {
    return NS_ERROR_NOT_SAME_THREAD;
  }
  if (aModuleName.IsEmpty()) {
    return NS_ERROR_INVALID_ARG;
  }

  // "Root Certs" is the name some NSS command-line utilities will give the
  // roots module if they decide to load it when there happens to be a
  // `MOZ_DLL_PREFIX "nssckbi" MOZ_DLL_SUFFIX` file in the directory being
  // operated on.  This causes failures, so as a workaround, the PSM
  // initialization code will unconditionally remove any module named "Root
  // Certs". We should prevent the user from adding an unrelated module named
  // "Root Certs" in the first place so PSM doesn't delete it. See bug 1406396.
  if (aModuleName.EqualsLiteral("Root Certs")) {
    return NS_ERROR_ILLEGAL_VALUE;
  }

  nsAutoCString moduleNameNormalized;
  nsresult rv = NormalizeModuleNameIn(aModuleName, moduleNameNormalized);
  if (NS_FAILED(rv)) {
    return rv;
  }

  nsAutoCString libraryPath;
  CopyUTF16toUTF8(aLibraryPath, libraryPath);

  ErrorResult result;
  RefPtr<Promise> promise =
      Promise::Create(xpc::CurrentNativeGlobal(aCx), result);
  if (result.Failed()) {
    return result.StealNSResult();
  }
  auto promiseHolder =
      MakeRefPtr<nsMainThreadPtrHolder<Promise>>("AddModule promise", promise);

  nsCOMPtr<nsIRunnable> runnable(NS_NewRunnableFunction(
      "AddModule runnable",
      [promiseHolder = std::move(promiseHolder),
       moduleNameNormalized = std::move(moduleNameNormalized),
       libraryPath = std::move(libraryPath), mechanismFlags = aMechanismFlags,
       cipherFlags = aCipherFlags]() {
        nsresult rv = DoAddModule(moduleNameNormalized, libraryPath,
                                  mechanismFlags, cipherFlags);
        RefPtr<SharedCertVerifier> certVerifier(GetDefaultCertVerifier());
        if (certVerifier) {
          certVerifier->ClearTrustCache();
        }
        NS_DispatchToMainThread(NS_NewRunnableFunction(
            "AddModule callback",
            [rv, promiseHolder = std::move(promiseHolder)] {
              if (NS_SUCCEEDED(rv)) {
                promiseHolder->get()->MaybeResolveWithUndefined();
              } else {
                promiseHolder->get()->MaybeReject(rv);
              }
            }));
      }));

  promise.forget(aPromise);
  return DispatchToNSSTaskQueue(runnable.forget());
}

nsTArray<UniqueSECMODModule> DoListModules() {
  // nsPKCS11Module isn't thread-safe (and doesn't need to be), so this
  // collects the known modules as an array of UniqueSECMODModule on the
  // background thread. They can then each be turned into an nsPKCS11Module on
  // the main thread.
  nsTArray<UniqueSECMODModule> modules;
  AutoSECMODListReadLock lock;
  for (SECMODModuleList* list = SECMOD_GetDefaultModuleList(); list;
       list = list->next) {
    modules.AppendElement(SECMOD_ReferenceModule(list->module));
  }
  for (SECMODModuleList* list = SECMOD_GetDeadModuleList(); list;
       list = list->next) {
    modules.AppendElement(SECMOD_ReferenceModule(list->module));
  }
  return modules;
}

NS_IMETHODIMP
PKCS11ModuleDB::ListModules(JSContext* aCx, Promise** aPromise) {
  MOZ_ASSERT(NS_IsMainThread());
  if (!NS_IsMainThread()) {
    return NS_ERROR_NOT_SAME_THREAD;
  }

  ErrorResult result;
  RefPtr<Promise> promise =
      Promise::Create(xpc::CurrentNativeGlobal(aCx), result);
  if (result.Failed()) {
    return result.StealNSResult();
  }
  auto promiseHolder = MakeRefPtr<nsMainThreadPtrHolder<Promise>>(
      "ListModules promise", promise);

  nsCOMPtr<nsIRunnable> runnable(NS_NewRunnableFunction(
      "ListModules runnable", [promiseHolder = std::move(promiseHolder)]() {
        nsTArray<UniqueSECMODModule> rawModules(DoListModules());
        NS_DispatchToMainThread(NS_NewRunnableFunction(
            "ListModules callback", [rawModules = std::move(rawModules),
                                     promiseHolder = std::move(promiseHolder)] {
              nsTArray<nsCOMPtr<nsIPKCS11Module>> modules;
              for (const auto& rawModule : rawModules) {
                modules.AppendElement(new nsPKCS11Module(rawModule.get()));
              }
              promiseHolder->get()->MaybeResolve(modules);
            }));
      }));

  promise.forget(aPromise);
  return DispatchToNSSTaskQueue(runnable.forget());
}

const nsLiteralCString kBuiltInModuleNames[] = {
    kNSSInternalModuleName,
    kRootModuleName,
    kOSClientCertsModuleName,
    kIPCClientCertsModuleName,
};

void CollectThirdPartyPKCS11ModuleTelemetry(bool aIsInitialization) {
  size_t thirdPartyModulesLoaded = 0;
  AutoSECMODListReadLock lock;
  for (SECMODModuleList* list = SECMOD_GetDefaultModuleList(); list;
       list = list->next) {
    bool isThirdParty = true;
    for (const auto& builtInModuleName : kBuiltInModuleNames) {
      if (builtInModuleName.Equals(list->module->commonName)) {
        isThirdParty = false;
        break;
      }
    }
    if (isThirdParty) {
      thirdPartyModulesLoaded++;
#if defined(XP_MACOSX)
      // Collect third party module filenames once per launch.
      // We collect signature type when adding a module. It would be wasteful
      // and duplicative to collect signature information on each launch given
      // that it requires file I/O. Combining the filename of modules collected
      // here with signature type and filename collected when adding a module
      // provides information about existing modules already in use and new
      // modules. No I/O is required to obtain the filename given the path on
      // macOS, but defer it to idle-time to avoid adding more work at startup.
      if (aIsInitialization) {
        nsCString modulePath(list->module->dllName);
        NS_DispatchToMainThreadQueue(
            NS_NewRunnableFunction("CollectThirdPartyModuleFilenameIdle",
                                   [modulePath]() {
                                     CollectThirdPartyModuleFilename(
                                         modulePath);
                                   }),
            EventQueuePriority::Idle);
      }
#endif  // defined(XP_MACOSX)
    }
  }
  mozilla::glean::pkcs11::third_party_modules_loaded.Set(
      thirdPartyModulesLoaded);
}

}  // namespace psm
}  // namespace mozilla
