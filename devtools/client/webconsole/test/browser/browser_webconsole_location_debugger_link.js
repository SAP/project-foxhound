/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Test that message source links for js errors and console API calls open in
// the jsdebugger when clicked.

"use strict";

// There are shutdown issues for which multiple rejections are left uncaught.
// See bug 1018184 for resolving these issues.
PromiseTestUtils.allowMatchingRejectionsGlobally(/this\.worker is null/);

requestLongerTimeout(2);

const BASE_URI =
  "https://example.com/browser/devtools/client/webconsole/test/browser/";
const TEST_URI = BASE_URI + "test-location-debugger-link.html";
const TEST_JS_URI = BASE_URI + "test-location-debugger-link-errors.js";
const TEST_JS_LOG_URI = BASE_URI + "test-location-debugger-link-console-log.js";

add_task(async function () {
  await pushPref("devtools.webconsole.filter.error", true);
  await pushPref("devtools.webconsole.filter.log", true);

  // On e10s, the exception thrown in test-location-debugger-link-errors.js
  // is triggered in child process and is ignored by test harness
  if (!Services.appinfo.browserTabsRemoteAutostart) {
    expectUncaughtException();
  }

  const hud = await openNewTabAndConsole(TEST_URI);
  const toolbox = gDevTools.getToolboxForTab(gBrowser.selectedTab);

  await testOpenInDebugger(hud, {
    text: "document.bar",
    typeSelector: ".error",
    url: TEST_JS_URI,
    line: 7,
    column: 12,
  });

  info("Selecting the console again");
  await toolbox.selectTool("webconsole");
  await testOpenInDebugger(hud, {
    text: "Blah Blah",
    typeSelector: ".console-api",
    url: TEST_JS_LOG_URI,
    line: 7,
    column: 11,
  });

  // check again the first node.
  info("Selecting the console again");
  await toolbox.selectTool("webconsole");
  await testOpenInDebugger(hud, {
    text: "document.bar",
    typeSelector: ".error",
    url: TEST_JS_URI,
    line: 7,
    column: 12,
  });

  info("Check location of evaluation error");
  await toolbox.selectTool("webconsole");
  await execute(
    hud,
    `const x = {};
     x.foo.bar;`
  );

  await testOpenInDebugger(hud, {
    text: "x.foo is undefined",
    typeSelector: ".error",
    // "debugger eval code" isn't an actual URL and is not stored as such in the Debugger
    // state, so don't check it.
    url: null,
    line: 2,
    column: 6,
  });

  await testOpenInDebugger(hud, {
    text: "String contains an invalid character",
    typeSelector: ".error",
    // atob exception comes with no particular column
    url: TEST_URI,
    line: 13,
    // Frame's column is undefined, but the debugger will open at first column
    column: null,
  });
});
