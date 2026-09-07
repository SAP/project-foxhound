/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Waits for the browser's visibility state to match the expected value and
 * returns the current image animation mode.
 *
 * @param {Browser} browser
 *   The browser to check.
 * @param {boolean} visible
 *   Whether to wait for the visible or hidden state.
 * @returns {Promise<number>}
 *   The imageAnimationMode value after entering the expected state.
 */
async function getAnimationModeAfterVisibilityChange(browser, visible) {
  return SpecialPowers.spawn(browser, [visible], async isVisible => {
    await ContentTaskUtils.waitForCondition(() => {
      return isVisible
        ? content.document.visibilityState == "visible"
        : content.document.visibilityState != "visible";
    });
    return content.windowUtils.imageAnimationMode;
  });
}

/**
 * Tests that image animations are stopped when about:newtab is backgrounded
 * and resumed when it is foregrounded.
 */
add_task(async function test_newtab_animation_stopped_when_backgrounded() {
  let newtab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:newtab",
    false
  );

  let foregroundTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com"
  );

  let browser = newtab.linkedBrowser;

  let animationMode = await getAnimationModeAfterVisibilityChange(
    browser,
    false
  );

  Assert.equal(
    animationMode,
    Ci.imgIContainer.kDontAnimMode,
    "Animation should be stopped when newtab is backgrounded"
  );

  await BrowserTestUtils.switchTab(gBrowser, newtab);

  animationMode = await getAnimationModeAfterVisibilityChange(browser, true);

  Assert.equal(
    animationMode,
    Ci.imgIContainer.kNormalAnimMode,
    "Animation should resume when newtab is foregrounded"
  );

  await BrowserTestUtils.switchTab(gBrowser, foregroundTab);

  animationMode = await getAnimationModeAfterVisibilityChange(browser, false);

  Assert.equal(
    animationMode,
    Ci.imgIContainer.kDontAnimMode,
    "Animation should be stopped again when newtab is backgrounded"
  );

  BrowserTestUtils.removeTab(foregroundTab);
  BrowserTestUtils.removeTab(newtab);
});
