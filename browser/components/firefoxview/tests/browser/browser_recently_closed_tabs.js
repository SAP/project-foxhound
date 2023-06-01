/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * The recently closed tab list is populated on a per-window basis.
 *
 * By default, the withFirefoxView helper opens a new window.
 * When using this helper for the tests in this file, we pass a
 * { win: window } option to skip that step and open fx view in
 * the current window. This ensures that the add_new_tab, close_tab,
 * and open_then_close functions are creating sessionstore entries
 * associated with the correct window where the tests are run.
 */

ChromeUtils.defineESModuleGetters(globalThis, {
  SessionStore: "resource:///modules/sessionstore/SessionStore.sys.mjs",
});

const RECENTLY_CLOSED_EVENT = [
  ["firefoxview", "entered", "firefoxview", undefined],
  ["firefoxview", "recently_closed", "tabs", undefined],
];

const CLOSED_TABS_OPEN_EVENT = [
  ["firefoxview", "closed_tabs_open", "tabs", "false"],
];

const RECENTLY_CLOSED_DISMISS_EVENT = [
  ["firefoxview", "dismiss_closed_tab", "tabs", undefined],
];

async function add_new_tab(URL) {
  let tab = BrowserTestUtils.addTab(gBrowser, URL);
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  return tab;
}

async function close_tab(tab) {
  const sessionStorePromise = BrowserTestUtils.waitForSessionStoreUpdate(tab);
  BrowserTestUtils.removeTab(tab);
  await sessionStorePromise;
}

async function dismiss_tab(tab, content) {
  info(`Dismissing tab ${tab.dataset.targetURI}`);
  const closedObjectsChanged = () =>
    TestUtils.topicObserved("sessionstore-closed-objects-changed");
  let dismissButton = tab.querySelector(".closed-tab-li-dismiss");
  EventUtils.synthesizeMouseAtCenter(dismissButton, {}, content);
  await closedObjectsChanged();
}

add_task(async function test_empty_list() {
  clearHistory();

  await withFirefoxView({ win: window }, async browser => {
    const { document } = browser.contentWindow;
    let container = document.querySelector("#collapsible-tabs-container");
    ok(
      container.classList.contains("empty-container"),
      "collapsible container should have correct styling when the list is empty"
    );

    testVisibility(browser, {
      expectedVisible: {
        "#recently-closed-tabs-placeholder": true,
        "ol.closed-tabs-list": false,
      },
    });

    const tab1 = await add_new_tab(URLs[0]);

    await close_tab(tab1);

    // The UI update happens asynchronously as we learn of the new closed tab.
    await BrowserTestUtils.waitForMutationCondition(
      container,
      { attributeFilter: ["class"] },
      () => !container.classList.contains("empty-container")
    );
    ok(
      !container.classList.contains("empty-container"),
      "collapsible container should have correct styling when the list is not empty"
    );

    testVisibility(browser, {
      expectedVisible: {
        "#recently-closed-tabs-placeholder": false,
        "ol.closed-tabs-list": true,
      },
    });

    is(
      document.querySelector("ol.closed-tabs-list").children.length,
      1,
      "recently-closed-tabs-list should have one list item"
    );
  });
});

