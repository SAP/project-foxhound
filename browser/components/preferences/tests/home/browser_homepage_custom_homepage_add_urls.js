/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";
const DEFAULT_HOMEPAGE_URL = "about:home";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["identity.fxaccounts.account.device.name", ""]],
  });
});

add_task(async function test_adding_single_custom_url() {
  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, DEFAULT_HOMEPAGE_URL]],
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
    "Pref should be updated with the new URL"
  );

  let boxItems = doc.querySelectorAll(
    "moz-box-item[data-url='https://example.com']"
  );
  is(boxItems.length, 1, "URL appears in the list");

  await BrowserTestUtils.removeTab(tab);
});
