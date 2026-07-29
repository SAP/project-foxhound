/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { WindowsLaunchOnLogin } = ChromeUtils.importESModule(
  "resource://gre/modules/WindowsLaunchOnLogin.sys.mjs"
);

add_task(async function test_CONFIRM_LAUNCH_ON_LOGIN() {
  const sandbox = sinon.createSandbox();
  sandbox.stub(WindowsLaunchOnLogin, "createLaunchOnLogin").resolves();
  registerCleanupFunction(() => sandbox.restore());

  await SMATestUtils.executeAndValidateAction({
    type: "CONFIRM_LAUNCH_ON_LOGIN",
  });

  Assert.ok(
    WindowsLaunchOnLogin.createLaunchOnLogin.calledOnce,
    "createLaunchOnLogin was called by the action"
  );
});

add_task(async function test_REMOVE_LAUNCH_ON_LOGIN() {
  const sandbox = sinon.createSandbox();
  sandbox.stub(WindowsLaunchOnLogin, "removeLaunchOnLogin").resolves();
  registerCleanupFunction(() => sandbox.restore());

  await SMATestUtils.executeAndValidateAction({
    type: "REMOVE_LAUNCH_ON_LOGIN",
  });

  Assert.ok(
    WindowsLaunchOnLogin.removeLaunchOnLogin.calledOnce,
    "removeLaunchOnLogin was called by the action"
  );
});
