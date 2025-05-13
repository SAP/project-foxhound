/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test the debounce behavior.
 */
add_task(async function test_about_translations_debounce() {
  const { runInPage, cleanup, resolveDownloads } = await openAboutTranslations({
    languagePairs: [
      { fromLang: "en", toLang: "fr" },
      { fromLang: "fr", toLang: "en" },
    ],
  });

  await runInPage(async ({ selectors }) => {
    const { document, window } = content;
    // Do not allow the debounce to come to completion.
    Cu.waiveXrays(window).DEBOUNCE_DELAY = 5;

    await ContentTaskUtils.waitForCondition(
      () => {
        return document.body.hasAttribute("ready");
      },
      "Waiting for the document to be ready.",
      100,
      200
    );

    /** @type {HTMLSelectElement} */
    const fromSelect = document.querySelector(selectors.fromLanguageSelect);
    /** @type {HTMLSelectElement} */
    const toSelect = document.querySelector(selectors.toLanguageSelect);
    /** @type {HTMLTextAreaElement} */
    const translationTextarea = document.querySelector(
      selectors.translationTextarea
    );
    /** @type {HTMLDivElement} */
    const translationResultsPlaceholder = document.querySelector(
      selectors.translationResultsPlaceholder
    );

    function setInput(element, value) {
      element.value = value;
      element.dispatchEvent(new Event("input"));
    }

    is(
      translationResultsPlaceholder.innerText,
      "Translation",
      "Showing default placeholder"
    );

    setInput(fromSelect, "en");
    setInput(toSelect, "fr");
    setInput(translationTextarea, "T");

    // There's a slight delay when "Translation" becomes "Translating…"
    await ContentTaskUtils.waitForCondition(
      () => translationResultsPlaceholder.innerText === "Translating…",
      "Showing translating text",
      100,
      200
    );
  });

  await resolveDownloads(1); // en -> fr

  await runInPage(async ({ selectors }) => {
    const { document, window } = content;
    // Do not allow the debounce to come to completion.
    Cu.waiveXrays(window).DEBOUNCE_DELAY = 5;

    await ContentTaskUtils.waitForCondition(
      () => {
        return document.body.hasAttribute("ready");
      },
      "Waiting for the document to be ready.",
      100,
      200
    );

    /** @type {HTMLTextAreaElement} */
    const translationTextarea = document.querySelector(
      selectors.translationTextarea
    );
    /** @type {HTMLDivElement} */
    const translationResult = document.querySelector(
      selectors.translationResult
    );
    /** @type {HTMLDivElement} */
    const translationResultsPlaceholder = document.querySelector(
      selectors.translationResultsPlaceholder
    );

    async function assertTranslationResult(translation) {
      try {
        await ContentTaskUtils.waitForCondition(
          () => translation === translationResult.innerText,
          `Waiting for: "${translation}"`,
          100,
          200
        );
      } catch (error) {
        // The result wasn't found, but the assertion below will report the error.
        console.error(error);
      }

      is(
        translation,
        translationResult.innerText,
        "The text runs through the mocked translations engine."
      );
    }
    function setInput(element, value) {
      element.value = value;
      element.dispatchEvent(new Event("input"));
    }

    info("Get the translations into a stable translationed state");

    await assertTranslationResult("T [en to fr]");

    is(
      translationResultsPlaceholder.textContent,
      "Translation",
      "Has the default placeholder as content"
    );
    is(
      translationResultsPlaceholder.innerText,
      "",
      "No longer showing any placeholder text"
    );

    info("Reset and pause the debounce state.");
    Cu.waiveXrays(window).DEBOUNCE_DELAY = 1_000_000_000;
    Cu.waiveXrays(window).DEBOUNCE_RUN_COUNT = 0;

    info("Input text which will be debounced.");
    setInput(translationTextarea, "T");
    setInput(translationTextarea, "Te");
    setInput(translationTextarea, "Tex");
    is(Cu.waiveXrays(window).DEBOUNCE_RUN_COUNT, 0, "Debounce has not run.");

    info("Allow the debounce to actually come to completion.");
    Cu.waiveXrays(window).DEBOUNCE_DELAY = 5;
    setInput(translationTextarea, "Text");

    await assertTranslationResult("TEXT [en to fr]");
    is(Cu.waiveXrays(window).DEBOUNCE_RUN_COUNT, 1, "Debounce ran once.");
  });

  await cleanup();
});
