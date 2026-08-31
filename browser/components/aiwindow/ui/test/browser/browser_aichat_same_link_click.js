/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

const { AIWindowUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs"
);

const TEST_URL = "https://example.com/test-page";

/**
 * Dispatches an OpenLink event from the AI chat content.
 *
 * @param {XULElement} browser - The browser element
 * @param {string} url - The URL to open
 */
async function dispatchOpenLinkEvent(browser, url) {
  await SpecialPowers.spawn(browser, [url], async linkUrl => {
    content.document.dispatchEvent(
      new content.CustomEvent("AIChatContent:OpenLink", {
        bubbles: true,
        detail: { url: linkUrl },
      })
    );
  });
}

/**
 * Creates a stub for AIWindowUI.handleSameLinkClick to track calls.
 *
 * @returns {object} Object with calls count and restore method
 */
function createSameLinkClickStub() {
  let calls = 0;
  const original = AIWindowUI.handleSameLinkClick;

  AIWindowUI.handleSameLinkClick = _win => {
    calls++;
  };

  return {
    get calls() {
      return calls;
    },
    restore() {
      AIWindowUI.handleSameLinkClick = original;
    },
  };
}

describe("AI Chat same-link click handling", () => {
  describe("when clicking a link to the current tab", () => {
    let targetTab, chatTab, stub;

    beforeEach(async () => {
      targetTab = await BrowserTestUtils.openNewForegroundTab(
        gBrowser,
        TEST_URL
      );
      chatTab = await BrowserTestUtils.openNewForegroundTab(
        gBrowser,
        "about:aichatcontent"
      );
      stub = createSameLinkClickStub();
      gBrowser.selectedTab = targetTab;
    });

    afterEach(async () => {
      stub.restore();
      await BrowserTestUtils.removeTab(chatTab);
      await BrowserTestUtils.removeTab(targetTab);
      stub = null;
      targetTab = null;
      chatTab = null;
    });

    it("should call handleSameLinkClick and not open a new tab", async () => {
      const initialTabCount = gBrowser.tabs.length;
      let newTabCreated = false;
      const onTabOpen = () => {
        newTabCreated = true;
      };
      gBrowser.tabContainer.addEventListener("TabOpen", onTabOpen);

      await dispatchOpenLinkEvent(chatTab.linkedBrowser, TEST_URL);

      await BrowserTestUtils.waitForCondition(
        () => stub.calls === 1,
        "AIWindowUI.handleSameLinkClick should be called for same URL"
      );

      gBrowser.tabContainer.removeEventListener("TabOpen", onTabOpen);

      Assert.ok(!newTabCreated, "No new tab should be opened for same URL");
      Assert.equal(
        gBrowser.tabs.length,
        initialTabCount,
        "Tab count should remain unchanged"
      );
      Assert.equal(
        gBrowser.selectedTab,
        targetTab,
        "Selected tab should remain the current tab"
      );
    });
  });

  describe("when clicking a non-http(s) URL", () => {
    let currentTab, chatTab, stub;

    beforeEach(async () => {
      currentTab = await BrowserTestUtils.openNewForegroundTab(
        gBrowser,
        TEST_URL
      );
      chatTab = await BrowserTestUtils.openNewForegroundTab(
        gBrowser,
        "about:aichatcontent"
      );
      stub = createSameLinkClickStub();
      gBrowser.selectedTab = currentTab;
    });

    afterEach(async () => {
      stub.restore();
      await BrowserTestUtils.removeTab(chatTab);
      await BrowserTestUtils.removeTab(currentTab);
      stub = null;
      currentTab = null;
      chatTab = null;
    });

    it("should be ignored and not trigger any actions", async () => {
      const initialTabCount = gBrowser.tabs.length;

      await dispatchOpenLinkEvent(chatTab.linkedBrowser, "javascript:alert(1)");

      await TestUtils.waitForTick();

      Assert.equal(
        stub.calls,
        0,
        "AIWindowUI.handleSameLinkClick should not be called for non-http(s) URL"
      );
      Assert.equal(
        gBrowser.tabs.length,
        initialTabCount,
        "No new tab should be created for non-http(s) URL"
      );
    });
  });
});
