/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Run through the test cases for how auto translation and offering translations works
 * with a variety of conditions. The
 *
 * Keep this table up to date with TranslationParent's maybeOfferTranslation and
 * shouldAutoTranslate methods. When an entry is blank "-" it has no affect on the
 * outcome.
 *
 * ┌────┬──────────┬───────────┬───────────────────┬───────────────────┬─────────────────────────────┐
 * │ #  │ Has HTML │ Detection │ Detection Content │ Always Translate  │ Outcome                     │
 * │    │ Tag      │ Agrees    │ > 200 code units  │ List Contains Tag │                             │
 * ├────┼──────────┼───────────┼───────────────────┼───────────────────┼─────────────────────────────┤
 * │  1 │ TRUE     │ TRUE      │ -                 │ TRUE              │ Auto Translate Matching Tag │
 * │  2 │ TRUE     │ TRUE      │ -                 │ FALSE             │ Offer Matching Tag          │
 * │  3 │ TRUE     │ TRUE      │ -                 │ TRUE              │ Auto Translate Matching Tag │
 * │  4 │ TRUE     │ TRUE      │ -                 │ FALSE             │ Offer Matching Tag          │
 * │  5 │ TRUE     │ FALSE     │ -                 │ TRUE              │ Show Button Only            │
 * │  6 │ TRUE     │ FALSE     │ -                 │ FALSE             │ Show Button Only            │
 * │  7 │ TRUE     │ FALSE     │ -                 │ TRUE              │ Show Button Only            │
 * │  8 │ TRUE     │ FALSE     │ -                 │ FALSE             │ Show Button Only            │
 * │  9 │ FALSE    │ -         │ TRUE              │ TRUE              │ Auto Translate Detected Tag │
 * │ 10 │ FALSE    │ -         │ TRUE              │ FALSE             │ Offer Detected Tag          │
 * │ 11 │ FALSE    │ -         │ FALSE             │ TRUE              │ Show Button Only            │
 * │ 12 │ FALSE    │ -         │ FALSE             │ FALSE             │ Show Button Only            │
 * └────┴──────────┴───────────┴───────────────────┴───────────────────┴─────────────────────────────┘
 */

/**
 * Request 2x longer timeout for this test.
 * There are lot of test cases in this file, but it doesn't make sense to split them up.
 */
requestLongerTimeout(2);

/**
 * Definitions for the test cases.
 *
 * @typedef {object} Case
 * @property {string} page - The page to load.
 * @property {string} message - A message for the primary assertion.
 * @property {string} [alwaysTranslateLanguages] - Set the pref: browser.translations.alwaysTranslateLanguages
 * @property {string} [neverTranslateLanguages] - Set the pref: browser.translations.alwaysTranslateLanguages
 *
 * Outcomes, use only one:
 * @property {string} [translatePage] - The page is expected to be translated.
 * @property {string} [offerTranslation] - The page offers a translation in this language.
 * @property {boolean} [buttonShown] - The button was shown to offer a translation.
 */

/**
 * @type {Case[]}
 */
