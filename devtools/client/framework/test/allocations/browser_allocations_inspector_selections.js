/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Record allocations while opening and closing DevTools

const TEST_URL =
  "data:text/html;charset=UTF-8," +
  encodeURIComponent(
    `<!doctype html>
<html>
<head>
    <title>Test page</title>
    <style type="text/css">
    body {
        background-color: #f0f0f2;
        margin: 0;
        padding: 0;
        font-family: Arial;
    }
    div {
        width: 600px;
        margin: 5em auto;
        padding: 2em;
        background-color: #fdfdff;
        border-radius: 0.5em;
        box-shadow: 2px 3px 7px 2px rgba(0,0,0,0.02);
    }
    </style>    
</head>

<body>
  <div>element</div>
</body>
</html>`
  );

const { require } = ChromeUtils.importESModule(
  "resource://devtools/shared/loader/Loader.sys.mjs"
);
const {
  gDevTools,
} = require("resource://devtools/client/framework/devtools.js");

async function testScript(
  toolbox,
  inspector,
  nodeFrontA,
  nodeFrontB,
  nodeFrontC
) {
  let onSelectionChanged = toolbox.once("selection-changed");
  let updated = inspector.once("inspector-updated");
  let onBoxModelUpdated = inspector.once("boxmodel-view-updated");
  inspector.selection.setNodeFront(nodeFrontA, {
    reason: "browser-context-menu",
  });
  await onSelectionChanged;
  await updated;
  await onBoxModelUpdated;

  onSelectionChanged = toolbox.once("selection-changed");
  updated = inspector.once("inspector-updated");
  inspector.selection.setNodeFront(nodeFrontB, {
    reason: "browser-context-menu",
  });
  await onSelectionChanged;
  await updated;

  onSelectionChanged = toolbox.once("selection-changed");
  updated = inspector.once("inspector-updated");
  onBoxModelUpdated = inspector.once("boxmodel-view-updated");
  inspector.selection.setNodeFront(nodeFrontC, {
    reason: "browser-context-menu",
  });
  await onSelectionChanged;
  await updated;
  await onBoxModelUpdated;
}

add_task(async function () {
  const tab = await addTab(TEST_URL);

  const toolbox = await gDevTools.showToolboxForTab(tab, {
    toolId: "inspector",
  });
  const inspector = toolbox.getPanel("inspector");
  const root = await inspector.walker.getRootNode();
  const body = await inspector.walker.querySelector(root, "body");
  const style = await inspector.walker.querySelector(root, "style");
  const { nodes } = await inspector.walker.children(style);
  const styleText = nodes[0];
  const div = await inspector.walker.querySelector(root, "div");

  // Run the test scenario first before recording in order to load all the
  // modules. Otherwise they get reported as "still allocated" objects,
  // whereas we do expect them to be kept in memory as they are loaded via
  // the main DevTools loader, which keeps the module loaded until the
  // shutdown of Firefox
  await testScript(toolbox, inspector, body, styleText, div);

  // Now, run the test script. This time, we record this run.
  await startRecordingAllocations();
  for (let i = 0; i < 10; i++) {
    await testScript(toolbox, inspector, body, styleText, div);
  }

  // Text property editor updates async and doesn't emit reliable event
  // to wait for all async operations.
  // This can be really slow and require >1s to wait for all the accumulated async calls.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(r => setTimeout(r, 2000));

  await stopRecordingAllocations("inspector-selections");

  await toolbox.destroy();
  gBrowser.removeTab(tab);
});
