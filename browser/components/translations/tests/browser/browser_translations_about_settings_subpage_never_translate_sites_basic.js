/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that never-translate site permissions load when opening the settings subpage.
 */
add_task(async function test_never_translate_sites_prepopulated() {
  const exampleComOrigin = new URL(ENGLISH_PAGE_URL).origin;
  const exampleOrgOrigin = new URL(SPANISH_PAGE_URL_DOT_ORG).origin;
  const exampleNetOrigin = new URL("https://example.net").origin;
  const siteOrigins = [exampleOrgOrigin, exampleComOrigin, exampleNetOrigin];
  const expectedSites = TranslationsSettingsTestUtils.sortOrigins(siteOrigins);

  const { cleanup, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [["browser.settings-redesign.enabled", true]],
    });

  info("Adding never-translate site permissions before opening settings");
  for (const origin of siteOrigins) {
    TranslationsParent.setNeverTranslateSiteByOrigin(true, origin);
  }

  const document = gBrowser.selectedBrowser.contentDocument;

  info("Navigating to the translations settings subpage");
  const manageButton = await waitForCondition(
    () => document.getElementById("translationsManageButton"),
    "Waiting for translationsManageButton"
  );

  info("Scrolling manage button into view");
  manageButton.scrollIntoView({ behavior: "instant", block: "center" });

  info(
    "Opening settings subpage and waiting for never-translate sites to render"
  );
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [
          TranslationsSettingsTestUtils.Events.NeverTranslateSitesRendered,
          { sites: expectedSites, count: expectedSites.length },
        ],
        [
          TranslationsSettingsTestUtils.Events
            .NeverTranslateSitesEmptyStateHidden,
        ],
        [TranslationsSettingsTestUtils.Events.Initialized],
      ],
    },
    async () => {
      click(manageButton, "Opening translations settings subpage");
    }
  );

  info("Verifying pre-populated never-translate sites are displayed");
  await translationsSettingsTestUtils.assertNeverTranslateSites({
    sites: expectedSites,
    count: expectedSites.length,
  });

  info(
    "Verifying never-translate sites empty state is hidden when sites exist"
  );
  await translationsSettingsTestUtils.assertNeverTranslateSitesEmptyState({
    visible: false,
  });

  await cleanup();
});

/**
 * Tests deleting never-translate sites and showing the empty-state row.
 */