add_task(async function test_list_ordering() {
  Services.obs.notifyObservers(null, "browser:purge-session-history");
  is(
    SessionStore.getClosedTabCount(window),
    0,
    "Closed tab count after purging session history"
  );
  await clearAllParentTelemetryEvents();

  const closedObjectsChanged = () =>
    TestUtils.topicObserved("sessionstore-closed-objects-changed");

  const tab1 = await add_new_tab(URLs[0]);
  const tab2 = await add_new_tab(URLs[1]);
  const tab3 = await add_new_tab(URLs[2]);

  gBrowser.selectedTab = tab3;

  await close_tab(tab3);
  await closedObjectsChanged();

  await close_tab(tab2);
  await closedObjectsChanged();

  await close_tab(tab1);
  await closedObjectsChanged();

  await withFirefoxView({ win: window }, async browser => {
    const { document } = browser.contentWindow;
    const tabsList = document.querySelector("ol.closed-tabs-list");
    await BrowserTestUtils.waitForMutationCondition(
      tabsList,
      { childList: true },
      () => tabsList.children.length > 1
    );

    is(
      document.querySelector("ol.closed-tabs-list").children.length,
      3,
      "recently-closed-tabs-list should have three list items"
    );

    // check that the ordering is correct when user navigates to another tab, and then closes multiple tabs.
    ok(
      document
        .querySelector("ol.closed-tabs-list")
        .firstChild.textContent.includes("mochi.test"),
      "first list item in recently-closed-tabs-list is in the correct order"
    );

    ok(
      document
        .querySelector("ol.closed-tabs-list")
        .children[2].textContent.includes("example.net"),
      "last list item in recently-closed-tabs-list is in the correct order"
    );

    let ele = document.querySelector("ol.closed-tabs-list").firstElementChild;
    let uri = ele.getAttribute("data-target-u-r-i");
    let newTabPromise = BrowserTestUtils.waitForNewTab(gBrowser, uri);
    ele.click();
    await newTabPromise;

    await TestUtils.waitForCondition(
      () => {
        let events = Services.telemetry.snapshotEvents(
          Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
          false
        ).parent;
        return events && events.length >= 2;
      },
      "Waiting for entered and recently_closed firefoxview telemetry events.",
      200,
      100
    );

    TelemetryTestUtils.assertEvents(
      RECENTLY_CLOSED_EVENT,
      { category: "firefoxview" },
      { clear: true, process: "parent" }
    );

    gBrowser.removeTab(gBrowser.selectedTab);

    await clearAllParentTelemetryEvents();

    await waitForElementVisible(
      browser,
      "#recently-closed-tabs-container > summary"
    );
    document.querySelector("#recently-closed-tabs-container > summary").click();

    await TestUtils.waitForCondition(
      () => {
        let events = Services.telemetry.snapshotEvents(
          Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
          false
        ).parent;
        return events && events.length >= 1;
      },
      "Waiting for closed_tabs_open firefoxview telemetry event.",
      200,
      100
    );

    TelemetryTestUtils.assertEvents(
      CLOSED_TABS_OPEN_EVENT,
      { category: "firefoxview" },
      { clear: true, process: "parent" }
    );
  });
});

add_task(async function test_max_list_items() {
  Services.obs.notifyObservers(null, "browser:purge-session-history");
  is(
    SessionStore.getClosedTabCount(window),
    0,
    "Closed tab count after purging session history"
  );

  await open_then_close(URLs[0]);
  await open_then_close(URLs[1]);
  await open_then_close(URLs[2]);

  // Seed the closed tabs count. We've assured that we've opened and
  // closed at least three tabs because of the calls to open_then_close
  // above.
  let mockMaxTabsLength = 3;

  await withFirefoxView({ win: window }, async browser => {
    const { document } = browser.contentWindow;

    // override this value for testing purposes
    document.querySelector(
      "recently-closed-tabs-list"
    ).maxTabsLength = mockMaxTabsLength;

    ok(
      !document
        .querySelector("#collapsible-tabs-container")
        .classList.contains("empty-container"),
      "collapsible container should have correct styling when the list is not empty"
    );

    testVisibility(browser, {
      expectedVisible: {
        "#recently-closed-tabs-placeholder": false,
        "ol.closed-tabs-list": true,
      },
    });

    is(
      document.querySelector("ol.closed-tabs-list").childNodes.length,
      mockMaxTabsLength,
      `recently-closed-tabs-list should have ${mockMaxTabsLength} list items`
    );

    const closedObjectsChanged = TestUtils.topicObserved(
      "sessionstore-closed-objects-changed"
    );
    // add another tab
    const tab = await add_new_tab(URLs[3]);
    await close_tab(tab);
    await closedObjectsChanged;

    let firstListItem = document.querySelector("ol.closed-tabs-list")
      .firstChild;
    await BrowserTestUtils.waitForMutationCondition(
      firstListItem,
      { characterData: true, childList: true, subtree: true },
      () => firstListItem.textContent.includes(".org")
    );
    ok(
      firstListItem.textContent.includes("example.org"),
      "first list item in recently-closed-tabs-list should have been updated"
    );

    is(
      document.querySelector("ol.closed-tabs-list").childNodes.length,
      mockMaxTabsLength,
      `recently-closed-tabs-list should still have ${mockMaxTabsLength} list items`
    );
  });
});

