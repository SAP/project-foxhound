/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

// Test that the inspector has the correct pseudo-class locking menu items and
// that these items actually work

const {
  PSEUDO_CLASSES,
  ELEMENT_SPECIFIC_PSEUDO_CLASSES,
} = require("resource://devtools/shared/css/constants.js");
const nodeConstants = require("resource://devtools/shared/dom-node-constants.js");

const TEST_URI = `data:text/html;charset=UTF-8,${encodeURIComponent(`
  <style>
    div::after {
      content: "-";
    }
  </style>
  <h1>pseudo-class lock node menu tests</h1>
  <div>test div</div>
  <details>test details</details>
  <a href="#">test link</a>`)}`;
// Strip the colon prefix from pseudo-classes (:before => before)
const PSEUDOS = PSEUDO_CLASSES.map(pseudo => pseudo.substring(1));
const ELEMENT_SPECIFIC_PSEUDOS = Object.keys(
  ELEMENT_SPECIFIC_PSEUDO_CLASSES
).map(pseudo => pseudo.substring(1));

add_task(async function () {
  const { inspector } = await openInspectorForURL(TEST_URI);
  const divNodeFront = await getNodeFront("div", inspector);
  const divChildren = await inspector.walker.children(divNodeFront);

  info("Check pseudo-class context menu on regular div node");
  await selectNode(divNodeFront, inspector);
  let allMenuItems = openContextMenuAndGetAllItems(inspector);
  await testMenuItems(allMenuItems, inspector, divNodeFront, true);
  await testElementSpecificItems(allMenuItems, inspector, divNodeFront);

  const [textNodeFront, afterNodeFront] = divChildren.nodes;

  info("Check pseudo-class context menu on text node");
  await selectNode(textNodeFront, inspector);
  // sanity check
  is(
    inspector.selection.nodeFront.nodeType,
    nodeConstants.TEXT_NODE,
    "We selected the text node"
  );
  allMenuItems = openContextMenuAndGetAllItems(inspector);
  await testMenuItems(allMenuItems, inspector, textNodeFront, false);

  info("Check pseudo-class context menu on pseudo-element node");
  await selectNode(afterNodeFront, inspector);
  is(
    inspector.selection.nodeFront.displayName,
    "::after",
    "We selected the ::after pseudo-element"
  );
  allMenuItems = openContextMenuAndGetAllItems(inspector);
  await testMenuItems(allMenuItems, inspector, afterNodeFront, false);

  info("Check element-specific pseudo-classes on details element");
  const detailsNodeFront = await getNodeFront("details", inspector);
  await selectNode(detailsNodeFront, inspector);
  allMenuItems = openContextMenuAndGetAllItems(inspector);
  await testElementSpecificItems(allMenuItems, inspector, detailsNodeFront);

  info("Check element-specific pseudo-classes on anchor element");
  const aNodeFront = await getNodeFront("a", inspector);
  await selectNode(aNodeFront, inspector);
  allMenuItems = openContextMenuAndGetAllItems(inspector);
  await testElementSpecificItems(allMenuItems, inspector, aNodeFront);
});

async function applyAndVerifyPseudoLock(inspector, menuItem, pseudo, selector) {
  const onPseudo = inspector.selection.once("pseudoclass");
  const onRefresh = inspector.once("rule-view-refreshed");
  const onMutations = once(inspector.walker, "mutations");

  menuItem.click();

  await onPseudo;
  await onRefresh;
  await onMutations;

  const hasLock = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [`:${pseudo}`, selector],
    (pseudoClass, sel) => {
      const element = content.document.querySelector(sel);
      return InspectorUtils.hasPseudoClassLock(element, pseudoClass);
    }
  );
  ok(hasLock, `pseudo-class lock has been applied for :${pseudo}`);
}

async function testMenuItems(allMenuItems, inspector, nodeFront, enabled) {
  for (const pseudo of PSEUDOS) {
    const menuItem = allMenuItems.find(
      item => item.id === "node-menu-pseudo-" + pseudo
    );
    ok(menuItem, ":" + pseudo + " menuitem exists");
    is(
      menuItem.disabled,
      !enabled,
      `:${pseudo} menuitem is ${enabled ? "enabled" : "disabled"} for "${nodeFront.displayName}"`
    );

    if (!enabled) {
      continue;
    }

    await applyAndVerifyPseudoLock(inspector, menuItem, pseudo, "div");
  }
}

async function testElementSpecificItems(allMenuItems, inspector, nodeFront) {
  const elementTag = nodeFront.displayName.toLowerCase();
  for (const pseudo of ELEMENT_SPECIFIC_PSEUDOS) {
    const supportedElements = ELEMENT_SPECIFIC_PSEUDO_CLASSES[":" + pseudo];
    const isSupported = supportedElements.has(elementTag);
    const menuItem = allMenuItems.find(
      item => item.id === "node-menu-pseudo-" + pseudo
    );

    if (isSupported) {
      ok(menuItem, `:${pseudo} menuitem exists for <${elementTag}> element`);
      await applyAndVerifyPseudoLock(inspector, menuItem, pseudo, elementTag);
    } else {
      ok(
        !menuItem,
        `:${pseudo} menuitem does not exist for <${elementTag}> element`
      );
    }
  }
}
