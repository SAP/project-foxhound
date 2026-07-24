/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { ChatStore, ChatConversation } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
);
// AIWindow is provided by the test environment (e.g. head.js or the browser window); do not import it here.

const TEST_URL1 = "https://example.com/";
const TEST_URL2 = "https://mozilla.org/";
const DAY_MS = 24 * 60 * 60 * 1000;

let gChatStore;
let gAIWindow;

/**
 * Creates a test chat conversation with optional parameters.
 *
 * @param {object} options - Configuration options for the test chat
 * @param {string} [options.title="Test Chat"] - Title of the chat
 * @param {string} [options.url=TEST_URL1] - URL associated with the chat
 * @param {Date} [options.createdDate=new Date()] - When the chat was created
 * @param {Date} [options.updatedDate=createdDate] - When the chat was last updated
 * @param {number} [options.messageCount=1] - Number of message pairs to add
 * @returns {Promise<ChatConversation>} The created conversation object
 */
async function addTestChat(options = {}) {
  const {
    title = "Test Chat",
    url = TEST_URL1,
    createdDate = new Date(),
    updatedDate = createdDate,
    messageCount = 1,
  } = options;

  const conversation = new ChatConversation({
    createdDate: createdDate.getTime(),
    updatedDate: updatedDate.getTime(),
    pageUrl: url ? new URL(url) : null,
  });
  conversation.title = title;

  for (let i = 0; i < messageCount; i++) {
    conversation.addUserMessage(
      `Test message ${i + 1}`,
      url ? new URL(url) : null
    );
    conversation.addAssistantMessage("text", `Assistant response ${i + 1}`);
  }

  await gChatStore.updateConversation(conversation);
  return conversation;
}

/**
 * Creates a test chat conversation without an associated URL.
 *
 * @param {object} options - Configuration options for the test chat
 * @returns {Promise<ChatConversation>} The created conversation object
 */
async function addTestChatWithoutUrl(options = {}) {
  return addTestChat({ ...options, url: null });
}

/**
 * Gets the rendered chat lists from the chats view.
 *
 * @param {Browser} browser - The browser containing the Firefox View
 * @returns {Promise<Array>} Array of chat list elements
 */
async function getChatsList(browser) {
  const { document } = browser.contentWindow;
  const chatsView = document.querySelector("view-chats");
  await TestUtils.waitForCondition(
    () => chatsView && chatsView.lists?.length,
    "Waiting for chats lists to render"
  );
  return chatsView.lists;
}

/**
 * Opens a new AI Window and waits for it to be ready.
 * The AI Window has the "ai-window" attribute on its document element,
 * which enables AI-specific features in Firefox View.
 *
 * @returns {Promise<Window>} The opened AI Window
 */
async function openAIWindow() {
  const win = await BrowserTestUtils.openNewBrowserWindow({ aiWindow: true });
  await BrowserTestUtils.waitForMutationCondition(
    win.document.documentElement,
    { attributes: true },
    () => win.document.documentElement.hasAttribute("ai-window")
  );
  return win;
}

/**
 * Waits for the chats navigation button to become visible in Firefox View.
 * The chats nav is only shown when an AI Window is active.
 *
 * @param {Document} document - The Firefox View document
 */
async function waitForChatsNavVisible(document) {
  await TestUtils.waitForCondition(() => {
    const chatsNav = document.getElementById("firefoxview-chats-nav");
    return chatsNav && !chatsNav.hidden;
  }, "Waiting for chats navigation button to be visible");
}

/**
 * Waits for the chats view to render with the expected number of chat items.
 * This waits for both the controller cache to be ready and the DOM to render.
 *
 * @param {Browser} browser - The browser containing the Firefox View
 * @param {number} expectedCount - The expected number of chat items to render
 */
async function waitForChatsReady(browser, expectedCount) {
  const { document } = browser.contentWindow;
  const chatsView = document.querySelector("view-chats");

  // Wait for controller to update
  await TestUtils.waitForCondition(
    () => chatsView.controller && chatsView.controller.cache.entries,
    "Waiting for controller cache to be ready"
  );

  // Wait for lists to render with expected count
  await TestUtils.waitForCondition(
    () => {
      const lists = chatsView.lists;
      if (!lists || !lists.length) {
        return false;
      }
      const totalItems = Array.from(lists).reduce(
        (sum, list) => sum + (list.rowEls?.length || 0),
        0
      );
      return totalItems === expectedCount;
    },
    `Waiting for ${expectedCount} chat items to render`,
    200,
    100
  );
}

