/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BUTTON_KEYBOARD_ACTIONS = ["enter", "space"];

const COPY_SOURCE_TEXT = "Hello clipboard";
const TRANSLATION_ERROR_SOURCE_TEXT = "This is a test.";

add_task(
  async function test_about_translations_accessible_invocation_copy_button() {
    for (const action of BUTTON_KEYBOARD_ACTIONS) {
      info(`Invoking copy button with "${action}".`);
      const { aboutTranslationsTestUtils, cleanup } =
        await openAboutTranslations({
          languagePairs: LANGUAGE_PAIRS,
          autoDownloadFromRemoteSettings: true,
          requireManualCopyButtonReset: true,
        });

      try {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");

        await aboutTranslationsTestUtils.assertEvents(
          {
            expected: [
              [
                AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
                { sourceText: COPY_SOURCE_TEXT },
              ],
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
          },
          async () => {
            await aboutTranslationsTestUtils.setSourceTextAreaValue(
              COPY_SOURCE_TEXT
            );
          }
        );

        await aboutTranslationsTestUtils.assertCopyButton({
          enabled: true,
          copied: false,
        });

        await aboutTranslationsTestUtils.assertEvents(
          {
            expected: [
              [AboutTranslationsTestUtils.Events.CopyButtonShowCopied],
            ],
          },
          async () => {
            await aboutTranslationsTestUtils.invokeCopyButton({ action });
          }
        );

        await aboutTranslationsTestUtils.assertCopyButton({
          enabled: true,
          copied: true,
        });
      } finally {
        await cleanup();
      }
    }
  }
);

add_task(
  async function test_about_translations_accessible_invocation_swap_languages_button() {
    for (const action of BUTTON_KEYBOARD_ACTIONS) {
      info(`Invoking swap languages button with "${action}".`);
      const { aboutTranslationsTestUtils, cleanup } =
        await openAboutTranslations({
          languagePairs: LANGUAGE_PAIRS,
        });

      try {
        await aboutTranslationsTestUtils.assertEvents(
          {
            expected: [
              [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
            ],
          },
          async () => {
            await aboutTranslationsTestUtils.setSourceLanguageSelectorValue(
              "en"
            );
            await aboutTranslationsTestUtils.setTargetLanguageSelectorValue(
              "uk"
            );
          }
        );

        await aboutTranslationsTestUtils.assertEvents(
          {
            expected: [
              [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
              [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
            ],
            unexpected: [
              AboutTranslationsTestUtils.Events.TranslationRequested,
              AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder,
            ],
          },
          async () => {
            await aboutTranslationsTestUtils.invokeSwapLanguagesButton({
              action,
            });
          }
        );

        await aboutTranslationsTestUtils.assertSourceLanguageSelector({
          value: "uk",
        });
        await aboutTranslationsTestUtils.assertTargetLanguageSelector({
          value: "en",
        });
      } finally {
        await cleanup();
      }
    }
  }
);

add_task(
  async function test_about_translations_accessible_invocation_translation_error_button() {
    for (const action of BUTTON_KEYBOARD_ACTIONS) {
      info(`Invoking translation error retry button with "${action}".`);
      const { aboutTranslationsTestUtils, cleanup } =
        await openAboutTranslations({
          languagePairs: LANGUAGE_PAIRS,
          autoDownloadFromRemoteSettings: false,
        });

      try {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");

        await aboutTranslationsTestUtils.assertEvents(
          {
            expected: [
              [
                AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
                { sourceText: TRANSLATION_ERROR_SOURCE_TEXT },
              ],
              [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
              [AboutTranslationsTestUtils.Events.ClearTargetText],
            ],
          },
          async () => {
            await aboutTranslationsTestUtils.setSourceTextAreaValue(
              TRANSLATION_ERROR_SOURCE_TEXT
            );
            await aboutTranslationsTestUtils.rejectDownloads(1);
          }
        );

        await aboutTranslationsTestUtils.waitForTranslationErrorMessage({
          visible: true,
        });

        await aboutTranslationsTestUtils.assertEvents(
          {
            expected: [
              [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
              [AboutTranslationsTestUtils.Events.ClearTargetText],
            ],
          },
          async () => {
            await aboutTranslationsTestUtils.invokeTranslationErrorButton({
              action,
            });
            await aboutTranslationsTestUtils.rejectDownloads(1);
          }
        );

        await aboutTranslationsTestUtils.waitForTranslationErrorMessage({
          visible: true,
        });
      } finally {
        await cleanup();
      }
    }
  }
);

add_task(
  async function test_about_translations_accessible_invocation_language_load_error_button() {
    for (const action of BUTTON_KEYBOARD_ACTIONS) {
      info(`Invoking language-load error retry button with "${action}".`);
      const realGetSupportedLanguages =
        TranslationsParent.getSupportedLanguages;
      let remainingFailures = 1;
      let cleanup;

      TranslationsParent.getSupportedLanguages = () => {
        if (remainingFailures > 0) {
          remainingFailures -= 1;
          throw new Error(
            "Simulating getSupportedLanguagesError() for invocation testing."
          );
        }
        return realGetSupportedLanguages();
      };

      try {
        const opened = await openAboutTranslations({
          languagePairs: LANGUAGE_PAIRS,
        });
        cleanup = opened.cleanup;

        await opened.aboutTranslationsTestUtils.assertIsVisible(
          aboutTranslationsStandaloneMessageVisibilityExpectations({
            languageLoadErrorMessage: true,
          })
        );

        await opened.aboutTranslationsTestUtils.assertEvents(
          {
            expected: [
              [AboutTranslationsTestUtils.Events.LanguageLoadRetryStarted],
              [AboutTranslationsTestUtils.Events.LanguageLoadRetrySucceeded],
            ],
          },
          async () => {
            await opened.aboutTranslationsTestUtils.invokeLanguageLoadErrorButton(
              {
                action,
              }
            );
          }
        );

        await opened.aboutTranslationsTestUtils.assertIsVisible(
          aboutTranslationsVisibilityExpectations()
        );
      } finally {
        if (cleanup) {
          await cleanup();
        }
        TranslationsParent.getSupportedLanguages = realGetSupportedLanguages;
      }
    }
  }
);

add_task(
  async function test_about_translations_accessible_invocation_unblock_feature_button() {
    for (const action of BUTTON_KEYBOARD_ACTIONS) {
      info(`Invoking feature-blocked unblock button with "${action}".`);
      const { aboutTranslationsTestUtils, cleanup } =
        await openAboutTranslations({
          featureEnabled: false,
          autoDownloadFromRemoteSettings: true,
        });

      try {
        await aboutTranslationsTestUtils.assertIsVisible(
          aboutTranslationsVisibilityExpectations({
            featureBlockedInfoMessage: true,
          })
        );

        await aboutTranslationsTestUtils.assertEvents(
          {
            expected: [
              [
                AboutTranslationsTestUtils.Events.EnabledStateChanged,
                { enabled: true },
              ],
            ],
          },
          async () => {
            await aboutTranslationsTestUtils.invokeUnblockFeatureButton({
              action,
            });
          }
        );

        await aboutTranslationsTestUtils.assertIsVisible(
          aboutTranslationsVisibilityExpectations()
        );
      } finally {
        await cleanup();
      }
    }
  }
);
