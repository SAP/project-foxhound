/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests the behaviour of adding a new rule to the rule view and editing
// its selector.

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

  await addNewRule(inspector, view);
  await testEditSelector(view, "span");

  info("Selecting the modified element with the new rule");
  await selectNode("span", inspector);
  await checkModifiedElement(view, "span");
});

async function testEditSelector(view, newSelector) {
  info("Test editing existing selector field");
  const idRuleEditor = getRuleViewRuleEditorAt(view, 1);
  await editSelectorForRuleEditor(view, idRuleEditor, newSelector);

  assertDisplayedRulesCount(view, 3);
  ok(
    getRuleViewRule(view, newSelector),
    `Rule with ${newSelector} selector exists.`
  );
}

function checkModifiedElement(view, selector) {
  assertDisplayedRulesCount(view, 2);
  ok(getRuleViewRule(view, selector), `Rule with ${selector} selector exists.`);
}
