/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const nodeConstants = require("resource://devtools/shared/dom-node-constants.js");

// Tests if the `Add rule` button disables itself properly for non-element nodes.

const TEST_URI = `
  <style type="text/css">
    #pseudo::before {
      content: "before";
    }
  </style>
  <div id="pseudo">${
    // put a text node big enough so the text node is not inlined
    "pseudo  ".repeat(50)
  }
  </div>
  <-- my comment -->
  <div id="testid">Test Node</div>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await testDisabledButton(inspector, view);
});

async function testDisabledButton(inspector, view) {
  const node = "#testid";

  info("Selecting a real element");
  await selectNode(node, inspector);
  ok(
    !view.addRuleButton.disabled,
    "Add rule button should be enabled for regular element"
  );

  info("Clear selection");
  await view.selectElement(null);
  ok(
    view.addRuleButton.disabled,
    "Add rule button should be disabled when no element is selected"
  );

  info("Selecting a real element");
  await selectNode(node, inspector);
  ok(
    !view.addRuleButton.disabled,
    "Add rule button should be enabled again when selecting regular element"
  );

  info("Selecting a pseudo element");
  const pseudo = await getNodeFront("#pseudo", inspector);
  const children = await inspector.walker.children(pseudo);
  const [beforeNodeFront, textNodeFront] = children.nodes;
  await selectNode(beforeNodeFront, inspector);
  // sanity check
  is(
    inspector.selection.nodeFront.displayName,
    "::before",
    "We selected the ::before pseudo element"
  );
  ok(
    !view.addRuleButton.disabled,
    "Add rule button should be enabled for pseudo element"
  );

  await selectNode(textNodeFront, inspector);
  // sanity check
  is(
    inspector.selection.nodeFront.nodeType,
    nodeConstants.TEXT_NODE,
    "We selected the text node"
  );
  ok(
    view.addRuleButton.disabled,
    "Add rule button should be disabled for text node"
  );

  info("Selecting a real element");
  await selectNode(node, inspector);
  ok(
    !view.addRuleButton.disabled,
    "Add rule button should be enabled again when selecting regular element"
  );
}