add_setup(async function () {
  // Enable AI Window feature
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.chatHistory.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", true],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
    ],
  });

  // Open an AI Window so Firefox View detects AI Window is active
  gAIWindow = await openAIWindow();

  gChatStore = AIWindow.chatStore;

  // Clean database before tests
  await gChatStore.destroyDatabase();

  registerCleanupFunction(async () => {
    await gChatStore.destroyDatabase();
    if (gAIWindow) {
      const { AIWindowUI } = ChromeUtils.importESModule(
        "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs"
      );
      AIWindowUI.closeSidebar(gAIWindow);
      await BrowserTestUtils.closeWindow(gAIWindow);
      gAIWindow = null;
    }
  });
});

add_task(async function test_chats_view_renders() {
  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;

    await waitForChatsNavVisible(document);
    await navigateToViewAndWait(document, "chats");

    const chatsView = document.querySelector("view-chats");
    Assert.ok(chatsView, "Chats view should be rendered");

    // Wait for view to fully render
    await TestUtils.waitForCondition(() => {
      const emptyState = chatsView.emptyState;
      return emptyState && BrowserTestUtils.isVisible(emptyState);
    }, "Waiting for empty state to be visible");

    const emptyState = chatsView.emptyState;
    Assert.ok(emptyState, "Empty state element should exist");
    Assert.ok(
      BrowserTestUtils.isVisible(emptyState),
      "Empty state should be visible when no chats exist"
    );
  });
});

add_task(async function test_chat_list_displays_items() {
  const chat1 = await addTestChat({
    title: "Chat with example.com",
    url: TEST_URL1,
  });
  const chat2 = await addTestChat({
    title: "Chat with example.org",
    url: TEST_URL2,
  });

  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await waitForChatsNavVisible(document);
    await navigateToViewAndWait(document, "chats");

    await waitForChatsReady(browser, 2);

    const lists = await getChatsList(browser);
    Assert.ok(lists.length, "At least one card should be rendered");

    const totalItems = Array.from(lists).reduce(
      (sum, list) => sum + list.rowEls.length,
      0
    );
    Assert.equal(totalItems, 2, "Should display 2 chat items");

    const firstRow = lists[0].rowEls[0];
    const titleEl = firstRow.shadowRoot.querySelector(".fxview-tab-row-title");
    Assert.ok(titleEl, "Chat should have title element");
    Assert.ok(
      titleEl.textContent.includes("Chat"),
      "Chat title should be displayed"
    );
  });

  await gChatStore.deleteConversationById(chat1.id);
  await gChatStore.deleteConversationById(chat2.id);
});

add_task(async function test_chat_with_url_has_icon() {
  const chat = await addTestChat({
    title: "Chat with favicon",
    url: TEST_URL1,
  });

  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await waitForChatsNavVisible(document);
    await navigateToViewAndWait(document, "chats");

    await waitForChatsReady(browser, 1);

    const lists = await getChatsList(browser);
    const firstRow = lists[0].rowEls[0];
    const icon = firstRow.shadowRoot.querySelector(".fxview-tab-row-favicon");

    Assert.ok(icon, "Chat item should have favicon element");
    const hasBackgroundImage =
      icon.style.backgroundImage &&
      icon.style.backgroundImage !== "none" &&
      icon.style.backgroundImage !== '""';
    Assert.ok(hasBackgroundImage, "Favicon should have a background image set");
  });

  await gChatStore.deleteConversationById(chat.id);
});

add_task(async function test_chat_without_url_displays() {
  const chat = await addTestChatWithoutUrl({
    title: "Chat without URL",
  });

  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await waitForChatsNavVisible(document);
    await navigateToViewAndWait(document, "chats");

    await waitForChatsReady(browser, 1);

    const lists = await getChatsList(browser);
    Assert.ok(lists.length, "Should have at least one card");

    const firstRow = lists[0].rowEls[0];
    Assert.ok(firstRow, "Chat item should be displayed");

    const titleEl = firstRow.shadowRoot.querySelector(".fxview-tab-row-title");
    Assert.ok(
      titleEl.textContent.includes("Chat without URL"),
      "Chat title should be displayed for chat without URL"
    );
  });

  await gChatStore.deleteConversationById(chat.id);
});

