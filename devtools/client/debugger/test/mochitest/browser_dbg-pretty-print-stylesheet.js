/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// Tests basic pretty-printing stylesheets.

"use strict";

const httpServer = createTestHTTPServer();
const BASE_URL = `http://localhost:${httpServer.identity.primaryPort}/`;

httpServer.registerContentType("html", "text/html");

httpServer.registerPathHandler("/index.html", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.write(`<!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
      </body>
    </html>
  `);
});

httpServer.registerPathHandler("/style.css", (request, response) => {
  response.setHeader("Content-Type", "text/css");
  response.write(
    `body{background:white;}div{font-size:4em;color:red}span{color:green;@media screen { background: blue; &>.myClass {padding: 1em} }}`
  );
});

("use strict");

add_task(async function () {
  await pushPref("devtools.debugger.features.stylesheets-in-debugger", true);
  const dbg = await initDebuggerWithAbsoluteURL(
    BASE_URL + "index.html",
    "style.css"
  );

  const MINIFIED_CSS_TEXT =
    "body{background:white;}div{font-size:4em;color:red}span{color:green;@media screen { background: blue; &>.myClass {padding: 1em} }}";
  const PRETTIFIED_CSS_TEXT = `
body {
  background:white;
}
div {
  font-size:4em;
  color:red
}
span {
  color:green;
  @media screen {
    background: blue;
    &>.myClass {
      padding: 1em
    }
  }
}
`.trimStart();

  await selectSource(dbg, "style.css", 2);

  is(
    getLineCount(dbg),
    1,
    `The minified style sheet should have a single line`
  );

  is(getEditorContent(dbg), MINIFIED_CSS_TEXT, "minified source is correct");

  let prettyPrintButton = findElement(dbg, "prettyPrintButton");
  ok(!prettyPrintButton.disabled, "The pretty print button should be enabled");

  ok(
    !prettyPrintButton.classList.contains("pretty"),
    "The pretty print button should not be enabled"
  );

  await togglePrettyPrint(dbg);

  is(
    getLineCount(dbg),
    17,
    `The pretty printed style sheet should the expected nunber of lines`
  );

  is(
    getEditorContent(dbg),
    PRETTIFIED_CSS_TEXT,
    "minified source has been prettified automatically"
  );

  ok(
    prettyPrintButton.classList.contains("pretty"),
    "The pretty print button should be enabled"
  );

  await togglePrettyPrint(dbg);

  prettyPrintButton = findElement(dbg, "prettyPrintButton");
  is(
    getLineCount(dbg),
    1,
    "The minified style sheet should have a single line"
  );

  is(
    getEditorContent(dbg),
    MINIFIED_CSS_TEXT,
    "minified source is still correct"
  );

  ok(
    !prettyPrintButton.classList.contains("pretty"),
    "The pretty print button should not be enabled"
  );
});
