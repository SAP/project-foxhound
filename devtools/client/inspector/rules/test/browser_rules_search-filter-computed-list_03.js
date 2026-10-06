/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the rule view search filter works properly in the computed list
// for color values.

// The color format here is chosen to match the default returned by
// CssColor.toString.
const SEARCH = "background-color: rgb(243, 243, 243)";

const TEST_URI = `
  <style type="text/css">
    .testclass {
      background: rgb(243, 243, 243) none repeat scroll 0% 0%;
    }
  </style>
  <div class="testclass">Styled Node</h1>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode(".testclass", inspector);
  await testAddTextInFilter(inspector, view);
});

async function testAddTextInFilter(inspector, view) {
  await setSearchFilter(view, SEARCH);

  info("Check that the correct rules are visible");
  assertDisplayedRulesCount(view, 2);
  is(
    getRuleViewRuleEditorAt(view, 0).rule.selectorText,
    "element",
    "First rule is inline element."
  );

  const rule = getRuleViewRuleEditorAt(view, 1).rule;
  const ruleEditor = rule.textProps[0].editor;
  const computed = ruleEditor.computed;

  is(rule.selectorText, ".testclass", "Second rule is .testclass.");
  is(
    ruleEditor.expander.getAttribute("aria-expanded"),
    "true",
    "Expander is open."
  );
  ok(
    !ruleEditor.container.classList.contains("ruleview-highlight"),
    "background property is not highlighted."
  );
  ok(computed.hasAttribute("filter-open"), "background computed list is open.");
  ok(
    computed.children[0].classList.contains("ruleview-highlight"),
    "background-color computed property is highlighted."
  );
}
