/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_StopGapEventTarget_h
#define mozilla_StopGapEventTarget_h

#include "nsISerialEventTarget.h"
#include "nsCOMPtr.h"
#include "nsISupports.h"
#include "nsTArray.h"
#include "mozilla/Mutex.h"
#include "mozilla/Queue.h"

namespace mozilla {

// This is an event target that buffers events until a "real" event target is
// connected to it. This is for situations where events must be dispatched, but
// we don't know *where* yet.
// Note: GetCurrentSerialEventTarget and friends will return the *real* event
// target for tasks that are dispatched to this.
class StopGapEventTarget final : public nsISerialEventTarget {
 public:
  StopGapEventTarget();

  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIEVENTTARGET_FULL

  // Call this when you know the real event target. Dispatches all queued
  // events right away, and passes subsequent events straight through.
  nsresult SetRealEventTarget(nsISerialEventTarget* aRealEventTarget);

 private:
  virtual ~StopGapEventTarget();
  typedef struct TaskStruct {
    nsCOMPtr<nsIRunnable> event;
    nsIEventTarget::DispatchFlags flags;
  } TaskStruct;

  Mutex mMutex;
  nsCOMPtr<nsISerialEventTarget> mRealEventTarget MOZ_GUARDED_BY(mMutex);
  nsTArray<TaskStruct> mTasks MOZ_GUARDED_BY(mMutex);
};
}  // namespace mozilla

#endif  // mozilla_StopGapEventTarget_h
