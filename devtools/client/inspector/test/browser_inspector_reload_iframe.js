/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

// Check that the markup view selection is preserved even if the selection is
// in an iframe.

// We're loading an image that would take a few second to load so the iframe won't have
// its readyState to "complete" (it should be "interactive").
// That was causing some issue, see Bug 1733539.

function getTestURI(delay) {
  const IMG_URL = `${URL_ROOT_COM_SSL}sjs_slow-loading-image.sjs?delay=${delay}`;
  const FRAME_URI =
    "data:text/html;charset=utf-8," +
    encodeURI(`
      <div id="in-frame">div in the iframe</div>
      <img src="${IMG_URL}"></img>
    `);
  const HTML = `
    <iframe src="${FRAME_URI}"></iframe>
  `;

  return "data:text/html;charset=utf-8," + encodeURI(HTML);
}

add_task(async function () {
  const { getSystemInfo } = require("resource://devtools/shared/system.js");

  const INSPECTOR_FIND_NODE_TIMEOUT = 1000 * getSystemInfo().timeoutMultiplier;
  const TEST_URI = getTestURI(INSPECTOR_FIND_NODE_TIMEOUT / 10);
  const SLOW_TEST_URI = getTestURI(INSPECTOR_FIND_NODE_TIMEOUT + 5000);

  const { inspector } = await openInspectorForURL(TEST_URI);

  await selectNodeInFrames(["iframe", "#in-frame"], inspector);

  let markupLoaded = inspector.once("markuploaded");

  info("Reloading page.");
  await navigateTo(TEST_URI);

  info("Waiting for markupview to load after reload.");
  await markupLoaded;

  const reloadedNodeFront = await getNodeFrontInFrames(
    ["iframe", "#in-frame"],
    inspector
  );

  is(
    inspector.selection.nodeFront,
    reloadedNodeFront,
    "#in-frame selected after reload."
  );

  info("Check that markup view is not blocked for a page with a slow iframe");
  await navigateTo(SLOW_TEST_URI);
  await selectNodeInFrames(["iframe", "#in-frame"], inspector);

  markupLoaded = inspector.once("markuploaded");

  info("Reloading page.");
  const onNavigate = navigateTo(SLOW_TEST_URI);

  info("Waiting for markupview to load after reload.");
  await markupLoaded;

  info("Check that the navigation is not done yet");
  ok(
    !(await hasPromiseResolved(onNavigate)),
    "Navigation to page with slow iframe is not done yet"
  );

  const bodyNodeFront = await getNodeFrontInFrames(["body"], inspector);
  is(
    inspector.selection.nodeFront,
    bodyNodeFront,
    "Iframe was too slow to load, the markup view selected body as fallback"
  );

  await onNavigate;
});

async function hasPromiseResolved(promise) {
  let resolved = false;

  // Note that the catch() is only here to avoid leaking promise rejections.
  // In all cases the resolved flag should be successfully flipped in finally().
  promise.finally(() => (resolved = true)).catch(() => {});
  // Make sure microtasks have time to run.
  await new Promise(resolve => Services.tm.dispatchToMainThread(resolve));
  return resolved;
}
