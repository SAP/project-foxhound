/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["identity.fxaccounts.account.device.name", ""]],
  });
});

add_task(async function default_homepage_test() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.startup.page", 1]],
  });
  let defaults = Services.prefs.getDefaultBranch("");
  // Simulate a homepage set via policy or a distribution.
  defaults.setStringPref("browser.startup.homepage", "https://example.com");

  if (Services.prefs.getBoolPref("browser.settings-redesign.enabled", false)) {
    // SRD UI
    let { win, tab } = await openHomePreferences();

    let homepageNewWindowsControl = await settingControlRenders(
      "homepageNewWindows",
      win
    );
    let select = homepageNewWindowsControl.controlEl;
    let nativeSelect = select.inputEl;

    Assert.equal(
      nativeSelect.value,
      "custom",
      "Homepage dropdown should show 'custom' when default homepage is set to custom URL"
    );

    let customHomepageButtonControl = await settingControlRenders(
      "homepageGoToCustomHomepageUrlPanel",
      win
    );
    let button = customHomepageButtonControl.controlEl;
    let description = button.descriptionEl;

    ok(
      description.textContent.includes("example.com"),
      "Custom homepage button description should include example.com"
    );

    await BrowserTestUtils.removeTab(tab);
  } else {
    // Legacy UI
    await openPreferencesViaOpenPreferencesAPI("paneHome", { leaveOpen: true });

    let doc = gBrowser.contentDocument;
    let homeMode = doc.getElementById("homeMode");
    Assert.equal(homeMode.value, 2, "homeMode should be 2 (Custom URL)");

    let homePageUrl = doc.getElementById("homePageUrl");
    Assert.equal(
      homePageUrl.value,
      "https://example.com",
      "homePageUrl should be example.com"
    );

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }

  registerCleanupFunction(async () => {
    defaults.setStringPref("browser.startup.homepage", "about:home");
  });
});
