/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Test that the node picker prevents firing various events to the Web Page.

const TEST_URL = `data:text/html;charset=utf8,<h1>Pick target</h1><h2>Other element</h2>
  <script>
    window.events = {};
    function reset() {
      window.events = {
        enter: 0,
        move: 0,
        over: 0,
        out: 0,
        leave: 0,
      };
    };
    reset();

    const h1 = document.querySelector("h1");
    h1.addEventListener("mouseenter", () => window.events.enter++, true);
    h1.addEventListener("mouseover", () => window.events.over++, true);
    h1.addEventListener("mousemove", () => window.events.move++, true);
    h1.addEventListener("mouseout", () => window.events.out++, true);
    h1.addEventListener("mouseleave", () => window.events.leave++, true);
  </script>`;

async function triggerPageEvents(shouldTriggerListeners) {
  await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [shouldTriggerListeners],
    async function (triggerListeners) {
      const h1 = content.document.querySelector("h1");
      EventUtils.synthesizeMouse(h1, 1, 1, { type: "mouseover" }, content);
      EventUtils.synthesizeMouse(h1, 2, 2, { type: "mousemove" }, content);
      EventUtils.synthesizeMouse(h1, 3, 3, { type: "mousemove" }, content);
      const h2 = content.document.querySelector("h2");
      // Hover the h2 element in order to trigger mouseout and mouseleave events on h1
      const onH2MouseOver = triggerListeners
        ? new Promise(r => {
            h2.addEventListener("mouseover", r);
          })
        : null;
      EventUtils.synthesizeMouse(h2, 1, 1, { type: "mouseover" }, content);
      if (triggerListeners) {
        await onH2MouseOver;
      } else {
        await new Promise(r => {
          content.setTimeout(r, 1000);
        });
      }
      if (triggerListeners) {
        is(content.wrappedJSObject.events.enter, 1);
        is(content.wrappedJSObject.events.over, 1);
        is(content.wrappedJSObject.events.move, 2);
        is(content.wrappedJSObject.events.out, 1);
        is(content.wrappedJSObject.events.leave, 1);
      } else {
        is(content.wrappedJSObject.events.enter, 0);
        is(content.wrappedJSObject.events.over, 0);
        is(content.wrappedJSObject.events.move, 0);
        is(content.wrappedJSObject.events.out, 0);
        is(content.wrappedJSObject.events.leave, 0);
      }
      content.wrappedJSObject.reset();
    }
  );
}
add_task(async () => {
  const { inspector, toolbox, highlighterTestFront } =
    await openInspectorForURL(TEST_URL);

  await triggerPageEvents(true);

  const { waitForHighlighterTypeHidden } = getHighlighterTestHelpers(inspector);

  info(
    "Start the picker and hover an element to populate the picker hovered node reference"
  );
  await startPicker(toolbox);
  await hoverElement(inspector, "h1");
  ok(
    await highlighterTestFront.assertHighlightedNode("h1"),
    "The highlighter is shown on the expected node"
  );

  await triggerPageEvents(false);

  info("Hit Escape to cancel picking");
  const onHighlighterHidden = waitForHighlighterTypeHidden(
    inspector.highlighters.TYPES.BOXMODEL
  );
  await stopPickerWithEscapeKey(toolbox);
  await onHighlighterHidden;
});
