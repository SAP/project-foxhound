/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";
const BLANK_HOMEPAGE_URL = "chrome://browser/content/blanktab.html";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["identity.fxaccounts.account.device.name", ""]],
  });
});

add_task(async function test_adding_multiple_custom_urls() {
  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, BLANK_HOMEPAGE_URL]],
  });

  let { win, doc, tab } = await openCustomHomepageSubpage();

  let inputControl = await settingControlRenders(
    "customHomepageAddUrlInput",
    win
  );
  let mozInput = inputControl.controlEl;
  let input = mozInput.inputEl || mozInput;

  let addButtonControl = await settingControlRenders(
    "customHomepageAddAddressButton",
    win
  );
  let addButton = addButtonControl.controlEl;

  input.focus();
  EventUtils.sendString("https://example.com", win);
  await TestUtils.waitForTick();
  addButton.click();

  await TestUtils.waitForCondition(
    () => Services.prefs.getStringPref(HOMEPAGE_PREF) === "https://example.com",
    "First URL added"
  );

  input.focus();
  input.select();
  EventUtils.sendString("https://test.org", win);
  await TestUtils.waitForTick();
  addButton.click();

  await TestUtils.waitForCondition(
    () =>
      Services.prefs.getStringPref(HOMEPAGE_PREF) ===
      "https://example.com|https://test.org",
    "Second URL added"
  );

  input.focus();
  input.select();
  EventUtils.sendString("https://mozilla.org", win);
  await TestUtils.waitForTick();
  addButton.click();

  await TestUtils.waitForCondition(
    () =>
      Services.prefs.getStringPref(HOMEPAGE_PREF) ===
      "https://example.com|https://test.org|https://mozilla.org",
    "Third URL added"
  );

  let boxItems = doc.querySelectorAll("moz-box-item[data-url]");
  is(boxItems.length, 3, "All three URLs appear in the list");

  await BrowserTestUtils.removeTab(tab);
});
