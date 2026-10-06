/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// The German lower-case character "ß" expands to two characters "SS" when capitalized.
// Our mock translator deterministically capitalizes text for integration tests.
const expandingInput = `\
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß`;

const SPANISH_TEXT = "Hola, ¿cómo estás?";
const longSpanishInput = `${SPANISH_TEXT}\n`.repeat(50).trim();

/**
 * This test case ensures that section heights stay synchronized in horizontal
 * orientation while a translation error message is visible, and that only the
 * target section shrinks when switching to vertical orientation.
 */
add_task(
  async function test_about_translations_section_heights_with_error_message() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "de", toLang: "en" },
          { fromLang: "en", toLang: "de" },
        ],
        autoDownloadFromRemoteSettings: false,
      }
    );

    const longExpandingInput = expandingInput + expandingInput;

    await ensureWindowSize(window, 1600 * Math.SQRT1_2, 900 * Math.SQRT1_2);

    info(
      "The text areas should expand when a large input triggers a translation error."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: longExpandingInput },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [AboutTranslationsTestUtils.Events.ClearTargetText],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.PageOrientationChanged],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("de");
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("en");
        await aboutTranslationsTestUtils.setSourceTextAreaValue(
          longExpandingInput
        );
        await aboutTranslationsTestUtils.rejectDownloads(1);
      }
    );

    await aboutTranslationsTestUtils.waitForTranslationErrorMessage({
      visible: true,
    });

    await aboutTranslationsTestUtils.assertTranslationErrorMessage({
      visible: true,
      targetTextAreaVisible: false,
      retryButtonEnabled: true,
      hasErrorClass: true,
    });

    const {
      sourceSectionHeight: horizontalSourceHeight,
      targetSectionHeight: horizontalTargetHeight,
    } = await aboutTranslationsTestUtils.getSectionHeights();
    is(
      horizontalSourceHeight,
      horizontalTargetHeight,
      "Expected section heights to match in horizontal orientation with an error message."
    );

    info(
      "The target section should shrink when switching to vertical orientation."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.PageOrientationChanged,
            { orientation: "vertical" },
          ],
        ],
      },
      async () => {
        await ensureWindowSize(window, 1000 * Math.SQRT1_2, 900 * Math.SQRT1_2);
      }
    );

    const {
      sourceSectionHeight: verticalSourceHeight,
      targetSectionHeight: verticalTargetHeight,
    } = await aboutTranslationsTestUtils.getSectionHeights();
    Assert.less(
      verticalTargetHeight,
      horizontalTargetHeight,
      "Expected target section to shrink in vertical orientation."
    );
    Assert.greater(
      verticalSourceHeight,
      verticalTargetHeight,
      "Expected source section to remain taller than target in vertical orientation."
    );

    info(
      "The section heights should match again after returning to horizontal orientation."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.PageOrientationChanged,
            { orientation: "horizontal" },
          ],
        ],
      },
      async () => {
        await ensureWindowSize(window, 1600 * Math.SQRT1_2, 900 * Math.SQRT1_2);
      }
    );

    const {
      sourceSectionHeight: finalSourceHeight,
      targetSectionHeight: finalTargetHeight,
    } = await aboutTranslationsTestUtils.getSectionHeights();
    is(
      finalSourceHeight,
      finalTargetHeight,
      "Expected section heights to match after returning to horizontal orientation."
    );
    Assert.greater(
      finalTargetHeight,
      verticalTargetHeight,
      "Expected target section to grow when returning to horizontal orientation."
    );

    await cleanup();
  }
);

/**
 * This test case ensures that section heights stay synchronized in horizontal
 * orientation while a detected-language unsupported message is visible, and that
 * only the target section shrinks when switching to vertical orientation.
 */
add_task(
  async function test_about_translations_section_heights_with_unsupported_language_message() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: LANGUAGE_PAIRS_WITHOUT_SPANISH,
        autoDownloadFromRemoteSettings: false,
      }
    );

    await ensureWindowSize(window, 1600 * Math.SQRT1_2, 900 * Math.SQRT1_2);
    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("detect");

    const detectedLanguagePromise = aboutTranslationsTestUtils.waitForEvent(
      AboutTranslationsTestUtils.Events.DetectedLanguageUpdated
    );

    info("The text areas should expand when showing an unsupported message.");
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: longSpanishInput },
          ],
          [AboutTranslationsTestUtils.Events.ClearTargetText],
          [AboutTranslationsTestUtils.Events.SourceTextClearButtonShown],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.PageOrientationChanged],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue(
          longSpanishInput
        );
      }
    );

    const { language: detectedLanguage } = await detectedLanguagePromise;
    ok(detectedLanguage, "Expected detected language to be set.");

    await aboutTranslationsTestUtils.waitForDetectedLanguageUnsupportedMessage({
      visible: true,
    });
    await aboutTranslationsTestUtils.assertDetectedLanguageUnsupportedMessage({
      visible: true,
      sourceTextAreaVisible: true,
      targetTextAreaVisible: true,
      learnMoreSupportPage: "website-translation",
    });

    const {
      sourceSectionHeight: horizontalSourceHeight,
      targetSectionHeight: horizontalTargetHeight,
    } = await aboutTranslationsTestUtils.getSectionHeights();
    is(
      horizontalSourceHeight,
      horizontalTargetHeight,
      "Expected section heights to match in horizontal orientation with an unsupported-language message."
    );

    info(
      "The target section should shrink when switching to vertical orientation."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.PageOrientationChanged,
            { orientation: "vertical" },
          ],
        ],
      },
      async () => {
        await ensureWindowSize(window, 1000 * Math.SQRT1_2, 900 * Math.SQRT1_2);
      }
    );

    const {
      sourceSectionHeight: verticalSourceHeight,
      targetSectionHeight: verticalTargetHeight,
    } = await aboutTranslationsTestUtils.getSectionHeights();
    Assert.less(
      verticalTargetHeight,
      horizontalTargetHeight,
      "Expected target section to shrink in vertical orientation."
    );
    Assert.greater(
      verticalSourceHeight,
      verticalTargetHeight,
      "Expected source section to remain taller than target in vertical orientation."
    );

    info(
      "The section heights should match again after returning to horizontal orientation."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.PageOrientationChanged,
            { orientation: "horizontal" },
          ],
        ],
      },
      async () => {
        await ensureWindowSize(window, 1600 * Math.SQRT1_2, 900 * Math.SQRT1_2);
      }
    );

    const {
      sourceSectionHeight: finalSourceHeight,
      targetSectionHeight: finalTargetHeight,
    } = await aboutTranslationsTestUtils.getSectionHeights();
    is(
      finalSourceHeight,
      finalTargetHeight,
      "Expected section heights to match after returning to horizontal orientation."
    );
    Assert.greater(
      finalTargetHeight,
      verticalTargetHeight,
      "Expected target section to grow when returning to horizontal orientation."
    );

    await cleanup();
  }
);
