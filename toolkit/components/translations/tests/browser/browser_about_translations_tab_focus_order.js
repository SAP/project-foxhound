/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const SOURCE_TEXT = "Hello focus order";
const DETECTED_UNSUPPORTED_TEXT = "Hola, ¿cómo estás?";
const TRANSLATION_ERROR_SOURCE_TEXT = "This is a test.";

const DEFAULT_FOCUS_ORDER = [
  "learnMoreLink",
  "sourceLanguageSelector",
  "targetLanguageSelector",
  "sourceSectionTextArea",
  "targetSectionTextArea",
];

const TRANSLATED_FOCUS_ORDER = [
  "learnMoreLink",
  "sourceLanguageSelector",
  "swapLanguagesButton",
  "targetLanguageSelector",
  "sourceSectionTextArea",
  "targetSectionTextArea",
  "copyButton",
];

const DETECTED_LANGUAGE_UNSUPPORTED_FOCUS_ORDER = [
  "learnMoreLink",
  "sourceLanguageSelector",
  "targetLanguageSelector",
  "detectedLanguageUnsupportedLearnMoreLink",
  "sourceSectionTextArea",
  "targetSectionTextArea",
];

const TRANSLATION_ERROR_FOCUS_ORDER = [
  "learnMoreLink",
  "sourceLanguageSelector",
  "targetLanguageSelector",
  "sourceSectionTextArea",
  "translationErrorButton",
];

const LANGUAGE_LOAD_ERROR_FOCUS_ORDER = [
  "learnMoreLink",
  "languageLoadErrorButton",
];

const FEATURE_BLOCKED_FOCUS_ORDER = ["learnMoreLink", "unblockFeatureButton"];
const STANDALONE_MESSAGE_FOCUS_ORDER = ["learnMoreLink"];

async function assertSuccessfulTranslationFocusOrder(
  aboutTranslationsTestUtils
) {
  await aboutTranslationsTestUtils.assertSwapLanguagesButton({
    enabled: false,
  });
  await aboutTranslationsTestUtils.assertSourceClearButton({
    visible: false,
  });
  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: false,
  });
  await aboutTranslationsTestUtils.assertTabFocusOrder(DEFAULT_FOCUS_ORDER);

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
      await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");
    }
  );

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.SourceTextClearButtonShown],
        [
          AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
          { sourceText: SOURCE_TEXT },
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
        [AboutTranslationsTestUtils.Events.CopyButtonEnabled],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceTextAreaValue(SOURCE_TEXT);
      await aboutTranslationsTestUtils.resolveDownloads(1);
    }
  );

  await aboutTranslationsTestUtils.assertSourceClearButton({
    visible: true,
  });
  await aboutTranslationsTestUtils.assertSwapLanguagesButton({
    enabled: true,
  });
  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: true,
  });
  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "en",
    targetLanguage: "fr",
    sourceText: SOURCE_TEXT,
  });
  await aboutTranslationsTestUtils.assertTabFocusOrder(TRANSLATED_FOCUS_ORDER);
}

async function showDetectedLanguageUnsupportedMessage(
  aboutTranslationsTestUtils
) {
  await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("detect");

  const detectedLanguagePromise = aboutTranslationsTestUtils.waitForEvent(
    AboutTranslationsTestUtils.Events.DetectedLanguageUpdated
  );

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.ClearTargetText],
        [AboutTranslationsTestUtils.Events.SourceTextClearButtonShown],
        [
          AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
          { sourceText: DETECTED_UNSUPPORTED_TEXT },
        ],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceTextAreaValue(
        DETECTED_UNSUPPORTED_TEXT
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
  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    detectedLanguage,
  });
  await aboutTranslationsTestUtils.assertSourceClearButton({
    visible: true,
  });
}

