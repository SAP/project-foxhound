/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// Tests that loader and new tab appear when pretty printing,
// and the selected location is mapped afterwards

"use strict";

add_task(async function () {
  const dbg = await initDebugger("doc-pretty.html", "pretty.js");

  SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    const scriptEl = content.document.createElement("script");
    scriptEl.innerText = `(function callInPretty() { debugger; funcWithMultipleBreakableColumns() })()`;
    content.document.body.append(scriptEl);
  });

  await waitForPaused(dbg);
  const scriptSource = dbg.selectors.getSelectedSource();

  info(
    "Step-in to navigate to pretty.js `funcWithMultipleBreakableColumns` function"
  );
  await stepOver(dbg);
  await stepIn(dbg);
  await waitForSelectedSource(dbg, "pretty.js");
  await waitForSelectedLocation(dbg, 9);

  is(
    countTabs(dbg),
    2,
    "Two tabs are opened, one for the dynamically inserted script and one for minified pretty.js"
  );
  is(
    dbg.selectors.getSourceCount(),
    2,
    "There are 2 sources before pretty printing"
  );
  await togglePrettyPrint(dbg);

  info("Wait for the pretty printed source to be selected on a different line");
  await waitForSelectedLocation(dbg, 11);

  is(countTabs(dbg), 2, "Pretty printing did not open any new tab");
  is(
    dbg.selectors.getSourceCount(),
    3,
    "There are three sources after pretty printing"
  );

  info("Navigate to previous frame in call stack");
  clickElement(dbg, "frame", 2);
  await waitForPaused(dbg, scriptSource);

  info("Navigate back to `funcWithMultipleBreakableColumns` frame");
  clickElement(dbg, "frame", 1);
  await waitForPaused(dbg, "pretty.js:formatted");
  await waitForSelectedLocation(dbg, 11, 17);
  ok(true, "pretty-printed source was selected");

  await resume(dbg);

  info("Re select the minified version");
  await togglePrettyPrint(dbg);
  await waitForSelectedLocation(dbg, 9, 17);

  info("Re toggle pretty print from the minified source");
  await togglePrettyPrint(dbg);
  is(countTabs(dbg), 2, "There are still two tabs");
  info(
    "Wait for re-selecting the mapped location in the pretty printed source"
  );
  await waitForSelectedLocation(dbg, 11, 17);
  is(
    dbg.selectors.getSourceCount(),
    3,
    "There are still 3 sources after retrying to pretty print the same source"
  );
});
