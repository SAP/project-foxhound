/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

XPCOMUtils.defineLazyModuleGetters(this, {
  AppUpdater: "resource://gre/modules/AppUpdater.jsm",
  sinon: "resource://testing-common/Sinon.jsm",
});

add_setup(function setup_internalErrorTest() {
  const sandbox = sinon.createSandbox();
  sandbox.stub(AppUpdater.prototype, "aus").get(() => {
    throw new Error("intentional test error");
  });
  sandbox.stub(AppUpdater.prototype, "checker").get(() => {
    throw new Error("intentional test error");
  });
  sandbox.stub(AppUpdater.prototype, "um").get(() => {
    throw new Error("intentional test error");
  });
  registerCleanupFunction(() => {
    sandbox.restore();
  });
});

// Test for the About dialog's internal error handling.
add_task(async function aboutDialog_internalError() {
  let params = {};
  await runAboutDialogUpdateTest(params, [
    {
      panelId: "internalError",
    },
  ]);
});
