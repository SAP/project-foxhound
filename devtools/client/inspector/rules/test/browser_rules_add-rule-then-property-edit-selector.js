/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests the behaviour of adding a new rule to the rule view, adding a new
// property and editing the selector.

const TEST_URI = `
  <style type="text/css">
    #testid {
      text-align: center;
    }
  </style>
  <div id="testid">Styled Node</div>
  <span>This is a span</span>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("#testid", inspector);

  const rule = await addNewRuleAndDismissEditor(inspector, view, "#testid", 1);

  // Wait for the new rule to be connected to its parent stylesheet, because
  // adding a new property will require to guess the indentation from the
  // stylesheet.
  // The parent stylesheet is coming from a resource, which might be available
  // later than the actual rule front. See Bug 1899341.
  await waitFor(
    () => rule.domRule.parentStyleSheet,
    "Wait until the stylesheet resource owning the style rule was received"
  );
  ok(
    rule.domRule.parentStyleSheet,
    "The rule front is connected to its parent stylesheet"
  );

  info("Adding a new property to the new rule");
  await addProperty(view, 1, "font-weight", "bold");

  info("Editing existing selector field");
  await testEditSelector(view, "span");

  info("Selecting the modified element");
  await selectNode("span", inspector);

  info("Check new rule and property exist in the modified element");
  checkModifiedElement(view, "span", 1);
});

async function testEditSelector(view, newSelector) {
  const idRuleEditor = getRuleViewRuleEditorAt(view, 1);

  await editSelectorForRuleEditor(view, idRuleEditor, newSelector);

  assertDisplayedRulesCount(view, 3);
}

function checkModifiedElement(view, selector, index) {
  assertDisplayedRulesCount(view, 2);
  ok(getRuleViewRule(view, selector), `Rule with ${selector} selector exists.`);

  const idRuleEditor = getRuleViewRuleEditorAt(view, index);
  const textProps = idRuleEditor.rule.textProps;
  const lastRule = textProps[textProps.length - 1];
  is(lastRule.name, "font-weight", "Last rule name is font-weight");
  is(lastRule.value, "bold", "Last rule value is bold");
}