const cases = [
  // HTML tag and (confident) detection agree.
  {
    // Case 1 - Spanish is set to auto translate.
    page: SPANISH_PAGE_URL,
    alwaysTranslateLanguages: "es",
    translatePage: "es",
    message:
      "Auto-translate since the declared language and identified language agree",
  },
  {
    // Case 2 - Nothing is set to auto translate.
    page: SPANISH_PAGE_URL,
    offerTranslation: "es",
    message:
      "The declared language and identified language agree, offer a translation",
  },
  // HTML tag and (low-confidence) detection agree.
  {
    // Case 3 - Spanish is set to auto translate.
    page: SPANISH_PAGE_SHORT_URL,
    alwaysTranslateLanguages: "es",
    translatePage: "es",
    message:
      "The declared language and identified language agree, offer a translation even " +
      "though the page has a short amount of content.",
  },
  {
    // Case 4 - Nothing is set to auto translate.
    page: SPANISH_PAGE_SHORT_URL,
    offerTranslation: "es",
    message:
      "The declared language and identified language agree, offer a translation",
  },
  // HTML tag and (confident) detection disagree.
  {
    // Case 5 - Spanish is set to auto translate.
    page: SPANISH_PAGE_MISMATCH_URL,
    alwaysTranslateLanguages: "es",
    buttonShown: true,
    message:
      "The declared and (confident) detected language disagree. Only show the button, do not auto-translate.",
  },
  {
    // Case 6 - Nothing is set to auto translate.
    page: SPANISH_PAGE_MISMATCH_URL,
    buttonShown: true,
    message:
      "The declared and (confident) detected language disagree. Only show the button, do not offer.",
  },
  // HTML tag and (low-confidence) detection disagree.
  {
    // Case 7 - Spanish is set to auto translate.
    page: SPANISH_PAGE_MISMATCH_SHORT_URL,
    alwaysTranslateLanguages: "es",
    buttonShown: true,
    message:
      "The declared and (low-confidence) detected language disagree. Only show the button, do not auto-translate.",
  },
  {
    // Case 8 - Nothing is set to auto translate.
    page: SPANISH_PAGE_MISMATCH_SHORT_URL,
    buttonShown: true,
    message:
      "The declared and (low-confidence) detected language disagree. Only show the button, do not offer.",
  },
  // Undeclared language and (high-confidence) detection.
  {
    // Case 9 - Spanish is set to auto translate.
    page: SPANISH_PAGE_UNDECLARED_URL,
    alwaysTranslateLanguages: "es,fr",
    translatePage: "es",
    message:
      "There is no declared language, but there is high confidence in the detected language, so go ahead and auto-translate.",
  },
  {
    // Case 10 - Nothing is set to auto translate.
    page: SPANISH_PAGE_UNDECLARED_URL,
    offerTranslation: "es",
    message:
      "There is no declared language, but there is high confidence in the detected language, so go ahead and offer.",
  },
  // Undeclared language and (low-confidence) detection.
  {
    // Case 11 - Spanish is set to auto translate.
    page: SPANISH_PAGE_MISMATCH_SHORT_URL,
    alwaysTranslateLanguages: "es",
    buttonShown: true,
    message:
      "A language was detected, but it was so low confidence only show the button.",
  },
  {
    // Case 12 - Nothing is set to auto translate.
    page: SPANISH_PAGE_UNDECLARED_SHORT_URL,
    buttonShown: true,
    message:
      "A language was detected, but it was so low confidence only show the button.",
  },
];

add_task(async function test_language_identification_behavior() {
  for (const [caseNo, testCase] of Object.entries(cases)) {
    const {
      page,
      message,
      alwaysTranslateLanguages,
      neverTranslateLanguages,
      translatePage,
      offerTranslation,
      buttonShown,
    } = testCase;
    info(`Testing Case ${Number(caseNo) + 1}`);
    TranslationsParent.testAutomaticPopup = true;

    // Handle this manually instead of using FullPageTranslationsTestUtils.waitForPanelPopupEvent
    // as we may not actually get a popupshown event and this leads to an error on test shutdown:
    // "popupshown listener on #full-page-translations-panel not removed before the end of test"
    let wasPopupShown = false;
    window.FullPageTranslationsPanel.elements; // De-lazify the panel.
    const { promise: popupShown, resolve } = Promise.withResolvers();
    const panel = window.document.getElementById(
      "full-page-translations-panel"
    );
    function handlePopupShown() {
      wasPopupShown = true;
      panel.removeEventListener("popupshown", handlePopupShown);
      resolve();
    }
    panel.addEventListener("popupshown", handlePopupShown);

    const { cleanup, runInPage, win } = await loadTestPage({
      page,
      languagePairs: LANGUAGE_PAIRS,
      autoDownloadFromRemoteSettings: true,
      contentEagerMode: true,
      prefs: [
        [
          "browser.translations.alwaysTranslateLanguages",
          alwaysTranslateLanguages,
        ],
        [
          "browser.translations.neverTranslateLanguages",
          neverTranslateLanguages,
        ],
      ],
    });

    let outcomes = 0;
    if (buttonShown) {
      outcomes++;
    }
    if (offerTranslation) {
      outcomes++;
    }
    if (translatePage) {
      outcomes++;
    }
    if (outcomes !== 1) {
      throw new Error("Expected only 1 main outcome.");
    }

    if (buttonShown || offerTranslation || translatePage) {
      await FullPageTranslationsTestUtils.assertTranslationsButton(
        {
          button: true,
          circleArrows: false,
          locale: translatePage,
          icon: true,
        },
        offerTranslation ? "The translation button is visible" : message
      );
    } else {
      await FullPageTranslationsTestUtils.assertTranslationsButton(
        { button: false },
        "The translations button is not visible."
      );
    }

    if (translatePage) {
      await FullPageTranslationsTestUtils.assertAllPageContentIsTranslated({
        fromLanguage: translatePage,
        toLanguage: "en",
        runInPage,
        message,
      });
      await FullPageTranslationsTestUtils.assertPageH1TitleIsTranslated({
        fromLanguage: "es",
        toLanguage: "en",
        runInPage,
        message:
          "The page's H1's title should be translated because it intersects with the viewport.",
      });

      if (
        page === SPANISH_PAGE_SHORT_URL ||
        page === SPANISH_PAGE_MISMATCH_SHORT_URL
      ) {
        await FullPageTranslationsTestUtils.assertPageFinalParagraphTitleIsTranslated(
          {
            fromLanguage: "es",
            toLanguage: "en",
            runInPage,
            message:
              "The page's final paragraph's title should be translated because it intersects with the viewport.",
          }
        );
      } else {
        await FullPageTranslationsTestUtils.assertPageFinalParagraphTitleIsNotTranslated(
          {
            runInPage,
            message:
              "Attribute translations are always lazy based on intersection, so the final paragraph's title should remain untranslated.",
          }
        );
      }
    } else {
      await FullPageTranslationsTestUtils.assertPageIsNotTranslated(
        runInPage,
        message
      );
    }

    if (offerTranslation) {
      await popupShown;
      ok(wasPopupShown, message);
      FullPageTranslationsTestUtils.assertSelectedFromLanguage({
        win,
        langTag: offerTranslation,
      });
      FullPageTranslationsTestUtils.assertSelectedToLanguage({
        win,
        langTag: "en",
      });
    } else {
      is(wasPopupShown, false, "A translation was not offered");
    }

    TranslationsParent.testAutomaticPopup = false;
    panel.removeEventListener("popupshown", handlePopupShown);
    await cleanup();
  }
});

