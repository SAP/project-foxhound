/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// Test that we can set breakpoints in scripts that have been GCed.

"use strict";

add_task(async function () {
  const dbg = await initDebugger(
    "doc-gc-breakpoint-positions.html",
    "module-gc.js",
    "module-gc2.js"
  );
  info("Debugger opened");
  await selectSource(dbg, "doc-gc-breakpoint-positions.html");
  info("source selected");
  await addBreakpoint(dbg, "doc-gc-breakpoint-positions.html", 21);
  info("Added breakpoint on breakpoint-positions.html:21");

  // modules
  await addBreakpoint(dbg, "module-gc.js", 3);
  info("Added breakpoint on module-gc.js:3");
  await addBreakpoint(dbg, "module-gc2.js", 1);
  info("Added breakpoint on module-gc2.js:1");

  info("Added breakpoint at GC'ed script location");
});
