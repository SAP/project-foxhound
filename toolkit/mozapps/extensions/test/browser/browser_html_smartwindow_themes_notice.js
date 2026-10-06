/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Verifies that the about:addons theme pane shows a notice for Smart Window
// users, informing them that theme appearance may vary.

const PREF_SMARTWINDOW_TOS_CONSENT_TIME = "browser.smartwindow.tos.consentTime";
const TOS_CONSENT_GRANTED = Math.round(Date.now() / 1000); // arbitrary non-zero timestamp
const PREF_SMARTWINDOW_SHOW_NOTICE = "browser.smartwindow.showThemesNotice";

const assertSmartWindowThemesNotice = async (addonsWin, { expectVisible }) => {
  const notice = addonsWin.document.querySelector("smartwindow-themes-notice");
  Assert.equal(
    BrowserTestUtils.isVisible(notice),
    expectVisible,
    `Expect smartwindow themes notice to be ${expectVisible ? "shown" : "hidden"}`
  );
  if (expectVisible) {
    const messageBar = notice.querySelector("moz-message-bar");
    Assert.ok(
      messageBar,
      "Expect a moz-message-bar inside the smartwindow themes notice"
    );
    Assert.ok(
      BrowserTestUtils.isVisible(messageBar),
      "Expect a moz-message-bar to be visible"
    );
    Assert.equal(
      messageBar.dismissable,
      true,
      "moz-message-bar should be dismissable"
    );
    Assert.equal(
      messageBar.dataset.l10nId,
      "smartwindow-themes-notice",
      "Got the expected fluent ID on the moz-message-bar"
    );

    await addonsWin.document.l10n.translateFragment(messageBar);
    Assert.ok(
      messageBar.message,
      "Expect smartwindow localized message to be found and set"
    );
  }
};

add_task(async function test_notice_hidden_before_tos_consent() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [PREF_SMARTWINDOW_TOS_CONSENT_TIME, 0],
      [PREF_SMARTWINDOW_SHOW_NOTICE, true],
    ],
  });
  const win = await loadInitialView("theme");
  await assertSmartWindowThemesNotice(win, { expectVisible: false });
  await closeView(win);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_notice_shown_after_tos_consent() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [PREF_SMARTWINDOW_TOS_CONSENT_TIME, TOS_CONSENT_GRANTED],
      [PREF_SMARTWINDOW_SHOW_NOTICE, true],
    ],
  });
  const win = await loadInitialView("theme");
  await assertSmartWindowThemesNotice(win, { expectVisible: true });
  await closeView(win);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_notice_hidden_after_dismissed() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [PREF_SMARTWINDOW_TOS_CONSENT_TIME, TOS_CONSENT_GRANTED],
      [PREF_SMARTWINDOW_SHOW_NOTICE, false],
    ],
  });
  const win = await loadInitialView("theme");
  await assertSmartWindowThemesNotice(win, { expectVisible: false });
  await closeView(win);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_notice_reacts_to_tos_consent_pref_change() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [PREF_SMARTWINDOW_TOS_CONSENT_TIME, 0],
      [PREF_SMARTWINDOW_SHOW_NOTICE, true],
    ],
  });
  const win = await loadInitialView("theme");
  await assertSmartWindowThemesNotice(win, { expectVisible: false });

  await SpecialPowers.pushPrefEnv({
    set: [[PREF_SMARTWINDOW_TOS_CONSENT_TIME, TOS_CONSENT_GRANTED]],
  });
  await assertSmartWindowThemesNotice(win, { expectVisible: true });

  await closeView(win);
  await SpecialPowers.popPrefEnv();
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_dismiss_sets_pref_and_hides_notice() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [PREF_SMARTWINDOW_TOS_CONSENT_TIME, TOS_CONSENT_GRANTED],
      [PREF_SMARTWINDOW_SHOW_NOTICE, true],
    ],
  });
  const win = await loadInitialView("theme");
  await assertSmartWindowThemesNotice(win, { expectVisible: true });

  const closeButton = win.document
    .querySelector("smartwindow-themes-notice")
    .querySelector("moz-message-bar")
    ?.shadowRoot.querySelector("moz-button.close");
  ok(closeButton, "Found close button in smartwindow themes notice");
  info(
    "Dismissing smartwindow themes notice by clicking on the close icon button"
  );
  closeButton.click();
  Assert.equal(
    Services.prefs.getBoolPref(PREF_SMARTWINDOW_SHOW_NOTICE),
    false,
    "Dismissing the notice should set the pref to false"
  );
  await assertSmartWindowThemesNotice(win, { expectVisible: false });

  await closeView(win);
  await SpecialPowers.popPrefEnv();
});