/**
 * This test case tests the behavior when the page has no declared language
 * tag and the detected language is not supported by Translations.
 */
add_task(async function test_detected_language_unsupported() {
  info("Testing unsupported detected language with no declared language");
  TranslationsParent.testAutomaticPopup = true;

  let wasPopupShown = false;
  window.FullPageTranslationsPanel.elements; // De-lazify the panel.

  const { resolve } = Promise.withResolvers();
  const panel = window.document.getElementById("full-page-translations-panel");

  function handlePopupShown() {
    wasPopupShown = true;
    panel.removeEventListener("popupshown", handlePopupShown);
    resolve();
  }
  panel.addEventListener("popupshown", handlePopupShown);

  const { cleanup, runInPage } = await loadTestPage({
    page: SPANISH_PAGE_UNDECLARED_URL,
    // Deliberately omit Spanish so that it is not supported.
    languagePairs: [
      { fromLang: "en", toLang: "fr" },
      { fromLang: "fr", toLang: "en" },
      { fromLang: "en", toLang: "uk" },
      { fromLang: "uk", toLang: "en" },
    ],
    autoDownloadFromRemoteSettings: true,
    contentEagerMode: true,
  });

  await FullPageTranslationsTestUtils.assertTranslationsButton(
    { button: false },
    "The translations button is not visible when the detected language is unsupported."
  );

  await FullPageTranslationsTestUtils.assertPageIsNotTranslated(
    runInPage,
    "No translation should occur when the detected language is unsupported."
  );

  is(
    wasPopupShown,
    false,
    "A translation was not offered for an unsupported detected language."
  );

  TranslationsParent.testAutomaticPopup = false;
  await cleanup();
});

