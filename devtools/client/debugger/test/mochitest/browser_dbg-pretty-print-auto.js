/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// Tests the auto pretty printing feature

"use strict";

add_task(async function testAutoPrettyPrintedOff() {
  // Disable source map in order to allow pretty printing the bundle
  await pushPref("devtools.source-map.client-service.enabled", false);

  const dbg = await initDebugger("doc-sourcemaps3.html", "bundle.js");

  // Expand the tree to make the source visible
  await waitForSourcesInSourceTree(dbg, ["bundle.js"], {
    noExpand: false,
  });
  // Do not use selectSource test helper as it ultimately pass keepContext=false to selectLocation action.
  await selectSourceFromSourceTree(
    dbg,
    "bundle.js",
    "Select the `bundle.js` script for the tree"
  );

  is(
    findElement(dbg, "prettyPrintButton").disabled,
    false,
    "The pretty print button is enabled"
  );
});

add_task(async function testAutoPrettyPrintedOn() {
  let dbg = await initDebugger("doc-sourcemaps3.html", "bundle.js");

  info("Enable automatic pretty printing");
  await toggleDebuggerSettingsMenuItem(dbg, {
    className: ".debugger-settings-menu-item-toggle-auto-pretty-print",
    isChecked: false,
  });

  // Expand the tree to make the source visible
  await waitForSourcesInSourceTree(dbg, ["bundle.js"], {
    noExpand: false,
  });
  // Do not use selectSource test helper as it ultimately pass keepContext=false to selectLocation action.
  await selectSourceFromSourceTree(
    dbg,
    "bundle.js",
    "Select the `bundle.js` script for the tree"
  );

  await waitForSelectedSource(dbg, "bundle.js");
  ok(
    findElement(dbg, "prettyPrintButton").classList.contains("pretty"),
    "The pretty print button should report that the source has been pretty printed"
  );

  const source = findSource(dbg, "bundle.js:formatted");
  await addBreakpoint(dbg, "bundle.js:formatted", 49);

  invokeInTab("test");
  await waitForPaused(dbg);

  await assertPausedAtSourceAndLine(dbg, source.id, 49);

  await stepOver(dbg);

  await assertPausedAtSourceAndLine(dbg, source.id, 55);

  await resume(dbg);

  info("Reload and assert that the source keeps being pretty printed");
  await reload(dbg, "bundle.js:formatted");
  await waitForSelectedSource(dbg, "bundle.js");
  ok(
    findElement(dbg, "prettyPrintButton").classList.contains("pretty"),
    "The source should still be pretty printed after reload"
  );

  // Close the tab and see if the source is also reopened directly to the pretty printed version
  await closeTab(dbg, "bundle.js");

  await closeTabAndToolbox();

  // Do not use `initDebugger` as it resets all settings
  const toolbox = await openNewTabAndToolbox(
    EXAMPLE_URL + "doc-sourcemaps3.html",
    "jsdebugger"
  );
  dbg = createDebuggerContext(toolbox);

  await selectSourceFromSourceTree(
    dbg,
    "bundle.js",
    "Select the `bundle.js` script for the tree"
  );
  ok(
    findElement(dbg, "prettyPrintButton").classList.contains("pretty"),
    "The source is still pretty printed after toolbox restart"
  );

  invokeInTab("test");
  await waitForPaused(dbg);

  await assertPausedAtSourceAndLine(dbg, source.id, 49);
  is(dbg.selectors.getSelectedSource().isPrettyPrinted, true);

  info("Manually disable pretty printing on the source");
  await togglePrettyPrint(dbg);

  info("Assert that we are showing the minimized source");
  await assertPausedAtSourceAndLine(dbg, source.generatedSource.id, 1, 625);
  is(dbg.selectors.getSelectedSource().isPrettyPrinted, false);

  info("Assert that we keep showing the minimized source after steps");
  await stepIn(dbg);
  is(dbg.selectors.getSelectedSource().isPrettyPrinted, false);
  await assertPausedAtSourceAndLine(dbg, source.generatedSource.id, 1, 655);

  await resume(dbg);

  info(
    "Reload and assert that auto-pretty printing did *not* re-pretty printed the source"
  );
  await reload(dbg, "bundle.js");
  ok(
    !findElement(dbg, "prettyPrintButton").classList.contains("pretty"),
    "The source should still *not* be pretty printed after reload"
  );

  info("Pause in an evaled source which shouldn't be pretty printed");
  const onResumed = SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    async function () {
      // Craft some source that makes `isMinified` function to consider the source as not minified
      // thanks to the indentations
      content.eval(`
      function foo() {
        debugger;
      }
      foo();`);
    }
  );
  await waitForPaused(dbg);
  ok(
    !findElement(dbg, "prettyPrintButton").classList.contains("pretty"),
    "Simple source should *not* be pretty printed"
  );

  await resume(dbg);
  await onResumed;
});
