/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Test network throttling `offline` mode

"use strict";

requestLongerTimeout(2);

const {
  PROFILE_CONSTANTS,
} = require("resource://devtools/client/shared/components/throttling/profiles.js");

add_task(async function () {
  await pushPref("devtools.cache.disabled", true);

  const { tab, monitor, toolbox } = await initNetMonitor(HTTPS_CUSTOM_GET_URL, {
    requestCount: 1,
  });
  await selectThrottle(monitor, PROFILE_CONSTANTS.OFFLINE);
  assertCurrentThrottleSelected(monitor, PROFILE_CONSTANTS.OFFLINE);

  const offlineEventFired = SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    async function () {
      return content.wrappedJSObject.hasOfflineEventFired();
    }
  );

  ok(offlineEventFired, "The offline event on the page fired");

  // As the browser is offline, load event won't fire
  await reloadBrowser({ waitForLoad: false });

  await assertNavigatorOnlineInConsole(toolbox, "false");
  await assertPageIsOffline();

  await selectThrottle(monitor, PROFILE_CONSTANTS.REGULAR_4G_LTE);
  assertCurrentThrottleSelected(monitor, PROFILE_CONSTANTS.REGULAR_4G_LTE);

  await reloadBrowser();

  await assertNavigatorOnlineInConsole(toolbox, "true");
  await assertPageIsOnline();

  await teardown(monitor);
});

function assertCurrentThrottleSelected(monitor, expectedProfile) {
  const doc = monitor.panelWin.document;
  is(
    doc.querySelector("#network-throttling").innerText,
    expectedProfile,
    `The '${expectedProfile}' throttle profile is correctly selected`
  );
}

function assertPageIsOffline() {
  // This is an error page.
  return SpecialPowers.spawn(
    gBrowser.selectedTab.linkedBrowser,
    [HTTPS_CUSTOM_GET_URL],
    function (uri) {
      is(
        content.document.documentURI.substring(0, 27),
        "about:neterror?e=netOffline",
        "Document URI is the error page."
      );

      // But location bar should show the original request.
      is(content.location.href, uri, "Docshell URI is the original URI.");
    }
  );
}

function assertPageIsOnline() {
  // This is an error page.
  return SpecialPowers.spawn(
    gBrowser.selectedTab.linkedBrowser,
    [HTTPS_CUSTOM_GET_URL],
    function (uri) {
      is(content.document.documentURI, uri, "Document URI is the original URI");

      // But location bar should show the original request.
      is(content.location.href, uri, "Docshell URI is the original URI.");
    }
  );
}

async function assertNavigatorOnlineInConsole(toolbox, expectedResultValue) {
  const input = "navigator.onLine";
  info(`Assert the value of '${input}' in the console`);
  await toolbox.openSplitConsole();
  const { hud } = await toolbox.getPanel("webconsole");
  hud.setInputValue(input);
  return waitForEagerEvaluationResult(hud, expectedResultValue);
}
