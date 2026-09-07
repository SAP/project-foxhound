/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Bug 1983408
// Autosuggestion and color picker popups shouldn't remove overridden and invalid styles

const TEST_URI = `
    <style type="text/css">
    #testid {
        /* Invalid property */
        something: random;
        /* Overridden property */
        background-color: blue;
        background-color: beige;
    }
    </style>
    <div id="testid">labubu</div>`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));

  const { inspector, view } = await openRuleView();
  await selectNode("#testid", inspector);

  const ruleEditor = getRuleViewRuleEditorAt(view, 1);
  await focusNewRuleViewProperty(ruleEditor);

  info("Type in color: to activate the autosuggestion popup");
  const onRuleviewChanged = view.once("ruleview-changed");
  for (const key of "color:") {
    EventUtils.synthesizeKey(key, {}, view.styleWindow);
  }
  await onRuleviewChanged;

  ok("Check autosuggestion popup does not remove overridden visuals");
  assertOverriddenVisuals(view);

  info(
    "Open color picker popup to test that it doesn't remove overridden/invalid classes"
  );
  const colorPicker = view.tooltips.getTooltip("colorPicker");
  const onColorTooltipReady = colorPicker.once("ready");
  view.element.querySelectorAll(".inspector-colorswatch")[1].focus();
  EventUtils.synthesizeKey("VK_RETURN", {}, view.styleWindow);
  await onColorTooltipReady;

  ok(
    "Check opening color picker while autosuggestion popup is active does not remove overridden visuals"
  );
  assertOverriddenVisuals(view);

  info(
    "Close the color picker popup to test that it doesn't remove overridden/invalid classes"
  );
  const onModifications = view.once("property-value-updated");
  colorPicker.hide();
  await onModifications;

  info(
    "Check overridden/invalid classes are still present after closing color picker popup"
  );
  assertOverriddenVisuals(view);
});

function assertOverriddenVisuals(view) {
  ok(
    getTextProperty(view, 1, {
      something: "random",
    }).editor.element.classList.contains("ruleview-invalid"),
    `"something: random" is still invalid`
  );

  ok(
    getTextProperty(view, 1, {
      "background-color": "blue",
    }).editor.element.classList.contains("ruleview-overridden"),
    `"background-color: blue" is still overridden`
  );
}
