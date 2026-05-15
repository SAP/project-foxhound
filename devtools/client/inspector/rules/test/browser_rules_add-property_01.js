/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test adding an invalid property.

const TEST_URI = `
  <style type='text/css'>
    #testid {
      background-color: blue;
    }
    .testclass {
      background-color: green;
    }
  </style>
  <div id='testid' class='testclass'>Styled Node</div>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("#testid", inspector);

  info("Test creating a new property");
  const textProp = await addProperty(view, 0, "background-color", "#XYZ");

  is(textProp.value, "#XYZ", "Text prop should have been changed.");
  is(textProp.editor.isValid(), false, "#XYZ should not be a valid entry");
  ok(
    textProp.editor.element.classList.contains("ruleview-invalid"),
    "property element should have the ruleview-invalid class"
  );

  info("Check that editing the property removes the ruleview-invalid class");
  await focusEditableField(view, textProp.editor.valueSpan);
  ok(
    !textProp.editor.element.classList.contains("ruleview-invalid"),
    "property element does not have the ruleview-invalid class when the declaration is being edited"
  );

  info("Check that the expander gets shown again after we're done editing");
  const onEditingCancelled = view.once("ruleview-changed");
  EventUtils.sendKey("ESCAPE", view.styleWindow);
  await onEditingCancelled;
  ok(
    textProp.editor.element.classList.contains("ruleview-invalid"),
    "property element should have the ruleview-invalid class again after editing is over"
  );
});
