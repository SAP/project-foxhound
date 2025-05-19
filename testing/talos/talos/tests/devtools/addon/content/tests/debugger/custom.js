/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  closeToolboxAndLog,
  garbageCollect,
  runTest,
  testSetup,
  testTeardown,
  PAGES_BASE_URL,
  waitForDOMElement,
} = require("../head");
const {
  createContext,
  findSource,
  getCM,
  hoverOnToken,
  openDebuggerAndLog,
  pauseDebugger,
  reloadDebuggerAndLog,
  removeBreakpoints,
  resume,
  selectSource,
  step,
  waitForSource,
  waitForText,
  waitUntil,
  addBreakpoint,
  waitForPaused,
  waitForState,
} = require("./debugger-helpers");

const IFRAME_BASE_URL =
  "http://damp.top.com/tests/devtools/addon/content/pages/";
const EXPECTED = {
  sources: 1134,
  file: "App.js",
  sourceURL: `${IFRAME_BASE_URL}custom/debugger/app-build/static/js/App.js`,
  text: "import React, { Component } from 'react';",
  threadsCount: 2,
};

const EXPECTED_FUNCTION = "window.hitBreakpoint()";

const TEST_URL = PAGES_BASE_URL + "custom/debugger/app-build/index.html";
const MINIFIED_URL = `${IFRAME_BASE_URL}custom/debugger/app-build/static/js/minified.js`;

module.exports = async function () {
  const isCm6Enabled = Services.prefs.getBoolPref(
    "devtools.debugger.features.codemirror-next"
  );

  const tab = await testSetup(TEST_URL, { disableCache: true });

  const toolbox = await openDebuggerAndLog("custom", EXPECTED, isCm6Enabled);

  dump("Waiting for debugger panel\n");
  const panel = await toolbox.getPanelWhenReady("jsdebugger");

  dump("Creating context\n");
  const dbg = await createContext(panel);

  // Reselect App.js as that's the source expected to be selected after page reload
  await selectSource(dbg, EXPECTED.file);

  await reloadDebuggerAndLog("custom", toolbox, EXPECTED, isCm6Enabled);

  // these tests are only run on custom.jsdebugger
  await pauseDebuggerAndLog(dbg, tab, EXPECTED_FUNCTION);
  await stepDebuggerAndLog(dbg, tab, EXPECTED_FUNCTION);

  await testProjectSearch(dbg, tab);
  await testPreview(dbg, tab, EXPECTED_FUNCTION, isCm6Enabled);
  await testOpeningLargeMinifiedFile(dbg, isCm6Enabled);
  await testPrettyPrint(dbg, toolbox, isCm6Enabled);

  await closeToolboxAndLog("custom.jsdebugger", toolbox);

  await testTeardown();
};

async function pauseDebuggerAndLog(dbg, tab, testFunction) {
  const pauseLocation = { line: 22, file: "App.js" };

  dump("Pausing debugger\n");
  let test = runTest("custom.jsdebugger.pause.DAMP");
  await pauseDebugger(dbg, tab, testFunction, pauseLocation);
  test.done();

  await removeBreakpoints(dbg);
  await resume(dbg);
  await garbageCollect();
}

async function stepDebuggerAndLog(dbg, tab, testFunction) {
  /*
   * See testing/talos/talos/tests/devtools/addon/content/pages/custom/debugger/app/src for the details
   * about the pages used for these tests.
   */

  const stepTests = [
    // This steps only once from the App.js into step-in-test.js.
    // This `stepInNewSource` should always run first to make sure `step-in-test.js` file
    // is loaded for the first time.
    {
      stepCount: 1,
      location: { line: 22, file: "App.js" },
      key: "stepInNewSource",
      stepType: "stepIn",
    },
    {
      stepCount: 2,
      location: { line: 10194, file: "step-in-test.js" },
      key: "stepIn",
      stepType: "stepIn",
    },
    {
      stepCount: 2,
      location: { line: 16, file: "step-over-test.js" },
      key: "stepOver",
      stepType: "stepOver",
    },
    {
      stepCount: 2,
      location: { line: 998, file: "step-out-test.js" },
      key: "stepOut",
      stepType: "stepOut",
    },
  ];

  for (const stepTest of stepTests) {
    await pauseDebugger(dbg, tab, testFunction, stepTest.location);
    const test = runTest(`custom.jsdebugger.${stepTest.key}.DAMP`);
    for (let i = 0; i < stepTest.stepCount; i++) {
      await step(dbg, stepTest.stepType);
    }
    test.done();
    await removeBreakpoints(dbg);
    await resume(dbg);
    await garbageCollect();
  }
}

async function testProjectSearch(dbg) {
  dump("Executing project search\n");
  const test = runTest(`custom.jsdebugger.project-search.DAMP`);
  const firstSearchResultTest = runTest(
    `custom.jsdebugger.project-search.first-search-result.DAMP`
  );
  await dbg.actions.setPrimaryPaneTab("project");
  await dbg.actions.setActiveSearch("project");
  const searchInput = await waitForDOMElement(
    dbg.win.document.querySelector("body"),
    ".project-text-search .search-field input"
  );
  searchInput.focus();
  searchInput.value = "retur";
  // Only dispatch a true key event for the last character in order to trigger only one search
  const key = "n";
  searchInput.dispatchEvent(
    new dbg.win.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      view: dbg.win,
      charCode: key.charCodeAt(0),
    })
  );
  searchInput.dispatchEvent(
    new dbg.win.KeyboardEvent("keyup", {
      bubbles: true,
      cancelable: true,
      view: dbg.win,
      charCode: key.charCodeAt(0),
    })
  );
  searchInput.dispatchEvent(
    new dbg.win.KeyboardEvent("keypress", {
      bubbles: true,
      cancelable: true,
      view: dbg.win,
      charCode: key.charCodeAt(0),
    })
  );

  // Wait till the first search result match is rendered
  await waitForDOMElement(
    dbg.win.document.querySelector("body"),
    ".project-text-search .tree-node .result"
  );
  firstSearchResultTest.done();
  // Then wait for all results to be fetched and the loader spin to hide
  await waitUntil(() => {
    return !dbg.win.document.querySelector(
      ".project-text-search .search-field .loader.spin"
    );
  });
  await dbg.actions.closeActiveSearch();
  test.done();
  await garbageCollect();
}

