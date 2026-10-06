/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests if the POST data displays in the UI before the server
 * sends any response.
 */
add_task(async function () {
  const { tab, monitor } = await initNetMonitor(SIMPLE_URL, {
    requestCount: 1,
  });
  info("Starting test... ");

  const { document, store, windowRequire } = monitor.panelWin;
  const Actions = windowRequire("devtools/client/netmonitor/src/actions/index");

  store.dispatch(Actions.batchEnable(false));

  const waitForRequest = waitForDOM(document, ".request-list-item");
  SpecialPowers.spawn(
    tab.linkedBrowser,
    ["sjs_no-response-server.sjs"],
    url => {
      const xhr = new content.XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.send("foobar");
    }
  );

  await waitForRequest;
  EventUtils.sendMouseEvent(
    { type: "mousedown" },
    document.querySelectorAll(".request-list-item")[0]
  );

  const waitForPanel = waitForDOM(document, "#request-panel .cm-content");
  clickOnSidebarTab(document, "request");

  await waitForPanel;
  const tabpanel = document.querySelector("#request-panel");
  is(
    tabpanel.querySelectorAll(".empty-notice").length,
    0,
    "The empty notice is not displayed in this tabpanel."
  );

  const editor = tabpanel.querySelector(".cm-content");
  is(editor.textContent, "foobar", "The editor content is foobar");

  const requestListItem = document.querySelectorAll(".request-list-item")[0];
  ok(
    !requestListItem.querySelector(".requests-list-status-code")?.textContent,
    "The request list item should not display a status code yet."
  );

  return teardown(monitor);
});
