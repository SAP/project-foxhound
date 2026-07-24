/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_source_clear_button_shows_and_hides_with_input() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs: LANGUAGE_PAIRS,
  });

  await aboutTranslationsTestUtils.assertSourceClearButton({
    visible: false,
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.SourceTextClearButtonShown],
      ],
      unexpected: [
        AboutTranslationsTestUtils.Events.SourceTextClearButtonHidden,
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello world");
    }
  );

  await aboutTranslationsTestUtils.assertSourceClearButton({
    visible: true,
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.SourceTextClearButtonHidden],
      ],
      unexpected: [
        AboutTranslationsTestUtils.Events.SourceTextClearButtonShown,
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceTextAreaValue("");
    }
  );

  await aboutTranslationsTestUtils.assertSourceClearButton({
    visible: false,
  });

  await cleanup();
});

add_task(
  async function test_source_clear_button_remains_visible_for_whitespace_only_values() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      { languagePairs: LANGUAGE_PAIRS }
    );

    await aboutTranslationsTestUtils.assertSourceClearButton({
      visible: false,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SourceTextClearButtonShown],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue("Text");
      }
    );

    await aboutTranslationsTestUtils.assertSourceClearButton({
      visible: true,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        unexpected: [
          AboutTranslationsTestUtils.Events.SourceTextClearButtonHidden,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue("   ");
      }
    );

    await aboutTranslationsTestUtils.assertSourceClearButton({
      visible: true,
    });

    await cleanup();
  }
);
