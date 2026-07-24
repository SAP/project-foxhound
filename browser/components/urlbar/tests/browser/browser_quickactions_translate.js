/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for the translate quick action.
 */

"use strict";

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/toolkit/components/translations/tests/browser/shared-head.js",
  this
);

const assertAction = async name => {
  await BrowserTestUtils.waitForCondition(() =>
    window.document.querySelector(`.urlbarView-action-btn[data-action=${name}]`)
  );
  Assert.ok(true, `We found action "${name}"`);
};

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.quickactions.enabled", true],
      ["browser.translations.quickAction.enabled", true],
      ["browser.translations.enable", true],
      ["browser.urlbar.quickactions.timesShownOnboardingLabel", 0],
    ],
  });

  const { removeMocks } = await createAndMockRemoteSettings({
    languagePairs: [
      { fromLang: "en", toLang: "fr" },
      { fromLang: "fr", toLang: "en" },
    ],
  });

  registerCleanupFunction(async () => {
    await SpecialPowers.popPrefEnv();
    await removeMocks();
  });
});

add_task(async function test_translate_disabled() {
  info("Disable the translate quick action and ensure it is hidden");
  await SpecialPowers.pushPrefEnv({
    set: [["browser.translations.quickAction.enabled", false]],
  });

  info("Search for the translate quick action keyword");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "translate",
  });

  let hasTranslateAction = Boolean(
    window.document.querySelector(
      `.urlbarView-action-btn[data-action=translate]`
    )
  );
  Assert.ok(!hasTranslateAction, "Translate action is not shown when disabled");

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_translate_ai_feature_toggle_from_disabled() {
  info("Start from disabled and ensure the translate quick action is hidden");
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.ai.control.default", "blocked"],
      ["browser.ai.control.translations", "blocked"],
      ["browser.translations.enable", false],
    ],
  });

  await TranslationsParent.AIFeature.disable();

  info("Search for the translate quick action keyword");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "translate",
  });

  let hasTranslateAction = Boolean(
    window.document.querySelector(
      `.urlbarView-action-btn[data-action=translate]`
    )
  );
  Assert.ok(
    !hasTranslateAction,
    "Translate action is not shown when the AI feature is disabled"
  );

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });

  await TranslationsParent.AIFeature.enable();

  info("Search for the translate quick action keyword after enable");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "translate",
  });

  await assertAction("translate");

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });

  await TranslationsParent.AIFeature.disable();

  info("Search for the translate quick action keyword after disable again");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "translate",
  });

  hasTranslateAction = Boolean(
    window.document.querySelector(
      `.urlbarView-action-btn[data-action=translate]`
    )
  );
  Assert.ok(
    !hasTranslateAction,
    "Translate action is not shown when the AI feature is disabled"
  );

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_translate_ai_feature_toggle_from_enabled() {
  info("Start from enabled and ensure the translate quick action is visible");
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.ai.control.default", "available"],
      ["browser.ai.control.translations", "default"],
      ["browser.translations.enable", true],
    ],
  });

  await TranslationsParent.AIFeature.enable();

  info("Search for the translate quick action keyword");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "translate",
  });

  await assertAction("translate");

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });

  await TranslationsParent.AIFeature.disable();

  info("Search for the translate quick action keyword after disable");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "translate",
  });

  let hasTranslateAction = Boolean(
    window.document.querySelector(
      `.urlbarView-action-btn[data-action=translate]`
    )
  );
  Assert.ok(
    !hasTranslateAction,
    "Translate action is not shown when the AI feature is disabled"
  );

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });

  await TranslationsParent.AIFeature.enable();

  info("Search for the translate quick action keyword after enable");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "translate",
  });

  await assertAction("translate");

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_translate_keyword() {
  info("Search with the primary translate keyword");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "translate",
  });

  await assertAction("translate");

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });
});

add_task(async function test_partial_match() {
  info("Search with a partial translate prefix");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "transl",
  });

  await assertAction("translate");

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });
});

add_task(async function test_translate_opens_about_translations() {
  info("Open a new tab for the translate action result");
  const translateTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  info("Search for the translate quick action");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "translate",
  });

  await assertAction("translate");

  EventUtils.synthesizeKey("KEY_Tab", {}, window);
  EventUtils.synthesizeKey("KEY_Enter", {}, window);

  info("Wait for about:translations to load and verify");
  await BrowserTestUtils.browserLoaded(translateTab.linkedBrowser, false, url =>
    url.startsWith("about:translations")
  );

  Assert.ok(
    translateTab.linkedBrowser.currentURI.spec.startsWith("about:translations"),
    "about:translations page is loaded"
  );

  if (UrlbarTestUtils.isPopupOpen(window)) {
    await UrlbarTestUtils.promisePopupClose(window, () => {
      EventUtils.synthesizeKey("KEY_Escape");
    });
  }
  BrowserTestUtils.removeTab(translateTab);
});

