/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { TaskbarTabs } = ChromeUtils.importESModule(
  "resource:///modules/taskbartabs/TaskbarTabs.sys.mjs"
);

add_task(async function test_CREATE_TASKBAR_TAB() {
  let taskbarTabStub = sinon.stub(TaskbarTabs, "moveTabIntoTaskbarTab");
  await BrowserTestUtils.withNewTab("https://example.com", async () => {
    await SMATestUtils.executeAndValidateAction({
      type: "CREATE_TASKBAR_TAB",
    });
  });

  Assert.equal(
    taskbarTabStub.callCount,
    1,
    "moveTabIntoTaskbarTab called by the action"
  );

  taskbarTabStub.restore();
});
