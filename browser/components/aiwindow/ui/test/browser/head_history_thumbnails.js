/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* import-globals-from head.js */
/* global ContentTaskUtils */

/**
 * Shared helpers for the history thumbnail grid tests. Loaded explicitly via
 * `Services.scriptloader.loadSubScript` from the history thumbnail test files
 * so they aren't pulled into every test in the directory (unlike head.js).
 */

// Response to trigger the search_browsing_history tool call
const SEARCH_BROWSING_HISTORY_TOOL_CALL_RESPONSE = [
  {
    text: "",
    tokens: null,
    isPrompt: false,
    toolCalls: [
      {
        id: "call_history_1",
        function: {
          name: "search_browsing_history",
          arguments: JSON.stringify({ searchTerm: "firefox" }),
        },
      },
    ],
  },
];

/**
 * @typedef {{
 *   url: string,
 *   title: string,
 *   favicon: string | null,
 *   thumbnail: string | null,
 *   visitDate: number,
 *   visitCount: number
 * }} HistoryResult
 */

/**
 * Returns an array of browsing history results
 *
 * @param {number} [amount=12] How many to return
 *
 * @returns {Array<HistoryResult>}
 */
function getFakeHistoryResults(amount = 12) {
  return Array.from({ length: amount }, (_, i) => ({
    url: `https://example.com/${i}`,
    title: `Example ${i}`,
    favicon: null,
    thumbnail: null,
    visitDate: Date.now(),
    visitCount: Math.ceil(Math.random() * amount),
  }));
}

/**
 * Returns markdown based on the history results to
 * use in the mocked LLM assistant response
 *
 * @param {HistoryResult} historyResults
 *
 * @returns {string} Markdown representation of history results array
 */
function historyResultsToMarkdown(historyResults) {
  return historyResults
    .map(historyResult => {
      return `- [${historyResult.title}](${historyResult.url})`;
    })
    .join("\n");
}

/**
 * @typedef {{
 *   searchTerm: string,
 *   count: number,
 *   results: Array<HistoryResult>
 * }} SearchBrowsingHistoryToolReturn
 */

/**
 * @typedef {(
 *   toolParams: string,
 *   conversation: ChatConversation
 * ) => Promise<SearchBrowsingHistoryToolReturn>}
 * SearchBrowsingHistoryFunctionFake
 */

/**
 * Returns a stub fake for the search_browsing_history tool call
 * to return a mocked response from the tool call
 *
 * @param {Array<HistoryResult>} fakeResults
 *
 * @returns {SearchBrowsingHistoryFunctionFake}
 */
function getSearchBrowsingHistoryFake(fakeResults) {
  return async (toolParams, conversation) => {
    conversation.addSeenUrls(fakeResults.map(({ url }) => url));
    await conversation.addHistoryResults(fakeResults);
    conversation.securityProperties.setPrivateData();
    return {
      searchTerm: "some search term",
      count: fakeResults.length,
      results: fakeResults,
    };
  };
}

/**
 * Mocks responses from the LLM backend to trigger
 * search_browsing_history tool call and an assistant
 * response with the specified browsing history results
 *
 * @param {MockEngineManager} mockEngineMan
 * @param {Array<HistoryResult>} fakeResults
 *
 * @returns {Promise<void>}
 */
async function mockResponseWithSearchBrowsingHistory(
  mockEngineMan,
  fakeResults
) {
  await mockEngineMan.respondTo({
    purpose: "chat",
    response: SEARCH_BROWSING_HISTORY_TOOL_CALL_RESPONSE,
  });

  await mockEngineMan.respondTo({
    purpose: "chat",
    response: `Here are sites from your history:\n\n${historyResultsToMarkdown(fakeResults)}`,
  });
}

/**
 * Waits for and returns the recorded Glean events for a
 * History Thumbnail grid metric.
 *
 * @param {"historyDisplayed" | "historyClick"} metric
 *
 * @returns {Promise<Array<object>>} The recorded events
 */
async function waitForHistoryTelemetry(metric) {
  let events;
  await TestUtils.waitForCondition(() => {
    events = Glean.smartWindow[metric].testGetValue();
    return events?.length;
  }, `Wait for ${metric} telemetry event`);
  return events;
}

/**
 * Clicks the nth item in the ai-chat-grid items
 *
 * @param {MozBrowser} browser The browser containing the chat area, fullpage or
 *                     sidebar browsers
 * @param {number} [nth=0] Which item index to click
 *
 * @returns {Promise<boolean>} Indicates whether the item was clicked or not
 */
