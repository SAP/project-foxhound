/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Testing selector inplace-editor behaviors in the rule-view

const TEST_URI = `
  <style type="text/css">
    .testclass {
      text-align: center;
    }
  </style>
  <div id="testid" class="testclass">Styled Node</div>
  <span>This is a span</span>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();

  info("Selecting the test element");
  await selectNode("#testid", inspector);
  await testEditSelector(view, "span");

  info("Selecting the modified element with the new rule");
  await selectNode("span", inspector);
  await checkModifiedElement(view, "span");
});

async function testEditSelector(view, newSelector) {
  info("Test editing existing selector fields");

  const idRuleEditor = getRuleViewRuleEditorAt(view, 1);
  await editSelectorForRuleEditor(view, idRuleEditor, newSelector);

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
  assertDisplayedRulesCount(view, 2);
  ok(getRuleViewRule(view, selector), `Rule with ${selector} selector exists.`);
}
