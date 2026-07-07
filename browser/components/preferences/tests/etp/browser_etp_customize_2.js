/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const CAT_PREF = "browser.contentblocking.category";
const COOKIE_BEHAVIOR_PREF = "network.cookie.cookieBehavior";
const TP_PREF = "privacy.trackingprotection.enabled";
const TP_PBM_PREF = "privacy.trackingprotection.pbmode.enabled";
const EMAIL_TP_PREF = "privacy.trackingprotection.emailtracking.enabled";
const EMAIL_TP_PBM_PREF =
  "privacy.trackingprotection.emailtracking.pbmode.enabled";
const CRYPTOMINING_PREF = "privacy.trackingprotection.cryptomining.enabled";
const FINGERPRINTING_PREF = "privacy.trackingprotection.fingerprinting.enabled";
const SUSPECT_FP_PREF = "privacy.fingerprintingProtection";
const SUSPECT_FP_PBM_PREF = "privacy.fingerprintingProtection.pbmode";

// Checks tracking protection toggle and scope dropdown interactions.
add_task(async function test_custom_cookie_controls() {
  let defaults = Services.prefs.getDefaultBranch("");
  let defaultCookieBehavior = defaults.getIntPref(COOKIE_BEHAVIOR_PREF);

  await SpecialPowers.pushPrefEnv({
    set: [
      [CAT_PREF, "custom"],
      [COOKIE_BEHAVIOR_PREF, Ci.nsICookieService.BEHAVIOR_ACCEPT],
    ],
  });

  let { doc } = await openEtpCustomizePage();
  let cookieToggle = getControl(doc, "etpCustomCookiesEnabled");
  let cookieSelect = getControl(doc, "cookieBehavior");

  ok(
    !cookieToggle.pressed,
    "Cookie toggle starts disabled when behavior is accept"
  );

  let prefChange = waitForAndAssertPrefState(
    COOKIE_BEHAVIOR_PREF,
    defaultCookieBehavior,
    "Enabling cookie toggle restores default behavior"
  );
  synthesizeClick(cookieToggle.buttonEl);
  await prefChange;

  ok(cookieToggle.pressed, "Cookie toggle is pressed when enabled");

  let getOption = value =>
    [...cookieSelect.querySelectorAll("moz-option")].find(
      o => o.value == value
    );

  ok(
    getOption(Ci.nsICookieService.BEHAVIOR_LIMIT_FOREIGN.toString()).hidden,
    "Legacy mode 3 option is hidden when not on a legacy mode"
  );
  ok(
    getOption(Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER.toString()).hidden,
    "Legacy mode 4 option is hidden when not on a legacy mode"
  );

  info("Select a stricter cookie behavior through the dropdown");
  let newBehavior = Ci.nsICookieService.BEHAVIOR_REJECT_FOREIGN.toString();
  await changeMozSelectValue(cookieSelect, newBehavior);
  is(
    Services.prefs.getIntPref(COOKIE_BEHAVIOR_PREF),
    Ci.nsICookieService.BEHAVIOR_REJECT_FOREIGN,
    "Cookie behavior pref updated from moz-select"
  );

  prefChange = waitForAndAssertPrefState(
    COOKIE_BEHAVIOR_PREF,
    Ci.nsICookieService.BEHAVIOR_ACCEPT,
    "Disabling cookie toggle accepts all cookies"
  );
  synthesizeClick(cookieToggle.buttonEl);
  await prefChange;

  ok(!cookieToggle.pressed, "Cookie toggle reflects disabled state");

  gBrowser.removeCurrentTab();
});

add_task(async function test_legacy_cookie_mode_options() {
  for (let legacyMode of [
    Ci.nsICookieService.BEHAVIOR_LIMIT_FOREIGN,
    Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER,
  ]) {
    await SpecialPowers.pushPrefEnv({
      set: [
        [CAT_PREF, "custom"],
        [COOKIE_BEHAVIOR_PREF, legacyMode],
      ],
    });

    let { doc } = await openEtpCustomizePage();
    let cookieSelect = getControl(doc, "cookieBehavior");
    let getOption = value =>
      [...cookieSelect.querySelectorAll("moz-option")].find(
        o => o.value == value
      );

    ok(
      !getOption(legacyMode.toString()).hidden,
      `Current legacy mode ${legacyMode} option is visible`
    );

    let otherLegacyMode =
      legacyMode === Ci.nsICookieService.BEHAVIOR_LIMIT_FOREIGN
        ? Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER
        : Ci.nsICookieService.BEHAVIOR_LIMIT_FOREIGN;
    ok(
      getOption(otherLegacyMode.toString()).hidden,
      `Other legacy mode ${otherLegacyMode} option is hidden`
    );

    gBrowser.removeCurrentTab();
  }
});

