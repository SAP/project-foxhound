/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef XPCOM_THREADS_TARGETSHUTDOWNTASKSET_H_
#define XPCOM_THREADS_TARGETSHUTDOWNTASKSET_H_

#include "mozilla/LinkedList.h"
#include "nsITargetShutdownTask.h"

class nsIRunnable;

// TargetShutdownTaskSet manages a set of nsITargetShutdownTask.
// It keeps a strong reference on added tasks until they are either Remove(d)
// or Extract(ed).

class TargetShutdownTaskSet {
 public:
  using TasksList = mozilla::LinkedList<RefPtr<nsITargetShutdownTask>>;
  using TasksArray = AutoTArray<nsCOMPtr<nsITargetShutdownTask>, 8>;

  TargetShutdownTaskSet() = default;
  TargetShutdownTaskSet(TargetShutdownTaskSet&& aOther) = default;
  TargetShutdownTaskSet(TargetShutdownTaskSet& aOther) = delete;

  // Add a task to the set and keep it owned. The caller can forget it if
  // it is not interested in being ever able to remove it.
  // Returns NS_ERROR_UNEXPECTED if the task is already in a
  // TargetShutdownTaskSet.
  nsresult AddTask(nsITargetShutdownTask* aTask) {
    MOZ_ASSERT(aTask);
    MOZ_ASSERT(!mShutdownTasksTaken);
    if (aTask->isInList()) {
      MOZ_ASSERT_UNREACHABLE(
          "A shutdown task can only be registered to one target.");
      return NS_ERROR_UNEXPECTED;
    }
    mShutdownTasks.insertBack(aTask);
    ++mShutdownTaskCount;
    return NS_OK;
  }

  // Remove a task from the set, based on its pointer value.
  // Returns NS_ERROR_UNEXPECTED if the task is not found.
  // Note that RemoveTask releases the set's owning reference on aTask in case
  // it was found.
  nsresult RemoveTask(nsITargetShutdownTask* aTask) {
    MOZ_ASSERT(aTask);
    if (!aTask->isInList()) {
      return NS_ERROR_UNEXPECTED;
    }
    aTask->removeFrom(mShutdownTasks);
    --mShutdownTaskCount;
    return NS_OK;
  }

  // Returns an array with owning pointers of all tasks. This must be called
  // only once. It's the caller's duty to decide how to run them.
  inline TasksArray Extract() {
    MOZ_ASSERT(!mShutdownTasksTaken);
    TasksArray ret;
    ret.SetCapacity(mShutdownTaskCount);
    while (!mShutdownTasks.isEmpty()) {
      auto task = mShutdownTasks.popFirst();
      ret.AppendElement(std::move(task));
    }
    mShutdownTaskCount = 0;
#ifdef DEBUG
    mShutdownTasksTaken = true;
#endif
    return ret;
  }

  bool IsEmpty() { return mShutdownTasks.isEmpty(); }

  ~TargetShutdownTaskSet() { MOZ_ASSERT(mShutdownTasks.isEmpty()); }

 private:
  TasksList mShutdownTasks;
  uint32_t mShutdownTaskCount{0};
#ifdef DEBUG
  bool mShutdownTasksTaken{false};
#endif
};

#endif
