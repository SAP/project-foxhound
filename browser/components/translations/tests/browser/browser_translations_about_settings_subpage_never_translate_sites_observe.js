/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that adding never-translate site permissions while the settings subpage is open
 * updates the UI via the permissions observer.
 */
add_task(
  async function test_never_translate_sites_observe_permission_changes() {
    const exampleComOrigin = new URL(ENGLISH_PAGE_URL).origin;
    const exampleOrgOrigin = new URL(SPANISH_PAGE_URL_DOT_ORG).origin;

    const { cleanup, translationsSettingsTestUtils } =
      await setupAboutPreferences(LANGUAGE_PAIRS, {
        prefs: [["browser.settings-redesign.enabled", true]],
      });

    const document = gBrowser.selectedBrowser.contentDocument;

    info("Navigating to the translations settings subpage");
    const manageButton = await waitForCondition(
      () => document.getElementById("translationsManageButton"),
      "Waiting for translationsManageButton"
    );

    info("Scrolling manage button into view");
    manageButton.scrollIntoView({ behavior: "instant", block: "center" });

    info("Opening settings subpage and waiting for initial empty render");
    await translationsSettingsTestUtils.assertEvents(
      {
        expected: [
          [
            TranslationsSettingsTestUtils.Events.NeverTranslateSitesRendered,
            { sites: [], count: 0 },
          ],
          [TranslationsSettingsTestUtils.Events.Initialized],
        ],
      },
      async () => {
        click(manageButton, "Opening translations settings subpage");
      }
    );

    info("Verifying never-translate sites empty state is visible initially");
    await translationsSettingsTestUtils.assertNeverTranslateSitesEmptyState({
      visible: true,
    });

    info("Adding example.com to never-translate sites while settings are open");
    await translationsSettingsTestUtils.assertEvents(
      {
        expected: [
          [
            TranslationsSettingsTestUtils.Events.NeverTranslateSitesRendered,
            { sites: [exampleComOrigin], count: 1 },
          ],
          [
            TranslationsSettingsTestUtils.Events
              .NeverTranslateSitesEmptyStateHidden,
          ],
        ],
      },
      async () => {
        TranslationsParent.setNeverTranslateSiteByOrigin(
          true,
          exampleComOrigin
        );
      }
    );

    info("Verifying example.com is rendered in the never-translate sites list");
    await translationsSettingsTestUtils.assertNeverTranslateSites({
      sites: [exampleComOrigin],
      count: 1,
    });
    await translationsSettingsTestUtils.assertNeverTranslateSitesEmptyState({
      visible: false,
    });

    info("Adding example.org to never-translate sites while settings are open");
    const expectedSites = TranslationsSettingsTestUtils.sortOrigins([
      exampleComOrigin,
      exampleOrgOrigin,
    ]);
    await translationsSettingsTestUtils.assertEvents(
      {
        expected: [
          [
            TranslationsSettingsTestUtils.Events.NeverTranslateSitesRendered,
            { sites: expectedSites, count: expectedSites.length },
          ],
        ],
      },
      async () => {
        TranslationsParent.setNeverTranslateSiteByOrigin(
          true,
          exampleOrgOrigin
        );
      }
    );

    info("Verifying both sites are displayed after observer update");
    await translationsSettingsTestUtils.assertNeverTranslateSites({
      sites: expectedSites,
      count: expectedSites.length,
    });
    await translationsSettingsTestUtils.assertNeverTranslateSitesEmptyState({
      visible: false,
    });

    await cleanup();
  }
);
