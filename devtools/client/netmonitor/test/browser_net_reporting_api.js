/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test that POST requests made by the Reporting API are displayed in the netmonitor
 */

add_task(async function () {
  info("Test Reporting API reports");
  await pushPref("dom.reporting.enabled", true);
  await pushPref("dom.reporting.header.enabled", true);

  const { monitor, tab } = await initNetMonitor(
    HTTPS_EXAMPLE_URL + "html_reporting_api-test-page.html",
    { requestCount: 1 }
  );

  info("Starting test... ");

  const { document, store, windowRequire } = monitor.panelWin;
  const Actions = windowRequire("devtools/client/netmonitor/src/actions/index");

  store.dispatch(Actions.batchEnable(false));

  const onReportingAPIRequest = waitForNetworkEvents(monitor, 1);
  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    // Trigger a Reporting API request by accessing a deprecated property
    content.wrappedJSObject.fullScreen;
  });
  await onReportingAPIRequest;

  const firstItem = document.querySelectorAll(".request-list-item")[0];
  is(
    firstItem.querySelector(".requests-list-url").innerText,
    HTTPS_EXAMPLE_URL + "sjs_simple-test-server.sjs",
    "The url in the displayed request is correct"
  );

  info("Check that we do get the report request data");

  // Wait for properties view to be displayed
  const onRequestData = waitForDOM(document, "#request-panel .properties-view");
  store.dispatch(Actions.toggleNetworkDetails());
  clickOnSidebarTab(document, "request");
  await onRequestData;

  const tabpanel = document.querySelector("#request-panel");

  const labels = tabpanel.querySelectorAll("tr .treeLabelCell .treeLabel");
  const values = tabpanel.querySelectorAll("tr .treeValueCell .objectBox");

  is(labels[4].textContent, "id", `got expected "id" row`);
  is(
    values[4].textContent,
    `"FullscreenAttribute"`,
    "got expected report id value"
  );

  is(labels[8].textContent, "type", `got expected "type" row`);
  is(values[8].textContent, `"deprecation"`, "got expected report type value");

  await teardown(monitor);
});
