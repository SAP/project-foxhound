/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// Tests re-opening pretty printed tabs on load

"use strict";

add_task(async function () {
  let dbg = await initDebugger("doc-minified.html", "math.min.js");

  await selectSourceFromSourceTree(dbg, "math.min.js");
  assertSourceIcon(dbg, "math.min.js", "javascript");
  await togglePrettyPrint(dbg);

  const tabs = findElement(dbg, "sourceTabs").children;
  is(tabs.length, 1, "We still have only one tab opened");
  is(tabs[0].textContent, "math.min.js", "The tab title is correct");

  // Test reloading the debugger
  await reload(dbg);

  await waitForSelectedSource(dbg, "math.min.js:formatted");
  ok(true, "Pretty printed source is selected on reload");

  // Select any other source
  await selectSourceFromSourceTree(dbg, "doc-minified.html");
  await togglePrettyPrint(dbg);

  // Ensure that we can re-select the pretty printed source from the Source Tree
  await selectSourceFromSourceTree(dbg, "math.min.js");
  await waitForSelectedSource(dbg, "math.min.js:formatted");
  const tab = findElement(dbg, "activeTab");
  is(tab.textContent, "math.min.js", "we stayed on the same tab after reload");
  is(countTabs(dbg), 2, "There is two tabs opened");

  const focusedTreeElement = findElementWithSelector(
    dbg,
    ".sources-list .focused .label"
  );
  is(
    focusedTreeElement.textContent.trim(),
    "math.min.js",
    "Pretty printed source is selected in tree"
  );
  await dbg.toolbox.closeToolbox();

  // Do not use `initDebugger` as it resets all settings, including tabs
  const toolbox = await openNewTabAndToolbox(
    EXAMPLE_URL + "doc-minified.html",
    "jsdebugger"
  );
  dbg = createDebuggerContext(toolbox);

  await waitForSelectedSource(dbg, "math.min.js:formatted");
  const [htmlTab, jsTab] = findElement(dbg, "sourceTabs").children;
  is(
    jsTab.textContent,
    "math.min.js",
    "After closing and re-opening the toolbox, the tab for the js tab is restored"
  );
  is(
    htmlTab.textContent,
    "doc-minified.html",
    "After closing and re-opening the toolbox, the tab for the html tab is restored"
  );
  is(countTabs(dbg), 2, "There is still two opened tabs after re-opening");

  info(
    "Click on the html source tab and verify the source is selected and pretty printed"
  );
  htmlTab.click();
  await waitForSelectedSource(dbg, "doc-minified.html:formatted");
  ok(
    findElement(dbg, "prettyPrintButton").classList.contains("pretty"),
    "The restored HTML source is pretty printed"
  );
});
