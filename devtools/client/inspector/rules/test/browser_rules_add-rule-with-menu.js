/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests the a new CSS rule can be added using the context menu.
const nodeConstants = require("resource://devtools/shared/dom-node-constants.js");

const TEST_URI = `
  <style>
    :where(#testid)::before {
      content: "before ";
    }
  </style>
  <div id="testid">${
    // put a text node big enough so the text node is not inlined
    "Test Node  ".repeat(50)
  }</div>`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();

  // Retrieve the different node fronts we're going to use
  const testidNodeFront = await getNodeFront("#testid", inspector);
  const children = await inspector.walker.children(testidNodeFront);
  const [beforeNodeFront, textNodeFront] = children.nodes;

  info("Add new rule on regular node");
  {
    await selectNode(testidNodeFront, inspector);

    info("Waiting for context menu to be shown");
    const menuitemAddRule = getAddNewRuleContextMenuItem(view);
    ok(menuitemAddRule.visible, "Add rule is visible");
    ok(!menuitemAddRule.disabled, "Add rule is not disabled");

    info("Adding the new rule and expecting a new-rule-added event");
    const onNewRuleAdded = view.once("new-rule-added");
    menuitemAddRule.click();
    await onNewRuleAdded;

    const ruleEditor = getRuleViewRuleEditor(view, 4);
    const editor = ruleEditor.selectorText.ownerDocument.activeElement;
    is(editor.value, "#testid", "Selector editor value is as expected");

    // Escaping from the selector field
    EventUtils.synthesizeKey("KEY_Escape");
  }

  info("Add new rule on pseudo element node");
  {
    await selectNode(beforeNodeFront, inspector);
    // sanity check
    is(
      inspector.selection.nodeFront.displayName,
      "::before",
      "We selected the ::before pseudo element"
    );

    info("Waiting for context menu to be shown");
    const menuitemAddRule = getAddNewRuleContextMenuItem(view);
    ok(menuitemAddRule.visible, "Add rule is visible");
    ok(!menuitemAddRule.disabled, "Add rule is not disabled");

    info("Adding the new rule and expecting a new-rule-added event");
    const onNewRuleAdded = view.once("new-rule-added");
    menuitemAddRule.click();
    await onNewRuleAdded;

    const ruleEditor = getRuleViewRuleEditor(view, 0);
    const editor = ruleEditor.selectorText.ownerDocument.activeElement;
    is(editor.value, "#testid::before", "Selector editor value is as expected");

    // Escaping from the selector field
    EventUtils.synthesizeKey("KEY_Escape");
  }

  info("Check that context menu is disabled when text node is selected");
  await selectNode(textNodeFront, inspector);
  // sanity check
  is(
    inspector.selection.nodeFront.nodeType,
    nodeConstants.TEXT_NODE,
    "We selected the text node"
  );
  info("Waiting for context menu to be shown");
  const menuitemAddRule = getAddNewRuleContextMenuItem(view);
  ok(menuitemAddRule.visible, "Add rule is visible");
  ok(
    menuitemAddRule.disabled,
    "Add rule is disabled when a text node is selected"
  );
});

function getAddNewRuleContextMenuItem(view) {
  const allMenuItems = openStyleContextMenuAndGetAllItems(view, view.element);
  return allMenuItems.find(
    item =>
      item.label ===
      STYLE_INSPECTOR_L10N.getStr("styleinspector.contextmenu.addNewRule")
  );
}
