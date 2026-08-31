/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Test that message source links for js errors and console API calls open in
// the jsdebugger when clicked.

"use strict";

// There are shutdown issues for which multiple rejections are left uncaught.
// See bug 1018184 for resolving these issues.
PromiseTestUtils.allowMatchingRejectionsGlobally(/Component not initialized/);
PromiseTestUtils.allowMatchingRejectionsGlobally(/this\.worker is null/);

const TEST_URI =
  "https://example.com/browser/devtools/client/webconsole/" +
  "test/browser/" +
  "test-stacktrace-location-debugger-link.html";

add_task(async function () {
  const hud = await openNewTabAndConsole(TEST_URI);
  const toolbox = gDevTools.getToolboxForTab(gBrowser.selectedTab);

  await testOpenFrameInDebugger(hud, toolbox, "console.trace()", [
    { url: TEST_URI, line: 21, column: 17 },
    { url: TEST_URI, line: 15, column: 9 },
    { url: TEST_URI, line: 30, column: 7 },
  ]);
  await testOpenFrameInDebugger(hud, toolbox, "myErrorObject", [
    { url: TEST_URI, line: 19, column: 21 },
    { url: TEST_URI, line: 15, column: 9 },
    { url: TEST_URI, line: 30, column: 7 },
  ]);
  await testOpenFrameInDebugger(hud, toolbox, "customSourceURL", [
    { url: "http://example.org/source.js", line: 1, column: 13 },
    { url: TEST_URI, line: 25, column: 9 },
    { url: TEST_URI, line: 15, column: 9 },
    { url: TEST_URI, line: 30, column: 7 },
  ]);
  await testOpenFrameInDebugger(
    hud,
    toolbox,
    "String contains an invalid character",
    [
      { url: TEST_URI, line: 27, column: 13 },
      { url: TEST_URI, line: 15, column: 9 },
      { url: TEST_URI, line: 30, column: 7 },
    ],
    ".error"
  );
});

async function testOpenFrameInDebugger(
  hud,
  toolbox,
  text,
  frames,
  typeSelector = ".console-api"
) {
  info(`Testing message with text "${text}"`);
  const messageNode = await waitFor(() =>
    findMessageByType(hud, text, typeSelector)
  );
  const framesNode = await waitFor(() => messageNode.querySelector(".frames"));

  const frameNodes = framesNode.querySelectorAll(".frame");
  is(
    frameNodes.length,
    frames.length,
    "The message does have the expected number of frames in the stacktrace"
  );

  for (let i = 0; i < frames.length; i++) {
    info(`Asserting frame #${i + 1}`);
    const frameNode = frameNodes[i];
    await checkMousedownOnNode(hud, toolbox, frameNode, frames[i]);

    info("Selecting the console again");
    await toolbox.selectTool("webconsole");
  }
}

async function checkMousedownOnNode(hud, toolbox, frameNode, frame) {
  info("checking click on node location");
  const onSourceInDebuggerOpened = once(hud, "source-in-debugger-opened");
  EventUtils.sendMouseEvent(
    { type: "click" },
    frameNode.querySelector(".location")
  );
  await onSourceInDebuggerOpened;

  const url = frameNode.querySelector(".filename").textContent;
  const line = Number(frameNode.querySelector(".line").textContent);
  // The customSourceURL isn't resolved whereas it will be in the debugger
  is(URL.parse(url).href, frame.url);
  is(line, frame.line);
  const dbg = toolbox.getPanel("jsdebugger");
  const selectedLocation = dbg._selectors.getSelectedLocation(dbg._getState());
  is(
    selectedLocation.source.url,
    // The customSourceURL isn't resolved whereas it will be in the debugger
    URL.parse(frame.url).href,
    `Debugger is opened at expected source url (${frame.url})`
  );
  is(
    selectedLocation.line,
    line,
    `Debugger is opened at expected line (${frame.line})`
  );
  // Debugger's column is 0-based
  is(
    selectedLocation.column + 1,
    frame.column,
    `Debugger is opened at expected column (${frame.column})`
  );
}
