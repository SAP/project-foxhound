/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// At the time of writing, toast notifications (including XUL notifications)
// don't support action buttons, so there's little to be tested here beyond
// display.

"use strict";

const { ToastNotification } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/ToastNotification.sys.mjs"
);
const { PanelTestProvider } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/PanelTestProvider.sys.mjs"
);

function getMessage(id) {
  return PanelTestProvider.getMessages().then(msgs =>
    msgs.find(m => m.id === id)
  );
}

// Ensure we don't fall back to a real implementation.
const showAlertStub = sinon.stub();
const AlertsServiceStub = sinon.stub(ToastNotification, "AlertsService").value({
  showAlert: showAlertStub,
});

registerCleanupFunction(() => {
  AlertsServiceStub.restore();
});

// Test that toast notifications do, in fact, invoke the AlertsService.  These
// tests don't *need* to be `browser` tests, but we may eventually be able to
// interact with the XUL notification elements, which would require `browser`
// tests, so we follow suit with the equivalent `Spotlight`, etc, tests and use
// the `browser` framework.
add_task(async function test_showAlert() {
  const l10n = new Localization([
    "branding/brand.ftl",
    "browser/newtab/asrouter.ftl",
  ]);
  let expectedTitle = await l10n.formatValue(
    "cfr-doorhanger-bookmark-fxa-header"
  );

  showAlertStub.reset();

  let dispatchStub = sinon.stub();

  let message = await getMessage("TEST_TOAST_NOTIFICATION1");
  await ToastNotification.showToastNotification(message, dispatchStub);

  // Test display.
  Assert.equal(
    showAlertStub.callCount,
    1,
    "AlertsService.showAlert is invoked"
  );

  let [alert] = showAlertStub.firstCall.args;
  Assert.equal(alert.title, expectedTitle, "Should match");
  Assert.equal(alert.text, "Body", "Should match");
  Assert.equal(alert.name, "test_toast_notification", "Should match");
});

// Test that the `title` of each `action` of a toast notification is localized.
add_task(async function test_actionLocalization() {
  const l10n = new Localization([
    "branding/brand.ftl",
    "browser/newtab/asrouter.ftl",
  ]);
  let expectedTitle = await l10n.formatValue(
    "mr2022-background-update-toast-title"
  );
  let expectedText = await l10n.formatValue(
    "mr2022-background-update-toast-text"
  );
  let expectedPrimary = await l10n.formatValue(
    "mr2022-background-update-toast-primary-button-label"
  );
  let expectedSecondary = await l10n.formatValue(
    "mr2022-background-update-toast-secondary-button-label"
  );

  showAlertStub.reset();

  let dispatchStub = sinon.stub();

  let message = await getMessage("MR2022_BACKGROUND_UPDATE_TOAST_NOTIFICATION");
  await ToastNotification.showToastNotification(message, dispatchStub);

  // Test display.
  Assert.equal(
    showAlertStub.callCount,
    1,
    "AlertsService.showAlert is invoked"
  );

  let [alert] = showAlertStub.firstCall.args;
  Assert.equal(alert.title, expectedTitle, "Should match title");
  Assert.equal(alert.text, expectedText, "Should match text");
  Assert.equal(alert.name, "mr2022_background_update", "Should match");
  Assert.equal(alert.actions[0].title, expectedPrimary, "Should match primary");
  Assert.equal(
    alert.actions[1].title,
    expectedSecondary,
    "Should match secondary"
  );
});

// Test that the correct image URL variant is selected based on the system
// color scheme and reduced motion preferences.
add_task(async function test_dynamic_image_url_selection() {
  const lightUrl =
    "chrome://browser/content/asrouter/assets/tabgroups/hort-animated-light.svg";
  const darkUrl =
    "chrome://browser/content/asrouter/assets/tabgroups/hort-animated-dark.svg";
  const reducedUrl =
    "chrome://browser/content/asrouter/assets/tabgroups/hort-static-light.svg";
  const darkReducedUrl =
    "chrome://browser/content/asrouter/assets/tabgroups/hort-static-dark.svg";

  const content = {
    image_url: lightUrl,
    dark_mode_image_url: darkUrl,
    reduced_motion_image_url: reducedUrl,
    dark_mode_reduced_motion_image_url: darkReducedUrl,
  };

  const cases = [
    // [isDark, isReducedMotion, expectedUrl]
    [false, false, lightUrl],
    [true, false, darkUrl],
    [false, true, reducedUrl],
    [true, true, darkReducedUrl],
  ];

  for (const [isDark, isReducedMotion, expectedUrl] of cases) {
    const appInfoStub = sinon.stub(Services, "appinfo").value({
      chromeColorSchemeIsDark: isDark,
      prefersReducedMotion: isReducedMotion,
    });
    try {
      Assert.equal(
        ToastNotification.imageUrlForContent(content),
        expectedUrl,
        `Expected image URL for isDark=${isDark} isReducedMotion=${isReducedMotion}`
      );
    } finally {
      appInfoStub.restore();
    }
  }
});

// Test that toast notifications report sensible telemetry.
add_task(async function test_telemetry() {
  let dispatchStub = sinon.stub();

  let message = await getMessage("TEST_TOAST_NOTIFICATION1");
  await ToastNotification.showToastNotification(message, dispatchStub);

  Assert.equal(
    dispatchStub.callCount,
    2,
    "1 IMPRESSION and 1 TOAST_NOTIFICATION_TELEMETRY"
  );
  Assert.equal(
    dispatchStub.firstCall.args[0].type,
    "TOAST_NOTIFICATION_TELEMETRY",
    "Should match"
  );
  Assert.equal(
    dispatchStub.firstCall.args[0].data.event,
    "IMPRESSION",
    "Should match"
  );
  Assert.equal(
    dispatchStub.secondCall.args[0].type,
    "IMPRESSION",
    "Should match"
  );
});
