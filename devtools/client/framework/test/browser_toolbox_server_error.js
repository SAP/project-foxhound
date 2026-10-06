/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

/**
 * Test that the toolbox displays initialization errors via the AppErrorBoundary.
 */
const TEST_URL = "data:text/html,test for toolbox server error";

add_task(async function () {
  Services.fog.testResetFOG();

  await pushPref("devtools.testing.force-server-error", true);
  const tab = await addTab(TEST_URL);

  const toolbox = await gDevTools.showToolboxForTab(tab, {
    toolId: "webconsole",
  });

  // Wait for the panel to fall back to the error UI
  const errorPanel = await waitFor(
    () => toolbox.doc.querySelector(".app-error-panel"),
    "Wait for the error panel to be displayed"
  );

  ok(errorPanel, "Error panel is displayed");

  const events = Glean.devtoolsMain.toolboxServerError.testGetValue();
  is(
    events.length,
    1,
    "One devtoolsMain.toolboxServerError event was collected"
  );

  is(
    events[0].extra.descriptor_type,
    "tab",
    "toolboxServerError event has the expected descriptor_type"
  );
  is(
    events[0].extra.error_name,
    "Error",
    "toolboxServerError event has the expected error name"
  );
  is(
    events[0].extra.host_type,
    "bottom",
    "toolboxServerError event has the expected host_type"
  );
  is(
    events[0].extra.is_destroying,
    // Note: type is boolean, but extra_keys values are serialized as strings.
    "false",
    "toolboxServerError event has the expected is_destroying flag"
  );
  is(
    events[0].extra.is_local_tab,
    // Note: type is boolean, but extra_keys values are serialized as strings.
    "true",
    "toolboxServerError event has the expected is_local_tab flag"
  );
  is(
    events[0].extra.is_window_closed,
    // Note: type is boolean, but extra_keys values are serialized as strings.
    "false",
    "toolboxServerError event has the expected is_window_closed flag"
  );
  is(
    events[0].extra.packet_error,
    "TypeError",
    "toolboxServerError event has the expected packet error name"
  );
  info(events[0].extra.stack);
  ok(
    events[0].extra.stack.includes(
      "resource://devtools/shared/commands/resource/resource-command.js"
    ),
    "toolboxServerError event has the expected stack"
  );
  ok(
    events[0].extra.server_stack.includes(
      "watchResources@resource://devtools/server/actors/watcher.js"
    ),
    "toolboxServerError event has the expected server stack"
  );
  ok(
    events[0].extra.server_content_process_stack.includes("/document-event.js"),
    "toolboxServerError event has the expected server content process stack"
  );
  is(
    events[0].extra.packet_type,
    "watchResources",
    "toolboxServerError packet type is correct"
  );
  is(
    events[0].extra.session_id,
    toolbox.sessionId,
    "toolboxServerError session_id matches the toolbox session id"
  );

  await toolbox.destroy();
  gBrowser.removeCurrentTab();
});
