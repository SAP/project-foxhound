/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  ASRouter: "resource:///modules/asrouter/ASRouter.sys.mjs",
});

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

add_task(async function test_feature_callout_triggers() {
  const sandbox = sinon.createSandbox();
  const receivedTrigger = new Promise(resolve => {
    sandbox.stub(lazy.ASRouter, "sendTriggerMessage").callsFake(({ id }) => {
      if (id === "smartWindowNewTab") {
        resolve(true);
      }
    });
  });

  const win = await BrowserTestUtils.openNewBrowserWindow({
    aiWindow: true,
  });

  let smartWindowNewTabTrigger = await receivedTrigger;

  Assert.ok(
    smartWindowNewTabTrigger,
    "ASRouter smartWindowNewTab trigger fired with the correct id"
  );

  // Clean up
  sandbox.restore();
  await BrowserTestUtils.closeWindow(win);
});