async function showTranslationErrorMessage(aboutTranslationsTestUtils) {
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
  await aboutTranslationsTestUtils.assertTranslationErrorMessage({
    visible: true,
    targetTextAreaVisible: false,
    retryButtonEnabled: true,
    hasErrorClass: true,
  });
  await aboutTranslationsTestUtils.assertSwapLanguagesButton({
    enabled: false,
  });
  await aboutTranslationsTestUtils.assertSourceClearButton({
    visible: true,
  });
}

add_task(async function test_about_translations_primary_focus_order() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs: LANGUAGE_PAIRS,
    autoDownloadFromRemoteSettings: false,
  });

  try {
    await assertSuccessfulTranslationFocusOrder(aboutTranslationsTestUtils);
  } finally {
    await cleanup();
  }
});

add_task(
  async function test_about_translations_detected_language_unsupported_focus_order() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: LANGUAGE_PAIRS_WITHOUT_SPANISH,
        autoDownloadFromRemoteSettings: false,
      }
    );

    try {
      await showDetectedLanguageUnsupportedMessage(aboutTranslationsTestUtils);
      await aboutTranslationsTestUtils.assertTabFocusOrder(
        DETECTED_LANGUAGE_UNSUPPORTED_FOCUS_ORDER
      );
    } finally {
      await cleanup();
    }
  }
);

add_task(
  async function test_about_translations_translation_error_focus_order() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: LANGUAGE_PAIRS,
        autoDownloadFromRemoteSettings: false,
      }
    );

    try {
      await showTranslationErrorMessage(aboutTranslationsTestUtils);
      await aboutTranslationsTestUtils.assertTabFocusOrder(
        TRANSLATION_ERROR_FOCUS_ORDER
      );
    } finally {
      await cleanup();
    }
  }
);

add_task(
  async function test_about_translations_language_load_error_focus_order() {
    const realGetSupportedLanguages = TranslationsParent.getSupportedLanguages;
    let cleanup;

    TranslationsParent.getSupportedLanguages = () => {
      throw new Error(
        "Simulating getSupportedLanguagesError() for focus-order testing."
      );
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
      await opened.aboutTranslationsTestUtils.assertTabFocusOrder(
        LANGUAGE_LOAD_ERROR_FOCUS_ORDER
      );
    } finally {
      if (cleanup) {
        await cleanup();
      }
      TranslationsParent.getSupportedLanguages = realGetSupportedLanguages;
    }
  }
);

add_task(async function test_about_translations_unsupported_info_focus_order() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    autoDownloadFromRemoteSettings: true,
    prefs: [["browser.translations.simulateUnsupportedEngine", true]],
  });

  try {
    await aboutTranslationsTestUtils.assertIsVisible(
      aboutTranslationsStandaloneMessageVisibilityExpectations({
        unsupportedInfoMessage: true,
      })
    );
    await aboutTranslationsTestUtils.assertTabFocusOrder(
      STANDALONE_MESSAGE_FOCUS_ORDER
    );
  } finally {
    await cleanup();
  }
});

add_task(async function test_about_translations_policy_disabled_focus_order() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    featureEnabled: false,
    lockEnabledState: true,
    autoDownloadFromRemoteSettings: true,
  });

  try {
    await aboutTranslationsTestUtils.assertIsVisible(
      aboutTranslationsStandaloneMessageVisibilityExpectations({
        policyDisabledInfoMessage: true,
      })
    );
    await aboutTranslationsTestUtils.assertTabFocusOrder(
      STANDALONE_MESSAGE_FOCUS_ORDER
    );
  } finally {
    await cleanup();
  }
});

add_task(async function test_about_translations_feature_blocked_focus_order() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    featureEnabled: false,
    autoDownloadFromRemoteSettings: true,
  });

  try {
    await aboutTranslationsTestUtils.assertIsVisible(
      aboutTranslationsVisibilityExpectations({
        featureBlockedInfoMessage: true,
      })
    );
    await aboutTranslationsTestUtils.assertTabFocusOrder(
      FEATURE_BLOCKED_FOCUS_ORDER
    );
  } finally {
    await cleanup();
  }
});
