/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(
  async function test_accessibility_sidebar_visible_when_redesign_enabled() {
    let tab = await openPrefsTab("accessibility");
    let doc = tab.linkedBrowser.contentDocument;

    is_element_visible(
      doc.getElementById("category-accessibility"),
      "Accessibility category is visible when settings redesign is enabled"
    );

    await BrowserTestUtils.removeTab(tab);
  }
);

add_task(async function test_accessibility_pane_loads_setting_groups() {
  let tab = await openPrefsTab("accessibility");
  let doc = tab.linkedBrowser.contentDocument;

  await BrowserTestUtils.waitForMutationCondition(
    doc.getElementById("mainPrefPane"),
    { childList: true, subtree: true },
    () => doc.querySelector('setting-group[groupid="zoom"]')
  );

  for (let groupId of [
    "zoom",
    "fonts",
    "contrast",
    "keyboardAndScrolling",
    "motionAndLink",
  ]) {
    let group = doc.querySelector(`setting-group[groupid="${groupId}"]`);
    ok(group, `${groupId} setting-group exists`);
    is_element_visible(group, `${groupId} setting-group is visible`);
  }

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_accessibility_pane_click_sidebar() {
  let tab = await openPrefsTab("");
  let doc = tab.linkedBrowser.contentDocument;

  let navButton = doc.getElementById("category-accessibility");
  await BrowserTestUtils.waitForCondition(
    () => navButton?.buttonEl,
    "Wait for accessibility nav button to render"
  );

  let paneLoaded = waitForPaneChange("accessibility");
  synthesizeClick(navButton);
  await paneLoaded;

  await BrowserTestUtils.waitForMutationCondition(
    doc.getElementById("mainPrefPane"),
    { childList: true, subtree: true },
    () => doc.querySelector('setting-group[groupid="zoom"]')
  );
  ok(
    doc.querySelector('setting-group[groupid="zoom"]'),
    "Zoom setting-group is present after clicking accessibility nav button"
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_pane_registration_no_errors() {
  let tab = await openPrefsTab("accessibility");
  let doc = tab.linkedBrowser.contentDocument;

  await BrowserTestUtils.waitForMutationCondition(
    doc.getElementById("mainPrefPane"),
    { childList: true, subtree: true },
    () => doc.querySelector('setting-group[groupid="zoom"]')
  );
  let firstGroup = doc.querySelector('setting-group[groupid="zoom"]');
  ok(
    firstGroup,
    "Accessibility pane loaded with setting-groups (no registration errors)"
  );

  await BrowserTestUtils.removeTab(tab);
});
