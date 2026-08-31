/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Testing selector inplace-editor behaviors in the rule-view with invalid
// selectors

const TEST_URI = `
  <style type="text/css">
    .testclass {
      text-align: center;
    }
  </style>
  <div class="testclass">Styled Node</div>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode(".testclass", inspector);
  await testEditSelector(view, "asd@:::!");
});

async function testEditSelector(view, newSelector) {
  info("Test editing existing selector fields");

  const ruleEditor = getRuleViewRuleEditorAt(view, 1);

  await editSelectorForRuleEditor(view, ruleEditor, newSelector);

  assertDisplayedRulesCount(view, 2);
  is(
    getRuleViewRule(view, newSelector),
    undefined,
    `Rule with ${newSelector} selector should not exist.`
  );
  ok(
    getRuleViewRule(view, ".testclass"),
    "Rule with .testclass selector exists."
  );
}
