/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef GMPTestMonitor_h_
#define GMPTestMonitor_h_

#include "mozilla/SchedulerGroup.h"
#include "mozilla/SpinEventLoopUntil.h"
#include "nsThreadUtils.h"

class GMPTestMonitor {
 public:
  GMPTestMonitor() : mFinished(false) {}

  void AwaitFinished() {
    MOZ_RELEASE_ASSERT(NS_IsMainThread());
    mozilla::SpinEventLoopUntil("GMPTestMonitor::AwaitFinished"_ns,
                                [&]() { return mFinished; });
    mFinished = false;
  }

 private:
  void MarkFinished() {
    MOZ_RELEASE_ASSERT(NS_IsMainThread());
    mFinished = true;
  }

 public:
  void SetFinished() {
    mozilla::SchedulerGroup::Dispatch(mozilla::NewNonOwningRunnableMethod(
        "GMPTestMonitor::MarkFinished", this, &GMPTestMonitor::MarkFinished));
  }

 private:
  bool mFinished;
};

#endif  // GMPTestMonitor_h_
