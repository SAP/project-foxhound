/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ORIGIN = "https://example.com/";
const TEST_URL =
  ORIGIN + "browser/browser/base/content/test/permissions/empty.html";

function getPrincipal(origin) {
  return Services.scriptSecurityManager.createContentPrincipalFromOrigin(
    origin
  );
}

// Helper: spawn a worker in content, have it query a permission, return state.
async function queryPermissionInWorker(browser) {
  return SpecialPowers.spawn(browser, [], async () => {
    if (!content._permWorker) {
      content._permWorker = new content.Worker("permission_worker.js");
    }
    return new Promise((resolve, reject) => {
      content._permWorker.onmessage = msg => {
        if (msg.data.type === "state") {
          resolve(msg.data.state);
        } else {
          reject(new Error(msg.data.message));
        }
      };
      content._permWorker.postMessage("query");
    });
  });
}

async function terminateWorker(browser) {
  await SpecialPowers.spawn(browser, [], () => {
    if (content._permWorker) {
      content._permWorker.terminate();
      content._permWorker = null;
    }
  });
}

// Test that a dedicated worker sees browser-scoped temporary permission
// changes via the Permissions API.
add_task(async function testWorkerSeesBrowserScopedPermission() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  let browser = tab.linkedBrowser;
  let principal = getPrincipal(ORIGIN);
  let browserId = browser.browserId;

  let state = await queryPermissionInWorker(browser);
  Assert.equal(state, "prompt", "Worker should initially see prompt");

  Services.perms.addFromPrincipalForBrowser(
    principal,
    "geo",
    Services.perms.ALLOW_ACTION,
    browserId,
    0
  );

  await BrowserTestUtils.waitForCondition(
    () => queryPermissionInWorker(browser).then(s => s === "granted"),
    "Waiting for worker to see granted"
  );

  state = await queryPermissionInWorker(browser);
  Assert.equal(state, "granted", "Worker should see granted after temp allow");

  Services.perms.removeFromPrincipalForBrowser(principal, "geo", browserId);

  await BrowserTestUtils.waitForCondition(
    () => queryPermissionInWorker(browser).then(s => s === "prompt"),
    "Waiting for worker to see prompt after removal"
  );

  state = await queryPermissionInWorker(browser);
  Assert.equal(state, "prompt", "Worker should see prompt after removal");

  await terminateWorker(browser);
  BrowserTestUtils.removeTab(tab);
});

// Test that bulk browser permission clear (removeAllForBrowser) is handled
// correctly for worker sinks.
add_task(async function testWorkerSurvivesBulkBrowserPermClear() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  let browser = tab.linkedBrowser;
  let principal = getPrincipal(ORIGIN);
  let browserId = browser.browserId;

  Services.perms.addFromPrincipalForBrowser(
    principal,
    "geo",
    Services.perms.ALLOW_ACTION,
    browserId,
    0
  );

  await BrowserTestUtils.waitForCondition(
    () => queryPermissionInWorker(browser).then(s => s === "granted"),
    "Waiting for worker to see granted"
  );

  Services.perms.removeAllForBrowser(browserId);

  await BrowserTestUtils.waitForCondition(
    () => queryPermissionInWorker(browser).then(s => s === "prompt"),
    "Waiting for worker to see prompt after bulk clear"
  );

  let state = await queryPermissionInWorker(browser);
  Assert.equal(state, "prompt", "Worker should see prompt after bulk clear");

  await terminateWorker(browser);
  BrowserTestUtils.removeTab(tab);
});
