/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.geckoview;

import androidx.annotation.AnyThread;
import androidx.annotation.NonNull;

/** Delegate for handling web notification events. */
public interface WebNotificationDelegate {
  /**
   * This is called when a new notification is created. The implementations of this should call
   * WebNotification.show or .dismiss, depending on whether the notification is successfully opened
   * or not.
   *
   * @param notification The WebNotification received.
   */
  @AnyThread
  default void onShowNotification(@NonNull final WebNotification notification) {}

  /**
   * This is called when an existing notification is closed. The implementations of this should call
   * WebNotification.dismiss.
   *
   * @param notification The WebNotification received.
   */
  @AnyThread
  default void onCloseNotification(@NonNull final WebNotification notification) {}
}
