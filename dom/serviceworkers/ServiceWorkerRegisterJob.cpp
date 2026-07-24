/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ServiceWorkerRegisterJob.h"

#include "ServiceWorkerManager.h"
#include "mozilla/ProfilerMarkers.h"
#include "mozilla/dom/WorkerCommon.h"

namespace mozilla::dom {

ServiceWorkerRegisterJob::ServiceWorkerRegisterJob(
    nsIPrincipal* aPrincipal, const nsACString& aScope, const WorkerType& aType,
    const nsACString& aScriptSpec, ServiceWorkerUpdateViaCache aUpdateViaCache,
    const ServiceWorkerLifetimeExtension& aLifetimeExtension)
    : ServiceWorkerUpdateJob(Type::Register, aPrincipal, aScope,
                             nsCString(aScriptSpec), aUpdateViaCache,
                             aLifetimeExtension),
      mType(aType) {}

void ServiceWorkerRegisterJob::AsyncExecute() {
  MOZ_ASSERT(NS_IsMainThread());

  AUTO_PROFILER_MARKER_UNTYPED("SWRJ AsyncExecute", DOM, {});

  RefPtr<ServiceWorkerManager> swm = ServiceWorkerManager::GetInstance();
  if (Canceled() || !swm) {
    FailUpdateJob(NS_ERROR_DOM_ABORT_ERR);
    return;
  }

  RefPtr<ServiceWorkerRegistrationInfo> registration =
      swm->GetRegistration(mPrincipal, mScope);

  if (registration) {
    // if registration already exists, comparing it's options to see if
    // they have been changed
    bool sameOptions =
        GetUpdateViaCache() == registration->GetUpdateViaCache() &&
        mType == registration->Type();

    registration->SetOptions(GetUpdateViaCache(), mType);

    RefPtr<ServiceWorkerInfo> newest = registration->Newest();
    if (newest && mScriptSpec.Equals(newest->ScriptSpec()) && sameOptions) {
      SetRegistration(registration);
      Finish(NS_OK);
      return;
    }
  } else {
    registration = swm->CreateNewRegistration(mScope, mType, mPrincipal,
                                              GetUpdateViaCache());
    if (!registration) {
      FailUpdateJob(NS_ERROR_DOM_ABORT_ERR);
      return;
    }
  }

  SetRegistration(registration);
  Update();
}

ServiceWorkerRegisterJob::~ServiceWorkerRegisterJob() = default;

}  // namespace mozilla::dom
