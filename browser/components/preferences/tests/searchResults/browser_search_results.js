/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * A setting-control hidden via `setting.visible = false` should not surface
 * in search results, even when its visible text is rendered into a nested
 * custom element's shadow DOM (e.g. a moz-checkbox > label). Recursing into
 * shadow roots without skipping `hidden` subtrees would otherwise match
 * labels on controls the user can't see.
 */
add_task(async function test_hidden_control_excluded_from_search() {
  const HIDDEN_LABEL = "somehiddencontroltestlabel";
  const VISIBLE_LABEL = "somevisiblecontroltestlabel";

  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });
  let doc = gBrowser.selectedBrowser.contentDocument;
  let win = doc.documentGlobal;

  win.Preferences.addSetting({
    id: "hiddenSearchSetting",
    visible: () => false,
    get: () => true,
  });
  win.Preferences.addSetting({
    id: "visibleSearchSetting",
    get: () => true,
  });
  win.SettingGroupManager.registerGroup("hiddenSearchGroup", {
    headingLevel: 2,
    items: [
      {
        id: "visibleSearchSetting",
        controlAttrs: { label: VISIBLE_LABEL },
      },
      {
        id: "hiddenSearchSetting",
        controlAttrs: { label: HIDDEN_LABEL },
      },
    ],
  });

  let group = doc.createElement("setting-group");
  group.setAttribute("groupid", "hiddenSearchGroup");
  group.setAttribute("data-category", "panePrivacy");
  doc.getElementById("mainPrefPane").appendChild(group);
  win.initSettingGroup("hiddenSearchGroup");
  await group.updateComplete;

  let controls = group.querySelectorAll("setting-control");
  is(controls.length, 2, "Both setting-controls were rendered");
  let hiddenControl = group.querySelector(
    "setting-control[id$='hiddenSearchSetting']"
  );
  ok(hiddenControl?.hidden, "Setting-control with visible:false is hidden");

  // Check visible control's label can be found in search.
  await runSearchInput(VISIBLE_LABEL);
  let noResultsEl = doc.getElementById("no-results-message");
  is_element_hidden(noResultsEl, "Visible control's label is found in search");

  // Clear and search for the hidden control's label.
  let searchInput = doc.getElementById("searchInput");
  searchInput.focus();
  let cleared = BrowserTestUtils.waitForEvent(
    win,
    "PreferencesSearchCompleted",
    evt => evt.detail == ""
  );
  let count = VISIBLE_LABEL.length;
  while (count--) {
    EventUtils.sendKey("BACK_SPACE", win);
  }
  await cleared;

  await runSearchInput(HIDDEN_LABEL);
  is_element_visible(
    noResultsEl,
    "Hidden control's shadow-DOM label should not surface in search results"
  );

  group.remove();
  gBrowser.removeCurrentTab();
});
