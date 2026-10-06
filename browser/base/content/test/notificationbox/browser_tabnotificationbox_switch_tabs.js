/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

registerCleanupFunction(() => {
  Services.prefs.clearUserPref("browser.tabs.splitview.hasUsed");
});

function assertNotificationBoxHidden(reason, browser) {
  let notificationBox = gBrowser.readNotificationBox(browser);

  if (!notificationBox) {
    ok(!notificationBox, `Notification box has not been created ${reason}`);
    return;
  }

  let name = notificationBox._stack.getAttribute("name");
  ok(name, `Notification box has a name ${reason}`);

  let { selectedViewName } = notificationBox._stack.parentElement;
  Assert.notEqual(
    selectedViewName,
    name,
    `Box is not shown ${reason} ${selectedViewName} != ${name}`
  );
}

function assertNotificationBoxShown(reason, browser) {
  let notificationBox = gBrowser.readNotificationBox(browser);
  ok(notificationBox, `Notification box has been created ${reason}`);

  let name = notificationBox._stack.getAttribute("name");
  ok(name, `Notification box has a name ${reason}`);

  let { selectedViewName } = notificationBox._stack.parentElement;
  is(selectedViewName, name, `Box is shown ${reason}`);
}

function assertNotificationBoxInPanel(reason, browser) {
  let notificationBox = gBrowser.readNotificationBox(browser);
  let browserContainer = gBrowser.getBrowserContainer(browser);
  is(
    notificationBox._stack.parentNode,
    browserContainer,
    `Box is inside its panel's browserContainer ${reason}`
  );
}

function assertNotificationBoxInDeck(reason, browser) {
  let notificationBox = gBrowser.readNotificationBox(browser);
  let deck = gBrowser.getTabNotificationDeck();
  is(
    notificationBox._stack.parentNode,
    deck,
    `Box is inside the shared notification deck ${reason}`
  );
}

async function createNotification({ browser, label, value, priority }) {
  let notificationBox = gBrowser.getNotificationBox(browser);
  let notification = await notificationBox.appendNotification(value, {
    label,
    priority: notificationBox[priority],
  });
  return notification;
}

add_task(async function testNotificationInBackgroundTab() {
  let firstTab = gBrowser.selectedTab;

  // Navigating to a page should not create the notification box
  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    let notificationBox = gBrowser.readNotificationBox(browser);
    ok(!notificationBox, "The notification box has not been created");

    gBrowser.selectedTab = firstTab;
    assertNotificationBoxHidden("initial first tab");

    await createNotification({
      browser,
      label: "My notification body",
      value: "test-notification",
      priority: "PRIORITY_INFO_LOW",
    });

    gBrowser.selectedTab = gBrowser.getTabForBrowser(browser);
    assertNotificationBoxShown("notification created");
  });
});

add_task(async function testNotificationInActiveTab() {
  // Open about:blank so the notification box isn't created on tab open.
  await BrowserTestUtils.withNewTab("about:blank", async browser => {
    ok(!gBrowser.readNotificationBox(browser), "No notifications for new tab");

    await createNotification({
      browser,
      label: "Notification!",
      value: "test-notification",
      priority: "PRIORITY_INFO_LOW",
    });
    assertNotificationBoxShown("after appendNotification");
  });
});

add_task(async function testNotificationMultipleTabs() {
  let tabOne = gBrowser.selectedTab;
  let tabTwo = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    url: "about:blank",
  });
  let tabThree = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    url: "https://example.com",
  });
  let browserOne = tabOne.linkedBrowser;
  let browserTwo = tabTwo.linkedBrowser;
  let browserThree = tabThree.linkedBrowser;

  is(gBrowser.selectedBrowser, browserThree, "example.com selected");

  let notificationBoxOne = gBrowser.readNotificationBox(browserOne);
  let notificationBoxTwo = gBrowser.readNotificationBox(browserTwo);
  let notificationBoxThree = gBrowser.readNotificationBox(browserThree);

  ok(!notificationBoxOne, "no initial tab box");
  ok(!notificationBoxTwo, "no about:blank box");
  ok(!notificationBoxThree, "no example.com box");

  // Verify the correct box is shown after creating tabs.
  assertNotificationBoxHidden("after open", browserOne);
  assertNotificationBoxHidden("after open", browserTwo);
  assertNotificationBoxHidden("after open", browserThree);

  await createNotification({
    browser: browserTwo,
    label: "Test blank",
    value: "blank",
    priority: "PRIORITY_INFO_LOW",
  });
  notificationBoxTwo = gBrowser.readNotificationBox(browserTwo);
  ok(notificationBoxTwo, "Notification box was created");

  // Verify the selected browser's notification box is still hidden.
  assertNotificationBoxHidden("hidden create", browserTwo);
  assertNotificationBoxHidden("other create", browserThree);

  await createNotification({
    browser: browserThree,
    label: "Test active tab",
    value: "active",
    priority: "PRIORITY_CRITICAL_LOW",
  });
  // Verify the selected browser's notification box is still shown.
  assertNotificationBoxHidden("active create", browserTwo);
  assertNotificationBoxShown("active create", browserThree);

  gBrowser.selectedTab = tabTwo;

  // Verify the notification box for the tab that has one gets shown.
  assertNotificationBoxShown("tab switch", browserTwo);
  assertNotificationBoxHidden("tab switch", browserThree);

  BrowserTestUtils.removeTab(tabTwo);
  BrowserTestUtils.removeTab(tabThree);
});

add_task(async function testNotificationInSplitView() {
  let tabOne = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    url: "about:blank",
  });
  let tabTwo = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    url: "about:blank",
  });
  let browserOne = tabOne.linkedBrowser;
  let browserTwo = tabTwo.linkedBrowser;

  await createNotification({
    browser: browserOne,
    label: "Split view notification",
    value: "split-test",
    priority: "PRIORITY_INFO_LOW",
  });
  assertNotificationBoxInDeck("before split view", browserOne);

  let activated = BrowserTestUtils.waitForEvent(window, "TabSplitViewActivate");
  let splitView = gBrowser.addTabSplitView([tabOne, tabTwo]);
  await activated;

  // Notification box should have moved into the panel.
  assertNotificationBoxInPanel("after activate", browserOne);

  // Both panels are visible; switching selection should not hide the notification.
  gBrowser.selectedTab = tabTwo;
  assertNotificationBoxInPanel("after selecting other panel", browserOne);

  // Creating a notification on the second panel should also go into its panel.
  await createNotification({
    browser: browserTwo,
    label: "Second panel notification",
    value: "split-test-2",
    priority: "PRIORITY_INFO_LOW",
  });
  assertNotificationBoxInPanel("second panel", browserTwo);

  // Exit split view — both should move back to the shared deck.
  let deactivated = BrowserTestUtils.waitForEvent(
    window,
    "TabSplitViewDeactivate"
  );
  splitView.unsplitTabs();
  await deactivated;
  assertNotificationBoxInDeck("after deactivate", browserOne);
  assertNotificationBoxInDeck("after deactivate", browserTwo);

  // Normal tab switching should work again.
  gBrowser.selectedTab = tabOne;
  assertNotificationBoxShown("after unsplit tab switch", browserOne);
  assertNotificationBoxHidden("after unsplit tab switch", browserTwo);

  BrowserTestUtils.removeTab(tabOne);
  BrowserTestUtils.removeTab(tabTwo);
});
