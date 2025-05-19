/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(
  async function test_select_translations_panel_translation_success_with_full_page_translations_active() {
    const { cleanup, runInPage, resolveDownloads } = await loadTestPage({
      page: SELECT_TEST_PAGE_URL,
      languagePairs: LANGUAGE_PAIRS,
      prefs: [["browser.translations.select.enable", true]],
    });

    await SelectTranslationsTestUtils.openPanel(runInPage, {
      openAtSpanishHyperlink: true,
      expectedFromLanguage: "es",
      expectedToLanguage: "en",
      downloadHandler: resolveDownloads,
      onOpenPanel: SelectTranslationsTestUtils.assertPanelViewTranslated,
    });
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsSelectTranslationsPanel.open,
      {
        expectedEventCount: 1,
        expectNewFlowId: true,
        assertForMostRecentEvent: {
          document_language: "es",
          from_language: "es",
          to_language: "en",
          top_preferred_language: "en",
          text_source: "hyperlink",
        },
      }
    );
    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 1],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 1,
        assertForMostRecentEvent: {
          document_language: "es",
          from_language: "es",
          to_language: "en",
          top_preferred_language: "en",
          request_target: "select",
          auto_translate: false,
          source_text_code_units: 23,
          source_text_word_count: 4,
        },
      }
    );

    await SelectTranslationsTestUtils.changeSelectedToLanguage(["fr"], {
      openDropdownMenu: true,
      pivotTranslation: true,
      downloadHandler: resolveDownloads,
      onChangeLanguage: SelectTranslationsTestUtils.assertPanelViewTranslated,
    });
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsSelectTranslationsPanel.changeToLanguage,
      {
        expectedEventCount: 1,
      }
    );
    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 2],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 2,
        assertForMostRecentEvent: {
          document_language: "es",
          from_language: "es",
          to_language: "fr",
          top_preferred_language: "en",
          request_target: "select",
          auto_translate: false,
          source_text_code_units: 23,
          source_text_word_count: 4,
        },
      }
    );

    await SelectTranslationsTestUtils.clickTranslateFullPageButton();
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsSelectTranslationsPanel.translateFullPageButton,
      {
        expectedEventCount: 1,
      }
    );
    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 1],
        ["select", 2],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 3,
        assertForMostRecentEvent: {
          document_language: "es",
          from_language: "es",
          to_language: "fr",
          top_preferred_language: "en",
          request_target: "full_page",
          auto_translate: false,
        },
      }
    );

    await FullPageTranslationsTestUtils.assertPageIsTranslated(
      "es",
      "fr",
      runInPage
    );

    await SelectTranslationsTestUtils.openPanel(runInPage, {
      selectFrenchSection: true,
      openAtFrenchSection: true,
      expectedFromLanguage: "fr",
      expectedToLanguage: "en",
      downloadHandler: resolveDownloads,
      onOpenPanel: SelectTranslationsTestUtils.assertPanelViewTranslated,
    });
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsSelectTranslationsPanel.open,
      {
        expectedEventCount: 2,
        expectNewFlowId: true,
        assertForMostRecentEvent: {
          document_language: "fr",
          from_language: "fr",
          to_language: "en",
          top_preferred_language: "en",
          text_source: "selection",
        },
      }
    );
    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 1],
        ["select", 3],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 4,
        assertForMostRecentEvent: {
          document_language: "fr",
          from_language: "fr",
          to_language: "en",
          top_preferred_language: "en",
          request_target: "select",
          auto_translate: false,
          source_text_code_units:
            AppConstants.platform === "win"
              ? 1718 // With carriage returns
              : 1709, // No carriage returns
          source_text_word_count: 281,
        },
      }
    );

    await SelectTranslationsTestUtils.clickDoneButton();
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsSelectTranslationsPanel.doneButton,
      {
        expectedEventCount: 1,
      }
    );

    await FullPageTranslationsTestUtils.openPanel({
      onOpenPanel: FullPageTranslationsTestUtils.assertPanelViewRevisit,
    });
    await TestTranslationsTelemetry.assertEvent(Glean.translationsPanel.open, {
      expectedEventCount: 1,
      expectNewFlowId: true,
      assertForMostRecentEvent: {
        auto_show: false,
        view_name: "revisitView",
        opened_from: "translationsButton",
        document_language: "es",
      },
    });

    await cleanup();
  }
);
