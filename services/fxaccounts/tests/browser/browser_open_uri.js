/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// We don't use the mock service from head.js as we want a little more control over when the
// callback is called. We should try to consolidate, but one yak at a time.
let gMockAlertsService;

function createMockAlertsService() {
  return {
    clickCallback: null,
    showAlert(alert, callback) {
      this.clickCallback = callback;
    },
    simulateClick() {
      if (this.clickCallback) {
        this.clickCallback(null, "alertclickcallback");
        this.clickCallback = null;
      }
    },
  };
}

function sendOpenUriNotification(uris) {
  let subject = {
    wrappedJSObject: {
      object: uris,
    },
  };
  Services.obs.notifyObservers(subject, "fxaccounts:commands:open-uri");
}

add_setup(async function () {
  const { AccountsGlue } = ChromeUtils.importESModule(
    "resource:///modules/AccountsGlue.sys.mjs"
  );
  gMockAlertsService = createMockAlertsService();
  const wrappedService = { wrappedJSObject: gMockAlertsService };

  AccountsGlue.observe(
    wrappedService,
    "browser-glue-test",
    "mock-alerts-service"
  );
});

add_task(async function test_open_single_tab() {
  let uris = [
    {
      uri: "https://example.com/single",
      sender: { id: "device1", name: "Device 1" },
    },
  ];

  let tabPromise = BrowserTestUtils.waitForNewTab(
    gBrowser,
    "https://example.com/single",
    false,
    true
  );

  sendOpenUriNotification(uris);

  let tab = await tabPromise;

  Assert.ok(tab, "Tab opened");
  Assert.ok(
    !PrivateBrowsingUtils.isBrowserPrivate(tab.linkedBrowser),
    "Tab is not private"
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_open_multiple_tabs() {
  let uris = [
    {
      uri: "https://example.org/1",
      sender: { id: "device2", name: "Device 2" },
    },
    {
      uri: "https://example.org/2",
      sender: { id: "device2", name: "Device 2" },
    },
    {
      uri: "https://example.org/3",
      sender: { id: "device2", name: "Device 2" },
    },
  ];

  let tab1Promise = BrowserTestUtils.waitForNewTab(
    gBrowser,
    "https://example.org/1",
    false,
    true
  );
  let tab2Promise = BrowserTestUtils.waitForNewTab(
    gBrowser,
    "https://example.org/2",
    false,
    true
  );
  let tab3Promise = BrowserTestUtils.waitForNewTab(
    gBrowser,
    "https://example.org/3",
    false,
    true
  );

  sendOpenUriNotification(uris);

  let tab1 = await tab1Promise;
  let tab2 = await tab2Promise;
  let tab3 = await tab3Promise;

  Assert.ok(tab1, "First tab opened");
  Assert.ok(tab2, "Second tab opened");
  Assert.ok(tab3, "Third tab opened");
  Assert.ok(
    !PrivateBrowsingUtils.isBrowserPrivate(tab1.linkedBrowser),
    "First tab is not private"
  );
  Assert.ok(
    !PrivateBrowsingUtils.isBrowserPrivate(tab2.linkedBrowser),
    "Second tab is not private"
  );
  Assert.ok(
    !PrivateBrowsingUtils.isBrowserPrivate(tab3.linkedBrowser),
    "Third tab is not private"
  );

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
  BrowserTestUtils.removeTab(tab3);
});

add_task(async function test_open_private_tabs() {
  let privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  let uris = [
    {
      uri: "https://example.com/private1",
      private: true,
      sender: { id: "device3", name: "Device 3" },
    },
    {
      uri: "https://example.com/private2",
      private: true,
      sender: { id: "device3", name: "Device 3" },
    },
  ];

  let tab1Promise = BrowserTestUtils.waitForNewTab(
    privateWin.gBrowser,
    "https://example.com/private1",
    false,
    true
  );
  let tab2Promise = BrowserTestUtils.waitForNewTab(
    privateWin.gBrowser,
    "https://example.com/private2",
    false,
    true
  );

  sendOpenUriNotification(uris);

  let tab1 = await tab1Promise;
  let tab2 = await tab2Promise;

  Assert.ok(tab1, "First private tab opened");
  Assert.ok(tab2, "Second private tab opened");
  Assert.ok(
    PrivateBrowsingUtils.isBrowserPrivate(tab1.linkedBrowser),
    "First tab is private"
  );
  Assert.ok(
    PrivateBrowsingUtils.isBrowserPrivate(tab2.linkedBrowser),
    "Second tab is private"
  );

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
  await BrowserTestUtils.closeWindow(privateWin);
});

add_task(async function test_open_mixed_private_and_non_private_tabs() {
  let privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  let uris = [
    {
      uri: "https://example.net/mixed1",
      private: false,
      sender: { id: "device4", name: "Device 4" },
    },
    {
      uri: "https://example.net/mixed2",
      private: true,
      sender: { id: "device4", name: "Device 4" },
    },
    {
      uri: "https://example.net/mixed3",
      private: false,
      sender: { id: "device4", name: "Device 4" },
    },
  ];

  let normalTab1Promise = BrowserTestUtils.waitForNewTab(
    gBrowser,
    "https://example.net/mixed1",
    false,
    true
  );
  let privateTabPromise = BrowserTestUtils.waitForNewTab(
    privateWin.gBrowser,
    "https://example.net/mixed2",
    false,
    true
  );
  let normalTab2Promise = BrowserTestUtils.waitForNewTab(
    gBrowser,
    "https://example.net/mixed3",
    false,
    true
  );

  sendOpenUriNotification(uris);

  let normalTab1 = await normalTab1Promise;
  let privateTab = await privateTabPromise;
  let normalTab2 = await normalTab2Promise;

  Assert.ok(normalTab1, "First non-private tab opened");
  Assert.ok(privateTab, "Private tab opened");
  Assert.ok(normalTab2, "Second non-private tab opened");
  Assert.ok(
    !PrivateBrowsingUtils.isBrowserPrivate(normalTab1.linkedBrowser),
    "First tab is not private"
  );
  Assert.ok(
    PrivateBrowsingUtils.isBrowserPrivate(privateTab.linkedBrowser),
    "Tab is private"
  );
  Assert.ok(
    !PrivateBrowsingUtils.isBrowserPrivate(normalTab2.linkedBrowser),
    "Third tab is not private"
  );

  BrowserTestUtils.removeTab(normalTab1);
  BrowserTestUtils.removeTab(normalTab2);
  await BrowserTestUtils.closeWindow(privateWin);
});

add_task(
  async function test_notification_click_focuses_non_private_tab_first() {
    let privateWin = await BrowserTestUtils.openNewBrowserWindow({
      private: true,
    });

    let uris = [
      {
        uri: "https://example.com/focus1",
        private: false,
        sender: { id: "device5", name: "Device 5" },
      },
      {
        uri: "https://example.com/focus2",
        private: true,
        sender: { id: "device5", name: "Device 5" },
      },
    ];

    let normalTabPromise = BrowserTestUtils.waitForNewTab(
      gBrowser,
      "https://example.com/focus1",
      false,
      true
    );
    let privateTabPromise = BrowserTestUtils.waitForNewTab(
      privateWin.gBrowser,
      "https://example.com/focus2",
      false,
      true
    );

    sendOpenUriNotification(uris);

    let normalTab = await normalTabPromise;
    let privateTab = await privateTabPromise;

    Assert.notEqual(
      gBrowser.selectedTab,
      normalTab,
      "Normal tab should not be selected initially"
    );

    gMockAlertsService.simulateClick();

    await TestUtils.waitForCondition(
      () => gBrowser.selectedTab === normalTab,
      "Waiting for first (non-private) tab to be selected"
    );

    Assert.equal(
      gBrowser.selectedTab,
      normalTab,
      "Clicking notification should focus first tab (non-private)"
    );
    // XXX - there was a test that `window == Services.wm.getMostRecentBrowserWindow()`, but that
    // is apparently platform specific and so failed on Linux on CI.

    BrowserTestUtils.removeTab(normalTab);
    BrowserTestUtils.removeTab(privateTab);
    await BrowserTestUtils.closeWindow(privateWin);
  }
);

add_task(async function test_notification_click_focuses_private_tab_first() {
  let privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  let uris = [
    {
      uri: "https://example.com/privatefocus1",
      private: true,
      sender: { id: "device6", name: "Device 6" },
    },
    {
      uri: "https://example.com/privatefocus2",
      private: false,
      sender: { id: "device6", name: "Device 6" },
    },
  ];

  let privateTabPromise = BrowserTestUtils.waitForNewTab(
    privateWin.gBrowser,
    "https://example.com/privatefocus1",
    false,
    true
  );
  let normalTabPromise = BrowserTestUtils.waitForNewTab(
    gBrowser,
    "https://example.com/privatefocus2",
    false,
    true
  );

  sendOpenUriNotification(uris);

  let privateTab = await privateTabPromise;
  let normalTab = await normalTabPromise;

  Assert.notEqual(
    privateWin.gBrowser.selectedTab,
    privateTab,
    "Private tab should not be selected initially"
  );

  gMockAlertsService.simulateClick();

  await TestUtils.waitForCondition(
    () => privateWin.gBrowser.selectedTab === privateTab,
    "Waiting for first (private) tab to be selected"
  );

  Assert.equal(
    privateWin.gBrowser.selectedTab,
    privateTab,
    "Clicking notification should focus first tab (private)"
  );
  Assert.equal(
    Services.wm.getMostRecentBrowserWindow(),
    privateWin,
    "Private window should be focused"
  );

  BrowserTestUtils.removeTab(privateTab);
  BrowserTestUtils.removeTab(normalTab);
  await BrowserTestUtils.closeWindow(privateWin);
});
