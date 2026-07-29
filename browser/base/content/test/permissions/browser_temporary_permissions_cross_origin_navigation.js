/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Bug 2021626: browser-scoped temporary permissions must be forwarded to new
// content processes on cross-origin navigation round-trips (A -> B -> A).

const ORIGIN_A = "https://example.com/";
const ORIGIN_B = "https://example.org/";

add_task(async function testTempPermSurvivesCrossOriginNav() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, ORIGIN_A);
  let browser = tab.linkedBrowser;
  let principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(ORIGIN_A);
  let browserId = browser.browserId;

  Services.perms.addFromPrincipalForBrowser(
    principal,
    "geo",
    Services.perms.ALLOW_ACTION,
    browserId,
    0
  );

  await waitForPermissionState(browser, "geolocation", "granted");

  let pid1 = await SpecialPowers.spawn(
    browser,
    [],
    () => Services.appinfo.processID
  );

  // Navigate cross-origin.
  await BrowserTestUtils.loadURIString({ browser, uriString: ORIGIN_B });

  // Force a new content process for the return navigation so the new process
  // starts without any browser-scoped permissions in its local table.
  Services.ppmm.releaseCachedProcesses();
  Services.prefs.setBoolPref("dom.ipc.disableContentProcessReuse", true);

  // Navigate back.
  await BrowserTestUtils.loadURIString({ browser, uriString: ORIGIN_A });

  Services.prefs.clearUserPref("dom.ipc.disableContentProcessReuse");

  let pid2 = await SpecialPowers.spawn(
    browser,
    [],
    () => Services.appinfo.processID
  );
  Assert.notEqual(pid1, pid2, "Should have switched to a new content process");

  let state = await queryPermissionInTab(browser, "geolocation");
  Assert.equal(
    state,
    "granted",
    "Temporary permission should survive cross-origin round-trip"
  );

  Services.perms.removeFromPrincipalForBrowser(principal, "geo", browserId);
  BrowserTestUtils.removeTab(tab);
});
