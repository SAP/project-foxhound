const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

const { AIWindowTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AIWindowTestUtils.sys.mjs"
);

function makeMenuItem(id) {
  const menuItem = document.createXULElement("menuitem");
  menuItem.setAttribute("id", id);

  const node = document.childNodes[0];
  document.documentElement.appendChild(menuItem, node);

  return menuItem;
}

let gSandbox = null,
  gAiWindow = null;

async function test_AiWindowMenu_setup(
  returnRecentConversations = true,
  openAiWindow = true
) {
  gSandbox = lazy.sinon.createSandbox();

  const testMenuItem = makeMenuItem("historyMenuItem");
  const testEvent = new Event("popupShowing");
  testMenuItem.dispatchEvent(testEvent);

  // add mock menuitem that the Chats option is added before
  const sanitizeItem = makeMenuItem("sanitizeItem");
  testMenuItem.appendChild(sanitizeItem);

  const startChatHistorySeparator = makeMenuItem("startChatHistorySeparator");
  testMenuItem.appendChild(startChatHistorySeparator);

  const chatsHistoryMenu = makeMenuItem("chatsHistoryMenu");
  chatsHistoryMenu.hidden = true;
  testMenuItem.appendChild(chatsHistoryMenu);

  const recentChatsHeader = makeMenuItem("recentChatsHeader");
  testMenuItem.appendChild(recentChatsHeader);

  gSandbox
    .stub(AIWindow.chatStore, "findRecentConversations")
    .callsFake(amount => {
      const conversations = [];

      if (!returnRecentConversations) {
        return conversations;
      }

      for (let i = 0; i < amount; i++) {
        conversations.push({ title: `Conversation ${i}`, id: i.toString() });
      }

      return conversations;
    });

  gAiWindow = await AIWindowTestUtils.openAIWindow(openAiWindow);
  if (openAiWindow) {
    gAiWindow.document.documentElement.setAttribute("ai-window", true);
  }

  return [testEvent, testMenuItem];
}

async function test_AiWindowMenu_cleanup() {
  await BrowserTestUtils.closeWindow(gAiWindow);
  gSandbox.restore();
}

describe("AiWindow Menu options", () => {
  let testEvent, testMenuItem;
  describe("AIWindow enabled and active and there are chats", () => {
    beforeEach(async () => {
      await AIWindowTestUtils.toggleAIWindowPref(SpecialPowers, true);
      const testObjects = await test_AiWindowMenu_setup(true);

      testEvent = testObjects[0];
      testMenuItem = testObjects[1];
    });

    afterEach(async () => {
      await test_AiWindowMenu_cleanup();
    });

    it("adds the Chats option to History menu", () => {
      AIWindow.appMenu(testEvent, gAiWindow);

      const chatsOption = testMenuItem.querySelector("#chatsHistoryMenu");

      Assert.ok(chatsOption, "Could not find the Chats option");
      Assert.ok(!chatsOption.hidden, "The Chats option should not be hidden");
    });

    it("enables the Recent Chats label", async () => {
      AIWindow.appMenu(testEvent, gAiWindow);

      await waitForElement(gAiWindow, "#recentChatsHeader");

      const recentChatsHeader =
        testMenuItem.querySelector("#recentChatsHeader");

      Assert.ok(recentChatsHeader);
      Assert.equal(recentChatsHeader.hasAttribute("hidden"), false);
    });

    it("adds recent chats in the history menu", async () => {
      await AIWindow.appMenu(testEvent, gAiWindow);

      await waitForElement(gAiWindow, "#recentChatsHeader");

      const conversationItems =
        gAiWindow.document.documentElement.querySelectorAll(
          ".recent-chat-item"
        );
      Assert.equal(conversationItems.length, 4);
    });
  });

  describe("AIWindow enabled and active and no chats", () => {
    beforeEach(async () => {
      await AIWindowTestUtils.toggleAIWindowPref(SpecialPowers, true);
      const testObjects = await test_AiWindowMenu_setup(false);

      testEvent = testObjects[0];
      testMenuItem = testObjects[1];
    });

    afterEach(async () => {
      await test_AiWindowMenu_cleanup();
    });

    it("doesnt add chats options when there arent any", async () => {
      await AIWindow.appMenu(testEvent, gAiWindow);

      const conversationItems =
        gAiWindow.document.documentElement.querySelectorAll(
          ".recent-chat-item"
        );
      Assert.equal(
        conversationItems.length,
        0,
        "Found recent chat items but should be none"
      );

      const recentChatsHeader =
        gAiWindow.document.documentElement.querySelector("#recentChatsHeader");
      Assert.ok(
        recentChatsHeader.hasAttribute("hidden"),
        "Found chats header but should be hidden"
      );
    });
  });

  describe("AIWindow enabled but not active", () => {
    beforeEach(async () => {
      await AIWindowTestUtils.toggleAIWindowPref(SpecialPowers, true);
      const testObjects = await test_AiWindowMenu_setup(false, false);

      testEvent = testObjects[0];
      testMenuItem = testObjects[1];
    });

    afterEach(async () => {
      await test_AiWindowMenu_cleanup();
    });

    it("does not add chats options", async () => {
      await AIWindow.appMenu(testEvent, gAiWindow);

      const recentChatsHeader =
        gAiWindow.document.documentElement.querySelector("#recentChatsHeader");
      Assert.ok(
        recentChatsHeader.hasAttribute("hidden"),
        "Found chats header visible but should be hidden"
      );

      const chatsOption =
        gAiWindow.document.documentElement.querySelector("#menu_chats");

      Assert.ok(!chatsOption, "Found the Chats option");
    });
  });

  describe("AIWindow enabled but not active", () => {
    beforeEach(async () => {
      await AIWindowTestUtils.toggleAIWindowPref(SpecialPowers, false);
      const testObjects = await test_AiWindowMenu_setup(false, false);

      testEvent = testObjects[0];
      testMenuItem = testObjects[1];
    });

    afterEach(async () => {
      await test_AiWindowMenu_cleanup();
    });

    it("does not add chats options", async () => {
      await AIWindow.appMenu(testEvent, gAiWindow);

      const recentChatsHeader =
        gAiWindow.document.documentElement.querySelector("#recentChatsHeader");
      Assert.ok(
        recentChatsHeader.hasAttribute("hidden"),
        "Found chats header visible but should be hidden"
      );

      const chatsOption =
        gAiWindow.document.documentElement.querySelector("#menu_chats");

      Assert.ok(!chatsOption, "Found the Chats option");
    });
  });

  // @todo Bug 2007583
  // Add test for clicking Recent Chat item
});

async function waitForElement(win, elementSelector) {
  await BrowserTestUtils.waitForMutationCondition(
    win,
    { childList: true },
    () => {
      const elements =
        win.document.documentElement.querySelectorAll(elementSelector);
      return elements.length;
    }
  );
}