add_task(async function test_legacy_cookie_mode_persists_within_session() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [CAT_PREF, "custom"],
      [COOKIE_BEHAVIOR_PREF, Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER],
    ],
  });

  let { doc } = await openEtpCustomizePage();
  let cookieSelect = getControl(doc, "cookieBehavior");
  let getOption = value =>
    [...cookieSelect.querySelectorAll("moz-option")].find(
      o => o.value == value
    );

  ok(
    !getOption(Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER.toString()).hidden,
    "Mode 4 option is visible when it is the current value"
  );

  info("Switch to behavior 5 (Total Cookie Protection)");
  await changeMozSelectValue(
    cookieSelect,
    Ci.nsICookieService.BEHAVIOR_PARTITION_FOREIGN.toString()
  );

  ok(
    !getOption(Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER.toString()).hidden,
    "Mode 4 option remains visible within the same session after switching away"
  );

  gBrowser.removeCurrentTab();

  info("Reload the preferences page");
  ({ doc } = await openEtpCustomizePage());
  cookieSelect = getControl(doc, "cookieBehavior");
  getOption = value =>
    [...cookieSelect.querySelectorAll("moz-option")].find(
      o => o.value == value
    );

  for (let value of [
    Ci.nsICookieService.BEHAVIOR_ACCEPT,
    Ci.nsICookieService.BEHAVIOR_REJECT_FOREIGN,
    Ci.nsICookieService.BEHAVIOR_REJECT,
    Ci.nsICookieService.BEHAVIOR_PARTITION_FOREIGN,
  ]) {
    ok(
      !getOption(value.toString()).hidden,
      `mode ${value} is visible after reload`
    );
  }

  ok(
    getOption(Ci.nsICookieService.BEHAVIOR_LIMIT_FOREIGN.toString()).hidden,
    "Mode 3 is hidden after reload"
  );
  ok(
    getOption(Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER.toString()).hidden,
    "Mode 4 is hidden after reload"
  );

  gBrowser.removeCurrentTab();
});

add_task(async function test_custom_tracking_protection_controls() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [CAT_PREF, "custom"],
      [TP_PREF, false],
      [TP_PBM_PREF, true],
      [EMAIL_TP_PREF, false],
      [EMAIL_TP_PBM_PREF, true],
    ],
  });

  let { doc } = await openEtpCustomizePage();
  let tpToggle = getControl(doc, "etpCustomTrackingProtectionEnabled");
  let tpContext = getControl(doc, "etpCustomTrackingProtectionEnabledContext");

  ok(tpToggle.pressed, "Tracking protection toggle starts enabled");

  let prefChange = TestUtils.waitForPrefChange(
    TP_PBM_PREF,
    value => value === false
  );
  synthesizeClick(tpToggle.buttonEl);
  await prefChange;

  ok(!tpToggle.pressed, "Tracking protection toggle reflects disabled state");
  ok(
    !Services.prefs.getBoolPref(TP_PREF),
    "All-windows tracking protection pref remains false"
  );
  // Email tracking protection follows tracking protection (bug 2049331): with
  // the toggle off, it must be disabled in both contexts.
  ok(
    !Services.prefs.getBoolPref(EMAIL_TP_PREF),
    "All-windows email tracking protection disabled when toggle is off"
  );
  ok(
    !Services.prefs.getBoolPref(EMAIL_TP_PBM_PREF),
    "Private-windows email tracking protection disabled when toggle is off"
  );

  prefChange = TestUtils.waitForPrefChange(
    TP_PBM_PREF,
    value => value === true
  );
  synthesizeClick(tpToggle.buttonEl);
  await prefChange;
  ok(tpToggle.pressed, "Tracking protection toggle enabled again");
  ok(
    !Services.prefs.getBoolPref(TP_PREF),
    "All-windows tracking protection pref still false after re-enabling toggle"
  );
  ok(
    !Services.prefs.getBoolPref(EMAIL_TP_PREF),
    "All-windows email tracking protection stays disabled for private-only TP"
  );
  ok(
    Services.prefs.getBoolPref(EMAIL_TP_PBM_PREF),
    "Private-windows email tracking protection enabled with the toggle"
  );

  info("Switch context to protect all windows");
  await changeMozSelectValue(tpContext, "all");
  ok(
    Services.prefs.getBoolPref(TP_PREF),
    "Tracking protection pref enabled for all windows"
  );
  ok(
    Services.prefs.getBoolPref(TP_PBM_PREF),
    "Tracking protection PBM pref stays enabled"
  );
  ok(
    Services.prefs.getBoolPref(EMAIL_TP_PREF),
    "All-windows email tracking protection enabled for all windows"
  );
  ok(
    Services.prefs.getBoolPref(EMAIL_TP_PBM_PREF),
    "Private-windows email tracking protection enabled for all windows"
  );

  info("Switch back to private windows only");
  await changeMozSelectValue(tpContext, "pbmOnly");
  ok(
    !Services.prefs.getBoolPref(TP_PREF),
    "All windows pref disabled when choosing private only"
  );
  ok(
    Services.prefs.getBoolPref(TP_PBM_PREF),
    "Private windows pref stays enabled"
  );
  ok(
    !Services.prefs.getBoolPref(EMAIL_TP_PREF),
    "All-windows email tracking protection disabled when choosing private only"
  );
  ok(
    Services.prefs.getBoolPref(EMAIL_TP_PBM_PREF),
    "Private-windows email tracking protection stays enabled"
  );

  gBrowser.removeCurrentTab();
});

