/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Test that EVENT_ALERT for a notification-message with an l10n label fires
 * only after translation, so screen readers can announce the message text.
 */
addAccessibleTask(
  ``,
  async function (browser) {
    const notificationBox = gBrowser.getNotificationBox(browser);

    // Resolves only when an EVENT_ALERT fires on a notification-message whose
    // shadow-root .message element already contains translated text. If
    // setAlertRole() were called before translateFragment(), every EVENT_ALERT
    // would fire with empty text and this promise would never resolve.
    let messageTextAtAlertTime;
    const onAlert = waitForEvent(EVENT_ALERT, event => {
      if (event.accessible?.DOMNode?.localName !== "notification-message") {
        return false;
      }
      const text = event.accessible.DOMNode.shadowRoot
        ?.querySelector(".message")
        ?.textContent?.trim();
      if (!text) {
        return false;
      }
      messageTextAtAlertTime = text;
      return true;
    });

    const notification = await notificationBox.appendNotification(
      "test-l10n-alert",
      {
        label: { "l10n-id": "reduced-protection-infobar-message" },
        priority: notificationBox.PRIORITY_INFO_LOW,
      }
    );

    await onAlert;
    ok(
      messageTextAtAlertTime,
      "Notification message is translated when EVENT_ALERT fires"
    );

    notificationBox.removeNotification(notification);
  },
  { topLevel: true }
);
