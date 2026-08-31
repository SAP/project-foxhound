/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// Tests pretty-printing of HTML file and its inner scripts.

"use strict";

const TEST_FILENAME = `doc-pretty-print-inline-scripts.html`;
const PRETTY_PRINTED_FILENAME = `${TEST_FILENAME}:formatted`;

const BREAKABLE_LINE_HINT_CHAR = `➤`;

requestLongerTimeout(2);

// Import helpers for the inspector
Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/devtools/client/inspector/test/shared-head.js",
  this
);

add_task(async function () {
  const dbg = await initDebugger(TEST_FILENAME);

  await selectSource(dbg, TEST_FILENAME);
  await togglePrettyPrint(dbg);

  const prettyPrintedSource = findSourceContent(dbg, PRETTY_PRINTED_FILENAME);

  ok(prettyPrintedSource, "Pretty-printed source exists");

  info("Check that the HTML file was pretty-printed as expected");
  const expectedPrettyHtml = getExpectedPrettyPrintedHtml();
  is(
    prettyPrintedSource.value,
    // ➤ is used to indicate breakable lines, we remove them to assert the actual
    // content of the editor.
    expectedPrettyHtml.replaceAll(BREAKABLE_LINE_HINT_CHAR, ""),
    "HTML file is pretty printed as expected"
  );

  info("Check breakable lines");
  const htmlLines = expectedPrettyHtml.split("\n");
  const expectedBreakableLines = [];
  htmlLines.forEach((line, index) => {
    if (line.startsWith(BREAKABLE_LINE_HINT_CHAR)) {
      // Lines in the debugger are 1-based
      expectedBreakableLines.push(index + 1);
    }
  });

  await assertBreakableLines(
    dbg,
    PRETTY_PRINTED_FILENAME,
    htmlLines.length,
    expectedBreakableLines
  );

  info("Check that console messages are pointing to pretty-printed file");
  const { toolbox } = dbg;
  await toolbox.selectTool("webconsole");

  const { hud } = await dbg.toolbox.getPanel("webconsole");
  info("Wait until messages are sourcemapped");
  await waitFor(
    () => !!findMessageByType(hud, PRETTY_PRINTED_FILENAME, ".log")
  );

  const firstMessage = await waitFor(() =>
    findMessageByType(hud, "User information", ".log")
  );
  const firstMessageLink = firstMessage.querySelector(".frame-link-source");
  is(
    firstMessageLink.innerText,
    `${PRETTY_PRINTED_FILENAME}:18:9`,
    "first console message has expected location"
  );
  info(
    "Click on the link of the first message to open the file in the debugger"
  );
  firstMessageLink.click();
  await waitForSelectedSource(dbg, PRETTY_PRINTED_FILENAME);
  ok(true, "pretty printed file was selected in debugger…");
  await waitForSelectedLocation(dbg, 18);
  ok(true, "…at the expected location");

  info("Go back to the console to check an other message");
  await toolbox.selectTool("webconsole");

  const secondMessage = await waitFor(() =>
    findMessageByType(hud, "42 yay", ".log")
  );
  const secondMessageLink = secondMessage.querySelector(".frame-link-source");
  is(
    secondMessageLink.innerText,
    `${PRETTY_PRINTED_FILENAME}:41:13`,
    "second console message has expected location"
  );
  info(
    "Click on the link of the second message to open the file in the debugger"
  );
  secondMessageLink.click();
  await waitForSelectedSource(dbg, PRETTY_PRINTED_FILENAME);
  ok(true, "pretty printed file was selected in debugger…");
  await waitForSelectedLocation(dbg, 41);
  ok(true, "…at the expected location");

  info("Check that event listener popup is pointing to pretty-printed file");
  const inspector = await toolbox.selectTool("inspector");

  const nodeFront = await getNodeFront("h1", inspector);
  const markupContainer = inspector.markup.getContainer(nodeFront);
  const evHolder = markupContainer.elt.querySelector(
    ".inspector-badge.interactive[data-event]"
  );
  const eventTooltip = inspector.markup.eventDetailsTooltip;

  info("Open event tooltip.");
  EventUtils.synthesizeMouseAtCenter(
    evHolder,
    {},
    inspector.markup.doc.defaultView
  );
  await eventTooltip.once("shown");
  ok(true, "event tooltip opened");
  // wait for filename to be sourcemapped
  await waitFor(() =>
    eventTooltip.panel
      .querySelector(".event-header")
      ?.innerText.includes(PRETTY_PRINTED_FILENAME)
  );
  const header = eventTooltip.panel.querySelector(".event-header");
  const headerFilename = header.querySelector(
    ".event-tooltip-filename"
  ).innerText;
  ok(
    headerFilename.endsWith(`${PRETTY_PRINTED_FILENAME}:51`),
    `Location in event tooltip is the pretty printed one (${headerFilename})`
  );
  info(
    "Check that clicking on open debugger icon selects the pretty printed file"
  );
  header.querySelector(".event-tooltip-debugger-icon").click();
  await waitForSelectedSource(dbg, PRETTY_PRINTED_FILENAME);
  ok(true, "pretty printed file was selected in debugger…");
  await waitForSelectedLocation(dbg, 51);
  ok(true, "…at the expected location");
});

