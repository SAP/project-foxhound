/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * A test to verify that ABA iframes partition at least localStorage and document.cookie
 */

"use strict";

add_setup(async function () {
  await setCookieBehaviorPref(BEHAVIOR_PARTITION_FOREIGN, false);
});

add_task(async function runTest() {
  info("Creating the tab");
  let tab = BrowserTestUtils.addTab(gBrowser, TEST_TOP_PAGE_HTTPS);
  gBrowser.selectedTab = tab;

  let browser = tab.linkedBrowser;
  await BrowserTestUtils.browserLoaded(browser);

  info("Creating the third-party iframe");
  let ifrBC = await SpecialPowers.spawn(
    browser,
    [TEST_4TH_PARTY_PAGE_HTTPS],
    async page => {
      let ifr = content.document.createElement("iframe");

      let loading = ContentTaskUtils.waitForEvent(ifr, "load");
      ifr.src = page;
      content.document.body.appendChild(ifr);
      await loading;

      return ifr.browsingContext;
    }
  );

  info("Creating the ABA iframe");
  let ifrABABC = await SpecialPowers.spawn(
    ifrBC,
    [TEST_TOP_PAGE_HTTPS],
    async page => {
      let ifr = content.document.createElement("iframe");

      let loading = ContentTaskUtils.waitForEvent(ifr, "load");
      ifr.src = page;
      content.document.body.appendChild(ifr);
      await loading;

      return ifr.browsingContext;
    }
  );

  info("Write cookie to the ABA third-party iframe");
  await SpecialPowers.spawn(ifrABABC, [], async _ => {
    content.document.cookie = "foo=bar; SameSite=None; Secure; Partitioned";
  });

  let cookie = await SpecialPowers.spawn(browser, [], async () => {
    return content.document.cookie;
  });
  is(cookie, "", "Cookie is not in the top level");

  info("Write localstorage to the ABA third-party iframe");
  await SpecialPowers.spawn(ifrABABC, [], async _ => {
    content.localStorage.setItem("foo", "bar");
  });

  let storage = await SpecialPowers.spawn(browser, [], async () => {
    return content.localStorage.getItem("foo");
  });
  is(storage, null, "LocalStorage update is not in the top level");

  let abaSubresourceBody = await SpecialPowers.spawn(
    ifrBC,
    [TEST_DOMAIN_HTTPS + TEST_PATH + "cookiesCORS.sjs"],
    async resource => {
      let result = await content.fetch(resource, { credentials: "include" });
      return await result.text();
    }
  );
  is(
    abaSubresourceBody,
    "cookie:foo=bar",
    "Partitioned cookie exists in A(B-fetch->A) request"
  );

  info("Calling requestStorageAccess in the ABA iframe");
  let granted = await SpecialPowers.spawn(ifrABABC, [], async () => {
    SpecialPowers.wrap(content.document).notifyUserGestureActivation();
    try {
      await content.document.requestStorageAccess();
    } catch {
      return false;
    }
    return content.document.hasStorageAccess();
  });

  ok(granted, "requestStorageAccess resolved and hasStorageAccess is true");

  info("Verifying no permission was written to the permission manager");
  let topURI = Services.io.newURI(TEST_DOMAIN_HTTPS);
  is(
    PermissionTestUtils.testPermission(
      topURI,
      "3rdPartyFrameStorage^https://example.net"
    ),
    Services.perms.UNKNOWN_ACTION,
    "No 3rdPartyFrameStorage permission was added for ABA iframe"
  );
  is(
    PermissionTestUtils.testPermission(
      topURI,
      "3rdPartyStorage^https://example.net"
    ),
    Services.perms.UNKNOWN_ACTION,
    "No 3rdPartyStorage permission was added for ABA iframe"
  );

  info("Clean up");
  BrowserTestUtils.removeTab(tab);
  await new Promise(resolve => {
    Services.clearData.deleteData(Ci.nsIClearDataService.CLEAR_ALL, () =>
      resolve()
    );
  });
});
