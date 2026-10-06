/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Test that the node picker works while reloading a page with
// an iframe going through an intermediate about:blank document

const FRAME_URL = "https://example.com/document-builder.sjs?html=iframe";
const TEST_URL =
  `https://example.org/document-builder.sjs?html=` +
  encodeURI(
    `<h1>Pick target</h1><h2>Other element</h2><iframe></iframe><script>window.onload=()=>{document.querySelector("iframe").src = "${FRAME_URL}";}</script>`
  );

async function waitForIframeLoad() {
  const iframeBC = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    function () {
      return content.document.querySelector("iframe").browsingContext;
    }
  );
  await SpecialPowers.spawn(iframeBC, [FRAME_URL], async function (url) {
    if (
      content.document.readyState == "complete" &&
      content.location.href == url
    ) {
      return null;
    }
    return new Promise(resolve => {
      content.addEventListener("load", resolve, { once: true });
    });
  });
}

add_task(async () => {
  let { inspector, toolbox, highlighterTestFront } =
    await openInspectorForURL(TEST_URL);
  await waitForIframeLoad();

  info(
    "Start the picker and hover an element to populate the picker hovered node reference"
  );
  await startPicker(toolbox);
  await hoverElement(inspector, "iframe");

  const HIGHLIGHTER_TYPE = inspector.highlighters.TYPES.BOXMODEL;
  const { getActiveHighlighter } = getHighlighterTestHelpers(inspector);

  ok(getActiveHighlighter(HIGHLIGHTER_TYPE), "Boxmodel highlighter is shown.");
  ok(
    await highlighterTestFront.assertHighlightedNode("iframe"),
    "The highlighter is shown on the expected node"
  );

  // Do not wait for full reload as the faulty target for transient about:blank
  // document may already be destroyed and not cause troubles anymore
  const onReloaded = reloadSelectedTab();

  // Bug 2003810: hovering during the navigation may throw error in the content process,
  // but this exception wouldn't make the test fail anyway.
  hoverElement(inspector, "h1");

  await onReloaded;

  // As the previous hover may not complete, we have to do another one once the page is loaded
  await hoverElement(inspector, "h1");
  ok(getActiveHighlighter(HIGHLIGHTER_TYPE), "Boxmodel highlighter is shown.");

  highlighterTestFront = await getHighlighterTestFront(toolbox);
  ok(
    await highlighterTestFront.assertHighlightedNode("h1"),
    "The highlighter is shown on the expected node"
  );

  await stopPickerWithEscapeKey(toolbox);

  // Bug 2003810 highlighted that the toolbox couldn't be re-opened
  // as the broken, not correctly unregistered/disabled node-picker was keeping
  // its suppressedEventListener active and possibly disable all further key presses.
  // But there is no way to reproduce the exact same keypress event.
  // BrowserTestUtils.synthesizeKey/EventUtils.synthesizeNativeKey both seem to send the event only to the content.
  // And EventUtils.synthesizeKey doesn't, but avoids reproducing the regression.
  const onToolboxDestroyed = toolbox.once("destroyed");
  info("Try to close the toolbox via a key shortcut");
  if (Services.appinfo.OS == "Darwin") {
    EventUtils.synthesizeKey("i", { accelKey: true, altKey: true });
  } else {
    EventUtils.synthesizeKey("i", { accelKey: true, shiftKey: true });
  }
  await onToolboxDestroyed;
});
