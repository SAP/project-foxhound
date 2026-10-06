/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// There are shutdown issues for which multiple rejections are left uncaught.
// See bug 1018184 for resolving these issues.
const { PromiseTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PromiseTestUtils.sys.mjs"
);
PromiseTestUtils.allowMatchingRejectionsGlobally(/File closed/);

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/devtools/client/inspector/test/shared-head.js",
  this
);

// Test that the Browser Toolbox can take screenshots.
add_task(async function () {
  // Select the options panel, which is faster than other panels, since we
  // are testing a toolbox toolbar button.
  await pushPref("devtools.browsertoolbox.panel", "options");

  // Enable the screenshot button
  await pushPref("devtools.command-button-screenshot.enabled", true);

  await addTab(`data:text/html,<div id="test-div">SCREENSHOT TOOL TEST</div>`);

  const ToolboxTask = await initBrowserToolboxTask();
  await ToolboxTask.importFunctions({
    getNodeFront,
    getNodeFrontInFrames,
    selectNode,
    // selectNodeInFrames depends on selectNode, getNodeFront, getNodeFrontInFrames.
    selectNodeInFrames,
    waitUntilDownload,
  });

  // Necessary for waitUntilDownload
  await ToolboxTask.evaluateExpression("let allDownloads = [];");

  const hasFilePath = await ToolboxTask.spawn(null, async () => {
    /* global gToolbox */
    const onScreenshotDownloaded = waitUntilDownload();
    gToolbox.doc.querySelector("#command-button-screenshot").click();
    const filePath = await onScreenshotDownloaded;
    return !!filePath;
  });
  ok(hasFilePath, "Browser toolbox take screenshot command succeeded");

  await ToolboxTask.destroy();
});
