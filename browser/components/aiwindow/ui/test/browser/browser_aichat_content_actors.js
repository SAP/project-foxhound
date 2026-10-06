/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test that AIChatContent actor gets registered when preference is enabled
 */
add_task(async function test_aichat_actor_registration() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
    const actor =
      browser.browsingContext.currentWindowGlobal.getActor("AIChatContent");
    Assert.ok(actor, "AIChatContent actor should be registered");
  });

  await SpecialPowers.popPrefEnv();
});

/**
 * Test that AIChatContent actor is not available when preference is disabled
 */
add_task(async function test_aichat_actor_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", false]],
  });

  await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
    Assert.throws(
      () =>
        browser.browsingContext.currentWindowGlobal.getActor("AIChatContent"),
      /NotFoundError/,
      "AIChatContent actor should not be available when disabled"
    );
  });

  await SpecialPowers.popPrefEnv();
});
