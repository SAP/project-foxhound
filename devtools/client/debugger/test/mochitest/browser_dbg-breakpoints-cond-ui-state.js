/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

"use strict";

// This test focuses on the UI interaction and doesn't assert that the breakpoints actually works

add_task(async function () {
  const dbg = await initDebugger("doc-scripts.html", "simple2.js");

  await selectSource(dbg, "simple2.js");
  await waitForSelectedSource(dbg, "simple2.js");

  info("Set condition `1`");
  await setConditionalBreakpoint(dbg, 5, "1");
  await waitForCondition(dbg, 1);

  let bp = findBreakpoint(dbg, "simple2.js", 5);
  is(bp.options.condition, "1", "breakpoint is created with the condition");
  await assertConditionBreakpoint(dbg, 5);

  info("Edit the conditional breakpoint set above");
  await setConditionalBreakpoint(dbg, 5, "2");
  await waitForCondition(dbg, 12);

  bp = findBreakpoint(dbg, "simple2.js", 5);
  is(bp.options.condition, "12", "breakpoint is created with the condition");
  await assertConditionBreakpoint(dbg, 5);

  info("Hit 'Enter' when the cursor is in the conditional statement");
  rightClickElement(dbg, "gutterElement", 5);
  await waitForContextMenu(dbg);
  selectContextMenuItem(dbg, `${selectors.editConditionItem}`);
  await waitForConditionalPanelFocus(dbg);
  pressKey(dbg, "Left");
  pressKey(dbg, "Enter");
  await waitForCondition(dbg, 12);

  bp = findBreakpoint(dbg, "simple2.js", 5);
  is(bp.options.condition, "12", "Hit 'Enter' doesn't add a new line");

  info("Hit 'Shift+Enter' when the cursor is in the conditional statement");
  rightClickElement(dbg, "gutterElement", 5);
  await waitForContextMenu(dbg);
  selectContextMenuItem(dbg, `${selectors.editConditionItem}`);
  await waitForConditionalPanelFocus(dbg);
  // The whole text is selected, hit Right key to get to the end of the input
  pressKey(dbg, "Right");
  // Move one char left to put the cursor between 1 and 2
  pressKey(dbg, "Left");
  // Insert a new line
  pressKey(dbg, "ShiftEnter");
  // And validate
  pressKey(dbg, "Enter");
  await waitForCondition(dbg, "1\n2");

  bp = findBreakpoint(dbg, "simple2.js", 5);
  is(bp.options.condition, "1\n2", "Hit 'Shift+Enter' adds a new line");

  clickElement(dbg, "gutterElement", 5);
  await waitForDispatch(dbg.store, "REMOVE_BREAKPOINT");
  bp = findBreakpoint(dbg, "simple2.js", 5);
  is(bp, undefined, "breakpoint was removed");
  await assertNoBreakpoint(dbg, 5);

  info("Adding a condition to a breakpoint");
  clickElement(dbg, "gutterElement", 5);
  await waitForDispatch(dbg.store, "SET_BREAKPOINT");
  await setConditionalBreakpoint(dbg, 5, "1");
  await waitForCondition(dbg, 1);

  bp = findBreakpoint(dbg, "simple2.js", 5);
  is(bp.options.condition, "1", "breakpoint is created with the condition");
  await assertConditionBreakpoint(dbg, 5);

  info("Double click the conditional breakpoint in secondary pane");
  dblClickElement(dbg, "conditionalBreakpointInSecPane");
  assertConditonalBreakpointPanelFocus(dbg, { isCm6Enabled });

  info("Click the conditional breakpoint in secondary pane");
  await clickElement(dbg, "conditionalBreakpointInSecPane");
  const conditonalPanel = findElement(dbg, "conditionalPanel");
  is(conditonalPanel, null, "The conditional breakpoint panel is closed");

  rightClickElement(dbg, "breakpointItem", 2);
  await waitForContextMenu(dbg);
  info('select "remove condition"');
  selectContextMenuItem(dbg, selectors.breakpointContextMenu.removeCondition);
  await waitForBreakpointWithoutCondition(dbg, "simple2.js", 5);
  bp = findBreakpoint(dbg, "simple2.js", 5);
  is(bp.options.condition, null, "breakpoint condition removed");

  info('Add "log point"');
  await setLogPoint(dbg, 5, "44");
  await waitForLog(dbg, 44);
  await assertLogBreakpoint(dbg, 5);

  bp = findBreakpoint(dbg, "simple2.js", 5);
  is(bp.options.logValue, "44", "breakpoint condition removed");

  await altClickElement(dbg, "gutterElement", 6);
  bp = await waitForBreakpoint(dbg, "simple2.js", 6);
  is(bp.options.logValue, "displayName", "logPoint has default value");

  info("Double click the logpoint in secondary pane");
  dblClickElement(dbg, "logPointInSecPane");
  assertConditonalBreakpointPanelFocus(dbg, { isLogPoint: true, isCm6Enabled });

  info("Click the logpoint in secondary pane");
  await clickElement(dbg, "logPointInSecPane");
  const logPointPanel = findElement(dbg, "logPointPanel");
  is(logPointPanel, null, "The logpoint panel is closed");
});

function waitForBreakpointWithoutCondition(dbg, url, line) {
  return waitForState(dbg, () => {
    const bp = findBreakpoint(dbg, url, line);
    return bp && !bp.options.condition;
  });
}

async function setConditionalBreakpoint(dbg, index, condition) {
  // Make this work with either add or edit menu items
  const { addConditionItem, editConditionItem } = selectors;
  const selector = `${addConditionItem},${editConditionItem}`;
  rightClickElement(dbg, "gutterElement", index);
  await waitForContextMenu(dbg);
  selectContextMenuItem(dbg, selector);
  typeInPanel(dbg, condition);
}

function assertConditonalBreakpointPanelFocus(
  dbg,
  { isLogPoint = false, isCm6Enabled }
) {
  const focusedElement = dbg.win.document.activeElement;
  const isPanelFocused = isCm6Enabled
    ? focusedElement.classList.contains("cm-content") &&
      focusedElement.closest(
        `.conditional-breakpoint-panel${isLogPoint ? ".log-point" : ""}`
      )
    : focusedElement.tagName == "TEXTAREA";
  ok(
    isPanelFocused,
    `The content element of ${
      isLogPoint ? "log point" : "conditional breakpoint"
    } panel is focused`
  );
}
