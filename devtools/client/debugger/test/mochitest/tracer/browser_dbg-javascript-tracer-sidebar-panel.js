/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// Tests the Javascript Tracing feature.

"use strict";

add_task(async function () {
  const dbg = await initDebugger("doc-scripts.html");

  info("Force the log method to be the debugger sidebar");
  await toggleJsTracerMenuItem(dbg, "#jstracer-menu-item-debugger-sidebar");

  info("Enable values recording");
  await toggleJsTracerMenuItem(dbg, "#jstracer-menu-item-log-values");

  info("Enable the tracing");
  await toggleJsTracer(dbg.toolbox);

  const topLevelThreadActorID =
    dbg.toolbox.commands.targetCommand.targetFront.threadFront.actorID;
  info("Wait for tracing to be enabled");
  await waitForState(dbg, () => {
    return dbg.selectors.getIsThreadCurrentlyTracing(topLevelThreadActorID);
  });

  invokeInTab("main");
  invokeInTab("simple");

  info("Wait for the call tree to appear in the tracer panel");
  const tracerTree = await waitForElementWithSelector(
    dbg,
    "#tracer-tab-panel .tree"
  );

  info("Wait for the expected traces to appear in the call tree");
  const traces = await waitFor(() => {
    const elements = tracerTree.querySelectorAll(".trace-line");
    if (elements.length == 6) {
      return elements;
    }
    return false;
  });
  is(traces[0].textContent, "λ main simple1.js:1:17");
  is(traces[1].textContent, "λ foo simple2.js:1:13");
  is(traces[2].textContent, "λ bar simple2.js:3:5");
  is(traces[3].textContent, "λ simple simple3.js:1:19");
  is(traces[4].textContent, "λ foo simple2.js:1:13");
  is(traces[5].textContent, "λ bar simple2.js:3:5");

  info("Select the trace for the call to `foo`");
  EventUtils.synthesizeMouseAtCenter(traces[1], {}, dbg.win);

  const focusedTrace = await waitFor(
    () => tracerTree.querySelector(".tree-node.focused .trace-line"),
    "Wait for the line to be focused in the tracer panel"
  );
  is(focusedTrace, traces[1], "The clicked trace is now focused");
  await waitFor(
    () => findElement(dbg, "tracedLine"),
    "Wait for the traced line to be highlighted in CodeMirror"
  );
  const tracePanel = await waitFor(() => findElement(dbg, "tracePanel"));
  ok(tracePanel, "The trace panel is shown on trace selection");
  const tracePanelItems = tracePanel.querySelectorAll(".trace-item");
  is(
    tracePanelItems.length,
    2,
    "There is two calls to foo() reported in the trace panel"
  );
  ok(
    tracePanelItems[0].classList.contains("selected"),
    "The first item is selected, this is the first call to foo()"
  );

  await assertInlinePreviews(
    dbg,
    [
      {
        previews: [
          { identifier: "x:", value: "1" },
          { identifier: "y:", value: "2" },
        ],
        line: 1,
      },
    ],
    "foo"
  );

  info("Click on the second trace item");
  tracePanelItems[1].click();

  await waitFor(
    () =>
      tracerTree.querySelector(".tree-node.focused .trace-line") == traces[4],
    "Wait for the focused trace in the tree to become the second call to foo()"
  );

  await assertInlinePreviews(
    dbg,
    [
      {
        previews: [
          { identifier: "x:", value: "3" },
          { identifier: "y:", value: "4" },
        ],
        line: 1,
      },
    ],
    "foo"
  );

  // Test Disabling tracing
  info("Disable the tracing");
  await toggleJsTracer(dbg.toolbox);
  info("Wait for tracing to be disabled");
  await waitForState(dbg, () => {
    return !dbg.selectors.getIsThreadCurrentlyTracing(topLevelThreadActorID);
  });

  info("Reset back to the default value");
  await toggleJsTracerMenuItem(dbg, "#jstracer-menu-item-console");
  await toggleJsTracerMenuItem(dbg, "#jstracer-menu-item-log-values");
});
