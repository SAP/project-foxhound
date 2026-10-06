/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* exported definePyVar, assignPyVarToUiaWithId, setUpWaitForUiaEvent, setUpWaitForUiaPropEvent, waitForUiaEvent, testPatternSupported, testPatternAbsent, testPythonRaises, isUiaElementArray */

// Load the shared-head file first.
Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/accessible/tests/browser/shared-head.js",
  this
);

// Loading helpers from accessible/tests/mochitest/ for all tests, as
// well as events.js and layout.js.
loadScripts(
  { name: "common.js", dir: MOCHITESTS_DIR },
  { name: "events.js", dir: MOCHITESTS_DIR },
  { name: "layout.js", dir: MOCHITESTS_DIR }
);

/**
 * Define a global Python variable and assign it to a given Python expression.
 */
function definePyVar(varName, expression) {
  return runPython(`
    global ${varName}
    ${varName} = ${expression}
  `);
}

/**
 * Get the UIA element with the given id and assign it to a global Python
 * variable using the id as the variable name.
 */
function assignPyVarToUiaWithId(id) {
  return definePyVar(id, `findUiaByDomId(doc, "${id}")`);
}

/**
 * Set up to wait for a UIA event. You must await this before performing the
 * action which fires the event.
 */
function setUpWaitForUiaEvent(eventName, id) {
  return definePyVar(
    "onEvent",
    `WaitForUiaEvent(eventId=UIA_${eventName}EventId, match="${id}")`
  );
}

/**
 * Set up to wait for a UIA property change event. You must await this before
 * performing the action which fires the event.
 */
function setUpWaitForUiaPropEvent(propName, id) {
  return definePyVar(
    "onEvent",
    `WaitForUiaEvent(property=UIA_${propName}PropertyId, match="${id}")`
  );
}

/**
 * Wait for the event requested in setUpWaitForUia*Event. The data for the
 * matching event will be placed in a Python global named `event`. We do this
 * rather than just returning the data because some event data can't be
 * serialized to JSON.
 */
function waitForUiaEvent() {
  return runPython(`
    global event
    event = onEvent.wait()
  `);
}

/**
 * Verify that a UIA element supports the given control pattern.
 */
async function testPatternSupported(id, patternName) {
  const hasPattern = await runPython(`
    el = findUiaByDomId(doc, "${id}")
    return bool(getUiaPattern(el, "${patternName}"))
  `);
  ok(hasPattern, `${id} has ${patternName} pattern`);
}

/**
 * Verify that a UIA element does *not* support the given control pattern.
 */
async function testPatternAbsent(id, patternName) {
  const hasPattern = await runPython(`
    el = findUiaByDomId(doc, "${id}")
    return bool(getUiaPattern(el, "${patternName}"))
  `);
  ok(!hasPattern, `${id} doesn't have ${patternName} pattern`);
}

/**
 * Verify that a Python expression raises an exception.
 */
async function testPythonRaises(expression, message) {
  let failed = false;
  try {
    await runPython(expression);
  } catch {
    failed = true;
  }
  ok(failed, message);
}

/**
 * Verify that an array of UIA elements contains (only) elements with the given
 * DOM ids.
 */
async function isUiaElementArray(pyExpr, ids, message) {
  const result = await runPython(`
    uias = (${pyExpr})
    return [uias.GetElement(i).CurrentAutomationId for i in range(uias.Length)]
  `);
  SimpleTest.isDeeply(result, ids, message);
}
