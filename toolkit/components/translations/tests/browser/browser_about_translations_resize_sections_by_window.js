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

/**
 * This test case ensures that modifying the window width within the page's horizontal
 * orientation does not cause the text areas to resize.
 */
add_task(
  async function test_about_translations_horizontal_orientation_resizes() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "de", toLang: "en" },
          { fromLang: "en", toLang: "de" },
        ],
        autoDownloadFromRemoteSettings: true,
      }
    );

    info(
      "The text areas should expand when a large input is pasted as the source."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 1 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 1 },
          ],
          [
            AboutTranslationsTestUtils.Events.SectionHeightsChanged,
            {
              sourceSectionHeightChange: "increased",
              targetSectionHeightChange: "increased",
            },
          ],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.PageOrientationChanged],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("de");
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("en");
        await aboutTranslationsTestUtils.setSourceTextAreaValue(expandingInput);
      }
    );

    await aboutTranslationsTestUtils.assertTranslatedText({
      sourceLanguage: "de",
      targetLanguage: "en",
      sourceText: expandingInput,
    });

    info(
      "The text area height should not change when the horizontal orientation is made wider, but remains horizontal."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        unexpected: [
          AboutTranslationsTestUtils.Events.SectionHeightsChanged,
          AboutTranslationsTestUtils.Events.PageOrientationChanged,
        ],
      },
      async () => {
        await ensureWindowSize(window, 1500 * Math.SQRT1_2, 900 * Math.SQRT1_2);
      }
    );

    info(
      "The text area height should not change when the horizontal orientation is made narrower, but remains horizontal."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        unexpected: [
          AboutTranslationsTestUtils.Events.SectionHeightsChanged,
          AboutTranslationsTestUtils.Events.PageOrientationChanged,
        ],
      },
      async () => {
        await ensureWindowSize(window, 1600 * Math.SQRT1_2, 900 * Math.SQRT1_2);
      }
    );

    await cleanup();
  }
);

/**
 * This test case ensures that source and target sections resize independently
 * while in vertical orientation.
 */
add_task(
  async function test_about_translations_vertical_orientation_resizes_by_input() {
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

    info(
      "The text-area heights should not change when transitioning to a vertical orientation with no content."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.PageOrientationChanged,
            { orientation: "vertical" },
          ],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.SectionHeightsChanged],
      },
      async () => {
        await ensureWindowSize(window, 1000 * Math.SQRT1_2, 900 * Math.SQRT1_2);
      }
    );

    info(
      "The source text area should expand with input while the target remains unchanged."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 1 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [
            AboutTranslationsTestUtils.Events.SectionHeightsChanged,
            {
              sourceSectionHeightChange: "increased",
              targetSectionHeightChange: "unchanged",
            },
          ],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.PageOrientationChanged],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("de");
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("en");
        await aboutTranslationsTestUtils.setSourceTextAreaValue(
          longExpandingInput
        );
      }
    );

    info(
      "The target text area should expand with output while the source remains unchanged."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 1 },
          ],
          [
            AboutTranslationsTestUtils.Events.SectionHeightsChanged,
            {
              sourceSectionHeightChange: "unchanged",
              targetSectionHeightChange: "increased",
            },
          ],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.PageOrientationChanged],
      },
      async () => {
        await aboutTranslationsTestUtils.resolveDownloads(1);
      }
    );

    await aboutTranslationsTestUtils.assertTranslatedText({
      sourceLanguage: "de",
      targetLanguage: "en",
      sourceText: longExpandingInput,
    });

    await cleanup();
  }
);

/**
 * This test case ensures that transitioning the page between its vertical and horizontal orientations via modifying
 * the window width may cause the text areas to resize, and that modifying the window width within the page's vertical
 * orientation may cause the text areas to resize.
 */
add_task(
  async function test_about_translations_vertical_orientation_resizes_by_window() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "de", toLang: "en" },
          { fromLang: "en", toLang: "de" },
        ],
        autoDownloadFromRemoteSettings: true,
      }
    );

    info(
      "The text-area heights should not change when transitioning to a vertical orientation with no content."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.PageOrientationChanged,
            { orientation: "vertical" },
          ],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.SectionHeightsChanged],
      },
      async () => {
        await ensureWindowSize(window, 1000 * Math.SQRT1_2, 900 * Math.SQRT1_2);
      }
    );

    info(
      "The text areas should expand when a large input is pasted as the source."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 1 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 1 },
          ],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.PageOrientationChanged],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("de");
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("en");
        await aboutTranslationsTestUtils.setSourceTextAreaValue(expandingInput);
      }
    );

    await aboutTranslationsTestUtils.assertTranslatedText({
      sourceLanguage: "de",
      targetLanguage: "en",
      sourceText: expandingInput,
    });

    info(
      "The text-area heights should increase when making the vertical orientation narrower."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.SectionHeightsChanged,
            {
              sourceSectionHeightChange: "increased",
              targetSectionHeightChange: "increased",
            },
          ],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.PageOrientationChanged],
      },
      async () => {
        await ensureWindowSize(window, 480 * Math.SQRT1_2, 900 * Math.SQRT1_2);
      }
    );

    info(
      "The text-area heights should decrease when making the vertical orientation wider."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.SectionHeightsChanged,
            {
              sourceSectionHeightChange: "decreased",
              targetSectionHeightChange: "decreased",
            },
          ],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.PageOrientationChanged],
      },
      async () => {
        await ensureWindowSize(window, 1000 * Math.SQRT1_2, 900 * Math.SQRT1_2);
      }
    );

    info(
      "The text-area heights should increase when transitioning from vertical to horizontal orientation with content."
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.PageOrientationChanged,
            { orientation: "horizontal" },
          ],
          [
            AboutTranslationsTestUtils.Events.SectionHeightsChanged,
            {
              sourceSectionHeightChange: "increased",
              targetSectionHeightChange: "increased",
            },
          ],
        ],
      },
      async () => {
        await ensureWindowSize(window, 1600 * Math.SQRT1_2, 900 * Math.SQRT1_2);
      }
    );

    await cleanup();
  }
);
