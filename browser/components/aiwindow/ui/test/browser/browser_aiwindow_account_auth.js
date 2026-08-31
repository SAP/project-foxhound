/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AIWindowAccountAuth } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/AIWindowAccountAuth.sys.mjs"
);

const { SpecialMessageActions } = ChromeUtils.importESModule(
  "resource://messaging-system/lib/SpecialMessageActions.sys.mjs"
);

add_task(async function test_autoClose_false_when_firstrun_not_completed() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.firstrun.hasCompleted", false],
      ["browser.smartwindow.tos.consentTime", 0],
    ],
  });

  const stub = sinon
    .stub(SpecialMessageActions, "fxaSignInFlow")
    .resolves(true);

  try {
    await AIWindowAccountAuth.promptSignIn(gBrowser.selectedBrowser);

    Assert.ok(stub.calledOnce, "fxaSignInFlow should be called once");

    const callArgs = stub.getCall(0).args[0];
    Assert.equal(
      callArgs.autoClose,
      false,
      "autoClose should be false when firstrun has not completed"
    );
  } finally {
    stub.restore();
    await SpecialPowers.popPrefEnv();
  }
});

add_task(async function test_autoClose_true_when_firstrun_completed() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.firstrun.hasCompleted", true],
      ["browser.smartwindow.tos.consentTime", 1735689600],
    ],
  });

  const stub = sinon
    .stub(SpecialMessageActions, "fxaSignInFlow")
    .resolves(true);

  try {
    await AIWindowAccountAuth.promptSignIn(gBrowser.selectedBrowser);

    Assert.ok(stub.calledOnce, "fxaSignInFlow should be called once");

    const callArgs = stub.getCall(0).args[0];
    Assert.equal(
      callArgs.autoClose,
      true,
      "autoClose should be true when firstrun has completed"
    );
  } finally {
    stub.restore();
    await SpecialPowers.popPrefEnv();
  }
});
