/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests that the console record the execute_js telemetry event with expected data
// when evaluating expressions.

"use strict";

const TEST_URI = `data:text/html,<!DOCTYPE html><meta charset=utf8>Test execute_js telemetry event`;

add_task(async function () {
  // Let's reset the counts.
  Services.fog.testResetFOG();

  const hud = await openNewTabAndConsole(TEST_URI);

  info("Evaluate a single line");
  await keyboardExecuteAndWaitForResultMessage(hud, `"single line"`, "");

  info("Evaluate another single line");
  await keyboardExecuteAndWaitForResultMessage(hud, `"single line 2"`, "");

  info("Evaluate multiple lines");
  await keyboardExecuteAndWaitForResultMessage(hud, `"n"\n.trim()`, "");

  info("Switch to editor mode");
  await toggleLayout(hud);

  info("Evaluate a single line in editor mode");
  await keyboardExecuteAndWaitForResultMessage(hud, `"single line 3"`, "");

  info("Evaluate multiple lines in editor mode");
  await keyboardExecuteAndWaitForResultMessage(
    hud,
    `"y"\n.trim()\n.trim()`,
    ""
  );

  info("Evaluate multiple lines again in editor mode");
  await keyboardExecuteAndWaitForResultMessage(hud, `"x"\n.trim()`, "");

  const events = Glean.devtoolsMain.executeJsWebconsole.testGetValue();
  is(6, events.length);
  const extras = [
    { lines: 1, input: "inline" },
    { lines: 1, input: "inline" },
    { lines: 2, input: "inline" },
    { lines: 1, input: "multiline" },
    { lines: 3, input: "multiline" },
    { lines: 2, input: "multiline" },
  ];
  for (const [extra, ev] of Iterator.zip([extras, events])) {
    is(extra.lines, parseInt(ev.extra.lines, 10));
    is(extra.input, ev.extra.input);
  }

  info("Switch back to inline mode");
  await toggleLayout(hud);
});
