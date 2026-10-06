/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test editing selectors for rules inside @import'd stylesheets.
// This is a regression test for bug 1355819.

add_task(async function () {
  await addTab(URL_ROOT + "doc_edit_imported_selector.html");
  const { inspector, view } = await openRuleView();

  info("Select the node styled by an @import'd rule");
  await selectNode("#target", inspector);

  info("Focus the selector in the rule-view");
  let ruleEditor = getRuleViewRuleEditorAt(view, 1);
  await editSelectorForRuleEditor(view, ruleEditor, "div");

  info("Check the rules are still displayed correctly");
  assertDisplayedRulesCount(view, 3);

  ruleEditor = getRuleViewRuleEditorAt(view, 1);
  is(
    ruleEditor.element.getAttribute("unmatched"),
    "false",
    "Rule editor is matched."
  );
  is(ruleEditor.selectorText.textContent, "div", "The new selector is correct");
});
