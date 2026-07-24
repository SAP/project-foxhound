/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// The German lower-case character "ß" expands to two characters "SS" when capitalized.
// Our mock translator deterministically capitalizes text for integration tests.
const largeExpandingInput = `\
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

const halfLargeExpandingInput = `\
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß \
ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß ß`;

/**
 * This test case ensures that translating a small input, one that would not
 * cause the text content to exceed the default text-area height, does not
 * cause the text area to automatically resize.
 */
add_task(async function test_about_translations_no_resize_for_small_input() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs: [
      { fromLang: "de", toLang: "en" },
      { fromLang: "en", toLang: "de" },
    ],
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          { translationId: 1 },
        ],
        [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
      ],
      unexpected: [
        AboutTranslationsTestUtils.Events.PageOrientationChanged,
        AboutTranslationsTestUtils.Events.SectionHeightsChanged,
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("de");
      await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("en");
      await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello world");
    }
  );

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          { translationId: 1 },
        ],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.resolveDownloads(1);
    }
  );

  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "de",
    targetLanguage: "en",
    sourceText: "Hello world",
  });

  await cleanup();
});

/**
 * This test case ensures that translating a source text that is larger than the
 * default source-text-area size will cause it to resize, that producing a translated
 * output that is larger than the target-text-area will cause it to resize, and that
 * reducing the size of the source text after it has been expanded will cause it to
 * return to the default size.
 */
add_task(async function test_about_translations_resize_by_input() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs: [
      { fromLang: "de", toLang: "en" },
      { fromLang: "en", toLang: "de" },
    ],
  });

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
      await aboutTranslationsTestUtils.setSourceTextAreaValue(
        largeExpandingInput
      );
    }
  );

  info(
    "The text areas should expand again if the translated output is taller than the input."
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
            sourceSectionHeightChange: "increased",
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
    sourceText: largeExpandingInput,
  });

  info(
    "The text areas should reduce their size if the content height is reduced."
  );
  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          { translationId: 2 },
        ],
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          { translationId: 2 },
        ],
        [
          AboutTranslationsTestUtils.Events.SectionHeightsChanged,
          {
            sourceSectionHeightChange: "decreased",
            targetSectionHeightChange: "decreased",
          },
        ],
      ],
      unexpected: [
        AboutTranslationsTestUtils.Events.PageOrientationChanged,
        AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder,
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceTextAreaValue(
        halfLargeExpandingInput
      );
    }
  );

  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "de",
    targetLanguage: "en",
    sourceText: halfLargeExpandingInput,
  });

  info(
    "The text areas should reset to default height when all content is removed."
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
      unexpected: [
        AboutTranslationsTestUtils.Events.TranslationRequested,
        AboutTranslationsTestUtils.Events.PageOrientationChanged,
        AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder,
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceTextAreaValue("");
    }
  );

  await aboutTranslationsTestUtils.assertSourceTextArea({
    showsPlaceholder: true,
  });

  await aboutTranslationsTestUtils.assertTargetTextArea({
    showsPlaceholder: true,
  });

  await cleanup();
});
