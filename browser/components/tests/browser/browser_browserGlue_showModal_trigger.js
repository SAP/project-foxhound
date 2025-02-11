/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

XPCOMUtils.defineLazyServiceGetters(this, {
  BrowserHandler: ["@mozilla.org/browser/clh;1", "nsIBrowserHandler"],
});
const { SpecialMessageActions } = ChromeUtils.importESModule(
  "resource://messaging-system/lib/SpecialMessageActions.sys.mjs"
);
const { TelemetryReportingPolicy } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryReportingPolicy.sys.mjs"
);
const { TelemetryUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryUtils.sys.mjs"
);

const TEST_SCREEN = [
  {
    id: "TEST_SCREEN",
    content: {
      position: "split",
      logo: {},
      title: "test",
    },
  },
];

const TEST_SCREEN_SELECTOR = `.onboardingContainer .screen.${TEST_SCREEN[0].id}`;

async function waitForClick(selector, win) {
  await TestUtils.waitForCondition(() => win.document.querySelector(selector));
  win.document.querySelector(selector).click();
}

async function showPreonboardingModal(
  screens = "",
  disableFirstRunPolicyTab = false,
  requireAction = false,
  isFirstRun = true,
  interactionRequiredPref = false
) {
  const PREFS_TO_SET = [
    ["browser.preonboarding.enabled", true],
    ["browser.preonboarding.screens", screens],
    [
      "browser.preonboarding.disableFirstRunPolicyTab",
      disableFirstRunPolicyTab,
    ],
    ["browser.preonboarding.requireAction", requireAction],
    ["browser.preonboarding.interactionPref", interactionRequiredPref],
    ["browser.startup.homepage_override.mstone", ""],
    ["startup.homepage_welcome_url", "about:welcome"],
    [TelemetryUtils.Preferences.FirstRun, isFirstRun],
  ];
  const PREFS_TO_CLEAR = [
    [TelemetryUtils.Preferences.AcceptedPolicyDate],
    [TelemetryUtils.Preferences.AcceptedPolicyVersion],
    [TelemetryUtils.Preferences.BypassNotification],
  ];
  await SpecialPowers.pushPrefEnv({
    set: PREFS_TO_SET,
    clear: PREFS_TO_CLEAR,
  });

  BrowserHandler.firstRunProfile = isFirstRun;

  Assert.equal(
    !TelemetryReportingPolicy.testShouldNotify(),
    disableFirstRunPolicyTab,
    "Privacy notice respects disableFirstRunPolicyTab"
  );

  await BROWSER_GLUE._maybeShowDefaultBrowserPrompt();

  registerCleanupFunction(async () => {
    PREFS_TO_SET.forEach(pref => Services.prefs.clearUserPref(pref[0]));
    BrowserHandler.firstRunProfile = false;
  });
}

add_task(async function show_preonboarding_modal() {
  let messageSpy = sinon.spy(SpecialMessageActions, "handleAction");
  let showModalSpy = sinon.spy(BROWSER_GLUE, "_showPreOnboardingModal");
  await showPreonboardingModal(JSON.stringify(TEST_SCREEN));

  sinon.assert.called(showModalSpy);

  const [win] = await TestUtils.topicObserved("subdialog-loaded");

  Assert.equal(
    Cc["@mozilla.org/browser/clh;1"]
      .getService(Ci.nsIBrowserHandler)
      .getFirstWindowArgs(),
    "about:welcome",
    "First window will be about:welcome"
  );

  // Wait for screen content to render
  await TestUtils.waitForCondition(() =>
    win.document.querySelector(TEST_SCREEN_SELECTOR)
  );

  Assert.ok(
    !!win.document.querySelector(TEST_SCREEN_SELECTOR),
    "Modal renders with custom screen"
  );

  Assert.equal(
    messageSpy.firstCall.args[0].data.content.disableEscClose,
    false,
    "Closing via ESC is not disabled"
  );

  await win.close();
  sinon.restore();
});

add_task(async function can_disable_showing_privacy_tab_and_closing_via_esc() {
  let messageSpy = sinon.spy(SpecialMessageActions, "handleAction");
  let showModalSpy = sinon.spy(BROWSER_GLUE, "_showPreOnboardingModal");
  await showPreonboardingModal(JSON.stringify(TEST_SCREEN), true, true);

  sinon.assert.called(showModalSpy);

  const [win] = await TestUtils.topicObserved("subdialog-loaded");

  // Wait for screen content to render
  await TestUtils.waitForCondition(() =>
    win.document.querySelector(TEST_SCREEN_SELECTOR)
  );

  Assert.equal(
    messageSpy.firstCall.args[0].data.content.disableEscClose,
    true,
    "Closing via ESC is disabled"
  );

  await win.close();
  sinon.restore();
});

add_task(
  async function modal_should_show_when_not_first_run_if_interaction_pref_is_set() {
    let showModalSpy = sinon.spy(BROWSER_GLUE, "_showPreOnboardingModal");
    await showPreonboardingModal(
      JSON.stringify(TEST_SCREEN),
      true,
      true,
      false,
      "messaging-system-action.modal-cleared"
    );

    sinon.assert.called(showModalSpy);

    const [win] = await TestUtils.topicObserved("subdialog-loaded");

    // Wait for screen content to render
    await TestUtils.waitForCondition(() =>
      win.document.querySelector(TEST_SCREEN_SELECTOR)
    );

    Assert.ok(
      !!win.document.querySelector(TEST_SCREEN_SELECTOR),
      "Modal renders with custom screen"
    );

    await win.close();
    sinon.restore();
  }
);

add_task(
  async function modal_should_not_show_when_not_first_run_if_interaction_pref_is_not_set() {
    let showModalSpy = sinon.spy(BROWSER_GLUE, "_showPreOnboardingModal");
    await showPreonboardingModal(
      JSON.stringify(TEST_SCREEN),
      true,
      true,
      false
    );

    sinon.assert.notCalled(showModalSpy);
    Assert.ok(true, "Preonboarding modal will not show");

    sinon.restore();
  }
);