add_task(async function test_time_updates_correctly() {
  clearHistory();
  is(
    SessionStore.getClosedTabCount(window),
    0,
    "Closed tab count after purging session history"
  );

  // Set the closed tabs state to include one tab that was closed 2 seconds ago.
  // This is well below the initial threshold for displaying the 'Just now' timestamp.
  // It is also much greater than the 5ms threshold we use for the updated pref value,
  // which results in the timestamp text changing after the pref value is changed.
  const TAB_CLOSED_AGO_MS = 2000;
  const TAB_UPDATE_TIME_MS = 5;
  const TAB_CLOSED_STATE = {
    windows: [
      {
        tabs: [{ entries: [] }],
        _closedTabs: [
          {
            state: { entries: [{ url: "https://www.example.com/" }] },
            closedId: 0,
            closedAt: Date.now() - TAB_CLOSED_AGO_MS,
            image: null,
          },
        ],
      },
    ],
  };
  await SessionStore.setBrowserState(JSON.stringify(TAB_CLOSED_STATE));

  is(
    SessionStore.getClosedTabCount(window),
    1,
    "Closed tab count after setting browser state"
  );

  await withFirefoxView(
    {
      win: window,
    },
    async browser => {
      const { document } = browser.contentWindow;

      const lastListItem = document.querySelector("ol.closed-tabs-list")
        .lastChild;
      const timeLabel = lastListItem.querySelector("span.closed-tab-li-time");
      let initialTimeText = timeLabel.textContent;
      Assert.stringContains(
        initialTimeText,
        "Just now",
        "recently-closed-tabs list item time is 'Just now'"
      );

      await SpecialPowers.pushPrefEnv({
        set: [["browser.tabs.firefox-view.updateTimeMs", TAB_UPDATE_TIME_MS]],
      });

      await BrowserTestUtils.waitForMutationCondition(
        timeLabel,
        { childList: true },
        () => !timeLabel.textContent.includes("now")
      );

      isnot(
        timeLabel.textContent,
        initialTimeText,
        "recently-closed-tabs list item time has updated"
      );

      await SpecialPowers.popPrefEnv();
    }
  );
  // Cleanup recently closed tab data.
  clearHistory();
});

