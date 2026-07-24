/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const evalMetadata = {
  owner: "Translations Team",
  name: "Full-Page Translation E2E Eval",
  description:
    "End-to-end translation quality evaluation for full-page translations.",
  test: "mochitest",
  options: {
    default: {
      manifest: "eval.toml",
      manifest_flavor: "browser-chrome",
      evaluations: {
        TranslationsBleu: { shouldAlert: false },
        TranslationsChrf: { shouldAlert: false },
        TranslationsLlmJudge: { shouldAlert: false },
      },
      perfherder: true,
    },
  },
};

const referenceText = `Guided Walk in the Valley
The forest path is quiet in the early morning and the river reflects the sky.
A red fox waits near the water and watches the trees.
Travelers carry a notebook to record the names of birds they hear.
After sunset, lanterns guide them back to the cabin.
`;

add_task(async function test_full_page_e2e_eval() {
  const { tab, cleanup } = await setupEvaluation({
    url: "https://example.com/browser/toolkit/components/ml/tests/browser_eval/example_page_es.html",
  });

  const getPageText = () => {
    return SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
      return [...content.document.querySelectorAll("article > *")]
        .map(el => el.innerText)
        .join("\n");
    });
  };

  const sourceText = await getPageText();
  Assert.ok(sourceText, "Source text was generated.");

  const articleTranslated = waitForMutations(tab.linkedBrowser, "article > *");

  await FullPageTranslationsTestUtils.assertTranslationsButton(
    { button: true, circleArrows: false, locale: false, icon: true },
    "The translations button is available."
  );

  await FullPageTranslationsTestUtils.openPanel({
    expectedFromLanguage: "es",
    expectedToLanguage: "en",
    onOpenPanel: FullPageTranslationsTestUtils.assertPanelViewIntro,
  });

  await FullPageTranslationsTestUtils.clickTranslateButton();

  await articleTranslated;

  const translatedText = await getPageText();
  Assert.ok(translatedText, "Translated text was generated.");

  Assert.notEqual(sourceText, translatedText, "The text was translated.");

  reportEvalResult({
    type: "translation",
    src: sourceText,
    trg: translatedText,
    ref: referenceText,
  });

  await cleanup();
});
