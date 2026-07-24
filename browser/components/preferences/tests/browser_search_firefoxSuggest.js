/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// This tests the Search pane's Firefox Suggest UI.

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  QuickSuggest: "moz-src:///browser/components/urlbar/QuickSuggest.sys.mjs",
});

const ONLINE_ENABLED_TOGGLE_ID = "firefoxSuggestOnlineEnabledToggle";
const BUTTON_RESTORE_DISMISSED_ID = "restoreDismissedSuggestions";

// Maps `SETTINGS_UI` values to expected visibility state objects. See
// `assertSuggestVisibility()` in `head.js` for info on the state objects.
const EXPECTED = {
  [QuickSuggest.SETTINGS_UI.FULL]: {
    [ONLINE_ENABLED_TOGGLE_ID]: { isVisible: true },
    locationBarGroupHeader: {
      isVisible: true,
      l10nId: "addressbar-header-firefox-suggest-2",
    },
  },
  [QuickSuggest.SETTINGS_UI.NONE]: {
    locationBarGroupHeader: { isVisible: true, l10nId: "addressbar-header-1" },
  },
  [QuickSuggest.SETTINGS_UI.OFFLINE_ONLY]: {
    [ONLINE_ENABLED_TOGGLE_ID]: { isVisible: false },
    locationBarGroupHeader: {
      isVisible: true,
      l10nId: "addressbar-header-firefox-suggest-2",
    },
  },
};

// This test can take a while due to the many permutations some of these tasks
// run through, so request a longer timeout.
requestLongerTimeout(10);

add_setup(async function () {
  // Suggest needs to be initialized in order to dismiss a suggestion.
  await QuickSuggestTestUtils.ensureQuickSuggestInit();

  // Set the default value of the preference to FULL, since that's what the
  // test was originally written with.
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.quicksuggest.settingsUi", QuickSuggest.SETTINGS_UI.FULL],
    ],
  });
});

// The following tasks check the initial visibility of the Firefox Suggest UI
// and the visibility after installing a Nimbus experiment.

add_task(async function initiallyDisabled_disable() {
  await doSuggestVisibilityTest({
    initialSuggestEnabled: false,
    initialExpected: EXPECTED[QuickSuggest.SETTINGS_UI.NONE],
    nimbusVariables: {
      quickSuggestEnabled: false,
    },
  });
});

add_task(async function initiallyDisabled_disable_settingsUiFull() {
  await doSuggestVisibilityTest({
    initialSuggestEnabled: false,
    initialExpected: EXPECTED[QuickSuggest.SETTINGS_UI.NONE],
    nimbusVariables: {
      quickSuggestEnabled: false,
      // `quickSuggestEnabled: false` should override this, so the Suggest
      // settings should not be visible (`initialExpected` should persist).
      quickSuggestSettingsUi: QuickSuggest.SETTINGS_UI.FULL,
    },
  });
});

add_task(async function initiallyDisabled_enable() {
  await doSuggestVisibilityTest({
    initialSuggestEnabled: false,
    initialExpected: EXPECTED[QuickSuggest.SETTINGS_UI.NONE],
    nimbusVariables: {
      quickSuggestEnabled: true,
    },
    newExpected: EXPECTED[QuickSuggest.SETTINGS_UI.FULL],
  });
});

add_task(async function initiallyDisabled_enable_settingsUiFull() {
  await doSuggestVisibilityTest({
    initialSuggestEnabled: false,
    initialExpected: EXPECTED[QuickSuggest.SETTINGS_UI.NONE],
    nimbusVariables: {
      quickSuggestEnabled: true,
      quickSuggestSettingsUi: QuickSuggest.SETTINGS_UI.FULL,
    },
    newExpected: EXPECTED[QuickSuggest.SETTINGS_UI.FULL],
  });
});

add_task(async function initiallyDisabled_enable_settingsUiNone() {
  await doSuggestVisibilityTest({
    initialSuggestEnabled: false,
    initialExpected: EXPECTED[QuickSuggest.SETTINGS_UI.NONE],
    nimbusVariables: {
      quickSuggestEnabled: true,
      quickSuggestSettingsUi: QuickSuggest.SETTINGS_UI.NONE,
    },
  });
});

add_task(async function initiallyDisabled_enable_settingsUiOfflineOnly() {
  await doSuggestVisibilityTest({
    initialSuggestEnabled: false,
    initialExpected: EXPECTED[QuickSuggest.SETTINGS_UI.NONE],
    nimbusVariables: {
      quickSuggestEnabled: true,
      quickSuggestSettingsUi: QuickSuggest.SETTINGS_UI.OFFLINE_ONLY,
    },
    newExpected: EXPECTED[QuickSuggest.SETTINGS_UI.OFFLINE_ONLY],
  });
});

add_task(async function initiallyEnabled_disable() {
  await doSuggestVisibilityTest({
    initialSuggestEnabled: true,
    initialExpected: EXPECTED[QuickSuggest.SETTINGS_UI.FULL],
    nimbusVariables: {
      quickSuggestEnabled: false,
    },
    newExpected: EXPECTED[QuickSuggest.SETTINGS_UI.NONE],
  });
});