add_task(async function test_list_maintains_focus_when_restoring_tab() {
  await SpecialPowers.clearUserPref(RECENTLY_CLOSED_STATE_PREF);
  Services.obs.notifyObservers(null, "browser:purge-session-history");
  is(
    SessionStore.getClosedTabCount(window),
    0,
    "Closed tab count after purging session history"
  );

  const sandbox = sinon.createSandbox();
  let setupCompleteStub = sandbox.stub(
    TabsSetupFlowManager,
    "isTabSyncSetupComplete"
  );
  setupCompleteStub.returns(true);

  await open_then_close(URLs[0]);
  await open_then_close(URLs[1]);
  await open_then_close(URLs[2]);

  await withFirefoxView({ win: window }, async browser => {
    let gBrowser = browser.getTabBrowser();
    const { document } = browser.contentWindow;
    const list = document.querySelectorAll(".closed-tab-li");
    let expectedFocusedElement = list[1].querySelector(".closed-tab-li-main");
    list[0].querySelector(".closed-tab-li-main").focus();
    EventUtils.synthesizeKey("KEY_Enter");
    let firefoxViewTab = gBrowser.tabs.find(tab => tab.label == "Firefox View");
    await BrowserTestUtils.switchTab(gBrowser, firefoxViewTab);
    is(
      document.activeElement,
      expectedFocusedElement,
      "Focus should be on the first item in the recently closed list"
    );
  });

  // clean up extra tabs
  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
  }

  clearHistory();
  await open_then_close(URLs[2]);
  await withFirefoxView({ win: window }, async browser => {
    let gBrowser = browser.getTabBrowser();
    const { document } = browser.contentWindow;
    let expectedFocusedElement = document.getElementById(
      "recently-closed-tabs-header-section"
    );
    const list = document.querySelectorAll(".closed-tab-li");
    list[0].querySelector(".closed-tab-li-main").focus();

    EventUtils.synthesizeKey("KEY_Enter");
    let firefoxViewTab = gBrowser.tabs.find(tab => tab.label == "Firefox View");
    await BrowserTestUtils.switchTab(gBrowser, firefoxViewTab);
    is(
      document.activeElement,
      expectedFocusedElement,
      "Focus should be on the section header"
    );
  });

  // clean up extra tabs
  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
  }
});

add_task(async function test_switch_before_closing() {
  clearHistory();

  const INITIAL_URL = "https://example.org/iwilldisappear";
  const FINAL_URL = "https://example.com/ishouldappear";
  await withFirefoxView({ win: window }, async function(browser) {
    let gBrowser = browser.getTabBrowser();
    let newTab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      INITIAL_URL
    );
    // Switch back to FxView:
    await BrowserTestUtils.switchTab(
      gBrowser,
      gBrowser.getTabForBrowser(browser)
    );
    // Update the tab we opened to a different site:
    let loadPromise = BrowserTestUtils.browserLoaded(
      newTab.linkedBrowser,
      null,
      FINAL_URL
    );
    BrowserTestUtils.loadURIString(newTab.linkedBrowser, FINAL_URL);
    await loadPromise;

    // Close the added tab
    BrowserTestUtils.removeTab(newTab);

    const { document } = browser.contentWindow;
    const tabsList = document.querySelector("ol.closed-tabs-list");
    await BrowserTestUtils.waitForMutationCondition(
      tabsList,
      { childList: true },
      () => !!tabsList.children.length
    );
    info("A tab appeared in the list, ensure it has the right URL.");
    let urlBit = tabsList.firstElementChild.querySelector(".closed-tab-li-url");
    await BrowserTestUtils.waitForMutationCondition(
      urlBit,
      { characterData: true, attributeFilter: ["title"] },
      () => urlBit.textContent.includes(".com")
    );
    is(
      urlBit.textContent,
      "example.com",
      "Item should end up with the correct URL."
    );
  });
});

add_task(async function test_alt_click_no_launch() {
  Services.obs.notifyObservers(null, "browser:purge-session-history");
  is(
    SessionStore.getClosedTabCount(window),
    0,
    "Closed tab count after purging session history"
  );

  await open_then_close(URLs[0]);

  await withFirefoxView({ win: window }, async browser => {
    let gBrowser = browser.getTabBrowser();
    let originalTabsLength = gBrowser.tabs.length;
    await BrowserTestUtils.synthesizeMouseAtCenter(
      ".closed-tab-li",
      { altKey: true },
      browser
    );

    is(
      gBrowser.tabs.length,
      originalTabsLength,
      `Opened tabs length should still be ${originalTabsLength}`
    );
  });
});

/**
 * Asserts that tabs that have been recently closed can be
 * restored by clicking on them, using the Enter key,
 * and using the Space bar.
 */
