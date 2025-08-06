/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Test clicking locations of logpoint logs and errors will open corresponding
// conditional panels in the debugger.

"use strict";

// Allow more time since we now wait for CM6 document updates to complete
requestLongerTimeout(2);

const TEST_URI =
  "https://example.com/browser/devtools/client/webconsole/" +
  "test/browser/test-location-debugger-link-logpoint.html";

add_task(async function () {
  // On e10s, the exception thrown in test-location-debugger-link-errors.js
  // is triggered in child process and is ignored by test harness
  if (!Services.appinfo.browserTabsRemoteAutostart) {
    expectUncaughtException();
  }

  // Eliminate interference from "saved" breakpoints
  // when running the test multiple times
  await clearDebuggerPreferences();
  const hud = await openNewTabAndConsole(TEST_URI);

  info("Open the Debugger panel");
  await openDebugger();

  const toolbox = hud.toolbox;
  const dbg = createDebuggerContext(toolbox);
  await selectSource(dbg, "test-location-debugger-link-logpoint-1.js");

  // Wait a bit for CM6 to complete any updates so the log panel
  // does not lose focus after the it has been opened
  await waitForDocumentLoadComplete(dbg);

  info("Add a logpoint with an invalid expression");
  await setLogPoint(dbg, 7, "undefinedVariable");

  info("Add a logpoint with a valid expression");
  await setLogPoint(dbg, 8, "`a is ${a}`");

  await assertLogBreakpoint(dbg, 7);
  await assertLogBreakpoint(dbg, 8);

  info("Close the file in the debugger");
  await closeTab(dbg, "test-location-debugger-link-logpoint-1.js");

  info("Selecting the console");
  await toolbox.selectTool("webconsole");

  info("Call the function");
  await invokeInTab("add");

  info("Wait for two messages");
  await waitFor(() => findAllMessages(hud).length === 2);

  await testOpenInDebugger(hud, {
    text: "undefinedVariable is not defined",
    typeSelector: ".logPointError",
    expectUrl: true,
    expectLine: false,
    expectColumn: false,
    logPointExpr: "undefinedVariable",
  });

  info("Selecting the console again");
  await toolbox.selectTool("webconsole");
  await testOpenInDebugger(hud, {
    text: "a is 1",
    typeSelector: ".logPoint",
    expectUrl: true,
    expectLine: false,
    expectColumn: false,
    logPointExpr: "`a is ${a}`",
  });

  // Test clicking location of a removed logpoint, or a newly added breakpoint
  // at an old logpoint's location will only highlight its line
  info("Remove the logpoints");
  const source = await findSource(
    dbg,
    "test-location-debugger-link-logpoint-1.js"
  );
  await removeBreakpoint(dbg, source.id, 7);
  await removeBreakpoint(dbg, source.id, 8);
  await addBreakpoint(dbg, "test-location-debugger-link-logpoint-1.js", 8);

  info("Selecting the console");
  await toolbox.selectTool("webconsole");
  await testOpenInDebugger(hud, {
    text: "undefinedVariable is not defined",
    typeSelector: ".logPointError",
    expectUrl: true,
    expectLine: true,
    expectColumn: true,
  });

  info("Selecting the console again");
  await toolbox.selectTool("webconsole");
  await testOpenInDebugger(hud, {
    text: "a is 1",
    typeSelector: ".logPoint",
    expectUrl: true,
    expectLine: true,
    expectColumn: true,
  });
});

// Test clicking locations of logpoints from different files
add_task(async function () {
  if (!Services.appinfo.browserTabsRemoteAutostart) {
    expectUncaughtException();
  }

  await clearDebuggerPreferences();
  const hud = await openNewTabAndConsole(TEST_URI);

  info("Open the Debugger panel");
  await openDebugger();

  const toolbox = hud.toolbox;
  const dbg = createDebuggerContext(toolbox);

  info("Add a logpoint to the first file");
  await selectSource(dbg, "test-location-debugger-link-logpoint-1.js");
  await setLogPoint(dbg, 8, "`a is ${a}`");

  info("Add a logpoint to the second file");
  await selectSource(dbg, "test-location-debugger-link-logpoint-2.js");
  await setLogPoint(dbg, 8, "`c is ${c}`");

  info("Selecting the console");
  await toolbox.selectTool("webconsole");

  info("Call the function from the first file");
  await invokeInTab("add");

  info("Wait for the first message");
  await waitFor(() => findAllMessages(hud).length === 1);
  await testOpenInDebugger(hud, {
    text: "a is 1",
    typeSelector: ".logPoint",
    expectUrl: true,
    expectLine: false,
    expectColumn: false,
    logPointExpr: "`a is ${a}`",
  });

  info("Selecting the console again");
  await toolbox.selectTool("webconsole");

  info("Call the function from the second file");
  await invokeInTab("subtract");

  info("Wait for the second message");
  await waitFor(() => findAllMessages(hud).length === 2);
  await testOpenInDebugger(hud, {
    text: "c is 1",
    typeSelector: ".logPoint",
    expectUrl: true,
    expectLine: false,
    expectColumn: false,
    logPointExpr: "`c is ${c}`",
  });
});
