/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that hitting shift + click on color swatch while editing the property
// name will only change the color unit and not lead to edit the property value.
// See also Bug 1248274.

const TEST_URI = `
  <style type="text/css">
  div {
    color: red;
  }
  </style>
  <div>Styled Node</div>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();

  info("Test shift + click on color swatch while editing property name");

  await selectNode("div", inspector);
  const prop = getTextProperty(view, 1, {
    color: "red",
  });
  const propEditor = prop.editor;

  const swatchSpan = propEditor.valueSpan.querySelector(
    ".inspector-colorswatch"
  );

  info("Focus the background name span");
  await focusEditableField(view, propEditor.nameSpan);
  const editor = inplaceEditor(propEditor.doc.activeElement);

  info(
    "Modify the property to background-color to trigger the " +
      "property-value-updated event"
  );
  editor.input.value = "background-color";

  const onPropertyValueUpdate = view.once("property-value-updated");
  const onSwatchUnitChange = once(swatchSpan, "unit-change");
  const onRuleViewChanged = view.once("ruleview-changed");

  info("blur propEditor.nameSpan by clicking on the color swatch");
  EventUtils.synthesizeMouseAtCenter(
    swatchSpan,
    { shiftKey: true },
    propEditor.doc.defaultView
  );

  info(
    "wait for ruleview-changed event to be triggered to prevent pending requests"
  );
  await onRuleViewChanged;

  info("wait for the color unit to change");
  await onSwatchUnitChange;
  ok(true, "the color unit was changed");

  info("wait for the property value to be updated");
  await onPropertyValueUpdate;

  ok(
    !inplaceEditor(propEditor.valueSpan),
    "The inplace editor wasn't shown " +
      "as a result of the color swatch shift + click"
  );
});
