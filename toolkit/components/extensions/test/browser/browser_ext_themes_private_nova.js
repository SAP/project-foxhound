"use strict";

/**
 * Tests that private browsing windows substitute the built-in private-window
 * theme when Nova is enabled and the active user theme is the default or an
 * in-App built-in. Third-party and non-inApp themes (e.g. alpenglow)
 * are left unchanged.
 */

const { BuiltInThemes } = ChromeUtils.importESModule(
  "resource:///modules/BuiltInThemes.sys.mjs"
);

const DEFAULT_THEME_ID = "default-theme@mozilla.org";
const LIGHT_THEME_ID = "firefox-compact-light@mozilla.org";
const DARK_THEME_ID = "firefox-compact-dark@mozilla.org";
const ALPENGLOW_THEME_ID = "firefox-alpenglow@mozilla.org";
const PRIVATE_THEME_ID = "firefox-privatewindow@mozilla.org";

async function checkWindowTheme(win, { effectiveThemeId, expectInApp }) {
  let root = win.document.documentElement;
  await BrowserTestUtils.waitForCondition(
    () => root.getAttribute("theme-effective-id") === effectiveThemeId,
    `Waiting for theme-effective-id to be ${effectiveThemeId}`
  );
  Assert.equal(
    root.getAttribute("theme-effective-id"),
    effectiveThemeId,
    "Window should apply the expected theme."
  );
  Assert.equal(
    root.hasAttribute("theme-in-app"),
    expectInApp,
    `theme-in-app attribute should${expectInApp ? "" : " not"} be set.`
  );
}

/**
 * Open a normal and a private window, assert their effective theme, then clean
 * up.
 *
 * @param {object} options
 * @param {string} options.normalThemeId - Expected effective theme id in a
 *        normal browsing window.
 * @param {string} options.privateThemeId - Expected effective theme id in a
 *        private browsing window.
 * @param {boolean} options.expectInApp - Expected theme-in-app attribute state
 *        (the same for both windows in every case we test).
 */
async function testNormalAndPrivate({
  normalThemeId,
  privateThemeId,
  expectInApp,
}) {
  await checkWindowTheme(window, {
    effectiveThemeId: normalThemeId,
    expectInApp,
  });

  await checkWindowTheme(privateWin, {
    effectiveThemeId: privateThemeId,
    expectInApp,
  });
}

let privateWin = null;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.nova.enabled", true]],
  });
  // Ensure the built-in themes are initialized.
  await BuiltInThemes.ensureBuiltInThemes();

  // Switching to a theme and back reaches a consistent themeData state, so the
  // default-theme case below sees fully-populated theme data. See the matching
  // note in browser_ext_themes_pbm.js.
  let lightTheme = await AddonManager.getAddonByID(LIGHT_THEME_ID);
  await lightTheme.enable();
  await lightTheme.disable();

  privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  registerCleanupFunction(async () => {
    await BrowserTestUtils.closeWindow(privateWin);
  });
});

// Default theme: private windows substitute the private-window theme; both
// windows are considered in-app.
add_task(async function test_default_theme() {
  await testNormalAndPrivate({
    normalThemeId: DEFAULT_THEME_ID,
    privateThemeId: PRIVATE_THEME_ID,
    expectInApp: true,
  });
});

// Dark built-in (inApp): no substitution in private windows but theme-in-app is true
add_task(async function test_dark_theme() {
  let darkTheme = await AddonManager.getAddonByID(DARK_THEME_ID);
  await darkTheme.enable();

  await testNormalAndPrivate({
    normalThemeId: DARK_THEME_ID,
    privateThemeId: DARK_THEME_ID,
    expectInApp: true,
  });

  await darkTheme.disable();
});

// Light built-in (inApp): no substitution in private windows but theme-in-app is true
add_task(async function test_light_theme() {
  let lightTheme = await AddonManager.getAddonByID(LIGHT_THEME_ID);
  await lightTheme.enable();

  await testNormalAndPrivate({
    normalThemeId: LIGHT_THEME_ID,
    privateThemeId: LIGHT_THEME_ID,
    expectInApp: true,
  });

  await lightTheme.disable();
});

// Alpenglow (built-in, but not inApp): no substitution in private windows, and
// theme-in-app is not set in either window.
add_task(async function test_alpenglow_theme() {
  let alpenglowTheme = await AddonManager.getAddonByID(ALPENGLOW_THEME_ID);
  await alpenglowTheme.enable();

  await testNormalAndPrivate({
    normalThemeId: ALPENGLOW_THEME_ID,
    privateThemeId: ALPENGLOW_THEME_ID,
    expectInApp: false,
  });

  await alpenglowTheme.disable();
});

// With browser.theme.dark-private-windows disabled, private windows should not
// substitute the private-window theme even with the default theme and Nova
// enabled. theme-in-app still reflects the user's (default) theme.
add_task(async function test_dark_private_windows_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.theme.dark-private-windows", false]],
  });

  // The pref is read per-update with no observer, so open a fresh private
  // window to pick up the disabled state at construction.
  let privateWinNoSub = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  await checkWindowTheme(privateWinNoSub, {
    effectiveThemeId: DEFAULT_THEME_ID,
    expectInApp: true,
  });

  await BrowserTestUtils.closeWindow(privateWinNoSub);
  await SpecialPowers.popPrefEnv();
});
