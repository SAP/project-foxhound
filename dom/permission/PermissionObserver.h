/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_PermissionObserver_h_
#define mozilla_dom_PermissionObserver_h_

#include "mozilla/dom/PermissionStatusBinding.h"
#include "mozilla/dom/PermissionsBinding.h"
#include "nsIObserver.h"
#include "nsTArray.h"
#include "nsWeakReference.h"

namespace mozilla::dom {

class PermissionStatusSink;

// Singleton that watches for perm-changed notifications in order to notify
// PermissionStatus objects.
class PermissionObserver final : public nsIObserver,
                                 public nsSupportsWeakReference {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIOBSERVER

  static already_AddRefed<PermissionObserver> GetInstance();

  void AddSink(PermissionStatusSink* aSink);
  void RemoveSink(PermissionStatusSink* aSink);

  static void NotifySystemPermissionChanged(PermissionName aName,
                                            PermissionState aState);
  static void EnsureMonitoringInParent(PermissionName aName);

 private:
  PermissionObserver();
  virtual ~PermissionObserver();

  nsTArray<RefPtr<PermissionStatusSink>> mSinks;
};

}  // namespace mozilla::dom

#endif
