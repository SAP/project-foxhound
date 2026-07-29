/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_serviceworkerregisterjob_h
#define mozilla_dom_serviceworkerregisterjob_h

#include "ServiceWorkerUpdateJob.h"

namespace mozilla::dom {

// The register job.  This implements the steps in the spec Register algorithm,
// but then uses ServiceWorkerUpdateJob to implement the Update and Install
// spec algorithms.
class ServiceWorkerRegisterJob final : public ServiceWorkerUpdateJob {
 public:
  ServiceWorkerRegisterJob(
      nsIPrincipal* aPrincipal, const nsACString& aScope,
      const WorkerType& aType, const nsACString& aScriptSpec,
      ServiceWorkerUpdateViaCache aUpdateViaCache,
      const ServiceWorkerLifetimeExtension& aLifetimeExtension,
      uint16_t aIPAddressSpace = 0);

 private:
  WorkerType mType;
  uint16_t mIPAddressSpace;

  // Implement the Register algorithm steps and then call the parent class
  // Update() to complete the job execution.
  virtual void AsyncExecute() override;

  virtual ~ServiceWorkerRegisterJob();
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_serviceworkerregisterjob_h