add_task(async function prettyPrintSingleLineDataUrl() {
  const TEST_URL = `data:text/html,<meta charset=utf8><script>{"use strict"; globalThis.foo = function() {}}</script>`;
  const PRETTY_PRINTED_URL = `${TEST_URL}:formatted`;
  const dbg = await initDebuggerWithAbsoluteURL(TEST_URL);

  await selectSource(dbg, TEST_URL);
  await togglePrettyPrint(dbg);

  const prettyPrintedSource = findSourceContent(dbg, PRETTY_PRINTED_URL);

  ok(prettyPrintedSource, "Pretty-printed source exists");

  info("Check that the HTML file was pretty-printed as expected");
  const expectedPrettyHtml = `<meta charset=utf8><script>
{
  'use strict';
  globalThis.foo = function () {
  }
}
</script>`;
  is(
    prettyPrintedSource.value,
    expectedPrettyHtml,
    "HTML file is pretty printed as expected"
  );
});

// Asserts that files which contain characters which are
// encoded by two code units (surrogate pairs)
add_task(async function prettyPrintHtmlWithSurrogatePairCharacters() {
  const TEST_URL = `doc-pretty-print-with-emojis.html`;
  const PRETTY_PRINTED_URL = `${TEST_URL}:formatted`;
  const dbg = await initDebugger(TEST_URL);

  await selectSource(dbg, TEST_URL);
  await togglePrettyPrint(dbg);
  const prettyPrintedSource = findSourceContent(dbg, PRETTY_PRINTED_URL);
  ok(prettyPrintedSource, "Pretty-printed source exists");

  info("Check that the HTML file was pretty-printed as expected");
  const expectedPrettyHtml =
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\" /></head><body>\n🥁🤯<script>\nconsole.log('%', '🤯🤯🤯🤯🤯')\n</script>🥁</body>";
  is(
    prettyPrintedSource.value,
    expectedPrettyHtml,
    "HTML file is pretty printed as expected"
  );
});

/**
 * Return the expected pretty-printed HTML. Lines starting with ➤ indicate breakable
 * lines for easier maintenance.
 *
 * @returns {string}
 */
function getExpectedPrettyPrintedHtml() {
  return `<!-- This Source Code Form is subject to the terms of the Mozilla Public
    - License, v. 2.0. If a copy of the MPL was not distributed with this
    - file, You can obtain one at http://mozilla.org/MPL/2.0/. -->
<!doctype html>

<html>
  <head>
    <meta charset="utf-8"/>
    <title>Debugger test page</title>
    <!-- Added to check we don't handle non js scripts -->
    <script id="json-data" type="application/json">
      { "foo": "bar" }
    </script>

    <!-- the unusual formatting is wanted to check inline scripts pretty printing -->
    <script id="inline" type="application/javascript">
➤const userInfo = JSON.parse(document.getElementById('json-data').text);
➤console.log('User information: %o', userInfo);
➤document.addEventListener(
  'click',
  function onClick(e) {
➤    console.log('in inline script');
    // this is
    // something
➤    e.target;
➤  }
);
</script>
  </head>

  <body>
    <h1>Minified</h1>
    <!-- Checking that having empty inline scripts doesn't throw off pretty printing -->
    <script></script>
    <!-- Single line "minified" script -->
    <script id="minified" type="module">
➤for (const x of [
  42
]) {
➤  if (x > 0) {
➤    console.log(x, 'yay')
  } else {
➤    console.log(x, 'booh')
  }
➤}
</script>
    <!-- Multiple line "minified" script, with content on the first line -->
    <script>
{
  'use strict';
➤  document.querySelector('h1').addEventListener('mousedown', e => {
➤    console.log('mousedown on h1')
➤  })
➤}
</script>
    <hr><script>
➤const x = {
  a: 1,
  b: 2
➤};
</script><hr><!-- multiple scripts on same line --><script>
➤const y = [
  1,
  2,
  3
];
➤y.map(i => i * 2)
</script>
  </body>
</html>
`;
}
