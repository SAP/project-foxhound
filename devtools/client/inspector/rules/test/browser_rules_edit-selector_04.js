/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the selector highlighter is removed when modifying a selector and
// the selector highlighter works for the newly added unmatched rule.

const TEST_URI = `
  <style type="text/css">
    p {
      background: red;
    }
  </style>
  <p>Test the selector highlighter</p>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("p", inspector);

  await testSelectorHighlight(view, "p");
  await testEditSelector(inspector, view, "body");
  await testSelectorHighlight(view, "body");
});

async function testSelectorHighlight(view, selector) {
  info("Test creating selector highlighter");

  info("Clicking on a selector icon");
  const { highlighter, isShown } = await clickSelectorIcon(view, selector);

  ok(highlighter, "The selector highlighter instance was created");
  ok(isShown, "The selector highlighter was shown");
}

async function testEditSelector(inspector, view, newSelector) {
  info("Test editing existing selector fields");

  const ruleEditor = getRuleViewRuleEditorAt(view, 1);

  const { waitForHighlighterTypeHidden } = getHighlighterTestHelpers(inspector);
  const onSelectorHighlighterHidden = waitForHighlighterTypeHidden(
    inspector.highlighters.TYPES.SELECTOR
  );

  await editSelectorForRuleEditor(view, ruleEditor, newSelector);

  await onSelectorHighlighterHidden;
  const highlighter = inspector.highlighters.getActiveHighlighter(
    inspector.highlighters.TYPES.SELECTOR
  );

  ok(!highlighter, "The highlighter instance was removed");
}
