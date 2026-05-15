/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

"use strict";

// Test that the values of the scope nodes are displayed correctly.
add_task(async function testScopeNodes() {
  const dbg = await initDebugger("doc-script-switching.html");

  const ready = Promise.all([
    waitForPaused(dbg),
    waitForLoadedSource(dbg, "script-switching-02.js"),

    // MAP_FRAMES triggers a new Scopes panel render cycle, which introduces
    // a race condition with the click event on the foo node.
    waitForDispatch(dbg.store, "MAP_FRAMES"),
  ]);
  invokeInTab("firstCall");
  await ready;

  is(getScopeNodeLabel(dbg, 1), "secondCall");
  is(getScopeNodeLabel(dbg, 2), "<this>");
  is(getScopeNodeLabel(dbg, 4), "foo()");
  await toggleScopeNode(dbg, 4);
  is(getScopeNodeLabel(dbg, 5), "arguments");

  await stepOver(dbg);
  is(getScopeNodeLabel(dbg, 4), "foo()");
  is(getScopeNodeLabel(dbg, 5), "Block");
  is(getScopeNodeLabel(dbg, 6), "Window");
  is(getScopeNodeValue(dbg, 6), "Global");

  info("Resuming the thread");
  await resume(dbg);
});

// Test that the scope nodes for destructuring paramters are not displayed.
add_task(async function testDestructuringParametersScopeNodes() {
  const dbg = await initDebuggerWithAbsoluteURL(
    "data:text/html;charset=utf8,<!DOCTYPE html><script>function foo({x}){debugger;};foo({x:2})</script>"
  );

  info("Reload the page to hit the debugger statement while loading");
  const onReloaded = reload(dbg);
  await waitForPaused(dbg);
  ok(true, "We're paused");

  info(
    "Checking all the nodes to assert that the scope node for the destructuring parameter is not displayed"
  );
  is(getScopeNodeLabel(dbg, 1), "foo");
  is(getScopeNodeLabel(dbg, 2), "<this>");
  is(getScopeNodeLabel(dbg, 3), "arguments");
  is(getScopeNodeLabel(dbg, 4), "x");
  is(getScopeNodeLabel(dbg, 5), "Window");

  info("Resuming the thread");
  await resume(dbg);
  await onReloaded;
});

// Test scope nodes for anonymous functions display correctly.
add_task(async function testAnonymousScopeNodes() {
  const dbg = await initDebuggerWithAbsoluteURL(
    "data:text/html;charset=utf8,<!DOCTYPE html><script>(function(){const x = 3; debugger;})()</script>"
  );

  info("Reload the page to hit the debugger statement while loading");
  const onReloaded = reload(dbg);
  await waitForPaused(dbg);
  ok(true, "We're paused");

  is(
    getScopeNodeLabel(dbg, 1),
    "<anonymous>",
    "The scope node for the anonymous function is displayed correctly"
  );

  info("Resuming the thread");
  await resume(dbg);
  await onReloaded;
});

// Test scope nodes for __proto__ arg and variable
add_task(async function testProtoScopeNodes() {
  const dbg = await initDebuggerWithAbsoluteURL(
    `data:text/html;charset=utf8,<!DOCTYPE html>
      <script>
        function testArgName(__proto__) {
          debugger;
        }
        function testVarName(name) {
          const __proto__ = name;
          debugger;
        }
      </script>`
  );

  info("Pause in testArgName");
  invokeInTab("testArgName", "peach");
  await waitForPaused(dbg);

  is(getScopeNodeLabel(dbg, 1), "testArgName");
  is(getScopeNodeLabel(dbg, 2), "__proto__");
  is(getScopeNodeValue(dbg, 2), `"peach"`);

  info("Resuming the thread");
  await resume(dbg);

  info("Pause in testVarName");
  invokeInTab("testVarName", "watermelon");
  await waitForPaused(dbg);

  is(getScopeNodeLabel(dbg, 1), "testVarName");
  is(getScopeNodeLabel(dbg, 2), "__proto__");
  is(getScopeNodeValue(dbg, 2), `"watermelon"`);

  info("Resuming the thread");
  await resume(dbg);
});
