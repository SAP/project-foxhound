/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_spellcheck_checkbox_toggles_pref() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["layout.spellcheckDefault", 2],
      [
        "browser.dictionaries.download.url",
        "https://example.com/%LOCALE%/dictionaries/",
      ],
    ],
  });

  await openPreferencesViaOpenPreferencesAPI("paneGeneral", {
    leaveOpen: true,
  });
  let win = gBrowser.selectedBrowser.contentWindow;
  let doc = win.document;

  let settingGroup = doc.querySelector('setting-group[groupid="spellCheck"]');
  await settingGroup.updateComplete;

  let settingControl = getSettingControl("checkSpelling", win);
  ok(settingControl, "The checkSpelling setting-control exists");
  await settingControl.updateComplete;

  let control = settingControl.controlEl;
  ok(control.checked, "Checkbox should be checked when pref is 2");

  let changed = waitForSettingControlChange(settingControl);
  synthesizeClick(control);
  await changed;

  is(
    Services.prefs.getIntPref("layout.spellcheckDefault"),
    0,
    "Pref should be 0 after unchecking"
  );
  ok(!control.checked, "Checkbox should be unchecked after clicking");

  changed = waitForSettingControlChange(settingControl);
  synthesizeClick(control);
  await changed;

  is(
    Services.prefs.getIntPref("layout.spellcheckDefault"),
    1,
    "Pref should be 1 after re-checking (get/set maps true to 1)"
  );
  ok(control.checked, "Checkbox should be checked after clicking again");

  let downloadDictionaries = getSettingControl("downloadDictionaries", win);
  ok(downloadDictionaries, "The downloadDictionaries setting-control exists");
  await downloadDictionaries.updateComplete;

  let link = downloadDictionaries.controlEl.renderRoot.querySelector("a");
  ok(link, "Link is rendered");

  is(
    link.href,
    `https://example.com/${Services.locale.appLocaleAsLangTag}/dictionaries/`,
    "Link href is localized"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
