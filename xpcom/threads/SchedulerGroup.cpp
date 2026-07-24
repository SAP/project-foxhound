/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/SchedulerGroup.h"
#include "nsThreadUtils.h"

namespace mozilla {

/* static */
nsresult SchedulerGroup::Dispatch(already_AddRefed<nsIRunnable>&& aRunnable,
                                  nsIEventTarget::DispatchFlags aFlags) {
  if (NS_IsMainThread()) {
    // NOTE: NS_DispatchToCurrentThread always specifies `NS_DISPATCH_FALLIBLE`.
    // This is done to maintain previous behaviour that all SchedulerGroup
    // dispatches from the main thread to the main thread are non-leaking.
    return NS_DispatchToCurrentThread(std::move(aRunnable));
  }
  return NS_DispatchToMainThread(std::move(aRunnable), aFlags);
}

}  // namespace mozilla
