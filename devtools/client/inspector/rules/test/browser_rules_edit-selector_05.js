/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that adding a new property of an unmatched rule works properly.

const TEST_URI = `
  <style type="text/css">
    #testid {
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

  info("Selecting the test element");
  await selectNode("#testid", inspector);
  await testEditSelector(view, "span");
  await testAddProperty(view);

  info("Selecting the modified element with the new rule");
  await selectNode("span", inspector);
  await checkModifiedElement(view, "span");
});

async function testEditSelector(view, newSelector) {
  info("Test editing existing selector fields");

  const ruleEditor = getRuleViewRuleEditorAt(view, 1);

  await editSelectorForRuleEditor(view, ruleEditor, newSelector);

  assertDisplayedRulesCount(view, 2);
  ok(
    getRuleViewRule(view, newSelector),
    `Rule with ${newSelector} selector exists.`
  );
  ok(
    getRuleViewRuleEditorAt(view, 1).element.getAttribute("unmatched"),
    `Rule with ${newSelector} does not match the current element.`
  );
}

function checkModifiedElement(view, selector) {
  assertDisplayedRulesCount(view, 3);
  ok(getRuleViewRule(view, selector), `Rule with ${selector} selector exists.`);
}

async function testAddProperty(view) {
  info("Test creating a new property");
  const textProp = await addProperty(view, 1, "text-align", "center");

  is(textProp.value, "center", "Text prop should have been changed.");
  ok(!textProp.overridden, "Property should not be overridden");
}
