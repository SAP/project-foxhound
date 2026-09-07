/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const FEATURE_GATE_PREF = "browser.urlbar.trustPanel.breachAlerts.featureGate";
const GLOBAL_FEATURE_GATE_PREF = "browser.urlbar.trustPanel.featureGate";
const BREACH_ALERTS_PREF = "browser.urlbar.trustPanel.breachAlerts";

const GROUP_SELECTOR = 'setting-group[groupid="privacyPanel"]';
const CHECKBOX_ID = "trustPanelBreachAlertsMain";

add_task(async function test_pref_mapping() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#connectionSecurity" },
    async function (browser) {
      let doc = browser.contentDocument;
      let win = browser.contentWindow;
      let checkbox = doc.getElementById(CHECKBOX_ID);
      info("CHECKBOX_ID element info:");
      if (checkbox) {
        info("  Name: " + checkbox.localName);
        info("  ID: " + checkbox.id);
        info("  OuterHTML: " + checkbox.outerHTML.substring(0, 500));
      } else {
        info("  NOT FOUND");
      }
      let setting = win.Preferences.getSetting(CHECKBOX_ID);
      ok(setting, "Setting should exist");
      if (setting) {
        is(
          setting.pref.id,
          BREACH_ALERTS_PREF,
          "Pref mapping should be correct"
        );
      }
    }
  );
});

// Test the section is hidden when the feature gate is disabled.
add_task(async function test_section_hidden_when_feature_gate_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [GLOBAL_FEATURE_GATE_PREF, true],
      [FEATURE_GATE_PREF, false],
    ],
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#connectionSecurity" },
    async function (browser) {
      let doc = browser.contentDocument;
      await BrowserTestUtils.waitForCondition(
        () => doc.querySelector(GROUP_SELECTOR),
        "Wait for setting group"
      );
      let settingGroup = doc.querySelector(GROUP_SELECTOR);

      // The visibility logic is asynchronous for Lit-based setting groups.
      await BrowserTestUtils.waitForCondition(
        () => BrowserTestUtils.isHidden(settingGroup),
        "Wait for setting group to be hidden"
      );

      let checkbox = doc.getElementById(CHECKBOX_ID);
      ok(checkbox, "The checkbox should still exist in the DOM");
      is_element_hidden(
        checkbox,
        "The checkbox should be hidden when featureGate is false"
      );
    }
  );

  await SpecialPowers.popPrefEnv();
});

// Test the section is shown when the feature gate is enabled.
add_task(async function test_section_shown_when_feature_gate_enabled() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [GLOBAL_FEATURE_GATE_PREF, true],
      [FEATURE_GATE_PREF, true],
    ],
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#connectionSecurity" },
    async function (browser) {
      let doc = browser.contentDocument;
      await BrowserTestUtils.waitForCondition(
        () => doc.querySelector(GROUP_SELECTOR),
        "Wait for setting group"
      );
      let settingGroup = doc.querySelector(GROUP_SELECTOR);

      await BrowserTestUtils.waitForCondition(
        () => BrowserTestUtils.isVisible(settingGroup),
        "Wait for setting group to be visible"
      );
      is_element_visible(
        settingGroup,
        "Privacy panel setting group is visible when featureGate is true"
      );

      await BrowserTestUtils.waitForCondition(
        () => doc.getElementById(CHECKBOX_ID),
        "Wait for checkbox"
      );
      let checkbox = doc.getElementById(CHECKBOX_ID);
      is_element_visible(
        checkbox,
        "The checkbox should be visible when featureGate is true"
      );
    }
  );

  await SpecialPowers.popPrefEnv();
});

// Test that toggling the checkbox updates the preference.
add_task(async function test_checkbox_toggle_updates_pref() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [GLOBAL_FEATURE_GATE_PREF, true],
      [FEATURE_GATE_PREF, true],
      [BREACH_ALERTS_PREF, true],
    ],
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#connectionSecurity" },
    async function (browser) {
      await SpecialPowers.spawn(
        browser,
        [CHECKBOX_ID, BREACH_ALERTS_PREF],
        async (checkboxId, breachAlertsPref) => {
          await ContentTaskUtils.waitForCondition(
            () => content.document.getElementById(checkboxId),
            "Wait for checkbox"
          );
          let checkbox = content.document.getElementById(checkboxId);
          ok(checkbox, "Checkbox should exist");
          ok(checkbox.checked, "The checkbox should be checked initially");

          checkbox.click();

          await ContentTaskUtils.waitForCondition(
            () => !checkbox.checked,
            "The checkbox should be unchecked after click"
          );
          is(
            Services.prefs.getBoolPref(breachAlertsPref),
            false,
            "Preference should be updated to false"
          );

          checkbox.click();

          await ContentTaskUtils.waitForCondition(
            () => checkbox.checked,
            "The checkbox should be checked after second click"
          );
          is(
            Services.prefs.getBoolPref(breachAlertsPref),
            true,
            "Preference should be updated back to true"
          );
        }
      );
    }
  );

  await SpecialPowers.popPrefEnv();
});

