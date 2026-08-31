/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const FIRST_URL = "https://example.com/document-builder.sjs?html=first";
const SECOND_URL = "https://example.com/document-builder.sjs?html=second";

// Add a simple test for the navigation committed flag.
add_task(async function test_committed() {
  const tab = await addTabAndWaitForNavigated(gBrowser, FIRST_URL);
  const browser = tab.linkedBrowser;

  const navigationObjects = [];
  const onEvent = name => {
    const navigation = navigationManager.getNavigationForBrowsingContext(
      browser.browsingContext
    );
    navigationObjects.push({ name, committed: navigation.committed });
  };

  const navigationManager = new NavigationManager();
  navigationManager.on("navigation-started", onEvent);
  navigationManager.on("navigation-committed", onEvent);
  navigationManager.on("navigation-stopped", onEvent);

  navigationManager.startMonitoring();

  await loadURL(browser, SECOND_URL);
  await BrowserTestUtils.waitForCondition(() => navigationObjects.length === 3);
  is(
    navigationObjects[0].name,
    "navigation-started",
    "First event is navigation-started"
  );
  ok(
    !navigationObjects[0].committed,
    "Navigation object in navigation-started is not committed yet"
  );
  is(
    navigationObjects[1].name,
    "navigation-committed",
    "Second event is navigation-committed"
  );
  ok(
    navigationObjects[1].committed,
    "Navigation object in navigation-committed is committed"
  );
  is(
    navigationObjects[2].name,
    "navigation-stopped",
    "Third event is navigation-stopped"
  );
  ok(
    navigationObjects[2].committed,
    "Navigation object in navigation-stopped is committed"
  );

  navigationManager.off("navigation-started", onEvent);
  navigationManager.off("navigation-committed", onEvent);
  navigationManager.off("navigation-stopped", onEvent);
  navigationManager.stopMonitoring();
});
