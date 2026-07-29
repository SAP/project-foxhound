/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Testing selector inplace-editor behaviors in the rule-view with pseudo
// classes.

const TEST_URI = `
  <style type="text/css">
    .testclass {
      text-align: center;
    }
    #testid3::first-letter {
      text-decoration: "italic"
    }
  </style>
  <div id="testid">Styled Node</div>
  <span class="testclass">This is a span</span>
  <div class="testclass2">A</div>
  <div id="testid3">B</div>
`;

const PSEUDO_PREF = "devtools.inspector.show_pseudo_elements";

add_task(async function () {
  // Expand the pseudo-elements section by default.
  Services.prefs.setBoolPref(PSEUDO_PREF, true);

  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();

  info("Selecting the test element");
  await selectNode(".testclass", inspector);
  // Modify the first rule after the "element" one
  let ruleEditor = getRuleViewRuleEditorAt(view, 1);
  await testEditSelector(view, ruleEditor, "div:nth-child(1)");

  info("Selecting the modified element");
  await selectNode("#testid", inspector);
  await checkModifiedElement(view, "div:nth-child(1)");

  info("Selecting the test element");
  await selectNode("#testid3", inspector);
  // Modify the pseudo element selector
  ruleEditor = getRuleViewRuleEditorAt(view, 0);
  await testEditSelector(view, ruleEditor, ".testclass2::first-letter");

  info("Selecting the modified element");
  await selectNode(".testclass2", inspector);
  await checkModifiedElement(view, ".testclass2::first-letter");

  // Reset the pseudo-elements section pref to its default value.
  Services.prefs.clearUserPref(PSEUDO_PREF);
});

async function testEditSelector(view, ruleEditor, newSelector) {
  info("Test editing existing selector fields");

  await editSelectorForRuleEditor(view, ruleEditor, newSelector);

  assertDisplayedRulesCount(view, 2);
  ok(
    getRuleViewRule(view, newSelector),
    `Rule with ${newSelector} selector exists.`
  );

  const newRuleEditor =
    getRuleViewRuleEditorAt(view, 1) || getRuleViewRuleEditorAt(view, 1, 0);
  ok(
    newRuleEditor.element.getAttribute("unmatched"),
    `Rule with ${newSelector} does not match the current element.`
  );
}

function checkModifiedElement(view, selector) {
  assertDisplayedRulesCount(view, 2);
  ok(getRuleViewRule(view, selector), `Rule with ${selector} selector exists.`);
}
