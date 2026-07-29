/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Testing editing pseudo element selector in the rule view.
const TEST_URI = `
  <style>
    h1::before {
      content: "-";
      color: lime;
    }
  </style>
  <h1 class=foo>pseudo</h1>`;

add_task(async function test_inline_sheet() {
  // Avoid focusing the first declaration after editing the selector
  await pushPref("devtools.inspector.rule-view.focusNextOnEnter", false);

  await addTab(
    `data:text/html,<meta charset=utf8>${encodeURIComponent(TEST_URI)}`
  );
  const { inspector, view } = await openRuleView();

  info("Check that we can edit the selectors in the pseudo elements section");
  await selectNode("h1", inspector);

  expandPseudoElementContainer(view);

  info(`Modify "h1::before" into ".foo::before"`);
  let ruleEditor = getRuleViewRuleEditorAt(view, 0);
  is(ruleEditor.selectorText.textContent, "h1::before");
  await editSelectorForRuleEditor(view, ruleEditor, ".foo::before");

  // Get the new rule editor reference
  ruleEditor = getRuleViewRuleEditorAt(view, 0);
  is(ruleEditor.selectorText.textContent, ".foo::before");
  is(
    ruleEditor.element.getAttribute("unmatched"),
    "false",
    "pseudo element rule still matches"
  );

  info(`Modify ".foo::before" into ".foo::after"`);
  ruleEditor = getRuleViewRuleEditorAt(view, 0);
  await editSelectorForRuleEditor(view, ruleEditor, ".foo::after");

  // Get the new rule editor reference
  ruleEditor = getRuleViewRuleEditorAt(view, 0);
  is(ruleEditor.selectorText.textContent, ".foo::after");
  is(
    ruleEditor.element.getAttribute("unmatched"),
    "false",
    "pseudo element rule still matches"
  );

  info(`Modify ".foo::after" into unmatching "h2::after"`);
  ruleEditor = getRuleViewRuleEditorAt(view, 0);
  await editSelectorForRuleEditor(view, ruleEditor, "h2::after");

  // Get the new rule editor reference
  ruleEditor = getRuleViewRuleEditorAt(view, 0);
  is(ruleEditor.selectorText.textContent, "h2::after");
  is(
    ruleEditor.element.getAttribute("unmatched"),
    "true",
    "pseudo element rule does not match h1 anymore"
  );

  info(`Modify "h2::after" back into matching "h1::after"`);
  ruleEditor = getRuleViewRuleEditorAt(view, 0);
  await editSelectorForRuleEditor(view, ruleEditor, "h1::after");

  // Get the new rule editor reference
  ruleEditor = getRuleViewRuleEditorAt(view, 0);
  is(ruleEditor.selectorText.textContent, "h1::after");
  is(
    ruleEditor.element.getAttribute("unmatched"),
    "false",
    "pseudo element rule does match back the h1 node"
  );

  info(
    "Check that we can edit the selector when the pseudo element node is selected"
  );
  const h1NodeFront = await getNodeFront("h1", inspector);
  let h1NodeFrontChildren = await inspector.walker.children(h1NodeFront);
  const h1AfterNodeFront = h1NodeFrontChildren.nodes.at(-1);
  await selectNode(h1AfterNodeFront, inspector);
  // sanity check
  is(
    inspector.selection.nodeFront.displayName,
    "::after",
    "We selected the ::after pseudo element"
  );

  info(`Modify "h1::after" into ".foo::after"`);
  ruleEditor = getRuleViewRuleEditorAt(view, 0);
  await editSelectorForRuleEditor(view, ruleEditor, ".foo::after");

  // Get the new rule editor reference
  ruleEditor = getRuleViewRuleEditorAt(view, 0);
  is(ruleEditor.selectorText.textContent, ".foo::after");
  is(
    ruleEditor.element.getAttribute("unmatched"),
    "false",
    "pseudo element rule still matches"
  );

  info(`Modify ".foo::after" into "h2::after"`);
  ruleEditor = getRuleViewRuleEditorAt(view, 0);
  const onSelection = inspector.selection.once("new-node-front");
  await editSelectorForRuleEditor(view, ruleEditor, "h2::after");
  await onSelection;
  is(
    inspector.selection.nodeFront,
    h1NodeFront,
    "The parent node of the pseudo element was selected"
  );
  h1NodeFrontChildren = await inspector.walker.children(h1NodeFront);
  is(
    h1NodeFrontChildren.nodes.find(child => child.displayName === "::after"),
    undefined,
    "The ::after pseudo element was removed"
  );
});
