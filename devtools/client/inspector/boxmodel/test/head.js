/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */
/* eslint no-unused-vars: [2, {"vars": "local"}] */
/* import-globals-from ../../../shared/test/shared-head.js */
/* import-globals-from ../../test/head.js */
"use strict";

// Import the inspector's head.js first (which itself imports shared-head.js).
Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/devtools/client/inspector/test/head.js",
  this
);

Services.prefs.setIntPref("devtools.toolbox.footer.height", 350);
registerCleanupFunction(() => {
  Services.prefs.clearUserPref("devtools.toolbox.footer.height");
});

/**
 * Is the given node visible in the page (rendered in the frame tree).
 * @param {DOMNode}
 * @return {Boolean}
 */
function isNodeVisible(node) {
  return !!node.getClientRects().length;
}

/**
 * Wait for the boxmodel-view-updated event.
 *
 * @param  {InspectorPanel} inspector
 *         The instance of InspectorPanel currently loaded in the toolbox.
 * @param  {Boolean} waitForSelectionUpdate
 *         Should the boxmodel-view-updated event come from a new selection.
 * @return {Promise} a promise
 */
async function waitForUpdate(inspector, waitForSelectionUpdate) {
  /**
   * While the highlighter is visible (mouse over the fields of the box model editor),
   * reflow events are prevented; see ReflowActor -> setIgnoreLayoutChanges()
   * The box model view updates in response to reflow events.
   * To ensure reflow events are fired, hide the highlighter.
   */
  await inspector.highlighters.hideHighlighterType(
    inspector.highlighters.TYPES.BOXMODEL
  );

  return new Promise(resolve => {
    inspector.on("boxmodel-view-updated", function onUpdate(reasons) {
      // Wait for another update event if we are waiting for a selection related event.
      if (waitForSelectionUpdate && !reasons.includes("new-selection")) {
        return;
      }

      inspector.off("boxmodel-view-updated", onUpdate);
      resolve();
    });
  });
}

/**
 * Wait for both boxmode-view-updated and markuploaded events.
 *
 * @return {Promise} a promise that resolves when both events have been received.
 */
function waitForMarkupLoaded(inspector) {
  return Promise.all([
    waitForUpdate(inspector),
    inspector.once("markuploaded"),
  ]);
}

function getStyle(testActor, selector, propertyName) {
  return testActor.eval(`
    document.querySelector("${selector}")
            .style.getPropertyValue("${propertyName}");
  `);
}

function setStyle(testActor, selector, propertyName, value) {
  return testActor.eval(`
    document.querySelector("${selector}")
            .style.${propertyName} = "${value}";
  `);
}

/**
 * The box model doesn't participate in the inspector's update mechanism, so simply
 * calling the default selectNode isn't enough to guarantee that the box model view has
 * finished updating. We also need to wait for the "boxmodel-view-updated" event.
 */
var _selectNode = selectNode;
selectNode = async function(node, inspector, reason) {
  const onUpdate = waitForUpdate(inspector, true);
  await _selectNode(node, inspector, reason);
  await onUpdate;
};
