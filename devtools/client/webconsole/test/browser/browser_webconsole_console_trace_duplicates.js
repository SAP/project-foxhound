/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_URI =
  "http://example.com/browser/devtools/client/webconsole/test/browser/" +
  "test-console-trace-duplicates.html";

add_task(async function testTraceMessages() {
  const hud = await openNewTabAndConsole(TEST_URI);

  const message = await waitFor(() => findConsoleAPIMessage(hud, "foo1"));
  // Wait until stacktrace is displayed.
  await waitFor(() => !!message.querySelector(".frames"));

  is(
    message.querySelector(".message-body").textContent,
    "console.trace()",
    "console.trace message body has expected text"
  );
  is(
    message.querySelector(".message-repeats").textContent,
    "3",
    "console.trace has the expected content for the repeat badge"
  );

  is(
    message.querySelector(".frame-link-filename").textContent,
    "test-console-trace-duplicates.html",
    "message frame has expected text content"
  );
  const [, line, column] = message
    .querySelector(".frame-link-line")
    .textContent.split(":");
  is(line, "20", "message frame has expected line");
  is(column, "11", "message frame has expected column");

  const stack = message.querySelector(".stacktrace");
  ok(!!stack, "There's a stacktrace element");

  const frames = Array.from(stack.querySelectorAll(".frame"));
  checkStacktraceFrames(frames, [
    {
      functionName: "foo3",
      filename: TEST_URI,
      line: 20,
    },
    {
      functionName: "foo2",
      filename: TEST_URI,
      line: 16,
    },
    {
      functionName: "foo1",
      filename: TEST_URI,
      line: 12,
    },
    {
      functionName: "<anonymous>",
      filename: TEST_URI,
      line: 23,
    },
  ]);
});

add_task(async function testTraceMessagesNoRepeat() {
  await pushPref("devtools.webconsole.groupSimilarMessages", false);
  const hud = await openNewTabAndConsole(TEST_URI);

  const messages = await waitFor(() => {
    const res = findConsoleAPIMessages(hud, "foo1");
    if (res.length < 3) {
      return false;
    }
    return res;
  });

  // Wait until all stacktraces are displayed.
  await waitFor(() =>
    [...messages].every(message => !!message.querySelector(".frames"))
  );

  is(
    messages[2].querySelector(".message-body").textContent,
    "console.trace()",
    "last console.trace message body has expected text"
  );
  is(
    messages[2].querySelector(".message-repeats"),
    null,
    "last console.trace doesn't have a repeat badge"
  );
});

/**
 * Check stack info returned by getStackInfo().
 *
 * @param {object} stackInfo
 *        A stackInfo object returned by getStackInfo().
 * @param {object} expected
 *        An object in the same format as the expected stackInfo object.
 */
function checkStacktraceFrames(frames, expectedFrames) {
  is(
    frames.length,
    expectedFrames.length,
    `There are ${frames.length} frames in the stacktrace`
  );

  frames.forEach((frameEl, i) => {
    const expected = expectedFrames[i];

    is(
      frameEl.querySelector(".title").textContent,
      expected.functionName,
      `expected function name is displayed for frame #${i}`
    );
    is(
      frameEl.querySelector(".location .filename").textContent,
      expected.filename,
      `expected filename is displayed for frame #${i}`
    );
    is(
      frameEl.querySelector(".location .line").textContent,
      `${expected.line}`,
      `expected line is displayed for frame #${i}`
    );
  });
}
