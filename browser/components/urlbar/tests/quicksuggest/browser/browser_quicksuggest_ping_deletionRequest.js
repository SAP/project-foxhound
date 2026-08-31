/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ContextId: "moz-src:///browser/modules/ContextId.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

if (ContextId.rotationEnabled) {
  // Tests that ContextId.forceRotation is called when Suggest as a whole is
  // disabled.
  add_task(async function suggestDisabled() {
    let sandbox = sinon.createSandbox();
    sandbox.stub(ContextId, "forceRotation");

    UrlbarPrefs.set("quicksuggest.enabled", false);
    Assert.ok(
      ContextId.forceRotation.calledOnce,
      "Should have forced context ID rotation upon disabling suggest"
    );

    UrlbarPrefs.clear("quicksuggest.enabled");
    await QuickSuggestTestUtils.forceSync();

    sandbox.restore();
  });

  // Tests that ContextId.forceRotation is called when AMP suggestions are
  // disabled.
  add_task(async function ampDisabled() {
    let sandbox = sinon.createSandbox();
    sandbox.stub(ContextId, "forceRotation");

    UrlbarPrefs.set("suggest.quicksuggest.sponsored", false);
    // Bug 1982437: When this test folder is run in series, it appears that
    // setting suggest.quicksuggest.sponsored to `false` here will cause the
    // UrlbarPrefs preference observer to fire multiple times, which will
    // mean that forceRotation will get called multiple times. We work around
    // this for now by using `called` rather than `calledOnce`.
    Assert.ok(
      ContextId.forceRotation.called,
      "Should have forced context ID rotation upon disabling sponsored suggest"
    );

    UrlbarPrefs.clear("suggest.quicksuggest.sponsored");
    await QuickSuggestTestUtils.forceSync();

    sandbox.restore();
  });
} else {
  // Tests the `quick-suggest-deletion-request` Glean ping if context ID
  // rotation is not enabled.

  // The ping should be submitted when Suggest as a whole is disabled.
  add_task(async function suggestDisabled() {
    await assertPingSubmitted(() => {
      UrlbarPrefs.set("quicksuggest.enabled", false);
    });

    UrlbarPrefs.clear("quicksuggest.enabled");
    await QuickSuggestTestUtils.forceSync();
  });

  // The ping should be submitted when AMP suggestions are disabled.
  add_task(async function ampDisabled() {
    await assertPingSubmitted(() => {
      UrlbarPrefs.set("suggest.quicksuggest.sponsored", false);
    });

    UrlbarPrefs.clear("suggest.quicksuggest.sponsored");
    await QuickSuggestTestUtils.forceSync();
  });

  async function assertPingSubmitted(callback) {
    let submitted = false;
    GleanPings.quickSuggestDeletionRequest.testBeforeNextSubmit(() => {
      submitted = true;
    });

    await callback();
    await TestUtils.waitForCondition(
      () => submitted,
      "Waiting for testBeforeNextSubmit"
    );

    Assert.equal(
      Glean.quickSuggest.contextId.testGetValue(),
      expectedPingContextId(),
      "The ping should have contextId set"
    );
  }
}
