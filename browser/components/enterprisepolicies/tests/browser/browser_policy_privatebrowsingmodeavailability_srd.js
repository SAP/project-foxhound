/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_privatebrowsing_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.history2.enabled", true]],
  });
  await setupPolicyEngineWithJson({
    policies: {
      PrivateBrowsingModeAvailability: 1,
    },
  });
  is(
    PrivateBrowsingUtils.enabled,
    false,
    "Private browsing should be disabled"
  );
  let newWin = await BrowserTestUtils.openNewBrowserWindow();
  let privateBrowsingCommand = newWin.document.getElementById(
    "Tools:PrivateBrowsing"
  );
  is(
    privateBrowsingCommand.hidden,
    true,
    "The private browsing command should be hidden"
  );
  await BrowserTestUtils.withNewTab(
    "about:preferences#privacy",
    async browser => {
      ok(
        browser.contentDocument
          .getElementById("historyMode")
          .querySelector("moz-option[value='dontremember']").disabled,
        "Don't remember history should be disabled"
      );
    }
  );
  await BrowserTestUtils.closeWindow(newWin);

  await testPageBlockedByPolicy("about:privatebrowsing");
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_privatebrowsing_enabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.history2.enabled", true]],
  });
  await setupPolicyEngineWithJson({
    policies: {
      PrivateBrowsingModeAvailability: 2,
    },
  });

  is(PrivateBrowsingUtils.enabled, true, "Private browsing should be true");
  let newWin = await BrowserTestUtils.openNewBrowserWindow();
  await BrowserTestUtils.withNewTab(
    "about:preferences#privacy",
    async browser => {
      ok(
        browser.contentDocument.getElementById("historyMode").disabled,
        "History selector should be disabled"
      );
    }
  );
  await BrowserTestUtils.closeWindow(newWin);
  await SpecialPowers.popPrefEnv();
});
