/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* eslint-disable camelcase */
// From https://learn.microsoft.com/en-us/windows/win32/api/uiautomationcore/ne-uiautomationcore-notificationkind
const NotificationKind_ActionCompleted = 2;
// From https://learn.microsoft.com/en-us/windows/win32/api/uiautomationcore/ne-uiautomationcore-notificationprocessing
const NotificationProcessing_ImportantAll = 0;
const NotificationProcessing_All = 2;
/* eslint-enable camelcase */

addUiaTask(
  `
<button id="button"></button>
<main id="main"><p id="p">abc</p></main>
  `,
  async function testNotification(browser) {
    info("button.ariaNotify a normal");
    await setUpWaitForUiaEvent("Notification", "button");
    await invokeContentTask(browser, [], () => {
      content.button = content.document.getElementById("button");
      content.button.ariaNotify("a");
    });
    await waitForUiaEvent();
    ok(true, "Got Notification event");
    is(await runPython(`event.displayString`), "a", "displayString correct");
    is(
      await runPython(`event.notificationKind`),
      NotificationKind_ActionCompleted,
      "notificationKind correct"
    );
    is(
      await runPython(`event.notificationProcessing`),
      NotificationProcessing_All,
      "notificationProcessing correct"
    );

    info("button.ariaNotify b high");
    await setUpWaitForUiaEvent("Notification", "button");
    await invokeContentTask(browser, [], () => {
      content.button.ariaNotify("b", { priority: "high" });
    });
    await waitForUiaEvent();
    ok(true, "Got Notification event");
    is(await runPython(`event.displayString`), "b", "displayString correct");
    is(
      await runPython(`event.notificationProcessing`),
      NotificationProcessing_ImportantAll,
      "notificationProcessing correct"
    );

    info("doc.ariaNotify c");
    await setUpWaitForUiaEvent("Notification", DEFAULT_CONTENT_DOC_BODY_ID);
    await invokeContentTask(browser, [], () => {
      content.document.ariaNotify("c");
    });
    await waitForUiaEvent();
    ok(true, "Got Notification event");
    is(await runPython(`event.displayString`), "c", "displayString correct");

    info("p.ariaNotify d");
    // p isn't in the UIA control view, so the event should fire on main.
    await setUpWaitForUiaEvent("Notification", "main");
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("p").ariaNotify("d");
    });
    await waitForUiaEvent();
    ok(true, "Got Notification event on button");
    is(await runPython(`event.displayString`), "d", "displayString correct");
  },
  // The IA2 -> UIA proxy doesn't support Notification events.
  { uiaEnabled: true, uiaDisabled: false }
);
