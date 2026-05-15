/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Verifies that the about:addons theme pane shows a notice in forced-colors
// mode, alerting users that themes are overridden.
add_task(async function test_aboutaddons_forced_colors_notice() {
  const assertForcedColorsNotice = async (addonsWin, { expectVisible }) => {
    const forcedColorsNotice = addonsWin.document.querySelector(
      "forced-colors-notice"
    );
    Assert.equal(
      BrowserTestUtils.isVisible(forcedColorsNotice),
      expectVisible,
      `Expect forced-colors notice to be ${expectVisible ? "shown" : "hidden"}`
    );
    if (expectVisible) {
      const messageBar = forcedColorsNotice.querySelector("moz-message-bar");
      Assert.ok(
        messageBar,
        "Expect a moz-message-bar to be found in the forced-colors notice"
      );
      Assert.equal(
        messageBar.type,
        "info",
        "Got the expected moz-message-bar type"
      );
      Assert.equal(
        messageBar.dataset.l10nId,
        "forced-colors-theme-notice",
        "Got the expected fluent ID set on the moz-message-bar"
      );
      Assert.equal(
        messageBar.dismissable,
        false,
        "moz-message-bar should not be dismissable"
      );
    }
  };

  info("Open about:addons with forced-colors mode disabled");
  await SpecialPowers.pushPrefEnv({
    set: [["ui.useAccessibilityTheme", 0]],
  });
  let win = await loadInitialView("theme");
  await assertForcedColorsNotice(win, { expectVisible: false });

  info("Switch forced-colors mode on");
  await SpecialPowers.pushPrefEnv({
    set: [["ui.useAccessibilityTheme", 1]],
  });
  await assertForcedColorsNotice(win, { expectVisible: true });

  info("Close and reopen about:addons tab with forced-colors enabled");
  await closeView(win);
  win = await loadInitialView("theme");
  await assertForcedColorsNotice(win, { expectVisible: true });

  info("Switch forced-colors mode off");
  await SpecialPowers.pushPrefEnv({
    set: [["ui.useAccessibilityTheme", 0]],
  });
  await assertForcedColorsNotice(win, { expectVisible: false });

  info("Test that forced-colors override is disabled when the pref is false");
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.theme.forced-colors-override.enabled", false],
      ["ui.useAccessibilityTheme", 1],
    ],
  });
  await closeView(win);
  win = await loadInitialView("theme");
  await assertForcedColorsNotice(win, { expectVisible: false });
  await SpecialPowers.popPrefEnv();

  await closeView(win);
});