async function testPreview(dbg, tab, testFunction, isCm6Enabled) {
  dump("Executing preview test ...\n");
  const pauseLocation = { line: 22, file: "App.js" };

  let test = runTest("custom.jsdebugger.preview.DAMP");
  await pauseDebugger(dbg, tab, testFunction, pauseLocation);
  await hoverOnToken(dbg, "window.hitBreakpoint", "window", isCm6Enabled);
  test.done();

  await removeBreakpoints(dbg);
  await resume(dbg);
  await garbageCollect();
}

async function testOpeningLargeMinifiedFile(dbg, isCm6Enabled) {
  dump("Executing opening large minified test ...\n");
  const fileFirstMinifiedChars = `(()=>{var e,t,n,r,o={82603`;

  dump("Open minified.js (large minified file)\n");
  const fullTest = runTest(
    "custom.jsdebugger.open-large-minified-file.full-selection.DAMP"
  );
  const test = runTest("custom.jsdebugger.open-large-minified-file.DAMP");
  const onSelected = selectSource(dbg, MINIFIED_URL);
  await waitForText(dbg, fileFirstMinifiedChars, isCm6Enabled);
  test.done();
  await onSelected;
  fullTest.done();

  await dbg.actions.closeTabs([findSource(dbg, MINIFIED_URL)]);

  // Also clear to prevent reselecting this source
  await dbg.actions.clearSelectedLocation();

  await garbageCollect();
}

async function testPrettyPrint(dbg, toolbox, isCm6Enabled) {
  const formattedFileUrl = `${MINIFIED_URL}:formatted`;
  const filePrettyChars = "82603: (e, t, n) => {\n";

  dump("Select minified file\n");
  await selectSource(dbg, MINIFIED_URL);

  dump("Wait until CodeMirror highlighting is done\n");
  const cm = getCM(dbg, isCm6Enabled);
  await waitUntil(() => {
    return isCm6Enabled
      ? cm.isDocumentLoadComplete
      : // For CM5 highlightFrontier is not documented but is an internal variable indicating the current
        // line that was just highlighted. This document has only 2 lines, so wait until both
        // are highlighted. Since there was an other document opened before, we need to do an
        // exact check to properly wait.
        cm.doc.highlightFrontier === 2;
  });

  const prettyPrintButton = await waitUntil(() => {
    return dbg.win.document.querySelector(".source-footer .prettyPrint.active");
  });

  dump("Click pretty-print button\n");
  const test = runTest("custom.jsdebugger.pretty-print.DAMP");
  prettyPrintButton.click();
  await waitForSource(dbg, formattedFileUrl);
  await waitForText(dbg, filePrettyChars, isCm6Enabled);
  test.done();

  await addBreakpoint(dbg, 776, formattedFileUrl);

  const onPaused = waitForPaused(dbg);
  const reloadAndPauseInPrettyPrintedFileTest = runTest(
    "custom.jsdebugger.pretty-print.reload-and-pause.DAMP"
  );
  await reloadDebuggerAndLog(
    "custom.pretty-print",
    toolbox,
    {
      sources: 1105,
      sourceURL: formattedFileUrl,
      text: filePrettyChars,
      threadsCount: EXPECTED.threadsCount,
    },
    isCm6Enabled
  );
  await onPaused;

  // When reloading, the `togglePrettyPrint` action is called to pretty print the minified source.
  // This action is quite slow and finishes by ensuring that breakpoints are updated according to
  // the new pretty printed source.
  // We have to wait for this, otherwise breakpoints may be added after we remove all breakpoints just after.
  await waitForState(
    dbg,
    function (state) {
      const breakpoints = dbg.selectors.getBreakpointsAtLine(state, 776);
      const source = findSource(dbg, formattedFileUrl);
      // We have to ensure that the breakpoint is specific to the very last source object,
      // and not the one from the previous page load.
      return (
        breakpoints?.length > 0 && breakpoints[0].location.source == source
      );
    },
    "wait for pretty print breakpoint"
  );

  reloadAndPauseInPrettyPrintedFileTest.done();

  // The previous code waiting for state change isn't quite enough,
  // we need to spin the event loop once before clearing the breakpoints as
  // the processing of the new pretty printed source may still create late breakpoints
  // when it tries to update the breakpoint location on the pretty printed source.
  await new Promise(r => setTimeout(r, 0));

  await removeBreakpoints(dbg);

  // Clear the selection to avoid the source to be re-pretty printed on next load
  // Clear the selection before closing the tabs, otherwise closeTabs will reselect a random source.
  await dbg.actions.clearSelectedLocation();

  // Close tabs and especially the pretty printed one to stop pretty printing it.
  // Given that it is hard to find the non-pretty printed source via `findSource`
  // (because bundle and pretty print sources use almost the same URL except ':formatted' for the pretty printed one)
  // let's close all the tabs.
  const sources = dbg.selectors.getSourceList(dbg.getState());
  await dbg.actions.closeTabs(sources);

  await garbageCollect();
}
