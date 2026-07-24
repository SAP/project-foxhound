/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";
const DEFAULT_HOMEPAGE_URL = "about:home";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.settings-redesign.enabled", true],
      ["identity.fxaccounts.account.device.name", ""],
    ],
  });
});

add_task(async function test_custom_homepage_button_visibility() {
  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, DEFAULT_HOMEPAGE_URL]],
  });

  let { win, tab } = await openHomePreferences();

  let customHomepageButtonControl = getSettingControl(
    "homepageGoToCustomHomepageUrlPanel",
    win
  );
  ok(
    !customHomepageButtonControl ||
      BrowserTestUtils.isHidden(customHomepageButtonControl),
    "Custom homepage button is hidden when homepage is default"
  );

  let homepageNewWindowsControl = await settingControlRenders(
    "homepageNewWindows",
    win
  );
  let select = homepageNewWindowsControl.controlEl;

  await changeMozSelectValue(select, "custom");

  customHomepageButtonControl = await settingControlRenders(
    "homepageGoToCustomHomepageUrlPanel",
    win
  );
  ok(
    customHomepageButtonControl,
    "Custom homepage button exists when custom is selected"
  );
  ok(
    BrowserTestUtils.isVisible(customHomepageButtonControl),
    "Custom homepage button is visible when custom is selected"
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_custom_homepage_button_description_shows_urls() {
  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, "https://example.com"]],
  });

  let { win, tab } = await openHomePreferences();

  let homepageNewWindowsControl = await settingControlRenders(
    "homepageNewWindows",
    win
  );
  let select = homepageNewWindowsControl.controlEl;

  await changeMozSelectValue(select, "custom");

  let customHomepageButtonControl = await settingControlRenders(
    "homepageGoToCustomHomepageUrlPanel",
    win
  );

  ok(customHomepageButtonControl, "Custom homepage button exists");

  let button = customHomepageButtonControl.controlEl;
  let description = button.descriptionEl;
  ok(description, "Button has description element");
  ok(
    description.textContent.includes("example.com"),
    "Description includes 'example.com'"
  );

  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, "https://example.com|https://test.org"]],
  });

  await TestUtils.waitForCondition(
    () =>
      description.textContent.includes("example.com") &&
      description.textContent.includes("test.org"),
    "Wait for description to update with multiple URLs"
  );

  ok(
    description.textContent.includes("example.com, test.org"),
    "Description shows both URLs separated by comma"
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_custom_homepage_button_navigates_to_subpage() {
  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, "https://example.com"]],
  });

  let { win, tab } = await openHomePreferences();

  let homepageNewWindowsControl = await settingControlRenders(
    "homepageNewWindows",
    win
  );
  let select = homepageNewWindowsControl.controlEl;

  await changeMozSelectValue(select, "custom");

  let customHomepageButtonControl = await settingControlRenders(
    "homepageGoToCustomHomepageUrlPanel",
    win
  );
  let button = customHomepageButtonControl.controlEl;

  let paneChangePromise = waitForPaneChange("customHomepage", win);

  button.click();

  await paneChangePromise;

  let doc = gBrowser.contentDocument;
  is(
    doc.location.hash,
    "#customHomepage",
    "Navigated to custom homepage subpage"
  );

  await BrowserTestUtils.removeTab(tab);
});
