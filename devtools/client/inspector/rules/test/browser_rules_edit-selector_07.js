/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the rule view overridden search filter does not appear for an
// unmatched rule.

const TEST_URI = `
  <style type="text/css">
    div {
      height: 0px;
    }
    #testid {
      height: 1px;
    }
    .testclass {
      height: 10px;
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
});

async function testEditSelector(view, newSelector) {
  info("Test editing existing selector fields");

  let ruleEditor = getRuleViewRuleEditorAt(view, 1);

  await editSelectorForRuleEditor(view, ruleEditor, newSelector);

  // Get the new rule editor that replaced the original
  ruleEditor = getRuleViewRuleEditorAt(view, 1);
  const rule = ruleEditor.rule;
  const textPropEditor = rule.textProps[0].editor;

  assertDisplayedRulesCount(view, 3);
  ok(
    getRuleViewRule(view, newSelector),
    `Rule with ${newSelector} selector exists.`
  );
  ok(
    ruleEditor.element.getAttribute("unmatched"),
    `Rule with ${newSelector} does not match the current element.`
  );
  ok(!textPropEditor.filterProperty, "Overridden search is hidden.");
}
