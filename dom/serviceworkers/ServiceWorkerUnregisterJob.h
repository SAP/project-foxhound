/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_serviceworkerunregisterjob_h
#define mozilla_dom_serviceworkerunregisterjob_h

#include "ServiceWorkerJob.h"

namespace mozilla {
template <typename ResolveValueT, typename RejectValueT, bool IsExclusive>
class MozPromise;
using GenericPromise = MozPromise<bool, nsresult, /* IsExclusive = */ true>;
}  // namespace mozilla

namespace mozilla::dom {

class ServiceWorkerUnregisterJob final : public ServiceWorkerJob {
 public:
  ServiceWorkerUnregisterJob(nsIPrincipal* aPrincipal,
                             const nsACString& aScope);

  bool GetResult() const;

 private:
  class PushUnsubscribeCallback;

  virtual ~ServiceWorkerUnregisterJob();

  already_AddRefed<GenericPromise> ClearNotifications();
  already_AddRefed<GenericPromise> ClearPushSubscriptions();

  void AsyncExecute() override;

  void Unregister();

  bool mResult;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_serviceworkerunregisterjob_h
