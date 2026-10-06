/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that previewing a color value (without closing the tooltip)
// actually changes the webpage style to the correct color in real time.

const TEST_DOC = `
  <style type="text/css">
    div {
      color: red;
    }
  </style>
  <div id="test">Color preview test</div>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_DOC));
  const { inspector, view } = await openRuleView();

  await selectNode("#test", inspector);

  const swatch = getRuleViewProperty(
    view,
    "div",
    "color"
  ).valueSpan.querySelector(".inspector-colorswatch");

  info("Opening the color picker");
  const cPicker = view.tooltips.getTooltip("colorPicker");
  const onColorPickerReady = cPicker.once("ready");
  swatch.click();
  await onColorPickerReady;

  info("Previewing a new color (without closing tooltip)");
  const previewColor = [0, 0, 255, 1];
  await simulateColorPickerChange(view, cPicker, previewColor, {
    selector: "div",
    name: "color",
    value: "rgb(0, 0, 255)",
  });

  is(
    await getComputedStyleProperty("#test", null, "color"),
    "rgb(0, 0, 255)",
    "Previewing the color immediately updates the element's style"
  );

  info("Pressing ESCAPE to close the tooltip and revert the preview");
  const onHidden = cPicker.tooltip.once("hidden");
  const onModifications = view.once("ruleview-changed");
  EventUtils.sendKey(
    "ESCAPE",
    cPicker.spectrum.element.ownerDocument.defaultView
  );
  await onHidden;
  await onModifications;

  is(
    await getComputedStyleProperty("#test", null, "color"),
    "rgb(255, 0, 0)",
    "Reverting back to red"
  );
});
