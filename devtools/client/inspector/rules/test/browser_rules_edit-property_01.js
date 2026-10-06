/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Testing adding new properties via the inplace-editors in the rule
// view.
// FIXME: some of the inplace-editor focus/blur/commit/revert stuff
// should be factored out in head.js

const TEST_URI = `
  <style type="text/css">
  #testid {
    color: red;
    background-color: blue;
  }
  .testclass, .unmatched {
    background-color: green;
  }
  </style>
  <div id="testid" class="testclass">Styled Node</div>
  <div id="testid2">Styled Node</div>
`;

var BACKGROUND_IMAGE_URL = 'url("' + URL_ROOT + 'doc_test_image.png")';

var TEST_DATA = [
  { name: "border-color", value: "red", isValid: true },
  { name: "background-image", value: BACKGROUND_IMAGE_URL, isValid: true },
  { name: "border", value: "solid 1px foo", isValid: false },
];

add_task(async function () {
  // Let's reset the counts.
  Services.fog.testResetFOG();

  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("#testid", inspector);

  const rule = getRuleViewRuleEditorAt(view, 1).rule;
  for (const { name, value, isValid } of TEST_DATA) {
    await testEditProperty(view, rule, name, value, isValid);
  }

  checkResults();
});

async function testEditProperty(view, rule, name, value, isValid) {
  info("Test editing existing property name/value fields");

  const doc = rule.editor.doc;
  const prop = rule.textProps[0];

  info("Focusing an existing property name in the rule-view");
  let editor = await focusEditableField(view, prop.editor.nameSpan, 32, 1);

  is(
    inplaceEditor(prop.editor.nameSpan),
    editor,
    "The property name editor got focused"
  );
  let input = editor.input;
  is(
    input.getAttribute("aria-label"),
    "Property name",
    "Property name input has expected aria-label"
  );

  info(
    "Entering a new property name, including : to commit and " +
      "focus the value"
  );
  const onValueFocus = once(rule.editor.element, "focus", true);
  const onNameDone = view.once("ruleview-changed");
  EventUtils.sendString(name + ":", doc.defaultView);
  await onValueFocus;
  await onNameDone;

  // Getting the value editor after focus
  editor = inplaceEditor(doc.activeElement);
  input = editor.input;
  is(inplaceEditor(prop.editor.valueSpan), editor, "Focus moved to the value.");

  info("Entering a new value, including ; to commit and blur the value");
  // Depending on the existing value, we may trigger a full ruleview update or only a light property one.
  const onValueDone = view.once(
    prop.value == value ? "property-value-updated" : "ruleview-changed"
  );
  const onBlur = once(input, "blur");
  EventUtils.sendString(value + ";", doc.defaultView);
  await onBlur;
  await onValueDone;

  is(
    prop.editor.isValid(),
    isValid,
    value + " is " + isValid ? "valid" : "invalid"
  );

  info("Checking that the style property was changed on the content page");
  const propValue = await getRulePropertyValue(0, 0, name);
  if (isValid) {
    is(propValue, value, name + " should have been set.");
  } else {
    isnot(propValue, value, name + " shouldn't have been set.");
  }
}

function checkResults() {
  is(5, Glean.devtoolsMain.editRuleRuleview.testGetValue().length);
}
