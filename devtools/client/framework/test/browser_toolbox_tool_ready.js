/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { PromiseTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PromiseTestUtils.sys.mjs"
);

// Closing the toolbox makes the performance panel try to stop the profiler;
// when it's already running (MOZ_PROFILER_STARTUP=1) that request races the
// connection teardown and rejects harmlessly. See bug 2044383.
PromiseTestUtils.allowMatchingRejectionsGlobally(
  /Connection closed, pending request to .*stopProfilerAndDiscardProfile/
);

requestLongerTimeout(5);

async function performChecks(tab) {
  let toolbox;
  const toolIds = await getSupportedToolIds(tab);
  for (const toolId of toolIds) {
    info("About to open " + toolId);
    toolbox = await gDevTools.showToolboxForTab(tab, { toolId });
    ok(toolbox, "toolbox exists for " + toolId);
    is(toolbox.currentToolId, toolId, "currentToolId should be " + toolId);

    const panel = toolbox.getCurrentPanel();
    ok(panel, toolId + " panel has been registered in the toolbox");
  }

  await toolbox.destroy();
}

function test() {
  (async function () {
    toggleAllTools(true);
    const tab = await addTab("about:blank");
    await performChecks(tab);
    gBrowser.removeCurrentTab();
    toggleAllTools(false);
    finish();
  })();
}
