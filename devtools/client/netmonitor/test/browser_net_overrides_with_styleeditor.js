/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* import-globals-from network-overrides-test-helpers.js */
Services.scriptloader.loadSubScript(
  CHROME_URL_ROOT + "network-overrides-test-helpers.js",
  this
);

/**
 * Test network override updates between the network monitor and the style editor.
 */

add_task(async function () {
  const { monitor, document } = await setupNetworkOverridesTest();

  const stylesheetRequest = findRequestByInitiator(document, "stylesheet");

  info("Set a network override for the stylesheet request");
  const overrideFileName = `style-override.css`;
  await setNetworkOverride(
    monitor,
    stylesheetRequest,
    overrideFileName,
    OVERRIDDEN_STYLESHEET,
    false
  );

  const waitForEvents = waitForNetworkEvents(monitor, 3);
  gBrowser.selectedBrowser.reload();
  await waitForEvents;

  info("Switch to styleeditor and check the stylesheet content");
  const { UI } = await monitor.toolbox.selectTool("styleeditor");

  const editor = UI.editors.find(e => e.friendlyName === "style.css");

  await UI.selectStyleSheet(editor.styleSheet);
  const styleEditor = await editor.getSourceEditor();
  const text = styleEditor.sourceEditor.getText();
  is(text, OVERRIDDEN_STYLESHEET, "style inspector changes are synced");

  is(
    monitor.panelWin.store.getState().requests.requests.length,
    3,
    "No new request is displayed in the netmonitor when opening the style editor"
  );

  return teardown(monitor);
});
