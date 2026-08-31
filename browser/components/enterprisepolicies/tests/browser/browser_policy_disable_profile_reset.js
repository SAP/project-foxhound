/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

let { ResetProfile } = ChromeUtils.importESModule(
  "resource://gre/modules/ResetProfile.sys.mjs"
);
Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/profiles/tests/browser/head.js",
  this
);

// For this test to work properly, this profile actually needs to be
// "reset-able", which requires that it be recognized by the toolkit profile
// service or the SelectableProfileService.
add_setup(async function () {
  await initGroupDatabase();
  Assert.ok(
    SelectableProfileService.currentProfile,
    "Should have a profile now"
  );
});

async function test_reset_disabled({ disabled }) {
  is(
    ResetProfile.resetSupported(),
    !disabled,
    "Reset should only be supported if policy has not been applied"
  );
  is(
    Services.prefs.getBoolPref("browser.disableResetPrompt", undefined),
    disabled,
    "Reset prompt should only be shown if policy has not been applied"
  );
  is(
    Services.prefs.prefIsLocked("browser.disableResetPrompt"),
    disabled,
    "Reset prompt pref should be locked if the policy has been applied"
  );

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:support"
  );
  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [{ disabled }],
    async function ({
      // eslint-disable-next-line no-shadow
      disabled,
    }) {
      let resetBox = content.document.getElementById("reset-box");
      let elementStyle = content.window.getComputedStyle(resetBox);
      let expectedDisplayValue = disabled ? "none" : "block";
      is(
        elementStyle.display,
        expectedDisplayValue,
        "about:support Reset button box should be hidden"
      );
    }
  );
  await BrowserTestUtils.removeTab(tab);
}

add_task(async function test_initial_conditions() {
  await test_reset_disabled({ disabled: false });
});

add_task(async function test_policy_disable_reset() {
  await setupPolicyEngineWithJson({
    policies: {
      DisableProfileRefresh: true,
    },
  });
  await test_reset_disabled({ disabled: true });
});
