/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_URI =
  "https://example.com/browser/devtools/client/webconsole/" +
  "test/browser/test-eval-sources.html";

// Test that stack/message links in console API and error messages originating
// from eval code go to a source in the debugger. This should work even when the
// console is opened first.
add_task(async function () {
  const hud = await openNewTabAndConsole(TEST_URI);
  const toolbox = gDevTools.getToolboxForTab(gBrowser.selectedTab);

  let messageNode = await waitFor(() => findErrorMessage(hud, "BAR"));
  await clickFirstStackElement(hud.toolbox, messageNode, true, {
    // evaled sources have no URL
    url: null,
    line: 1,
    column: 33,
  });

  const dbg = toolbox.getPanel("jsdebugger");

  is(
    dbg._selectors.getSelectedSource(dbg._getState()).url,
    null,
    "expected source url"
  );

  await toolbox.selectTool("webconsole");
  await testOpenInDebugger(hud, {
    text: "FOO",
    typeSelector: ".console-api",
    // evaled sources have no URL
    url: null,
    line: 1,
    column: 35,
  });

  await toolbox.selectTool("webconsole");
  await testOpenInDebugger(hud, {
    text: "BAR",
    typeSelector: ".error",
    url: null,
    line: 1,
    column: 33,
  });

  // Test that links in the API work when the eval source has a sourceURL property
  // which is not considered to be a valid URL.
  await toolbox.selectTool("webconsole");
  await testOpenInDebugger(hud, {
    text: "BAZ",
    typeSelector: ".console-api",
    url: null,
    line: 2,
    column: 17,
  });

  // Test that stacks in console.trace() calls work.
  await toolbox.selectTool("webconsole");
  messageNode = await waitFor(() => findConsoleAPIMessage(hud, "TRACE"));
  await clickFirstStackElement(hud.toolbox, messageNode, false, {
    // Do not assert the url as it differs from Frame and Debugger
    // The Frame displays "my-foo.js", while the debugger resolves to an absolute URL.
    url: null,
    line: 3,
    column: 17,
  });

  is(
    /my-foo.js/.test(dbg._selectors.getSelectedSource(dbg._getState()).url),
    true,
    "expected source url"
  );
});

async function clickFirstStackElement(
  toolbox,
  message,
  needsExpansion,
  options
) {
  if (needsExpansion) {
    const button = message.querySelector(".collapse-button");
    ok(button, "has button");
    button.click();
  }

  const frameNode = await waitFor(() =>
    message.querySelector(".stacktrace .frame")
  );

  await clickAndAssertFrameLinkNode(toolbox, frameNode, options);
}
