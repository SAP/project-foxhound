/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_PermissionStatusSink_h
#define mozilla_dom_PermissionStatusSink_h

#include "mozilla/MozPromise.h"
#include "mozilla/Mutex.h"
#include "mozilla/dom/GeolocationIPCUtils.h"
#include "mozilla/dom/PermissionStatusBinding.h"
#include "mozilla/dom/PermissionsBinding.h"
#include "nsIPermission.h"

class nsPIDOMWindowInner;

namespace mozilla::dom {

class PermissionObserver;
class PermissionStatus;
class ThreadSafeWorkerRef;

class PermissionStatusSink {
 public:
  struct InternalPermissionStates {
    uint32_t mBrowser = 0;
    PermissionState mSystem = PermissionState::Denied;
  };
  using InternalPermissionStatesPromise =
      MozPromise<InternalPermissionStates, nsresult, true>;
  using PermissionStatePromise = MozPromise<uint32_t, nsresult, true>;
  using SystemPermissionStatePromise =
      MozPromise<PermissionState, nsresult, true>;

  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(PermissionStatusSink)

  PermissionStatusSink(PermissionStatus* aPermissionStatus,
                       PermissionName aPermissionName,
                       const nsACString& aPermissionType);

  RefPtr<InternalPermissionStatesPromise> Init();

  // These functions should be called when an permission is updated which may
  // change the state of this PermissionStatus. MaybeUpdatedByOnMainThread
  // accepts the permission object itself that is update. When the permission's
  // key is not same-origin with this object's owner window/worker, such as for
  // secondary-keyed permissions like `3rdPartyFrameStorage^...`,
  // MaybeUpdatedByNotifyOnlyOnMainThread will be called with the updated
  // window/worker as an argument. MaybeUpdatedByNotifyOnly must be defined by
  // PermissionStatus inheritors that are double-keyed.
  virtual bool MaybeUpdatedByOnMainThread(nsIPermission* aPermission);
  virtual bool MaybeUpdatedByBrowserPermOnMainThread(
      nsIPermission* aPermission);
  virtual bool MaybeUpdatedByNotifyOnlyOnMainThread(
      nsPIDOMWindowInner* aInnerWindow);

  bool MaybeAffectedByBrowserIdOnMainThread(uint64_t aBrowserId);

  void PermissionChangedOnMainThread();
  void SystemPermissionChangedOnMainThread(PermissionState aState);

  PermissionName Name() const { return mPermissionName; }

  void Disentangle();

 protected:
  virtual ~PermissionStatusSink();

  virtual RefPtr<PermissionStatePromise> ComputeStateOnMainThread();

  RefPtr<PermissionStatePromise> ComputeStateOnMainThreadInternal(
      nsPIDOMWindowInner* aWindow);

  RefPtr<SystemPermissionStatePromise> ComputeSystemState();

  // Returns mPermissionStatus. Must be called on mSerialEventTarget (i.e. the
  // main thread for window sinks, the worker thread for worker sinks).
  PermissionStatus* GetPermissionStatus() {
    MOZ_ASSERT(mSerialEventTarget->IsOnCurrentThread());
    return mPermissionStatus;
  }

  void ClearPermissionStatus();

  bool GetBrowserIdOnMainThread(uint64_t* aBrowserId);

  nsCOMPtr<nsISerialEventTarget> mSerialEventTarget;
  nsCOMPtr<nsIPrincipal> mPrincipalForPermission;

  RefPtr<PermissionObserver> mObserver;

  Mutex mMutex;

 private:
  // Only access via GetPermissionStatus(). Owned by mSerialEventTarget; for
  // worker sinks the main thread must use mWorkerRef (under mMutex) instead.
  RefPtr<PermissionStatus> mPermissionStatus;

  // Protected by mutex.
  // Created and released on worker-thread. Used also on main-thread.
  RefPtr<ThreadSafeWorkerRef> mWorkerRef MOZ_GUARDED_BY(mMutex);

  PermissionName mPermissionName;
  nsCString mPermissionType;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_permissionstatusSink_h