add_task(async function test_translate_includes_target_language() {
  info("Open a new tab for the translate action result");
  const translateTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  info("Search for the translate quick action");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "translate",
  });

  await assertAction("translate");

  EventUtils.synthesizeKey("KEY_Tab", {}, window);
  EventUtils.synthesizeKey("KEY_Enter", {}, window);

  info("Wait for about:translations to load and check query params");
  await BrowserTestUtils.browserLoaded(translateTab.linkedBrowser, false, url =>
    url.startsWith("about:translations")
  );

  const url = new URL(translateTab.linkedBrowser.currentURI.spec);
  const hashParams = new URLSearchParams(url.hash.substring(1));
  const targetLang = hashParams.get("trg");

  Assert.equal(targetLang, "en", "Target language parameter is set to 'en'");

  if (UrlbarTestUtils.isPopupOpen(window)) {
    await UrlbarTestUtils.promisePopupClose(window, () => {
      EventUtils.synthesizeKey("KEY_Escape");
    });
  }
  BrowserTestUtils.removeTab(translateTab);
});

add_task(
  async function test_translate_missing_language_does_not_append_target() {
    info("Open a new tab for the translate action result");
    const translateTab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      "about:blank"
    );

    info("Temporarily override preferred language lookup to fail once");
    let oneTimeOverrideCalled = false;
    const originalFn = TranslationsParent.getTopPreferredSupportedToLang;
    TranslationsParent.getTopPreferredSupportedToLang = async () => {
      oneTimeOverrideCalled = true;
      TranslationsParent.getTopPreferredSupportedToLang = originalFn;
      throw new Error("Simulated failure retrieving the preferred language");
    };

    info("Search for the translate quick action");
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "translate",
    });

    await assertAction("translate");

    EventUtils.synthesizeKey("KEY_Tab", {}, window);
    EventUtils.synthesizeKey("KEY_Enter", {}, window);

    info(
      "Wait for about:translations and confirm no target language is appended"
    );
    await BrowserTestUtils.browserLoaded(
      translateTab.linkedBrowser,
      false,
      url => url.startsWith("about:translations")
    );

    const url = new URL(translateTab.linkedBrowser.currentURI.spec);
    Assert.equal(url.hash, "", "No target language parameter is appended");
    Assert.ok(oneTimeOverrideCalled, "The overridden language lookup ran once");
    Assert.equal(
      originalFn,
      TranslationsParent.getTopPreferredSupportedToLang,
      "The preferred-language getter has been restored"
    );

    if (UrlbarTestUtils.isPopupOpen(window)) {
      await UrlbarTestUtils.promisePopupClose(window, () => {
        EventUtils.synthesizeKey("KEY_Escape");
      });
    }
    BrowserTestUtils.removeTab(translateTab);
  }
);

add_task(async function test_translate_switches_to_existing_tab() {
  info("Open about:translations in the first tab");
  const translateTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:translations"
  );

  info("Open a content page in another foreground tab");
  const otherTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com"
  );

  Assert.equal(
    gBrowser.selectedTab,
    otherTab,
    "Other tab is currently selected"
  );

  info("Trigger the translate quick action");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "translate",
  });

  await assertAction("translate");

  EventUtils.synthesizeKey("KEY_Tab", {}, window);
  EventUtils.synthesizeKey("KEY_Enter", {}, window);

  info("Wait for the existing tab to be selected");
  await BrowserTestUtils.waitForCondition(
    () => gBrowser.selectedTab === translateTab,
    "Should switch to existing about:translations tab"
  );

  Assert.equal(
    gBrowser.selectedTab,
    translateTab,
    "Switched to existing about:translations tab"
  );

  if (UrlbarTestUtils.isPopupOpen(window)) {
    await UrlbarTestUtils.promisePopupClose(window, () => {
      EventUtils.synthesizeKey("KEY_Escape");
    });
  }
  BrowserTestUtils.removeTab(otherTab);
  BrowserTestUtils.removeTab(translateTab);
});
