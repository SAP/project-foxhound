/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * With no custom cleaning categories set and sanitizeOnShutdown disabled,
 * the checkboxes "alwaysClear" and "deleteOnClose" should share the same state.
 * The state of the cleaning categories cookiesAndStorage and cache should be in the state of the "deleteOnClose" box.
 */
add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.clearOnShutdown.cookies", true]],
  });
});

add_task(async function test_syncWithoutCustomPrefs() {
  await openPreferencesViaOpenPreferencesAPI("panePrivacy", {
    leaveOpen: true,
  });

  let document = gBrowser.contentDocument;
  let deleteOnCloseBox = document.getElementById("deleteOnClose");
  let alwaysClearBox = document.getElementById("alwaysClear");

  ok(!deleteOnCloseBox.checked, "DeleteOnClose initial state is deselected");
  ok(!alwaysClearBox.checked, "AlwaysClear initial state is deselected");

  deleteOnCloseBox.click();

  // Wait for UI to update.
  await new Promise(resolve => requestAnimationFrame(resolve));

  ok(deleteOnCloseBox.checked, "DeleteOnClose is selected");
  is(
    deleteOnCloseBox.checked,
    alwaysClearBox.checked,
    "DeleteOnClose sets alwaysClear in the same state, selected"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cookiesAndStorage"),
    "Cookie cleaning pref is set"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cache"),
    "Cache cleaning pref is set"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.cookies"),
    "Old cookie cleaning pref is not changed"
  );
  ok(
    !Services.prefs.getBoolPref(
      "privacy.clearOnShutdown_v2.browsingHistoryAndDownloads"
    ),
    "History cleaning pref is not set"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.siteSettings"),
    "Site settings cleaning pref is not set"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown.siteSettings"),
    "Old Site settings cleaning pref is not set"
  );

  deleteOnCloseBox.click();

  // Wait for UI to update.
  await new Promise(resolve => requestAnimationFrame(resolve));

  ok(!deleteOnCloseBox.checked, "DeleteOnClose is deselected");
  is(
    deleteOnCloseBox.checked,
    alwaysClearBox.checked,
    "DeleteOnclose sets alwaysClear in the same state, deselected"
  );

  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cookiesAndStorage"),
    "Cookie cleaning pref is reset"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cache"),
    "Cache cleaning pref is reset"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.cookies"),
    "Old cookie cleaning pref is not changed"
  );
  ok(
    !Services.prefs.getBoolPref(
      "privacy.clearOnShutdown_v2.browsingHistoryAndDownloads"
    ),
    "History cleaning pref is not set"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.siteSettings"),
    "Site settings cleaning pref is not set"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  Services.prefs.clearUserPref(
    "privacy.clearOnShutdown_v2.browsingHistoryAndDownloads"
  );
  Services.prefs.clearUserPref("privacy.clearOnShutdown_v2.siteSettings");
  Services.prefs.clearUserPref("privacy.clearOnShutdown_v2.cache");
  Services.prefs.clearUserPref("privacy.clearOnShutdown_v2.cookiesAndStorage");
  Services.prefs.clearUserPref("privacy.sanitize.sanitizeOnShutdown");
});

/*
 * With custom cleaning category already set and SanitizeOnShutdown enabled,
 * deselecting "deleteOnClose" should not change the state of "alwaysClear".
 * The state of the cleaning categories cookiesAndStorage and cache should be in the state of the "deleteOnClose" box.
 */
add_task(async function test_syncWithCustomPrefs() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown_v2.browsingHistoryAndDownloads", true],
      ["privacy.clearOnShutdown.history", false],
      ["privacy.clearOnShutdown_v2.siteSettings", true],
      ["privacy.sanitize.sanitizeOnShutdown", true],
    ],
  });

  await openPreferencesViaOpenPreferencesAPI("panePrivacy", {
    leaveOpen: true,
  });

  let document = gBrowser.contentDocument;
  let deleteOnCloseBox = document.getElementById("deleteOnClose");
  let alwaysClearBox = document.getElementById("alwaysClear");

  ok(deleteOnCloseBox.checked, "DeleteOnClose initial state is selected");
  ok(alwaysClearBox.checked, "AlwaysClear initial state is selected");

  is(
    deleteOnCloseBox.checked,
    alwaysClearBox.checked,
    "AlwaysClear and deleteOnClose are in the same state, selected"
  );
  ok(
    Services.prefs.getBoolPref(
      "privacy.clearOnShutdown_v2.browsingHistoryAndDownloads"
    ),
    "History cleaning pref is still set"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown.history"),
    "Old history cleaning pref is not changed"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.siteSettings"),
    "Site settings cleaning pref is still set"
  );

  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cookiesAndStorage"),
    "Cookie cleaning pref is set"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cache"),
    "Cache cleaning pref is set"
  );

  deleteOnCloseBox.click();

  // Wait for UI to update.
  await new Promise(resolve => requestAnimationFrame(resolve));

  ok(!deleteOnCloseBox.checked, "DeleteOnClose is deselected");
  is(
    !deleteOnCloseBox.checked,
    alwaysClearBox.checked,
    "AlwaysClear is not synced with deleteOnClose, only deleteOnClose is deselected"
  );

  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cookiesAndStorage"),
    "Cookie cleaning pref is reset"
  );
  ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.cache"),
    "Cache cleaning pref is reset"
  );
  ok(
    Services.prefs.getBoolPref(
      "privacy.clearOnShutdown_v2.browsingHistoryAndDownloads"
    ),
    "History cleaning pref is still set"
  );
  ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown_v2.siteSettings"),
    "Site settings cleaning pref is still set"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  await SpecialPowers.popPrefEnv();
});

