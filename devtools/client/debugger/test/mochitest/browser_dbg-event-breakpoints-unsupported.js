/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// Tests early event breakpoints and event breakpoints in a remote frame.

"use strict";

const BAD_EVENT_ID = "event.dom-mutation.DOMSubtreeModified";

add_task(async function () {
  info(
    "Open and close the debugger a first time to prime the preferences and async storage"
  );
  let dbg = await initDebugger("doc-event-breakpoints.html");
  await dbg.toolbox.closeToolbox();

  info("Update the event listeners breakpoint data with an invalid event id");
  const staleEventListenerBreakpointsState = {
    categories: [],
    byPanel: {
      breakpoint: {
        active: [BAD_EVENT_ID],
        expanded: [],
      },
      tracer: { expanded: [] },
    },
    logEventBreakpoints: false,
    active: [],
    expanded: [],
  };
  await asyncStorage.setItem(
    "debugger.event-listener-breakpoints",
    staleEventListenerBreakpointsState
  );

  // Note: DO NOT use initDebugger here, as it would clear storage and
  // preferences.
  info("Reopen the debugger without resetting preferences");
  const toolbox = await openNewTabAndToolbox(
    EXAMPLE_URL + "doc-event-breakpoints.html",
    "jsdebugger"
  );
  dbg = createDebuggerContext(toolbox);
  await waitForSources(dbg, "event-breakpoints.js");

  await selectSource(dbg, "event-breakpoints.js");
  await waitForSelectedSource(dbg, "event-breakpoints.js");
  const eventBreakpointsSource = findSource(dbg, "event-breakpoints.js");

  info("Check that an event breakpoint can still be set");
  await toggleEventBreakpoint(dbg, "Mouse", "event.mouse.click");

  invokeInTab("clickHandler");
  await waitForPaused(dbg);
  await assertPausedAtSourceAndLine(dbg, eventBreakpointsSource.id, 12);

  const sanitizedEventListenerBreakpointsState = await asyncStorage.getItem(
    "debugger.event-listener-breakpoints"
  );
  const sanitizedActive =
    sanitizedEventListenerBreakpointsState.byPanel.breakpoint.active;
  ok(!sanitizedActive.includes(BAD_EVENT_ID));
  ok(sanitizedActive.includes("event.mouse.click"));

  await resume(dbg);
});
