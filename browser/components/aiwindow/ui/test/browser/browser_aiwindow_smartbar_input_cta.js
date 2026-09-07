/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for the input-cta component in the Smartbar.
 */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
    ],
  });

  const fakeIntentEngine = {
    run({ args: [[query]] }) {
      const searchKeywords = ["search", "hello"];
      const formattedPrompt = query.toLowerCase();
      const isSearch = searchKeywords.some(keyword =>
        formattedPrompt.includes(keyword)
      );

      if (isSearch) {
        return [
          { label: "search", score: 0.95 },
          { label: "chat", score: 0.05 },
        ];
      }
      return [
        { label: "chat", score: 0.95 },
        { label: "search", score: 0.05 },
      ];
    },
  };

  gIntentEngineStub.resolves(fakeIntentEngine);
});

add_task(async function test_smartbar_cta_default_search_engine_label() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  const defaultSearchEngineInfo = await SpecialPowers.spawn(
    browser,
    [],
    async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = aiWindowElement.shadowRoot.querySelector(
        "#ai-window-smartbar"
      );
      const inputCta = smartbar.querySelector("input-cta");
      await ContentTaskUtils.waitForMutationCondition(
        inputCta,
        { attributes: true, subtree: true },
        () => inputCta.searchEngineInfo.name
      );
      const searchEngineName = inputCta.searchEngineInfo.name;
      inputCta.action = "search";
      await inputCta.updateComplete;
      const searchLabel = await content.document.l10n.formatValue(
        "aiwindow-input-cta-menu-label-search",
        { searchEngineName }
      );

      return {
        name: searchEngineName,
        hasIcon: !!inputCta.searchEngineInfo.icon,
        searchLabel,
      };
    }
  );

  Assert.ok(defaultSearchEngineInfo.name, "Search engine name should be set");
  Assert.ok(
    defaultSearchEngineInfo.hasIcon,
    "Search engine icon should be set"
  );
  Assert.equal(
    defaultSearchEngineInfo.searchLabel,
    `Search with ${defaultSearchEngineInfo.name}`,
    `Search label should include engine name: [${defaultSearchEngineInfo.searchLabel}]`
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_cta_search_engines_list() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  const searchEnginesResult = await SpecialPowers.spawn(
    browser,
    [],
    async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = aiWindowElement.shadowRoot.querySelector(
        "#ai-window-smartbar"
      );
      const inputCta = smartbar.querySelector("input-cta");
      // DOM is not observable for this case, so we can't use waitForMutationCondition.
      await ContentTaskUtils.waitForCondition(
        () => !!inputCta.searchEngines.length
      );

      return inputCta.searchEngines.map(e => ({
        name: e.name,
        hasIcon: !!e.icon,
      }));
    }
  );

  Assert.greater(
    searchEnginesResult.length,
    0,
    "searchEngines should have at least one engine"
  );

  for (const engine of searchEnginesResult) {
    Assert.ok(engine.name, "Each search engine should have a name");
  }

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_search_with_overrides_chat_intent() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  // Trigger 'chat' intent
  const query = "tell me a joke";
  // Spaces are encoded as "+" in the search submission query string.
  const expectedQuery = "q=tell+me+a+joke";

  await stubLoadURL(browser, { captureURL: true });
  await typeInSmartbar(browser, query);
  await waitForSmartbarAction(browser, "chat");
  await selectSmartbarSearchEngine(browser);

  const searchResult = await getStubLoadURLResult(browser);
  Assert.ok(
    searchResult.called,
    "Selecting a search engine should run a search even when intent is 'chat'"
  );
  Assert.ok(
    searchResult.url.includes(expectedQuery),
    `Search URL should contain "${expectedQuery}": ${searchResult.url}`
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_cta_intent() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const inputCta = smartbar.querySelector("input-cta");
    const TEST_QUERIES = [
      { query: "Search for weather", expectedAction: "search" },
      { query: "Hello, how are you?", expectedAction: "chat" },
      { query: "mozilla.com", expectedAction: "navigate" },
    ];
    for (const { query, expectedAction } of TEST_QUERIES) {
      smartbar.focus();

      info("Waiting for action to update to " + expectedAction);
      let mutate = ContentTaskUtils.waitForMutationCondition(
        inputCta,
        { attributes: true, subtree: true },
        () => inputCta.action == expectedAction
      );
      EventUtils.sendString(query, content);
      info("Backspace the whole string to reset the state for the next query.");
      smartbar.setSelectionRange(0, query.length);
      mutate = ContentTaskUtils.waitForMutationCondition(
        inputCta,
        { attributes: true, subtree: true },
        () => inputCta.action == ""
      );
      EventUtils.sendKey("BACK_SPACE", content);
      await mutate;
    }
  });

  await BrowserTestUtils.closeWindow(win);
});