add_task(async function test_never_translate_sites_delete_and_empty_state() {
  const exampleComOrigin = new URL(ENGLISH_PAGE_URL).origin;
  const exampleOrgOrigin = new URL(SPANISH_PAGE_URL_DOT_ORG).origin;
  const initialSites = [exampleComOrigin, exampleOrgOrigin];
  const expectedInitialSites =
    TranslationsSettingsTestUtils.sortOrigins(initialSites);

  const { cleanup, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [["browser.settings-redesign.enabled", true]],
    });

  info("Adding never-translate site permissions before opening settings");
  for (const origin of initialSites) {
    TranslationsParent.setNeverTranslateSiteByOrigin(true, origin);
  }

  const document = gBrowser.selectedBrowser.contentDocument;

  info("Navigating to the translations settings subpage");
  const manageButton = await waitForCondition(
    () => document.getElementById("translationsManageButton"),
    "Waiting for translationsManageButton"
  );

  info("Scrolling manage button into view");
  manageButton.scrollIntoView({ behavior: "instant", block: "center" });

  info(
    "Opening settings subpage and waiting for never-translate sites to render"
  );
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [
          TranslationsSettingsTestUtils.Events.NeverTranslateSitesRendered,
          {
            sites: expectedInitialSites,
            count: expectedInitialSites.length,
          },
        ],
        [
          TranslationsSettingsTestUtils.Events
            .NeverTranslateSitesEmptyStateHidden,
        ],
        [TranslationsSettingsTestUtils.Events.Initialized],
      ],
    },
    async () => {
      click(manageButton, "Opening translations settings subpage");
    }
  );

  info("Verifying both never-translate sites are shown");
  await translationsSettingsTestUtils.assertNeverTranslateSites({
    sites: expectedInitialSites,
    count: expectedInitialSites.length,
  });

  const removedOrigin = expectedInitialSites[0];
  const remainingOrigin = expectedInitialSites[1];

  info(`Removing never-translate site ${removedOrigin} via delete button`);
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [
          TranslationsSettingsTestUtils.Events.NeverTranslateSitesRendered,
          { sites: [remainingOrigin], count: 1 },
        ],
      ],
    },
    async () => {
      await translationsSettingsTestUtils.removeNeverTranslateSite(
        removedOrigin
      );
    }
  );

  info("Verifying single site remains after deletion");
  await translationsSettingsTestUtils.assertNeverTranslateSites({
    sites: [remainingOrigin],
    count: 1,
  });
  await translationsSettingsTestUtils.assertNeverTranslateSitesEmptyState({
    visible: false,
  });

  info(`Removing final never-translate site ${remainingOrigin}`);
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [
          TranslationsSettingsTestUtils.Events.NeverTranslateSitesRendered,
          { sites: [], count: 0 },
        ],
        [
          TranslationsSettingsTestUtils.Events
            .NeverTranslateSitesEmptyStateShown,
        ],
      ],
    },
    async () => {
      await translationsSettingsTestUtils.removeNeverTranslateSite(
        remainingOrigin
      );
    }
  );

  info("Verifying empty state row appears after last deletion");
  await translationsSettingsTestUtils.assertNeverTranslateSites({
    sites: [],
    count: 0,
  });
  await translationsSettingsTestUtils.assertNeverTranslateSitesEmptyState({
    visible: true,
  });

  await cleanup();
});

/**
 * Tests that never-translate sites are sorted by domain ignoring the scheme.
 */
add_task(async function test_never_translate_sites_sorted_ignoring_scheme() {
  const httpEsOrigin = new URL("https://es.wikipedia.org").origin;
  const httpsEnOrigin = new URL("https://en.wikipedia.org").origin;
  const httpsJaOrigin = new URL("https://ja.wikipedia.org").origin;
  const siteOrigins = [httpsJaOrigin, httpEsOrigin, httpsEnOrigin];
  const expectedSites = TranslationsSettingsTestUtils.sortOrigins(siteOrigins);

  const { cleanup, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [["browser.settings-redesign.enabled", true]],
    });

  info("Adding never-translate site permissions before opening settings");
  for (const origin of siteOrigins) {
    TranslationsParent.setNeverTranslateSiteByOrigin(true, origin);
  }

  const document = gBrowser.selectedBrowser.contentDocument;

  info("Navigating to the translations settings subpage");
  const manageButton = await waitForCondition(
    () => document.getElementById("translationsManageButton"),
    "Waiting for translationsManageButton"
  );

  info("Scrolling manage button into view");
  manageButton.scrollIntoView({ behavior: "instant", block: "center" });

  info(
    "Opening settings subpage and waiting for never-translate sites to render"
  );
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [
          TranslationsSettingsTestUtils.Events.NeverTranslateSitesRendered,
          { sites: expectedSites, count: expectedSites.length },
        ],
        [
          TranslationsSettingsTestUtils.Events
            .NeverTranslateSitesEmptyStateHidden,
        ],
        [TranslationsSettingsTestUtils.Events.Initialized],
      ],
    },
    async () => {
      click(manageButton, "Opening translations settings subpage");
    }
  );

  info("Verifying never-translate sites are sorted by domain ignoring scheme");
  await translationsSettingsTestUtils.assertNeverTranslateSites({
    sites: expectedSites,
    count: expectedSites.length,
  });
  await translationsSettingsTestUtils.assertNeverTranslateSitesOrder({
    sites: expectedSites,
  });
  await translationsSettingsTestUtils.assertNeverTranslateSitesEmptyState({
    visible: false,
  });

  await cleanup();
});