add_task(async function initiallyEnabled_disable_settingsUiFull() {
  await doSuggestVisibilityTest({
    initialSuggestEnabled: true,
    initialExpected: EXPECTED[QuickSuggest.SETTINGS_UI.FULL],
    nimbusVariables: {
      quickSuggestEnabled: false,
      // `quickSuggestEnabled: false` should override this, so the Suggest
      // settings should not be visible.
      quickSuggestSettingsUi: QuickSuggest.SETTINGS_UI.FULL,
    },
    newExpected: EXPECTED[QuickSuggest.SETTINGS_UI.NONE],
  });
});

add_task(async function initiallyEnabled_enable() {
  await doSuggestVisibilityTest({
    initialSuggestEnabled: true,
    initialExpected: EXPECTED[QuickSuggest.SETTINGS_UI.FULL],
    nimbusVariables: {
      quickSuggestEnabled: true,
    },
  });
});

add_task(async function initiallyEnabled_settingsUiFull() {
  await doSuggestVisibilityTest({
    initialSuggestEnabled: true,
    initialExpected: EXPECTED[QuickSuggest.SETTINGS_UI.FULL],
    nimbusVariables: {
      quickSuggestSettingsUi: QuickSuggest.SETTINGS_UI.FULL,
    },
  });
});

add_task(async function initiallyEnabled_settingsUiNone() {
  await doSuggestVisibilityTest({
    initialSuggestEnabled: true,
    initialExpected: EXPECTED[QuickSuggest.SETTINGS_UI.FULL],
    nimbusVariables: {
      quickSuggestSettingsUi: QuickSuggest.SETTINGS_UI.NONE,
    },
    newExpected: EXPECTED[QuickSuggest.SETTINGS_UI.NONE],
  });
});

add_task(async function initiallyEnabled_settingsUiOfflineOnly() {
  await doSuggestVisibilityTest({
    initialSuggestEnabled: true,
    initialExpected: EXPECTED[QuickSuggest.SETTINGS_UI.FULL],
    nimbusVariables: {
      quickSuggestSettingsUi: QuickSuggest.SETTINGS_UI.OFFLINE_ONLY,
    },
    newExpected: EXPECTED[QuickSuggest.SETTINGS_UI.OFFLINE_ONLY],
  });
});

add_task(async function toggling_all_firefoxsuggest_disables_other_options() {
  // Enable quicksuggest since it could be off by default depending on location.
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.suggest.quicksuggest.all", true]],
  });

  await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });

  let doc = gBrowser.selectedBrowser.contentDocument;
  let allCheckbox = doc.getElementById("firefoxSuggestAll");
  let sponsoredCheckbox = doc.getElementById("firefoxSuggestSponsored");
  let onlineEnabledCheckbox = doc.getElementById(
    "firefoxSuggestOnlineEnabledToggle"
  );

  // Initial state.
  Assert.ok(
    allCheckbox.checked,
    "firefoxSuggestAll should initially be checked"
  );
  Assert.ok(
    !sponsoredCheckbox.disabled,
    "sponsoredCheckbox should initially be enabled"
  );
  Assert.ok(
    !onlineEnabledCheckbox.disabled,
    "onlineEnabledCheckbox should initially be enabled"
  );

  allCheckbox.click();
  await allCheckbox.parentElement.updateComplete;

  Assert.ok(!allCheckbox.checked, "firefoxSuggestAll should now be unchecked");
  Assert.ok(sponsoredCheckbox.disabled, "sponsoredCheckbox should be disabled");
  Assert.ok(
    onlineEnabledCheckbox.disabled,
    "onlineEnabledCheckbox should be disabled"
  );

  allCheckbox.click();
  await allCheckbox.parentElement.updateComplete;

  Assert.ok(allCheckbox.checked, "firefoxSuggestAll should be checked");
  Assert.ok(
    !sponsoredCheckbox.disabled,
    "sponsoredCheckbox should be enabled again"
  );
  Assert.ok(
    !onlineEnabledCheckbox.disabled,
    "onlineEnabledCheckbox should be enabled again"
  );

  gBrowser.removeCurrentTab();
});

add_task(
  async function all_firefoxsuggest_disabled_disables_other_options_on_open() {
    // Disable the "all" preference and enable the others before opening settings.
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.urlbar.suggest.quicksuggest.all", false],
        ["browser.urlbar.suggest.quicksuggest.sponsored", true],
        ["browser.urlbar.quicksuggest.online.enabled", true],
      ],
    });

    await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });

    let doc = gBrowser.selectedBrowser.contentDocument;
    let allCheckbox = doc.getElementById("firefoxSuggestAll");
    let sponsoredCheckbox = doc.getElementById("firefoxSuggestSponsored");
    let onlineEnabledCheckbox = doc.getElementById(
      "firefoxSuggestOnlineEnabledToggle"
    );

    // Initial state.
    Assert.ok(!allCheckbox.checked, "firefoxSuggestAll should not be checked");
    Assert.ok(
      sponsoredCheckbox.disabled,
      "sponsoredCheckbox should initially be disabled"
    );
    Assert.ok(
      onlineEnabledCheckbox.disabled,
      "onlineEnabledCheckbox should initially be disabled"
    );

    gBrowser.removeCurrentTab();

    await SpecialPowers.popPrefEnv();
  }
);

