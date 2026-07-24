/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

// Test that the inspector has the correct pseudo-class locking menu items and
// that these items actually work

const {
  PSEUDO_CLASSES,
} = require("resource://devtools/shared/css/constants.js");
const nodeConstants = require("resource://devtools/shared/dom-node-constants.js");

const TEST_URI = `data:text/html;charset=UTF-8,
  <style>
    div::after {
      content: "-";
    }
  </style>
  <h1>pseudo-class lock node menu tests</h1>
  <div>test div</div>`;
// Strip the colon prefix from pseudo-classes (:before => before)
const PSEUDOS = PSEUDO_CLASSES.map(pseudo => pseudo.substr(1));

add_task(async function () {
  const { inspector } = await openInspectorForURL(TEST_URI);
  const divNodeFront = await getNodeFront("div", inspector);
  const divChildren = await inspector.walker.children(divNodeFront);

  info("Check pseudo element context menu on regular node");
  await selectNode(divNodeFront, inspector);
  let allMenuItems = openContextMenuAndGetAllItems(inspector);
  await testMenuItems(allMenuItems, inspector, true);

  const [textNodeFront, afterNodeFront] = divChildren.nodes;

  info("Check pseudo element context menu on text node");
  await selectNode(textNodeFront, inspector);
  // sanity check
  is(
    inspector.selection.nodeFront.nodeType,
    nodeConstants.TEXT_NODE,
    "We selected the text node"
  );
  allMenuItems = openContextMenuAndGetAllItems(inspector);
  await testMenuItems(allMenuItems, inspector, false);

  info("Check pseudo element context menu on pseudo element node");
  await selectNode(afterNodeFront, inspector);
  is(
    inspector.selection.nodeFront.displayName,
    "::after",
    "We selected the ::after pseudo element"
  );
  allMenuItems = openContextMenuAndGetAllItems(inspector);
  await testMenuItems(allMenuItems, inspector, false);
});

async function testMenuItems(allMenuItems, inspector, enabled) {
  for (const pseudo of PSEUDOS) {
    const menuItem = allMenuItems.find(
      item => item.id === "node-menu-pseudo-" + pseudo
    );
    ok(menuItem, ":" + pseudo + " menuitem exists");
    is(
      menuItem.disabled,
      !enabled,
      `:${pseudo} menuitem is ${enabled ? "enabled" : "disabled"} for "${inspector.selection.nodeFront.displayName}"`
    );

    if (!enabled) {
      continue;
    }

    // Give the inspector panels a chance to update when the pseudoclass changes
    const onPseudo = inspector.selection.once("pseudoclass");
    const onRefresh = inspector.once("rule-view-refreshed");

    // Walker uses SDK-events so calling walker.once does not return a promise.
    const onMutations = once(inspector.walker, "mutations");

    menuItem.click();

    await onPseudo;
    await onRefresh;
    await onMutations;

    const hasLock = await SpecialPowers.spawn(
      gBrowser.selectedBrowser,
      [`:${pseudo}`],
      pseudoClass => {
        const element = content.document.querySelector("div");
        return InspectorUtils.hasPseudoClassLock(element, pseudoClass);
      }
    );
    ok(hasLock, "pseudo-class lock has been applied");
  }
}