// Covers cryptomining/fingerprinting toggles and suspect protection context behavior.
add_task(async function test_custom_fingerprinting_controls() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [CAT_PREF, "custom"],
      [CRYPTOMINING_PREF, false],
      [FINGERPRINTING_PREF, false],
      [SUSPECT_FP_PREF, false],
      [SUSPECT_FP_PBM_PREF, false],
    ],
  });

  let { doc } = await openEtpCustomizePage();
  let cryptoToggle = getControl(doc, "etpCustomCryptominingProtectionEnabled");
  let knownFpToggle = getControl(
    doc,
    "etpCustomKnownFingerprintingProtectionEnabled"
  );
  let suspectFpToggle = getControl(
    doc,
    "etpCustomSuspectFingerprintingProtectionEnabled"
  );
  let suspectContext = getControl(
    doc,
    "etpCustomSuspectFingerprintingProtectionEnabledContext"
  );

  info("Enable cryptomining protection");
  let prefChange = waitForAndAssertPrefState(
    CRYPTOMINING_PREF,
    true,
    "Cryptomining pref enabled"
  );
  synthesizeClick(cryptoToggle.buttonEl);
  await prefChange;

  info("Enable known fingerprinting protection");
  prefChange = waitForAndAssertPrefState(
    FINGERPRINTING_PREF,
    true,
    "Fingerprinting pref enabled"
  );
  synthesizeClick(knownFpToggle.buttonEl);
  await prefChange;

  info("Enable suspect fingerprinting protection");
  prefChange = TestUtils.waitForPrefChange(
    SUSPECT_FP_PBM_PREF,
    value => value === true
  );
  synthesizeClick(suspectFpToggle.buttonEl);
  await prefChange;
  ok(
    !Services.prefs.getBoolPref(SUSPECT_FP_PREF),
    "All-windows suspect fingerprinting pref remains false after toggle"
  );

  info("Switch suspect protection context to all windows");
  await changeMozSelectValue(suspectContext, "all");
  ok(
    Services.prefs.getBoolPref(SUSPECT_FP_PREF),
    "All-windows suspect fingerprinting pref enabled"
  );
  ok(
    Services.prefs.getBoolPref(SUSPECT_FP_PBM_PREF),
    "PBM suspect fingerprinting pref remains enabled"
  );

  info("Disable suspect protection through the toggle");
  prefChange = TestUtils.waitForPrefChange(
    SUSPECT_FP_PBM_PREF,
    value => value === false
  );
  synthesizeClick(suspectFpToggle.buttonEl);
  await prefChange;
  ok(
    !Services.prefs.getBoolPref(SUSPECT_FP_PREF),
    "All-window suspect pref disabled after toggle off"
  );

  gBrowser.removeCurrentTab();
});
