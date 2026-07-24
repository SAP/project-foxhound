/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

add_setup(async function () {
  await setCookieBehaviorPref(
    BEHAVIOR_REJECT_TRACKER_AND_PARTITION_FOREIGN,
    false
  );
});

const TEST_TOP_A_PAGE = TEST_TOP_PAGE_HTTPS;
const TEST_IFRAME_B_PAGE = TEST_3RD_PARTY_PAGE;

add_task(async function runTest() {
  info("Creating the top-level A tab");
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: TEST_TOP_A_PAGE,
  });

  info("Creating the AB depth=1 iframe");
  let ifrBC = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [TEST_IFRAME_B_PAGE],
    async page => {
      const ifr = content.document.createElement("iframe");

      const loading = ContentTaskUtils.waitForEvent(ifr, "load");
      ifr.src = page;
      content.document.body.appendChild(ifr);
      await loading;

      return ifr.browsingContext;
    }
  );

  info("Register a ServiceWorker in the AB iframe");
  await SpecialPowers.spawn(ifrBC, [], async () => {
    const sw = content.navigator.serviceWorker;
    const controlled = ContentTaskUtils.waitForEvent(sw, "controllerchange");
    await sw.register("serviceWorker.js");
    await controlled;
  });

  info("Create a window.open'ed about:blank from the AB iframe");
  const [winBC, winControlled] = await SpecialPowers.spawn(ifrBC, [], () => {
    if (!content.navigator.serviceWorker.controller) {
      throw new Error("should have been controlled");
    }

    const w = content.open("about:blank");
    return [w.browsingContext, !!w.navigator.serviceWorker.controller];
  });

  // There are multiple issues if the popup would inherit the serviceworker controller.
  // - The controller has the partitioned principal from the iframe and which has a different
  //   partition key than the popup.
  // - Even if the partitioned principals would be equal, the popup is top-level and would
  //   use it's regular, unpartitioned principal.
  // - If the popup would inherit the partitioned principal, that likely would cause issues
  //   with same-origin navigations losing the partitioning.
  // - Antitracking decided to consider auxiliary browsing contexts as top-level due to web-compat.
  ok(
    !winControlled,
    "To fix the crash, we don't inherit the controller to an auxiliary BC"
  );

  info("Create a ABB iframe that should inherit the controller");
  const ifrControlled = await SpecialPowers.spawn(ifrBC, [], () => {
    if (!content.navigator.serviceWorker.controller) {
      throw new Error("should have been controlled");
    }

    let ifr = content.document.createElement("iframe");
    content.document.body.appendChild(ifr);
    return !!ifr.contentWindow.navigator.serviceWorker.controller;
  });
  ok(ifrControlled, "Iframe should inherit controller");

  info("Clean up");
  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.spawn(winBC, [], () => content.close());
  await new Promise(resolve => {
    Services.clearData.deleteData(Ci.nsIClearDataService.CLEAR_ALL, () =>
      resolve()
    );
  });
});
