"use strict";

const PAGE_PREFS = "about:preferences";
const PAGE_PRIVACY = PAGE_PREFS + "#privacy";
const SELECTORS = {
  savedCreditCardsBtn: "setting-group[groupid=payments] #savedPaymentsButton",
  reauthCheckbox: "setting-group[groupid=payments] #requireOSAuthForPayments",
};

// On mac, this test times out in chaos mode
requestLongerTimeout(2);

add_setup(async function () {
  // Revert head.js change that mocks os auth
  sinon.restore();

  // Load in a few credit cards
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.reduceTimerPrecision", false]],
  });
  await setStorage(TEST_CREDIT_CARD_1, TEST_CREDIT_CARD_2);
});

/*
 * This test ensures that OS auth is enabled in Nightly builds and that the
 * encrypted pref is set correctly.
 */
add_task(async function test_os_auth_enabled_with_checkbox() {
  let finalPrefPaneLoaded = TestUtils.topicObserved("sync-pane-loaded");
  FormAutofillUtils.setOSAuthEnabled(true);
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: PAGE_PRIVACY },
    async function (browser) {
      await finalPrefPaneLoaded;

      await SpecialPowers.spawn(browser, [SELECTORS], async selectors => {
        ok(
          content.document.querySelector(selectors.reauthCheckbox).checked,
          "OSReauth for credit cards should be checked"
        );
      });
      ok(FormAutofillUtils.getOSAuthEnabled(), "OSAuth should be enabled.");
    }
  );
});

/*
 * This test makes sure that calling setOSAuthEnabled correctly sets the
 * checkbox and encryped pref.
 */
add_task(async function test_os_auth_disabled_with_checkbox() {
  let finalPrefPaneLoaded = TestUtils.topicObserved("sync-pane-loaded");
  FormAutofillUtils.setOSAuthEnabled(false);

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: PAGE_PRIVACY },
    async function (browser) {
      await finalPrefPaneLoaded;

      await SpecialPowers.spawn(browser, [SELECTORS], async selectors => {
        is(
          content.document.querySelector(selectors.reauthCheckbox).checked,
          false,
          "OSReauth for credit cards should be unchecked"
        );
      });
      is(
        FormAutofillUtils.getOSAuthEnabled(),
        false,
        "OSAuth should be disabled"
      );
    }
  );
  FormAutofillUtils.setOSAuthEnabled(true);
});

add_task(async function test_osAuth_enabled() {
  await test_osAuth_enabled_behaviour(false);
  await test_osAuth_enabled_behaviour(true);
});

/**
 * This test ensures that there is an OS authentication prompt when OS
 * authentication is enabled.
 *
 * @param settingsRedesignEnabled string
 */
async function test_osAuth_enabled_behaviour(settingsRedesignEnabled) {
  info(
    `Running test_osAuth_enabled_behaviour with settings redesign set to ${settingsRedesignEnabled}`
  );
  let finalPrefPaneLoaded = TestUtils.topicObserved("sync-pane-loaded");
  await SpecialPowers.pushPrefEnv({
    set: [
      [FormAutofillUtils.AUTOFILL_CREDITCARDS_OS_AUTH_LOCKED_PREF, true],
      ["browser.settings-redesign.enabled", settingsRedesignEnabled],
    ],
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: PAGE_PRIVACY },
    async function (browser) {
      const redesignEnabled = Services.prefs.getBoolPref(
        "browser.settings-redesign.enabled",
        false
      );
      await finalPrefPaneLoaded;
      if (!OSKeyStoreTestUtils.canTestOSKeyStoreLogin()) {
        // The rest of the test uses Edit mode which causes an OS prompt in official builds.
        return;
      }
      let reauthObserved = OSKeyStoreTestUtils.waitForOSKeyStoreLogin(true);
      await openEditPaymentsList(redesignEnabled, browser);
      await reauthObserved; // If the OS does not popup, this will cause a timeout in the test.

      if (!redesignEnabled) {
        await waitForSubDialogLoad(content, EDIT_CREDIT_CARD_DIALOG_URL);
      }
    }
  );
}

add_task(async function test_osAuth_disabled() {
  await test_osAuth_disabled_behavior(false);
  await test_osAuth_disabled_behavior(true);
});

/**
 * This test checks that no OS authentication prompt is triggered when OS
 * authentication is disabled.
 *
 * @param settingsRedesignEnabled string
 */
async function test_osAuth_disabled_behavior(settingsRedesignEnabled) {
  info(
    `Running test_osAuth_disabled_behavior with settings redesign set to ${settingsRedesignEnabled}`
  );

  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", settingsRedesignEnabled]],
  });

  let finalPrefPaneLoaded = TestUtils.topicObserved("sync-pane-loaded");
  FormAutofillUtils.setOSAuthEnabled(false);
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: PAGE_PRIVACY },
    async function (browser) {
      await finalPrefPaneLoaded;
      const redesignEnabled = Services.prefs.getBoolPref(
        "browser.settings-redesign.enabled",
        false
      );
      await openEditPaymentsList(redesignEnabled, browser);
      // If OSAuth prompt shows up, the next line would cause a timeout since the edit dialog would not show up.
      await waitForSubDialogLoad(content, EDIT_CREDIT_CARD_DIALOG_URL);
    }
  );
  FormAutofillUtils.setOSAuthEnabled(true);
}

/*
 * Helper function for opening the payment methods list UI, depending on whether
 * or not settings redesign is enabled.
 */
async function openEditPaymentsList(redesignEnabled, browser) {
  if (!redesignEnabled) {
    await SpecialPowers.spawn(browser, [SELECTORS], async selectors => {
      content.document.querySelector(selectors.savedCreditCardsBtn).click();
    });
    let ccManageDialog = await waitForSubDialogLoad(
      content,
      MANAGE_CREDIT_CARDS_DIALOG_URL
    );
    await SpecialPowers.spawn(ccManageDialog, [], async () => {
      let selRecords = content.document.getElementById("credit-cards");
      await EventUtils.synthesizeMouseAtCenter(
        selRecords.children[0],
        [],
        content
      );
      content.document.querySelector("#edit").click();
    });
  } else {
    await SpecialPowers.spawn(browser, [], async () => {
      const savedPaymentsBtn = content.document.querySelector(
        "#savedPaymentsButton"
      );
      savedPaymentsBtn.click();

      info("Ensure we have navigated to the manage payments page.");
      const paymentsPage = content.document.querySelector(
        '[data-category="paneManagePayments"]'
      );
      await ContentTaskUtils.waitForCondition(
        () => !paymentsPage.hidden,
        "Payments page is failed to show."
      );
      ok(true, "Payments page is visible");
      info("Click list item edit button");
      const editBtn = paymentsPage.querySelector("moz-button[action='edit']");
      editBtn.click();
    });
  }
}

async function test_OsAuth_Enabled() {}
