/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:expandtab:shiftwidth=2:tabstop=2:
 */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef WakeLockListener_h_
#define WakeLockListener_h_

#include "nsHashKeys.h"
#include "nsRefPtrHashtable.h"

#include "nsIDOMWakeLockListener.h"

class WakeLockTopic;

/**
 * Receives WakeLock events and simply passes it on to the right WakeLockTopic
 * to inhibit the screensaver.
 */
class WakeLockListener final : public nsIDOMMozWakeLockListener {
 public:
  NS_DECL_ISUPPORTS;

  nsresult Callback(const nsAString& topic, const nsAString& state) override;
  void SetState(const nsAString& topic, bool aBackground, bool aInhibit);

  WakeLockListener();

 private:
  ~WakeLockListener();

  // Map of topic names to |WakeLockTopic|s.
  // We assume a small, finite-sized set of topics.
  nsRefPtrHashtable<nsStringHashKey, WakeLockTopic> mForegroundTopics;
  nsRefPtrHashtable<nsStringHashKey, WakeLockTopic> mBackgroundTopics;
};

#endif  // WakeLockListener_h_
