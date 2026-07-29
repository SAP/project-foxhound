/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that reverting a selector edit does the right thing.
// Bug 1241046.

const TEST_URI = `
  <style type="text/css">
    span {
      color: chartreuse;
    }
  </style>
  <span>
    <div id="testid" class="testclass">Styled Node</div>
  </span>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();

  info("Selecting the test element");
  await selectNode("#testid", inspector);

  let idRuleEditor = getRuleViewRuleEditorAt(view, 1);

  await editSelectorForRuleEditor(view, idRuleEditor, "pre");

  info("Re-focusing the selector name in the rule-view");
  idRuleEditor = getRuleViewRuleEditorAt(view, 1);

  assertDisplayedRulesCount(view, 2);
  ok(getRuleViewRule(view, "pre"), "Rule with pre selector exists.");
  is(
    getRuleViewRuleEditorAt(view, 1).element.getAttribute("unmatched"),
    "true",
    "Rule with pre does not match the current element."
  );

  // Now change it back.
  await editSelectorForRuleEditor(view, idRuleEditor, "span");

  assertDisplayedRulesCount(view, 2);
  ok(getRuleViewRule(view, "span"), "Rule with span selector exists.");
  is(
    getRuleViewRuleEditorAt(view, 1).element.getAttribute("unmatched"),
    "false",
    "Rule with span matches the current element."
  );
});