add_task(async function test_date_grouping_today() {
  const chat = await addTestChat({
    title: "Today's chat",
    updatedDate: new Date(),
  });

  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await waitForChatsNavVisible(document);
    await navigateToViewAndWait(document, "chats");

    await waitForChatsReady(browser, 1);

    const lists = await getChatsList(browser);
    Assert.greater(lists.length, 0, "Should have chat list for today");
    Assert.equal(
      lists[0].rowEls.length,
      1,
      "Should have 1 chat in today's list"
    );
  });

  await gChatStore.deleteConversationById(chat.id);
});

add_task(async function test_date_grouping_yesterday() {
  const yesterday = new Date(Date.now() - DAY_MS);
  const chat = await addTestChat({
    title: "Yesterday's chat",
    updatedDate: yesterday,
  });

  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await waitForChatsNavVisible(document);
    await navigateToViewAndWait(document, "chats");

    await waitForChatsReady(browser, 1);

    const lists = await getChatsList(browser);
    Assert.equal(
      lists[0].rowEls.length,
      1,
      "Should have 1 chat from yesterday"
    );
  });

  await gChatStore.deleteConversationById(chat.id);
});

add_task(async function test_chat_with_url_opens_sidebar() {
  requestLongerTimeout(2);

  const { AIWindowUI } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs"
  );

  const chat = await addTestChat({
    title: "Chat with URL for sidebar",
    url: TEST_URL1,
  });

  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await waitForChatsNavVisible(document);
    await navigateToViewAndWait(document, "chats");

    await waitForChatsReady(browser, 1);

    const lists = await getChatsList(browser);
    const firstRow = lists[0].rowEls[0];

    // Verify the chat has a URL (which determines sidebar vs fullpage)
    const conversation = await gChatStore.findConversationById(chat.id);
    const mostRecentPage = conversation.getMostRecentPageVisited();
    Assert.ok(mostRecentPage?.href, "Chat should have a URL for sidebar mode");
    Assert.equal(
      mostRecentPage.href,
      TEST_URL1,
      "Chat should have the correct URL"
    );

    const tabBrowser = browser.getTabBrowser();

    const mainEl = firstRow.shadowRoot.querySelector(".fxview-tab-row-main");
    const tabOpenedPromise = BrowserTestUtils.waitForNewTab(
      tabBrowser,
      TEST_URL1,
      true
    );
    EventUtils.synthesizeMouseAtCenter(mainEl, {}, browser.contentWindow);

    const newTab = await tabOpenedPromise;

    // Verify the new tab loaded the URL
    Assert.ok(
      newTab.linkedBrowser.currentURI.spec.includes("example.com"),
      "New tab should load the page URL"
    );

    // Wait for sidebar to open with longer timeout
    await TestUtils.waitForCondition(
      () => AIWindowUI.isSidebarOpen(newTab.ownerGlobal),
      "Waiting for sidebar to open",
      5000,
      100
    );

    Assert.ok(
      AIWindowUI.isSidebarOpen(newTab.ownerGlobal),
      "Sidebar should be open in the new tab"
    );

    // Clean up
    AIWindowUI.closeSidebar(newTab.ownerGlobal);
    BrowserTestUtils.removeTab(newTab);
  });

  await gChatStore.deleteConversationById(chat.id);
});

add_task(async function test_delete_chat() {
  const chat = await addTestChat({ title: "Chat to Delete" });

  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await waitForChatsNavVisible(document);
    await navigateToViewAndWait(document, "chats");

    await waitForChatsReady(browser, 1);

    let lists = await getChatsList(browser);
    Assert.equal(
      lists[0].rowEls.length,
      1,
      "Should have 1 chat before deletion"
    );

    const chatsView = document.querySelector("view-chats");
    const firstRow = lists[0].rowEls[0];

    chatsView.triggerNode = firstRow;
    await chatsView.controller.deleteChat();

    // Wait for controller cache to update
    await TestUtils.waitForCondition(
      () => {
        const cache = chatsView.controller.cache;
        return (
          !cache.entries ||
          cache.entries.length === 0 ||
          cache.entries.every(e => e.items.length === 0)
        );
      },
      "Waiting for cache to reflect deletion",
      200,
      50
    );

    // Verify chat was deleted from database
    const deletedChat = await gChatStore.findConversationById(chat.id);
    Assert.equal(deletedChat, null, "Chat should be deleted from database");
  });
});
