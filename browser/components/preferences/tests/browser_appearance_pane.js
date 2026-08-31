/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(
  async function test_appearance_sidebar_visible_when_redesign_enabled() {
    let tab = await openPrefsTab("appearance");
    let doc = tab.linkedBrowser.contentDocument;

    is_element_visible(
      doc.getElementById("category-appearance"),
      "Appearance category is visible when settings redesign is enabled"
    );

    await BrowserTestUtils.removeTab(tab);
  }
);

add_task(async function test_appearance_pane_loads_setting_groups() {
  let tab = await openPrefsTab("appearance");
  let doc = tab.linkedBrowser.contentDocument;

  await BrowserTestUtils.waitForMutationCondition(
    doc.getElementById("mainPrefPane"),
    { childList: true, subtree: true },
    () => doc.querySelector('setting-group[groupid="appearance"]')
  );

  for (let groupId of ["appearance", "browserTheme", "relatedSettings"]) {
    let group = doc.querySelector(`setting-group[groupid="${groupId}"]`);
    ok(group, `${groupId} setting-group exists`);
    is_element_visible(group, `${groupId} setting-group is visible`);
  }

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_appearance_pane_click_sidebar() {
  let tab = await openPrefsTab("");
  let doc = tab.linkedBrowser.contentDocument;

  let navButton = doc.getElementById("category-appearance");
  await BrowserTestUtils.waitForCondition(
    () => navButton?.buttonEl,
    "Wait for appearance nav button to render"
  );

  let paneLoaded = waitForPaneChange("appearance");
  synthesizeClick(navButton);
  await paneLoaded;

  await BrowserTestUtils.waitForMutationCondition(
    doc.getElementById("mainPrefPane"),
    { childList: true, subtree: true },
    () => doc.querySelector('setting-group[groupid="appearance"]')
  );
  ok(
    doc.querySelector('setting-group[groupid="appearance"]'),
    "Appearance setting-group is present after clicking appearance nav button"
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_related_settings_accessibility_link_navigates() {
  let tab = await openPrefsTab("appearance");
  let doc = tab.linkedBrowser.contentDocument;

  await BrowserTestUtils.waitForMutationCondition(
    doc.getElementById("mainPrefPane"),
    { childList: true, subtree: true },
    () => doc.querySelector('setting-group[groupid="relatedSettings"]')
  );

  let paneLoaded = waitForPaneChange("accessibility");
  synthesizeClick(getSettingControl("related-settings-accessibility-link"));
  await paneLoaded;

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_related_settings_home_link_navigates() {
  let tab = await openPrefsTab("appearance");
  let doc = tab.linkedBrowser.contentDocument;

  await BrowserTestUtils.waitForMutationCondition(
    doc.getElementById("mainPrefPane"),
    { childList: true, subtree: true },
    () => doc.querySelector('setting-group[groupid="relatedSettings"]')
  );

  let paneLoaded = waitForPaneChange("home");
  synthesizeClick(getSettingControl("related-settings-home-link"));
  await paneLoaded;

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_related_settings_tabs_browsing_link_navigates() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
  await openPreferencesViaOpenPreferencesAPI("appearance", {
    leaveOpen: true,
  });
  let doc = gBrowser.selectedBrowser.contentDocument;

  await BrowserTestUtils.waitForMutationCondition(
    doc.getElementById("mainPrefPane"),
    { childList: true, subtree: true },
    () => doc.querySelector('setting-group[groupid="relatedSettings"]')
  );

  let paneLoaded = waitForPaneChange("tabsBrowsing");
  synthesizeClick(getSettingControl("related-settings-tabs-browsing-link"));
  await paneLoaded;

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_browser_layout_group_in_tabs_browsing_pane() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
  await openPreferencesViaOpenPreferencesAPI("tabsBrowsing", {
    leaveOpen: true,
  });
  let doc = gBrowser.selectedBrowser.contentDocument;

  await BrowserTestUtils.waitForMutationCondition(
    doc.getElementById("mainPrefPane"),
    { childList: true, subtree: true },
    () => doc.querySelector('setting-group[groupid="browserLayout"]')
  );

  let group = doc.querySelector('setting-group[groupid="browserLayout"]');
  ok(group, "browserLayout setting-group exists in tabs-browsing pane");
  is_element_visible(group, "browserLayout setting-group is visible");

  await BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
