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
 * This test case ensures that modifying the zoom level within the page's horizontal
 * orientation does not cause the text areas to resize.
 */
add_task(
  async function test_about_translations_horizontal_orientation_zoom_changes() {
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
      () => {
        FullZoom.setZoom(0.9 * Math.SQRT1_2);
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
      () => {
        FullZoom.setZoom(1.1 * Math.SQRT1_2);
      }
    );

    await cleanup();
  }
);

/**
 * This test case ensures that transitioning the page between its vertical and horizontal orientations via zoom
 * may cause the text areas to resize, and that modifying the zoom level within the page's vertical orientation
 * may cause the text areas to resize.
 */
add_task(
  async function test_about_translations_vertical_orientation_zoom_changes() {
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
      "The page orientation should change to vertical when zooming in significantly."
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
      () => {
        FullZoom.setZoom(1.5 * Math.SQRT1_2);
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
              sourceSectionHeightChange: "unchanged",
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
      () => {
        FullZoom.setZoom(4 * Math.SQRT1_2);
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
      () => {
        FullZoom.setZoom(1.5 * Math.SQRT1_2);
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
      () => {
        FullZoom.setZoom(1.0 * Math.SQRT1_2);
      }
    );

    await cleanup();
  }
);