add_task(async function test_restore_recently_closed_tabs() {
  clearHistory();

  await open_then_close(URLs[0]);
  await open_then_close(URLs[1]);
  await open_then_close(URLs[2]);

  await EventUtils.synthesizeMouseAtCenter(
    gBrowser.ownerDocument.getElementById("firefox-view-button"),
    { type: "mousedown" },
    window
  );
  // Wait for Firefox View to be loaded before interacting
  // with the page.
  await BrowserTestUtils.browserLoaded(
    window.FirefoxViewHandler.tab.linkedBrowser
  );
  let { document } = gBrowser.contentWindow;
  let tabRestored = BrowserTestUtils.waitForNewTab(gBrowser, URLs[2]);
  EventUtils.synthesizeMouseAtCenter(
    document.querySelector(".closed-tab-li"),
    {},
    gBrowser.contentWindow
  );

  await tabRestored;
  ok(true, "Tab was restored by mouse click");

  await EventUtils.synthesizeMouseAtCenter(
    gBrowser.ownerDocument.getElementById("firefox-view-button"),
    { type: "mousedown" },
    window
  );

  tabRestored = BrowserTestUtils.waitForNewTab(gBrowser, URLs[1]);
  document.querySelector(".closed-tab-li .closed-tab-li-main").focus();
  EventUtils.synthesizeKey("KEY_Enter", {}, gBrowser.contentWindow);

  await tabRestored;
  ok(true, "Tab was restored by using the Enter key");

  await EventUtils.synthesizeMouseAtCenter(
    gBrowser.ownerDocument.getElementById("firefox-view-button"),
    { type: "mousedown" },
    window
  );

  tabRestored = BrowserTestUtils.waitForNewTab(gBrowser, URLs[0]);
  document.querySelector(".closed-tab-li .closed-tab-li-main").focus();
  EventUtils.synthesizeKey(" ", {}, gBrowser.contentWindow);

  await tabRestored;
  ok(true, "Tab was restored by using the Space bar");

  // clean up extra tabs
  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
  }
});

/**
 * Asserts that tabs are removed from Recently Closed tabs in
 * Fx View when tabs are removed from latest closed tab data.
 * Ex: Selecting "Reopen Closed Tab" from the tabs toolbar
 * context menu
 */
add_task(async function test_reopen_recently_closed_tabs() {
  clearHistory();

  await open_then_close(URLs[0]);
  await open_then_close(URLs[1]);
  await open_then_close(URLs[2]);

  await EventUtils.synthesizeMouseAtCenter(
    gBrowser.ownerDocument.getElementById("firefox-view-button"),
    { type: "mousedown" },
    window
  );
  // Wait for Firefox View to be loaded before interacting
  // with the page.
  await BrowserTestUtils.browserLoaded(
    window.FirefoxViewHandler.tab.linkedBrowser
  );

  let { document } = gBrowser.contentWindow;

  let tabReopened = BrowserTestUtils.waitForNewTab(gBrowser, URLs[2]);
  SessionStore.undoCloseTab(window);
  await tabReopened;

  const tabsList = document.querySelector("ol.closed-tabs-list");

  await EventUtils.synthesizeMouseAtCenter(
    gBrowser.ownerDocument.getElementById("firefox-view-button"),
    { type: "mousedown" },
    window
  );

  await BrowserTestUtils.waitForMutationCondition(
    tabsList,
    { childList: true },
    () => tabsList.children.length === 2
  );

  Assert.equal(
    tabsList.children[0].dataset.targetURI,
    URLs[1],
    `First recently closed item should be ${URLs[1]}`
  );

  await close_tab(gBrowser.visibleTabs[gBrowser.visibleTabs.length - 1]);

  await BrowserTestUtils.waitForMutationCondition(
    tabsList,
    { childList: true },
    () => tabsList.children.length === 3
  );

  Assert.equal(
    tabsList.children[0].dataset.targetURI,
    URLs[2],
    `First recently closed item should be ${URLs[2]}`
  );

  await dismiss_tab(tabsList.children[0], content);

  await BrowserTestUtils.waitForMutationCondition(
    tabsList,
    { childList: true },
    () => tabsList.children.length === 2
  );

  Assert.equal(
    tabsList.children[0].dataset.targetURI,
    URLs[1],
    `First recently closed item should be ${URLs[1]}`
  );

  // clean up extra tabs
  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
  }
});

