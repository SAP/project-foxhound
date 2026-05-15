/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Stories
const STORIES_SYSTEM_PREF =
  "browser.newtabpage.activity-stream.feeds.system.topstories";
const STORIES_PREF =
  "browser.newtabpage.activity-stream.feeds.section.topstories";

// Extra prefs relating to "manage topics" box button link
const SECTIONS_ENABLED_PREF =
  "browser.newtabpage.activity-stream.discoverystream.sections.enabled";
const TOPIC_LABELS_ENABLED_PREF =
  "browser.newtabpage.activity-stream.discoverystream.topicLabels.enabled";
const SECTIONS_PERSONALIZATION_ENABLED_PREF =
  "browser.newtabpage.activity-stream.discoverystream.sections.personalization.enabled";
const SECTIONS_CUSTOMIZE_MENU_PANEL_ENABLED_PREF =
  "browser.newtabpage.activity-stream.discoverystream.sections.customizeMenuPanel.enabled";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.settings-redesign.enabled", true],
      // Opening preferences initializes FxA code which sets this pref.
      // Track it to avoid test warnings.
      ["identity.fxaccounts.account.device.name", ""],
    ],
  });
});

add_task(async function test_manage_topics_visible_when_all_deps_enabled() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [STORIES_SYSTEM_PREF, true],
      [STORIES_PREF, true],
      [SECTIONS_ENABLED_PREF, true],
      [TOPIC_LABELS_ENABLED_PREF, true],
      [SECTIONS_PERSONALIZATION_ENABLED_PREF, true],
      [SECTIONS_CUSTOMIZE_MENU_PANEL_ENABLED_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let manageTopicsControl = await settingControlRenders("manageTopics", win);
  ok(
    manageTopicsControl,
    "Manage topics box link exists when all deps are enabled"
  );
  ok(
    BrowserTestUtils.isVisible(manageTopicsControl),
    "Manage topics box link is visible when all dependencies are enabled"
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_manage_topics_hidden_when_any_dep_disabled() {
  const dependencies = [
    STORIES_PREF,
    STORIES_SYSTEM_PREF,
    SECTIONS_ENABLED_PREF,
    TOPIC_LABELS_ENABLED_PREF,
    SECTIONS_PERSONALIZATION_ENABLED_PREF,
    SECTIONS_CUSTOMIZE_MENU_PANEL_ENABLED_PREF,
  ];

  for (let dep of dependencies) {
    // Set all prefs explicitly: the current dep to false, all others to true.
    // This tests that disabling any single dependency hides the manage topics box link.
    let prefSettings = [
      [STORIES_SYSTEM_PREF, dep !== STORIES_SYSTEM_PREF],
      [STORIES_PREF, dep !== STORIES_PREF],
      [SECTIONS_ENABLED_PREF, dep !== SECTIONS_ENABLED_PREF],
      [TOPIC_LABELS_ENABLED_PREF, dep !== TOPIC_LABELS_ENABLED_PREF],
      [
        SECTIONS_PERSONALIZATION_ENABLED_PREF,
        dep !== SECTIONS_PERSONALIZATION_ENABLED_PREF,
      ],
      [
        SECTIONS_CUSTOMIZE_MENU_PANEL_ENABLED_PREF,
        dep !== SECTIONS_CUSTOMIZE_MENU_PANEL_ENABLED_PREF,
      ],
    ];

    await SpecialPowers.pushPrefEnv({
      set: prefSettings,
    });

    let { win, tab } = await openHomePreferences();

    let manageTopicsControl = getSettingControl("manageTopics", win);
    ok(
      !manageTopicsControl || BrowserTestUtils.isHidden(manageTopicsControl),
      `Manage topics box link is hidden when ${dep} is disabled`
    );

    BrowserTestUtils.removeTab(tab);
  }
});
