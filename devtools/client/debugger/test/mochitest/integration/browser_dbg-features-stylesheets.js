/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

"use strict";

/**
 * Asserts the features of style sheets in the debugger
 */
const httpServer = createTestHTTPServer();
const BASE_URL = `http://localhost:${httpServer.identity.primaryPort}/`;

httpServer.registerContentType("html", "text/html");
httpServer.registerContentType("js", "application/javascript");

httpServer.registerPathHandler("/index.html", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.write(`<html>
      <head>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body></body>
    </html>`);
});

httpServer.registerPathHandler("/style.css", (request, response) => {
  response.setHeader("Content-Type", "text/css");
  response.write("body { background-color: powderblue; }");
});

// This tests that editing style sheets updates the current page.
add_task(async function testEditingStyleSheets() {
  await pushPref("devtools.debugger.features.stylesheets-in-debugger", true);
  const dbg = await initDebuggerWithAbsoluteURL(
    BASE_URL + "index.html",
    "style.css"
  );

  let currentBgColor = await getCurrentPageBackgroundColor();
  is(
    currentBgColor,
    "rgb(176, 224, 230)",
    "The background color is powder blue"
  );

  await selectSourceFromSourceTreeWithIndex(
    dbg,
    "style.css",
    3,
    "Select the style sheet"
  );
  const color = "powderblue";
  is(getEditorContent(dbg), `body { background-color: ${color}; }`);

  info("Change the value of the backgroud color property in the editor");
  getCMEditor(dbg).focus();
  await setEditorCursorAt(dbg, 1, 35);
  let x = color.length;
  while (x > 0) {
    pressKey(dbg, "Backspace");
    x--;
  }
  type(dbg, "green");

  // Wait a bit for the color to change to the final green color
  const bgColorChanged = await waitFor(async () => {
    currentBgColor = await getCurrentPageBackgroundColor();
    return currentBgColor == "rgb(0, 128, 0)";
  });
  ok(bgColorChanged, "The background color is now green");
  is(getEditorContent(dbg), `body { background-color: green; }`);
});

function getCurrentPageBackgroundColor() {
  return SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    const bodyStyles = content.getComputedStyle(content.document.body);
    return bodyStyles.backgroundColor;
  });
}
