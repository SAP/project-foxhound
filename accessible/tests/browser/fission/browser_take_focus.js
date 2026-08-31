/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from ../../mochitest/states.js */
loadScripts(
  { name: "role.js", dir: MOCHITESTS_DIR },
  { name: "states.js", dir: MOCHITESTS_DIR }
);

addAccessibleTask(
  `<div role="group"><input id="textbox" value="hello"/></div>`,
  async function (browser, iframeDocAcc, contentDocAcc) {
    const textbox = findAccessibleChildByID(iframeDocAcc, "textbox");
    const iframe = findAccessibleChildByID(contentDocAcc, "default-iframe-id");
    const iframeDoc = findAccessibleChildByID(
      contentDocAcc,
      "default-iframe-body-id"
    );
    const root = getRootAccessible(document);

    testStates(textbox, STATE_FOCUSABLE, 0, STATE_FOCUSED);

    let onFocus = waitForEvent(EVENT_FOCUS, textbox);
    textbox.takeFocus();
    await onFocus;

    testStates(textbox, STATE_FOCUSABLE | STATE_FOCUSED, 0);

    is(
      getAccessibleDOMNodeID(contentDocAcc.focusedChild),
      "textbox",
      "correct focusedChild from top doc"
    );

    is(
      getAccessibleDOMNodeID(iframeDocAcc.focusedChild),
      "textbox",
      "correct focusedChild from iframe"
    );

    is(
      getAccessibleDOMNodeID(root.focusedChild),
      "textbox",
      "correct focusedChild from root"
    );

    ok(!iframe.focusedChild, "correct focusedChild from iframe (null)");

    onFocus = waitForEvent(EVENT_FOCUS, iframeDoc);
    iframeDoc.takeFocus();
    await onFocus;

    is(
      getAccessibleDOMNodeID(contentDocAcc.focusedChild),
      "default-iframe-body-id",
      "correct focusedChild of child doc from top doc"
    );
    is(
      getAccessibleDOMNodeID(iframe.focusedChild),
      "default-iframe-body-id",
      "correct focusedChild of child doc from iframe"
    );
    is(
      getAccessibleDOMNodeID(root.focusedChild),
      "default-iframe-body-id",
      "correct focusedChild of child doc from root"
    );
  },
  { topLevel: false, iframe: true, remoteIframe: true }
);

function focusURLBar() {
  info("Focusing the URL bar");
  // XXX: See bug 2016839
  const focused = waitForEvent(
    EVENT_FOCUS,
    event => event.accessible.role == ROLE_EDITCOMBOBOX
  );
  gURLBar.focus();
  return focused;
}

// Retry takeFocus if the expected focus event doesn't arrive in time.
// This handles intermittent races when moving focus between chrome UI
// and remote content.
async function takeFocusWithRetry(acc, retries = 5, timeoutMs = 3000) {
  for (let i = 0; i < retries; i++) {
    const focused = waitForEvent(EVENT_FOCUS, acc);
    acc.takeFocus();
    let timeoutId;
    let resolveTimeout;
    const timeout = new Promise(r => {
      resolveTimeout = r;
      // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
      timeoutId = setTimeout(() => r("timeout"), timeoutMs);
    });
    const result = await Promise.race([focused, timeout]);
    if (result !== "timeout") {
      // In the ideal case, we'll recieve a focus event here before the
      // timeout comes back. When that happens, we should resolve the timeout
      // so the Promise can release both the timeout and the captured focus event.
      // Without this, browser shutdown can happen before the timeout timer fires (particularly
      // in --verify mode). This causes the reference to the focus event to leak
      // because the race wrapper is still active.
      // Leaking the focus event also leaks its associated window :(
      clearTimeout(timeoutId);
      resolveTimeout();
      return;
    }
    info(`takeFocus attempt ${i + 1} timed out, retrying...`);
  }
  ok(false, "Failed to receive focus event after multiple retries");
}

/**
 * Test takeFocus on web content when focus is in the browser UI.
 */
addAccessibleTask(
  `
<button id="outerButton">outerButton</button>
<iframe src="data:text/html,<body id='innerDoc'><button id='innerButton'>innerButton</button>"></iframe>
  `,
  async function testFocusContentWhileUiFocused(browser, docAcc) {
    await focusURLBar();
    info("Focusing docAcc");
    await takeFocusWithRetry(docAcc);

    await focusURLBar();
    info("Focusing outerButton");
    const outerButton = findAccessibleChildByID(docAcc, "outerButton");
    await takeFocusWithRetry(outerButton);

    await focusURLBar();
    info("Focusing innerButton");
    const innerButton = findAccessibleChildByID(docAcc, "innerButton");
    await takeFocusWithRetry(innerButton);

    await focusURLBar();
    info("Focusing outerButton");
    await takeFocusWithRetry(outerButton);
  },
  { chrome: true, topLevel: true, iframe: true, remoteIframe: true }
);