// Tests the "Restore" button for dismissed suggestions.
add_task(async function restoreDismissedSuggestions() {
  // Start with no dismissed suggestions.
  await QuickSuggest.clearDismissedSuggestions();
  Assert.ok(
    !(await QuickSuggest.canClearDismissedSuggestions()),
    "canClearDismissedSuggestions should be false after clearing suggestions"
  );

  await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });

  let doc = gBrowser.selectedBrowser.contentDocument;
  let addressBarSection = doc.getElementById("locationBarGroup");
  addressBarSection.scrollIntoView();

  let button = doc.getElementById(BUTTON_RESTORE_DISMISSED_ID);
  Assert.ok(button.disabled, "Restore button is disabled initially.");

  await QuickSuggest.dismissResult(QuickSuggestTestUtils.ampResult());

  Assert.ok(
    await QuickSuggest.canClearDismissedSuggestions(),
    "canClearDismissedSuggestions should return true after dismissing a suggestion"
  );
  await TestUtils.waitForCondition(
    () => !button.disabled,
    "Waiting for Restore button to become enabled after dismissing suggestion"
  );
  Assert.ok(
    !button.disabled,
    "Restore button should be enabled after dismissing suggestion"
  );

  let clearPromise = TestUtils.topicObserved("quicksuggest-dismissals-cleared");
  button.click();
  await clearPromise;

  Assert.ok(
    !(await QuickSuggest.canClearDismissedSuggestions()),
    "canClearDismissedSuggestions should return false after restoring dismissals"
  );
  await TestUtils.waitForCondition(
    () => button.disabled,
    "Waiting for Restore button to become disabled after clicking it"
  );
  Assert.ok(
    button.disabled,
    "Restore button should be disabled after clearing suggestions"
  );

  gBrowser.removeCurrentTab();
});

// If the pane is open while Suggest is still initializing and there are
// dismissed suggestions, the "Restore" button should become enabled when init
// finishes.
add_task(async function restoreDismissedSuggestions_init_enabled() {
  // Dismiss a suggestion.
  await QuickSuggest.dismissResult(QuickSuggestTestUtils.ampResult());
  Assert.ok(
    await QuickSuggest.canClearDismissedSuggestions(),
    "canClearDismissedSuggestions should be true after dismissing suggestion"
  );

  await doRestoreInitTest(async button => {
    // The button should become enabled since we dismissed a suggestion above.
    await TestUtils.waitForCondition(
      () => !button.disabled,
      "Waiting for Restore button to become enabled after re-enabling Rust backend"
    );
    Assert.ok(
      !button.disabled,
      "Restore button should be enabled after re-enabling Rust backend"
    );
  });
});

// If the pane is open while Suggest is still initializing and there are no
// dismissed suggestions, the "Restore" button should remain disabled when init
// finishes.
add_task(async function restoreDismissedSuggestions_init_disabled() {
  // Clear dismissed suggestions.
  await QuickSuggest.clearDismissedSuggestions();
  Assert.ok(
    !(await QuickSuggest.canClearDismissedSuggestions()),
    "canClearDismissedSuggestions should be false after clearing suggestions"
  );

  await doRestoreInitTest(async button => {
    // The button should remain disabled since there are no dismissed
    // suggestions.
    await TestUtils.waitForTick();
    Assert.ok(
      button.disabled,
      "Restore button should remain disabled after re-enabling Rust backend"
    );
  });
});

async function doRestoreInitTest(checkButton) {
  // Disable the Suggest Rust backend, which manages individually dismissed
  // suggestions. While Rust is disabled, Suggest won't be able to tell whether
  // there are any individually dismissed suggestions.
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.quicksuggest.rustEnabled", false]],
  });

  // Open the pane.
  await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });

  let doc = gBrowser.selectedBrowser.contentDocument;
  let addressBarSection = doc.getElementById("locationBarGroup");
  addressBarSection.scrollIntoView();

  let button = doc.getElementById(BUTTON_RESTORE_DISMISSED_ID);
  Assert.ok(button.disabled, "Restore button is disabled initially.");

  // Re-enable the Rust backend. It will send `quicksuggest-dismissals-changed`
  // when it finishes initialization.
  let changedPromise = TestUtils.topicObserved(
    "quicksuggest-dismissals-changed"
  );
  await SpecialPowers.popPrefEnv();

  info(
    "Waiting for quicksuggest-dismissals-changed after re-enabling Rust backend"
  );
  await changedPromise;

  await checkButton(button);

  // Clean up.
  await QuickSuggest.clearDismissedSuggestions();
  gBrowser.removeCurrentTab();
}
