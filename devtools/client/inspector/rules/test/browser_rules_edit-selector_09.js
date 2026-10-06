/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that editing a selector to an unmatched rule does set up the correct
// property on the rule, and that settings property in said rule does not
// lead to overriding properties from matched rules.
// Test that having a rule with both matched and unmatched selectors does work
// correctly.

const TEST_URI = `
  <style type="text/css">
    #testid {
      color: black;
    }
    .testclass {
      background-color: white;
    }
  </style>
  <div id="testid">Styled Node</div>
  <span class="testclass">This is a span</span>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();

  await selectNode("#testid", inspector);
  await testEditSelector(view, "span");
  await testAddImportantProperty(view);
  await testAddMatchedRule(view, "span, div");
});

async function testEditSelector(view, newSelector) {
  info("Test editing existing selector fields");

  const ruleEditor = getRuleViewRuleEditorAt(view, 1);

  await editSelectorForRuleEditor(view, ruleEditor, newSelector);

  ok(
    getRuleViewRule(view, newSelector),
    `Rule with ${newSelector} selector exists.`
  );
  ok(
    getRuleViewRuleEditorAt(view, 1).element.getAttribute("unmatched"),
    `Rule with ${newSelector} does not match the current element.`
  );
}

async function testAddImportantProperty(view) {
  info("Test creating a new property with !important");
  const textProp = await addProperty(view, 1, "color", "red !important");

  is(textProp.value, "red", "Text prop should have been changed.");
  is(textProp.priority, "important", 'Text prop has an "important" priority.');
  ok(!textProp.overridden, "Property should not be overridden");

  const prop = getTextProperty(view, 1, { color: "black" });
  ok(
    !prop.overridden,
    "Existing property on matched rule should not be overridden"
  );
}

async function testAddMatchedRule(view, selector) {
  info("Test adding a matching selector");

  const ruleEditor = getRuleViewRuleEditorAt(view, 1);

  await editSelectorForRuleEditor(view, ruleEditor, selector);

  is(
    getRuleViewRuleEditorAt(view, 1).element.getAttribute("unmatched"),
    "false",
    `Rule with ${selector} does match the current element.`
  );
}
