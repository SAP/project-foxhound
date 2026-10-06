/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// Tests the Javascript Tracing feature.

"use strict";

add_task(async function () {
  const dbg = await initDebugger("doc-scripts.html");

  info("Force the log method to be the debugger sidebar");
  await toggleJsTracerMenuItem(dbg, "#jstracer-menu-item-debugger-sidebar");

  info("Enable the tracing");
  await toggleJsTracer(dbg.toolbox);

  const topLevelThreadActorID =
    dbg.toolbox.commands.targetCommand.targetFront.threadFront.actorID;
  info("Wait for tracing to be enabled");
  await waitForState(dbg, () => {
    return dbg.selectors.getIsThreadCurrentlyTracing(topLevelThreadActorID);
  });

  invokeInTab("main");

  info("Wait for the call tree to appear in the tracer panel");
  const tracerTree = await waitForElementWithSelector(
    dbg,
    "#tracer-tab-panel .tree"
  );

  info("Wait for the expected traces to appear in the call tree");
  await waitFor(() => {
    const elements = tracerTree.querySelectorAll(".trace-line");
    if (elements.length == 3) {
      return elements;
    }
    return false;
  });

  is(
    findAllElementsWithSelector(dbg, ".tracer-timeline").length,
    1,
    "The timeline was rendered before moving to another tab"
  );
  await dbg.actions.setPrimaryPaneTab("sources");
  await dbg.actions.setPrimaryPaneTab("tracer");
  is(
    findAllElementsWithSelector(dbg, ".tracer-timeline").length,
    1,
    "The timeline is still rendered after moving to another tab"
  );

  info("Reset back to the default value");
  await toggleJsTracerMenuItem(dbg, "#jstracer-menu-item-console");
});
