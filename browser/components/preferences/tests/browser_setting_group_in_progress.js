/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

async function openPrefsWithSettings({ allEnabled, sectionEnabled }) {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.settings-redesign.enabled", allEnabled],
      ["browser.settings-redesign.mysection.enabled", sectionEnabled],
    ],
  });
  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });
  let doc = gBrowser.selectedBrowser.contentDocument;
  let win = doc.documentGlobal;
  win.Preferences.addSetting({
    id: "testSetting",
    get: () => true,
  });
  win.SettingGroupManager.registerGroup("mysection", {
    inProgress: true,
    headingLevel: 2,
    items: [
      {
        id: "testSetting",
        controlAttrs: {
          label: "Test setting",
        },
      },
    ],
  });
  let legacyGroup = doc.createXULElement("groupbox");
  legacyGroup.id = "mysectionGroup";
  legacyGroup.setAttribute("data-srd-groupid", "mysection");
  legacyGroup.setAttribute("data-category", "paneSync");
  legacyGroup.hidden = true;
  let mysectionGroup = doc.createElement("setting-group");
  mysectionGroup.setAttribute("groupid", "mysection");
  mysectionGroup.setAttribute("data-category", "paneSync");
  mysectionGroup.hidden = true;
  let paneContainer = doc.getElementById("mainPrefPane");
  paneContainer.appendChild(mysectionGroup);
  paneContainer.appendChild(legacyGroup);
  win.initSettingGroup("mysection");
  let paneLoaded = waitForPaneChange("sync");
  EventUtils.synthesizeMouseAtCenter(
    doc.getElementById("category-sync"),
    {},
    win
  );
  await paneLoaded;
  return doc;
}

add_task(async function test_section_disabled() {
  try {
    let doc = await openPrefsWithSettings({
      allEnabled: false,
      sectionEnabled: false,
    });
    let legacyGroup = doc.getElementById("mysectionGroup");
    let redesignGroup = doc.querySelector('setting-group[groupid="mysection"]');
    ok(legacyGroup.checkVisibility(), "The legacy group is visible");
    is(
      legacyGroup.dataset.category,
      "paneSync",
      "The legacy group has a category"
    );
    ok(
      !legacyGroup.hasAttribute("data-hidden-from-search"),
      "The legacy group is visible to search"
    );
    ok(!redesignGroup, "The redesign group was removed");
  } finally {
    gBrowser.removeCurrentTab();
  }
});

add_task(async function test_section_enabled() {
  let doc = await openPrefsWithSettings({
    allEnabled: false,
    sectionEnabled: true,
  });
  let legacyGroup = doc.getElementById("mysectionGroup");
  let redesignGroup = doc.querySelector('setting-group[groupid="mysection"]');
  ok(!legacyGroup.checkVisibility(), "The legacy group is hidden");
  ok(!legacyGroup.dataset.category, "The legacy group category is removed");
  is(
    legacyGroup.getAttribute("data-hidden-from-search"),
    "true",
    "The legacy group is hidden from search"
  );
  ok(redesignGroup.checkVisibility(), "The redesign group is visible");
  is(
    redesignGroup.dataset.category,
    "paneSync",
    "The redesign group has a category"
  );
  gBrowser.removeCurrentTab();
});

add_task(async function test_all_enabled() {
  let doc = await openPrefsWithSettings({
    allEnabled: true,
    sectionEnabled: false,
  });
  let legacyGroup = doc.getElementById("mysectionGroup");
  let redesignGroup = doc.querySelector('setting-group[groupid="mysection"]');
  ok(!legacyGroup.checkVisibility(), "The legacy group is hidden");
  ok(!legacyGroup.dataset.category, "The legacy group category is removed");
  is(
    legacyGroup.getAttribute("data-hidden-from-search"),
    "true",
    "The legacy group is hidden from search"
  );
  ok(redesignGroup.checkVisibility(), "The redesign group is visible");
  is(
    redesignGroup.dataset.category,
    "paneSync",
    "The redesign group has a category"
  );
  gBrowser.removeCurrentTab();
});