// Test that the checkbox reflects the preference state on load.
add_task(async function test_checkbox_reflects_pref() {
  for (let state of [true, false]) {
    await SpecialPowers.pushPrefEnv({
      set: [
        [GLOBAL_FEATURE_GATE_PREF, true],
        [FEATURE_GATE_PREF, true],
        [BREACH_ALERTS_PREF, state],
      ],
    });

    await BrowserTestUtils.withNewTab(
      { gBrowser, url: "about:preferences#connectionSecurity" },
      async function (browser) {
        let doc = browser.contentDocument;
        await BrowserTestUtils.waitForCondition(
          () => doc.getElementById(CHECKBOX_ID),
          "Wait for checkbox"
        );
        let checkbox = doc.getElementById(CHECKBOX_ID);
        is(
          checkbox.checked,
          state,
          `The checkbox state should reflect the preference: ${state}`
        );
      }
    );

    await SpecialPowers.popPrefEnv();
  }
});

// Test that the section is hidden when global gate is disabled but specific gate is enabled.
add_task(
  async function test_hidden_when_global_gate_disabled_specific_gate_enabled() {
    await SpecialPowers.pushPrefEnv({
      set: [
        [GLOBAL_FEATURE_GATE_PREF, false],
        [FEATURE_GATE_PREF, true],
      ],
    });

    await BrowserTestUtils.withNewTab(
      { gBrowser, url: "about:preferences#connectionSecurity" },
      async function (browser) {
        let doc = browser.contentDocument;
        await BrowserTestUtils.waitForCondition(
          () => doc.getElementById(CHECKBOX_ID),
          "Wait for checkbox"
        );
        let checkbox = doc.getElementById(CHECKBOX_ID);
        ok(checkbox, "The checkbox should still exist in the DOM");
        is_element_hidden(
          checkbox,
          "The checkbox should be hidden when global gate is false"
        );
      }
    );

    await SpecialPowers.popPrefEnv();
  }
);

// Test that the section is hidden when both gates are disabled.
add_task(async function test_hidden_when_both_gates_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [GLOBAL_FEATURE_GATE_PREF, false],
      [FEATURE_GATE_PREF, false],
    ],
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#connectionSecurity" },
    async function (browser) {
      let doc = browser.contentDocument;
      await BrowserTestUtils.waitForCondition(
        () => doc.getElementById(CHECKBOX_ID),
        "Wait for checkbox"
      );
      let checkbox = doc.getElementById(CHECKBOX_ID);
      is_element_hidden(
        checkbox,
        "The checkbox should be hidden when both gates are false"
      );
    }
  );

  await SpecialPowers.popPrefEnv();
});

// Test that the section is hidden when global gate is disabled after being enabled (reload required).
add_task(async function test_visibility_after_global_gate_toggle() {
  // 1. Start with both enabled -> should be visible
  await SpecialPowers.pushPrefEnv({
    set: [
      [GLOBAL_FEATURE_GATE_PREF, true],
      [FEATURE_GATE_PREF, true],
    ],
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#connectionSecurity" },
    async function (browser) {
      let doc = browser.contentDocument;
      await BrowserTestUtils.waitForCondition(
        () => doc.getElementById(CHECKBOX_ID),
        "Wait for checkbox"
      );
      let checkbox = doc.getElementById(CHECKBOX_ID);
      is_element_visible(checkbox, "Visible when both gates are enabled");

      // 2. Disable global gate and reload -> should be hidden
      await SpecialPowers.pushPrefEnv({
        set: [[GLOBAL_FEATURE_GATE_PREF, false]],
      });
      browser.reload();
      await BrowserTestUtils.browserLoaded(browser);

      doc = browser.contentDocument;
      await BrowserTestUtils.waitForCondition(
        () => doc.getElementById(CHECKBOX_ID),
        "Wait for checkbox after reload"
      );
      checkbox = doc.getElementById(CHECKBOX_ID);
      is_element_hidden(
        checkbox,
        "Hidden after global gate disabled and reload"
      );

      await SpecialPowers.popPrefEnv();
    }
  );

  await SpecialPowers.popPrefEnv();
});