async function clickNthGridItem(browser, nth = 0) {
  const aiChatBrowser = await getAIChatBrowser(browser);

  return spawnBounded(
    aiChatBrowser,
    [nth],
    async nthEl => {
      // Wait for ai-chat-content, then for the grid host to land in the
      // message's light DOM (observing the content shadow tree catches it).
      await ContentTaskUtils.waitForMutationCondition(
        content.document.documentElement,
        { childList: true, subtree: true },
        () => content.document.querySelector("ai-chat-content")
      );
      const contentEl = content.document.querySelector("ai-chat-content");
      await ContentTaskUtils.waitForMutationCondition(
        contentEl.shadowRoot,
        { childList: true, subtree: true },
        () =>
          ContentTaskUtils.querySelectorDeep(content.document, "ai-chat-grid")
      );
      const aiChatGrid = ContentTaskUtils.querySelectorDeep(
        content.document,
        "ai-chat-grid"
      );

      // .scroll-area and its children render asynchronously inside the grid's
      // own shadow root, so the observe target moves there.
      await ContentTaskUtils.waitForMutationCondition(
        aiChatGrid.shadowRoot,
        { childList: true, subtree: true },
        () =>
          aiChatGrid.shadowRoot.querySelector(".scroll-area")?.children[nthEl]
      );

      const nthElement =
        aiChatGrid.shadowRoot.querySelector(".scroll-area").children[nthEl];

      info(`nthElement: ${nthElement.outerHTML}`);
      nthElement.click();
      return true;
    },
    `grid item ${nth}`
  );
}

/**
 * @typedef {{
 *   showGrid: boolean,
 *   showList: boolean
 * }} GridViewModeData
 */

/**
 * Gets view mode data for the ai-chat-grid
 *
 * @param {MozBrowser} browser The browser containing the chat area, fullpage or
 *                     sidebar browsers
 *
 * @returns {Promise<GridViewModeData>}
 */
async function getGridViewMode(browser) {
  const aiChatBrowser = await getAIChatBrowser(browser);

  return spawnBounded(
    aiChatBrowser,
    [],
    async () => {
      await ContentTaskUtils.waitForMutationCondition(
        content.document.documentElement,
        { childList: true, subtree: true },
        () => content.document.querySelector("ai-chat-content")
      );
      const contentEl = content.document.querySelector("ai-chat-content");
      await ContentTaskUtils.waitForMutationCondition(
        contentEl.shadowRoot,
        { childList: true, subtree: true },
        () =>
          ContentTaskUtils.querySelectorDeep(content.document, "ai-chat-grid")
      );
      const aiChatGrid = ContentTaskUtils.querySelectorDeep(
        content.document,
        "ai-chat-grid"
      );

      const showGrid = aiChatGrid.getAttribute("view") === "grid";
      const showList = aiChatGrid.getAttribute("view") === "list";

      return { showGrid, showList };
    },
    "ai-chat-grid view mode"
  );
}

/**
 * Toggles the ai-chat-grid mode
 *
 * @param {MozBrowser} browser
 * @param {boolean} showGrid
 * @param {boolean} showList
 *
 * @returns {Promise<boolean>} Whether the mode was toggled
 */
async function toggleGridViewMode(browser, showGrid, showList) {
  const aiChatBrowser = await getAIChatBrowser(browser);

  return spawnBounded(
    aiChatBrowser,
    [showGrid, showList],
    async (showingGrid, showingList) => {
      await ContentTaskUtils.waitForMutationCondition(
        content.document.documentElement,
        { childList: true, subtree: true },
        () => content.document.querySelector("ai-chat-content")
      );
      const contentEl = content.document.querySelector("ai-chat-content");
      await ContentTaskUtils.waitForMutationCondition(
        contentEl.shadowRoot,
        { childList: true, subtree: true },
        () =>
          ContentTaskUtils.querySelectorDeep(content.document, "ai-chat-grid")
      );
      const aiChatGrid = ContentTaskUtils.querySelectorDeep(
        content.document,
        "ai-chat-grid"
      );

      let button;
      switch (true) {
        case showingGrid:
          button = ContentTaskUtils.querySelectorDeep(aiChatGrid, "#list");
          break;

        case showingList:
          button = ContentTaskUtils.querySelectorDeep(aiChatGrid, "#grid");
          break;

        default:
          return false;
      }

      button.click();

      return true;
    },
    "ai-chat-grid view toggle"
  );
}
