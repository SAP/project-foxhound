/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * This test case ensures that changing hash parameters in-place updates the UI.
 */
add_task(async function test_about_translations_url_hash_change_updates_ui() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs: LANGUAGE_PAIRS,
    autoDownloadFromRemoteSettings: true,
  });

  await aboutTranslationsTestUtils.loadNewPage({
    sourceLanguage: "en",
    targetLanguage: "",
    sourceText: "",
  });
  await aboutTranslationsTestUtils.assertURLMatchesUI({
    sourceLanguage: "en",
    targetLanguage: "",
    sourceText: "",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    languageTag: null,
    showsPlaceholder: true,
  });
  await aboutTranslationsTestUtils.assertTargetTextArea({
    languageTag: null,
    showsPlaceholder: true,
  });
  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
          {
            sourceLanguage: "en",
            targetLanguage: "",
            sourceText: "",
          },
        ],
      ],
      unexpected: [AboutTranslationsTestUtils.Events.TranslationRequested],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceTextAreaValue("");
    }
  );

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
          {
            sourceLanguage: "en",
            targetLanguage: "fr",
            sourceText: "Hello",
          },
        ],
        [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          ({ translationId }) => translationId === 1 || translationId === 2,
        ],
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          ({ translationId }) => translationId === 1 || translationId === 2,
        ],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.updateCurrentPageHash({
        sourceLanguage: "en",
        targetLanguage: "fr",
        sourceText: "Hello",
      });
    }
  );

  await aboutTranslationsTestUtils.assertURLMatchesUI({
    sourceLanguage: "en",
    targetLanguage: "fr",
    sourceText: "Hello",
  });
  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "en",
    targetLanguage: "fr",
    sourceText: "Hello",
  });

  await cleanup();
});

/**
 * This test case ensures that changing the current page hash to empty resets the UI.
 */
add_task(async function test_about_translations_url_empty_hash_resets_ui() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs: LANGUAGE_PAIRS,
    autoDownloadFromRemoteSettings: false,
  });

  await aboutTranslationsTestUtils.loadNewPage();
  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
          {
            sourceLanguage: "en",
            targetLanguage: "es",
            sourceText: "Hello",
          },
        ],
        [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          ({ translationId }) => translationId === 1 || translationId === 2,
        ],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.updateCurrentPageHash({
        sourceLanguage: "en",
        targetLanguage: "es",
        sourceText: "Hello",
      });
    }
  );
  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          ({ translationId }) => translationId === 1 || translationId === 2,
        ],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.resolveDownloads(1);
    }
  );
  await aboutTranslationsTestUtils.assertURLMatchesUI({
    sourceLanguage: "en",
    targetLanguage: "es",
    sourceText: "Hello",
  });
  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "en",
    targetLanguage: "es",
    sourceText: "Hello",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
          {
            sourceLanguage: "detect",
            targetLanguage: "",
            sourceText: "",
          },
        ],
      ],
      unexpected: [AboutTranslationsTestUtils.Events.TranslationRequested],
    },
    async () => {
      await aboutTranslationsTestUtils.clearCurrentPageHash();
    }
  );

  await aboutTranslationsTestUtils.assertURLMatchesUI({
    sourceLanguage: "detect",
    targetLanguage: "",
    sourceText: "",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    languageTag: null,
    showsPlaceholder: true,
  });
  await aboutTranslationsTestUtils.assertTargetTextArea({
    languageTag: null,
    showsPlaceholder: true,
  });

  await cleanup();
});

/**
 * This test case ensures that invalid hash parameters are ignored and sanitized.
 */
add_task(
  async function test_about_translations_url_hash_change_invalid_params() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: LANGUAGE_PAIRS,
        autoDownloadFromRemoteSettings: false,
      }
    );

    await aboutTranslationsTestUtils.loadNewPage();
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
            {
              sourceLanguage: "en",
              targetLanguage: "es",
              sourceText: "Hello",
            },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            ({ translationId }) => translationId === 1 || translationId === 2,
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.updateCurrentPageHash({
          sourceLanguage: "en",
          targetLanguage: "es",
          sourceText: "Hello",
        });
      }
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            ({ translationId }) => translationId === 1 || translationId === 2,
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.resolveDownloads(1);
      }
    );
    await aboutTranslationsTestUtils.assertURLMatchesUI({
      sourceLanguage: "en",
      targetLanguage: "es",
      sourceText: "Hello",
    });
    await aboutTranslationsTestUtils.assertTranslatedText({
      sourceLanguage: "en",
      targetLanguage: "es",
      sourceText: "Hello",
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
            {
              sourceLanguage: "detect",
              targetLanguage: "",
              sourceText: "",
            },
          ],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.TranslationRequested],
      },
      async () => {
        await aboutTranslationsTestUtils.updateCurrentPageHash({
          sourceLanguage: "invalid",
          targetLanguage: "invalid",
        });
      }
    );

    await aboutTranslationsTestUtils.assertURLMatchesUI({
      sourceLanguage: "detect",
      targetLanguage: "",
      sourceText: "",
    });
    await aboutTranslationsTestUtils.assertSourceTextArea({
      languageTag: null,
      showsPlaceholder: true,
    });
    await aboutTranslationsTestUtils.assertTargetTextArea({
      languageTag: null,
      showsPlaceholder: true,
    });

    await cleanup();
  }
);