/*
 * Setting/resetting cleaning prefs for cookies, cache, offline apps
 * and selecting/deselecting the "alwaysClear" Box, also selects/deselects
 * the "deleteOnClose" box.
 */

add_task(async function test_syncWithCustomPrefs() {
  await openPreferencesViaOpenPreferencesAPI("panePrivacy", {
    leaveOpen: true,
  });

  let document = gBrowser.contentDocument;
  let deleteOnCloseBox = document.getElementById("deleteOnClose");
  let alwaysClearBox = document.getElementById("alwaysClear");

  ok(!deleteOnCloseBox.checked, "DeleteOnClose initial state is deselected");
  ok(!alwaysClearBox.checked, "AlwaysClear initial state is deselected");

  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown_v2.cookiesAndStorage", true],
      ["privacy.clearOnShutdown_v2.cache", true],
      ["privacy.sanitize.sanitizeOnShutdown", true],
    ],
  });

  ok(alwaysClearBox.checked, "AlwaysClear is selected");
  is(
    deleteOnCloseBox.checked,
    alwaysClearBox.checked,
    "AlwaysClear and deleteOnClose are in the same state, selected"
  );

  alwaysClearBox.click();

  // Wait for UI to update.
  await new Promise(resolve => requestAnimationFrame(resolve));

  ok(!alwaysClearBox.checked, "AlwaysClear is deselected");
  is(
    deleteOnCloseBox.checked,
    alwaysClearBox.checked,
    "AlwaysClear and deleteOnClose are in the same state, deselected"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  await SpecialPowers.popPrefEnv();
});

/*
 * On loading the page, the ClearOnClose box should be set according to the pref selection
 */
add_task(async function test_initialState() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown_v2.cookiesAndStorage", true],
      ["privacy.clearOnShutdown_v2.cache", true],
      ["privacy.sanitize.sanitizeOnShutdown", true],
    ],
  });

  await openPreferencesViaOpenPreferencesAPI("panePrivacy", {
    leaveOpen: true,
  });

  let document = gBrowser.contentDocument;
  let deleteOnCloseBox = document.getElementById("deleteOnClose");

  ok(
    deleteOnCloseBox.checked,
    "DeleteOnClose is set accordingly to the prefs, selected"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);

  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown_v2.cookiesAndStorage", false],
      ["privacy.clearOnShutdown_v2.cache", false],
      ["privacy.sanitize.sanitizeOnShutdown", true],
      ["privacy.clearOnShutdown_v2.browsingHistoryAndDownloads", true],
    ],
  });

  await openPreferencesViaOpenPreferencesAPI("panePrivacy", {
    leaveOpen: true,
  });

  document = gBrowser.contentDocument;
  deleteOnCloseBox = document.getElementById("deleteOnClose");

  ok(
    !deleteOnCloseBox.checked,
    "DeleteOnClose is set accordingly to the prefs, deselected"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);

  // When private browsing mode autostart is selected, the deleteOnClose Box is selected always
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.clearOnShutdown_v2.cookiesAndStorage", false],
      ["privacy.clearOnShutdown_v2.cache", false],
      ["privacy.sanitize.sanitizeOnShutdown", false],
      ["browser.privatebrowsing.autostart", true],
    ],
  });

  await openPreferencesViaOpenPreferencesAPI("panePrivacy", {
    leaveOpen: true,
  });

  document = gBrowser.contentDocument;
  deleteOnCloseBox = document.getElementById("deleteOnClose");

  ok(
    deleteOnCloseBox.checked,
    "DeleteOnClose is set accordingly to the private Browsing autostart pref, selected"
  );

  // Reset history mode
  await SpecialPowers.popPrefEnv();
  gBrowser.contentWindow.Preferences.getSetting("historyMode").value =
    "remember";
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
