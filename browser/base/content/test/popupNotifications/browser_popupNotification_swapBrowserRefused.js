/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// When a browser swap occurs and a notification's eventCallback returns
// falsy from the "swapping" event, PopupNotifications removes the
// notification and must fire "removed" with withoutUserResponse = true so
// consumers know to cancel the underlying request rather than treat it as
// a user-driven dismissal.
add_task(async function refusedSwapFiresRemovedWithoutUserResponse() {
  let win = await BrowserTestUtils.openNewBrowserWindow();
  let tab = await BrowserTestUtils.openNewForegroundTab(
    win.gBrowser,
    "https://example.com/"
  );

  let swappingCalled = false;
  let removedCalled = false;
  let removedWithoutUserResponseArg;

  win.PopupNotifications.show(
    tab.linkedBrowser,
    "test-refused-swap",
    "refused swap message",
    null,
    { label: "Main", accessKey: "M", callback: () => {} },
    [{ label: "Secondary", accessKey: "S", callback: () => {} }],
    {
      eventCallback(topic, nextRemovalReason, withoutUserResponse) {
        if (topic == "swapping") {
          swappingCalled = true;
          return false;
        }
        if (topic == "removed") {
          removedCalled = true;
          removedWithoutUserResponseArg = withoutUserResponse;
        }
        return undefined;
      },
    }
  );

  let newWinPromise = BrowserTestUtils.waitForNewWindow();
  let newWin = win.gBrowser.replaceTabWithWindow(tab);
  await newWinPromise;

  ok(swappingCalled, "swapping callback fired");
  ok(removedCalled, "removed callback fired");
  is(
    removedWithoutUserResponseArg,
    true,
    "removed callback received withoutUserResponse = true"
  );

  is(
    newWin.PopupNotifications.getNotification(
      "test-refused-swap",
      newWin.gBrowser.selectedBrowser
    ),
    null,
    "notification is not present on the new window"
  );

  await BrowserTestUtils.closeWindow(newWin);
  await BrowserTestUtils.closeWindow(win);
});
