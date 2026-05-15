/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_FXA_AIWINDOW_SIGNIN_FLOW() {
  let launchAIWindowStub = sinon.stub(AIWindow, "launchWindow");
  launchAIWindowStub.resolves(true);

  await SMATestUtils.executeAndValidateAction({
    type: "FXA_AIWINDOW_SIGNIN_FLOW",
  });

  Assert.equal(
    launchAIWindowStub.callCount,
    1,
    "Should call launchWindow once"
  );

  Assert.ok(
    launchAIWindowStub.firstCall.args[0],
    "Should be called with browser argument"
  );

  launchAIWindowStub.restore();
});
