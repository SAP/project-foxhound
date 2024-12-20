/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * This test case verifies the behavior of switching the from-language to the same value
 * that is currently selected in the to-language by opening the language dropdown menu,
 * effectively stealing the to-language's value, leaving it unselected and focused.
 */
add_task(
  async function test_select_translations_panel_select_same_from_language_via_popup() {
    const { cleanup, runInPage } = await loadTestPage({
      page: SELECT_TEST_PAGE_URL,
      languagePairs: [
        // Do not include Spanish.
        { fromLang: "fr", toLang: "en" },
        { fromLang: "en", toLang: "fr" },
      ],
      prefs: [["browser.translations.select.enable", true]],
    });

    await SelectTranslationsTestUtils.openPanel(runInPage, {
      selectSpanishSection: true,
      openAtSpanishSection: true,
      expectedFromLanguage: null,
      expectedToLanguage: "en",
      onOpenPanel:
        SelectTranslationsTestUtils.assertPanelViewNoFromLangSelected,
    });

    await SelectTranslationsTestUtils.changeSelectedFromLanguage(["en"], {
      openDropdownMenu: true,
      onChangeLanguage:
        SelectTranslationsTestUtils.assertPanelViewNoFromToSelected,
    });

    await cleanup();
  }
);

/**
 * This test case verifies the behavior of switching the to-language to the same value
 * that is currently selected in the from-language by opening the language dropdown menu,
 * effectively stealing the from-language's value, leaving it unselected and focused.
 */
add_task(
  async function test_select_translations_panel_select_same_to_language_via_popup() {
    const { cleanup, runInPage } = await loadTestPage({
      page: SELECT_TEST_PAGE_URL,
      languagePairs: LANGUAGE_PAIRS,
      prefs: [["browser.translations.select.enable", true]],
    });

    await SelectTranslationsTestUtils.openPanel(runInPage, {
      selectEnglishSection: true,
      openAtEnglishSection: true,
      expectedFromLanguage: "en",
      expectedToLanguage: null,
      onOpenPanel: SelectTranslationsTestUtils.assertPanelViewNoToLangSelected,
    });

    await SelectTranslationsTestUtils.changeSelectedToLanguage(["en"], {
      openDropdownMenu: true,
      onChangeLanguage:
        SelectTranslationsTestUtils.assertPanelViewNoFromLangSelected,
    });

    await cleanup();
  }
);
