/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Regression test for Bug 2044851: when the DNSOverHTTPS enterprise policy
// locks the underlying prefs, the redesigned about:preferences#dnsOverHttps
// pane must surface that lock on every interactive DoH control.

const LOCKED_SETTING_IDS = [
  "dohRadioGroup",
  "dohFallbackIfCustom",
  "dohProviderSelect",
  "dohCustomProvider",
  "dohExceptionsButton",
];

async function withPolicy(policy, fn) {
  PoliciesPrefTracker.start();
  await EnterprisePolicyTesting.setupPolicyEngineWithJson({ policies: policy });
  try {
    await fn();
  } finally {
    await EnterprisePolicyTesting.setupPolicyEngineWithJson("");
    PoliciesPrefTracker.stop();
  }
}

add_task(async function testDoHPolicyLocksAllControls() {
  await withPolicy(
    {
      DNSOverHTTPS: {
        Enabled: false,
        Locked: true,
      },
    },
    async () => {
      ok(
        Services.prefs.prefIsLocked("network.trr.mode"),
        "network.trr.mode should be locked by the policy"
      );

      await openPreferencesViaOpenPreferencesAPI("dnsOverHttps", {
        leaveOpen: true,
      });
      let win = gBrowser.selectedBrowser.contentWindow;

      for (let id of LOCKED_SETTING_IDS) {
        let setting = await TestUtils.waitForCondition(
          () => win.Preferences.getSetting(id),
          `Setting ${id} should be registered`
        );
        ok(setting.disabled, `${id} should be disabled when policy locks DoH`);
      }

      // The exceptions button is always rendered; verify the DOM control
      // reflects the disabled state too, since that is the surface the user
      // sees.
      let exceptionsControl = await settingControlRenders(
        "dohExceptionsButton",
        win
      );
      ok(
        exceptionsControl.disabled,
        "Manage Exceptions setting-control should be disabled by the policy"
      );

      gBrowser.removeCurrentTab();
    }
  );
});
