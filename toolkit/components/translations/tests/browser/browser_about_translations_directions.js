/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(
  async function test_about_translations_script_directions_with_translations() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          // English (en) is LTR and Arabic (ar) is RTL.
          { fromLang: "en", toLang: "ar" },
          { fromLang: "ar", toLang: "en" },
        ],
      }
    );

    await aboutTranslationsTestUtils.assertSourceLanguageSelector({
      value: "detect",
      options: ["detect", "ar", "en"],
    });

    await aboutTranslationsTestUtils.assertSourceTextArea({
      scriptDirection: "ltr",
      showsPlaceholder: true,
    });

    await aboutTranslationsTestUtils.assertTargetLanguageSelector({
      value: "",
      options: ["", "ar", "en"],
    });

    await aboutTranslationsTestUtils.assertTargetTextArea({
      scriptDirection: "ltr",
      showsPlaceholder: true,
    });

    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
    await aboutTranslationsTestUtils.assertSourceTextArea({
      scriptDirection: "ltr",
      showsPlaceholder: true,
    });

    await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("ar");
    await aboutTranslationsTestUtils.assertTargetTextArea({
      // Even though we've switch to "ar", it is still displaying an English placeholder.
      scriptDirection: "ltr",
      showsPlaceholder: true,
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
        unexpected: [AboutTranslationsTestUtils.Events.TranslationComplete],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello world");
      }
    );

    await aboutTranslationsTestUtils.assertTargetTextArea({
      scriptDirection: "ltr",
      value: "Translating…",
    });

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
      sourceLanguage: "en",
      targetLanguage: "ar",
      sourceText: "Hello world",
    });

    await aboutTranslationsTestUtils.assertSourceTextArea({
      scriptDirection: "ltr",
      value: "Hello world",
    });

    await aboutTranslationsTestUtils.assertTargetTextArea({
      scriptDirection: "rtl",
      value: "HELLO WORLD [en to ar]",
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 2 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.TranslationComplete],
      },
      async () => {
        info("Swap languages to Arabic source and English target");
        await aboutTranslationsTestUtils.clickSwapLanguagesButton();
        await aboutTranslationsTestUtils.assertSourceTextArea({
          // The source textarea should already be in RTL even though translation has not completed.
          scriptDirection: "rtl",
          value: "HELLO WORLD [en to ar]",
        });
        await aboutTranslationsTestUtils.assertTargetTextArea({
          // Even though the target language is RTL, the translating placeholder is still LTR.
          scriptDirection: "ltr",
          value: "Translating…",
        });
      }
    );

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 2 },
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.resolveDownloads(1);
      }
    );

    await aboutTranslationsTestUtils.assertTranslatedText({
      translationId: 2,
      sourceLanguage: "ar",
      targetLanguage: "en",
      sourceText: "HELLO WORLD [en to ar]",
    });

    await aboutTranslationsTestUtils.assertTargetTextArea({
      scriptDirection: "ltr",
      value: "HELLO WORLD [EN TO AR] [ar to en]",
    });

    await cleanup();
  }
);

add_task(
  async function test_about_translations_script_directions_placeholders_only() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          // English (en) is LTR and Arabic (ar) is RTL.
          { fromLang: "en", toLang: "ar" },
          { fromLang: "ar", toLang: "en" },
        ],
      }
    );

    await aboutTranslationsTestUtils.assertSourceLanguageSelector({
      value: "detect",
      options: ["detect", "ar", "en"],
    });

    await aboutTranslationsTestUtils.assertTargetLanguageSelector({
      value: "",
      options: ["", "ar", "en"],
    });

    await aboutTranslationsTestUtils.assertSourceTextArea({
      scriptDirection: "ltr",
      showsPlaceholder: true,
    });

    await aboutTranslationsTestUtils.assertTargetTextArea({
      scriptDirection: "ltr",
      showsPlaceholder: true,
    });

    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
    await aboutTranslationsTestUtils.assertSourceLanguageSelector({
      value: "en",
    });
    await aboutTranslationsTestUtils.assertSourceTextArea({
      scriptDirection: "ltr",
      showsPlaceholder: true,
    });

    await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("ar");
    await aboutTranslationsTestUtils.assertTargetLanguageSelector({
      value: "ar",
    });
    await aboutTranslationsTestUtils.assertTargetTextArea({
      // Even though we've switch to "ar", it is still displaying an English placeholder.
      scriptDirection: "ltr",
      showsPlaceholder: true,
    });

    await aboutTranslationsTestUtils.clickSwapLanguagesButton();

    await aboutTranslationsTestUtils.assertSourceLanguageSelector({
      value: "ar",
    });
    await aboutTranslationsTestUtils.assertSourceTextArea({
      // Even though we've switch to "ar", it is still displaying an English placeholder.
      scriptDirection: "ltr",
      showsPlaceholder: true,
    });

    await aboutTranslationsTestUtils.assertTargetLanguageSelector({
      value: "en",
    });
    await aboutTranslationsTestUtils.assertTargetTextArea({
      scriptDirection: "ltr",
      showsPlaceholder: true,
    });

    await cleanup();
  }
);
