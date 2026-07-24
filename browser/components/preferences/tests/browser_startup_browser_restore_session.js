/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests for "Open previous windows
 * and tabs" checkbox on about:preferences.
 */

registerCleanupFunction(() => {
  gBrowser.removeCurrentTab();
});

add_setup(async function () {
  await openPreferencesViaOpenPreferencesAPI("general", { leaveOpen: true });
});

add_task(async function test_startup_browser_restore() {
  const PREF = "browser.privatebrowsing.autostart";
  const FALSE_INITIAL_VALUE = false;

  /**
   * Assume pref is set to false initially.
   */
  Services.prefs.setBoolPref(PREF, FALSE_INITIAL_VALUE);

  const { document } = gBrowser.contentWindow;
  let browserRestoreSession = document.getElementById("browserRestoreSession");
  const { parentElement: control } = browserRestoreSession;
  const checkbox = control.querySelector("moz-checkbox");

  is(
    browserRestoreSession.localName,
    "moz-checkbox",
    "Checkbox is a moz-checkbox."
  );

  ok(!control.hidden, "Control element is visible by default");

  ok(!checkbox.disabled, "Checkbox is NOT disabled by default");

  ok(!checkbox.checked, "Checkbox is NOT checked by default");

  is(
    content.document.l10n.getAttributes(browserRestoreSession).id,
    "startup-restore-windows-and-tabs",
    `Checkbox has the correct data-l10n-id attribute`
  );

  Services.prefs.setBoolPref(PREF, true);
  await control.updateComplete;

  ok(checkbox.disabled, "Checkbox is disabled after pref is set to true");

  /**
   * Re-enable control.
   */
  Services.prefs.setBoolPref(PREF, FALSE_INITIAL_VALUE);
  await control.updateComplete;

  Services.prefs.setIntPref("browser.startup.page", 0);

  ok(
    !checkbox.checked,
    "Checkbox is NOT checked after browser.startup.page is set to 0 = STARTUP_PREF_BLANK"
  );

  Services.prefs.setIntPref("browser.startup.page", 1);
  await control.updateComplete;

  ok(
    !checkbox.checked,
    "Checkbox is still NOT checked after changing browser.startup.page to 1 = STARTUP_PREF_HOMEPAGE"
  );

  Services.prefs.setIntPref("browser.startup.page", 3);
  await control.updateComplete;

  ok(
    checkbox.checked,
    "Checkbox is checked after changing browser.startup.page to 3 = STARTUP_PREF_RESTORE_SESSION"
  );

  Services.prefs.clearUserPref(PREF);
});
