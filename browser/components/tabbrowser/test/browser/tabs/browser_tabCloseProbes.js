"use strict";

add_setup(async function () {
  // Force-enable tab animations
  gReduceMotionOverride = false;
});

/**
 * Tests browser.tabclose.time_anim by closing a tab with the tab
 * close animation.
 */
add_task(async function test_close_time_anim_probe() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  await BrowserTestUtils.waitForCondition(() => tab._fullyOpen);

  Services.fog.testResetFOG();

  BrowserTestUtils.removeTab(tab, { animate: true });

  await BrowserTestUtils.waitForCondition(() =>
    Glean.browserTabclose.timeAnim.testGetValue()
  );
  Assert.equal(Glean.browserTabclose.timeAnim.testGetValue().count, 1);
  Assert.equal(Glean.browserTabclose.timeNoAnim.testGetValue()?.count ?? 0, 0);
});

/**
 * Tests browser.tabclose.time_no_anim by closing a tab without the
 * tab close animation.
 */
add_task(async function test_close_time_no_anim_probe() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  await BrowserTestUtils.waitForCondition(() => tab._fullyOpen);

  Services.fog.testResetFOG();

  BrowserTestUtils.removeTab(tab, { animate: false });

  await BrowserTestUtils.waitForCondition(() =>
    Glean.browserTabclose.timeNoAnim.testGetValue()
  );
  Assert.equal(Glean.browserTabclose.timeAnim.testGetValue()?.count ?? 0, 0);
  Assert.equal(Glean.browserTabclose.timeNoAnim.testGetValue().count, 1);
});