/**
 * Asserts that tabs that have been recently closed can be
 * dismissed by clicking on their respective dismiss buttons.
 */
add_task(async function test_dismiss_tab() {
  Services.obs.notifyObservers(null, "browser:purge-session-history");
  Assert.equal(
    SessionStore.getClosedTabCount(window),
    0,
    "Closed tab count after purging session history"
  );
  await clearAllParentTelemetryEvents();

  await withFirefoxView({ win: window }, async browser => {
    const { document } = browser.contentWindow;

    const closedObjectsChanged = () =>
      TestUtils.topicObserved("sessionstore-closed-objects-changed");

    const tab1 = await add_new_tab(URLs[0]);
    const tab2 = await add_new_tab(URLs[1]);
    const tab3 = await add_new_tab(URLs[2]);

    await close_tab(tab3);
    await closedObjectsChanged();

    await close_tab(tab2);
    await closedObjectsChanged();

    await close_tab(tab1);
    await closedObjectsChanged();

    const tabsList = document.querySelector("ol.closed-tabs-list");

    await clearAllParentTelemetryEvents();

    await dismiss_tab(tabsList.children[0], content);

    await TestUtils.waitForCondition(
      () => {
        let events = Services.telemetry.snapshotEvents(
          Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
          false
        ).parent;
        return events && events.length >= 1;
      },
      "Waiting for dismiss_closed_tab firefoxview telemetry event.",
      200,
      100
    );

    TelemetryTestUtils.assertEvents(
      RECENTLY_CLOSED_DISMISS_EVENT,
      { category: "firefoxview" },
      { clear: true, process: "parent" }
    );

    Assert.equal(
      tabsList.children[0].dataset.targetURI,
      URLs[1],
      `First recently closed item should be ${URLs[1]}`
    );

    Assert.equal(
      tabsList.children.length,
      2,
      "recently-closed-tabs-list should have two list items"
    );

    await clearAllParentTelemetryEvents();

    await dismiss_tab(tabsList.children[0], content);

    await TestUtils.waitForCondition(
      () => {
        let events = Services.telemetry.snapshotEvents(
          Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
          false
        ).parent;
        return events && events.length >= 1;
      },
      "Waiting for dismiss_closed_tab firefoxview telemetry event.",
      200,
      100
    );

    TelemetryTestUtils.assertEvents(
      RECENTLY_CLOSED_DISMISS_EVENT,
      { category: "firefoxview" },
      { clear: true, process: "parent" }
    );

    Assert.equal(
      tabsList.children[0].dataset.targetURI,
      URLs[2],
      `First recently closed item should be ${URLs[2]}`
    );

    Assert.equal(
      tabsList.children.length,
      1,
      "recently-closed-tabs-list should have one list item"
    );

    await clearAllParentTelemetryEvents();

    await dismiss_tab(tabsList.children[0], content);

    await TestUtils.waitForCondition(
      () => {
        let events = Services.telemetry.snapshotEvents(
          Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
          false
        ).parent;
        return events && events.length >= 1;
      },
      "Waiting for dismiss_closed_tab firefoxview telemetry event.",
      200,
      100
    );

    TelemetryTestUtils.assertEvents(
      RECENTLY_CLOSED_DISMISS_EVENT,
      { category: "firefoxview" },
      { clear: true, process: "parent" }
    );

    testVisibility(browser, {
      expectedVisible: {
        "#recently-closed-tabs-placeholder": true,
        "ol.closed-tabs-list": false,
      },
    });
  });
});