add_task(async function test_norwegian_bokmal_offered_for_translation() {
  TranslationsParent.testAutomaticPopup = true;

  let wasPopupShown = false;
  window.FullPageTranslationsPanel.elements; // De-lazify the panel.
  const { promise: popupShown, resolve } = Promise.withResolvers();
  const panel = window.document.getElementById("full-page-translations-panel");
  function handlePopupShown() {
    wasPopupShown = true;
    panel.removeEventListener("popupshown", handlePopupShown);
    resolve();
  }
  panel.addEventListener("popupshown", handlePopupShown);

  const html = String.raw;
  const { cleanup, win } = await loadTestPage({
    html: html`
      <!DOCTYPE html>
      <html lang="nb">
        <head>
          <meta charset="utf-8" />
          <title>Translations Test</title>
          <style>
            div {
              margin: 10px auto;
              width: 300px;
            }
            p {
              margin: 47px 0;
              font-size: 21px;
              line-height: 2;
            }
          </style>
        </head>
        <body>
          <div>
            <header lang="en">
              The following is an excerpt from Norsk literaturhistorie for
              gymnasiet, lærerskoler og høiere folkeskoler, which is in the
              public domain
            </header>
            <p>
              Som nævnt var det mest i Bergen at vi merker noget til norsk
              åndsliv i den tid.
            </p>
            <p>
              Bergen var den største by i Norden, og den by i Norge som stod i
              livligst samkvem med utlandet.
            </p>
            <p>
              Her måtte de nye idéer derfor først vise sig. Herfra gik den
              "første literære fornyelse" ut.
            </p>
            <p>
              Bispen Geble Pederssøn i Bergen var vor første humanist. Han
              interesserte sig især for skolen i sin by.
            </p>
            <p>
              I Bergen var det også at interessen for Norges gamle historie
              holdt sig. Flere arbeidet med oversættelser av de gamle sagaer.
            </p>
            <p>
              Blandt dem skal vi især merke lagmand Mattis Størssøn († 1569),
              som gav et utdrag av de gamle kongesagaer.
            </p>
            <p>
              Han skrev også et klageskrift mot de tyske kjøbmænd. Han var en
              anset mand og regjeringen brukte ham til flere vigtige hverv.
            </p>
            <p>
              Mest kjendt av Bergens-humanistene var allikevel *Absalon
              Pederssøn
            </p>
            <p>Beyer*, Geble Pederssøns elev og fostersøn. Han studerte ved</p>
            <p>
              universitetene i Kjøbenhavn og Wittenberg, hvor han tok
              magistergraden.
            </p>
            <p>
              Siden blev han lektor ved stiftsskolen i Bergen og til slut
              slotsprest.
            </p>
            <p>Han døde i 1574.</p>
            <p>
              I sine 14 sidste leve-år førte Absalon Pederssøn en dagbok, som er
            </p>
            <p>
              bevart under navnet _Bergens kapitelsbog_. Han fortæller her de
              mindste
            </p>
            <p>småting, som f. eks. at et par elever fra stiftsskolen en</p>
            <p>
              søndagseftermiddag går i vinkjelderen istedenfor i kirken. Men
            </p>
            <p>
              småtingene gjør netop boken til et levende og egte kulturbillede
              fra
            </p>
            <p>
              Bergen i den tid. Desuten har Absalon Pederssøn skrevet en Norges
            </p>
            <p>beskrivelse.</p>
            <p>
              Den sidste bok er merkelig ved at forfatteren viser sterk
              nationalfølelse og med styrke uttaler sin sorg over Norges
              tilbakegang og sit haap om at landet igjen maa reise sig av
              dvalen. Han siger om Norge i gamle dager, at da „var hun udi agt
              og ære; da havde hun en guldkrone paa sit hoved og en forgyldt
              løve med en blodøks; — — da udbredte Norige sin magt og vinger,“
              og at „Noriges rige haver standet udi sin blomster og været et
              sterkt og mandigt rige blandt andre kongeriger; men,“ siger han
              senere: „Fra den dag Norige kom under Danmark og miste sin egen
              herre og konning, saa haver det og mist sin manddoms styrke og
              magt og begynder at blive gammel og graahærd og saa tung, at det
              ei kan bære sin egen uld. — — Idet at hun er vorden træt og gammel
              af seilas og formaar ikke mere at drage udenlands, haver hun i sin
              rasendes alderdom, i hvilken hun bliver til barn paa det ny igjen,
              tilbudet en stor hob af hansestæderne, at de maa ikke alene seile
              her i riget, men ogsaa garpe[15] plante sig fast blandt disse
              klipper, hvilke som haver faaet det norske sand i deres sko, at de
              vil ikke gjerne herud igjen, men vil dø derpaa, at bergefisk og
              norsk smør er udi deres hansestæder en god ret.“ Han mener om
              Norge, at „hun gaar paa krykker og stylter og vil snart falde
              omkuld. — — Dog kunde vel Norige engang vaagne op af søvne, dersom
              hun finge en regenter over sig; thi hun er ikke aldeles saa
              forfalden og forsvækket, at hun jo kunde komme til sin magt igjen.
              — — Udi folket er endnu noget af den gamle dyd, manddom og
              styrke.“
            </p>
          </div>
        </body>
      </html>
    `,
    languagePairs: [
      { fromLang: "nb", toLang: "en" },
      { fromLang: "en", toLang: "nb" },
    ],
  });

  await popupShown;
  ok(wasPopupShown, "Translation offered");
  FullPageTranslationsTestUtils.assertSelectedFromLanguage({
    win,
    langTag: "nb",
  });
  FullPageTranslationsTestUtils.assertSelectedToLanguage({
    win,
    langTag: "en",
  });

  TranslationsParent.testAutomaticPopup = false;
  panel.removeEventListener("popupshown", handlePopupShown);
  await cleanup();
});
