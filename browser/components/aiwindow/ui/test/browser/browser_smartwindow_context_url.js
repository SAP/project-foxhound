/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { PromiseTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PromiseTestUtils.sys.mjs"
);

// AI chat content loads Fluent strings asynchronously, which may not complete
// before the test finishes. This is expected and doesn't affect test behavior.
PromiseTestUtils.allowMatchingRejectionsGlobally(
  /Missing message.*smartwindow-messages-document-title/
);

/**
 * Tests that context url for user messages and smartbar context chips, which
 * are retrieved from the same function, work in both places. Context urls
 * come from aiwindow/ui/modules/ChatUtils.sys.mjs::getCurrentTabUrl()
 */
describe("context url retrieval", () => {
  let gAiWindow;
  let gRestoreNetworkBoundaries;
  let gCapturedRequests;
  const gPassthroughFeatures = new Set(["chat"]);
  const TEST_PAGE_1 =
    "https://example.com/browser/browser/components/aiwindow/ui/test/browser/test_context_url_page.html";

  const TEST_PAGE_2 =
    "https://example.com/browser/browser/components/aiwindow/ui/test/browser/test_context_url_page2.html";

  beforeEach(async () => {
    ({
      restore: gRestoreNetworkBoundaries,
      capturedRequests: gCapturedRequests,
    } = await stubEngineNetworkBoundaries({
      passthroughFeatures: gPassthroughFeatures,
    }));
    gAiWindow = await openAIWindow();
  });

  afterEach(async () => {
    if (gAiWindow) {
      await BrowserTestUtils.closeWindow(gAiWindow);
      gAiWindow = null;
    }
    await gRestoreNetworkBoundaries();
  });

  describe("when the user navigates to a site", () => {
    beforeEach(async () => {
      await promiseNavigateAndLoad(
        gAiWindow.gBrowser.selectedBrowser,
        TEST_PAGE_1
      );
    });

    it("should make the context chip show the 'Example Domain' context label", async () => {
      Assert.ok(AIWindowUI.isSidebarOpen(gAiWindow), "Sidebar should be open");

      const sidebarBrowser =
        gAiWindow.document.getElementById("ai-window-browser");

      const labels = await getSmartbarContextChipLabels(
        sidebarBrowser,
        "example.com"
      );

      Assert.equal(labels.length, 1, "There should be one context chip");
      Assert.equal(
        labels[0],
        "Example Domain",
        `Expected a context chip labeled 'Example Domain', got: ${labels[0]}`
      );
    });

    it("should refresh the context chip to say 'Website Name'", async () => {
      Assert.ok(AIWindowUI.isSidebarOpen(gAiWindow), "Sidebar should be open");

      const sidebarBrowser =
        gAiWindow.document.getElementById("ai-window-browser");

      let labels = await getSmartbarContextChipLabels(
        sidebarBrowser,
        "test_context_url_page.html"
      );

      Assert.equal(
        labels[0],
        "Example Domain",
        `Expected a context chip labeled 'Example Domain', got: ${labels[0]}`
      );

      await promiseNavigateAndLoad(
        gAiWindow.gBrowser.selectedBrowser,
        TEST_PAGE_2
      );

      await BrowserTestUtils.waitForCondition(
        () => gAiWindow.gBrowser.selectedTab.label === "Website Title",
        "Wait for tab title to update to 'Website Title'"
      );

      labels = await getSmartbarContextChipLabels(
        sidebarBrowser,
        "test_context_url_page2.html"
      );

      Assert.equal(
        labels.length,
        1,
        "There should still be only one context chip"
      );
      info(`labels: ${labels}`);
      Assert.equal(
        labels[0],
        "Website Title",
        `Expected a context chip labeled 'Website Title', got: ${labels[0]}`
      );
    });
  });

  describe("when context websites are added via the + button", () => {
    let gRestoreSignIn;

    beforeEach(async () => {
      gPassthroughFeatures.add("conversation-suggestions-sidebar-starter");

      await SpecialPowers.pushPrefEnv({
        set: [["browser.search.suggest.enabled", false]],
      });

      gRestoreSignIn = skipSignIn();

      // Navigate first tab to TEST_PAGE_1.
      await promiseNavigateAndLoad(
        gAiWindow.gBrowser.selectedBrowser,
        TEST_PAGE_1
      );
      await BrowserTestUtils.waitForCondition(
        () => gAiWindow.gBrowser.selectedTab.label === "Example Domain",
        "Wait for first tab title to update"
      );

      // Open a second tab and navigate it to TEST_PAGE_2.
      const secondTab = BrowserTestUtils.addTab(
        gAiWindow.gBrowser,
        TEST_PAGE_2
      );
      await BrowserTestUtils.browserLoaded(secondTab.linkedBrowser);
      await BrowserTestUtils.waitForCondition(
        () => secondTab.label === "Website Title",
        "Wait for second tab title to update"
      );

      // Switch back to the first tab.
      gAiWindow.gBrowser.selectedTab = gAiWindow.gBrowser.tabs[0];

      const sidebarBrowser =
        gAiWindow.document.getElementById("ai-window-browser");

      // Click the + button and select the second tab from the panel.
      await openTabContextMenuAndClickTabByLabel(
        sidebarBrowser,
        "Website Title"
      );
    });

    afterEach(async () => {
      gPassthroughFeatures.delete("conversation-suggestions-sidebar-starter");
      gRestoreSignIn();
      await SpecialPowers.popPrefEnv();
    });

    it("should include both context websites in starter prompt generation", async () => {
      const sidebarBrowser =
        gAiWindow.document.getElementById("ai-window-browser");

      // Verify both chips are shown before triggering navigation.
      const labels = await getSmartbarContextChipLabels(sidebarBrowser, null);
      Assert.equal(labels.length, 2, "Should have two context chips");
      Assert.ok(
        labels.includes("Example Domain"),
        "Should have the first tab chip"
      );
      Assert.ok(
        labels.includes("Website Title"),
        "Should have the second tab chip"
      );

      // Clear captured requests so we only see the ones from the navigation.
      gCapturedRequests.length = 0;

      // Navigate to example.com to trigger loadStarterPrompts.
      await promiseNavigateAndLoad(
        gAiWindow.gBrowser.selectedBrowser,
        "https://example.com/"
      );

      // Wait for the starter prompt generation request to hit the mock server.
      await TestUtils.waitForCondition(
        () => !!gCapturedRequests.length,
        "Wait for starter prompt generation request"
      );

      // The request body should contain messages with context tab info.
      // The second tab (TEST_PAGE_2) should appear since it was added via the + button.
      const requestBody = gCapturedRequests[0];
      const allContent = requestBody.messages
        .map(m => m.content || "")
        .join(" ");

      Assert.ok(
        allContent.includes(TEST_PAGE_2),
        "Starter prompt request should include the second tab URL"
      );
    });

    it("should include both context websites in the submitted user message", async () => {
      const sidebarBrowser =
        gAiWindow.document.getElementById("ai-window-browser");

      await typeInSmartbar(sidebarBrowser, "test");
      await submitSmartbar(sidebarBrowser);

      const chipLabels = await getUserMessageChipLabels(sidebarBrowser);

      Assert.equal(chipLabels.length, 2, "Should have two context chips");
      Assert.ok(
        chipLabels.includes("Example Domain"),
        "Should have a chip for the first tab"
      );
      Assert.ok(
        chipLabels.includes("Website Title"),
        "Should have a chip for the second tab"
      );
    });
  });

  describe("when the user submits a message", () => {
    let gRestoreSignIn;

    beforeEach(async () => {
      await SpecialPowers.pushPrefEnv({
        set: [["browser.search.suggest.enabled", false]],
      });

      gRestoreSignIn = skipSignIn();

      await promiseNavigateAndLoad(
        gAiWindow.gBrowser.selectedBrowser,
        TEST_PAGE_1
      );
    });

    afterEach(async () => {
      gRestoreSignIn();
      await SpecialPowers.popPrefEnv();
    });

    it("should create a user message with a context chip label matching the site", async () => {
      const sidebarBrowser =
        gAiWindow.document.getElementById("ai-window-browser");

      await BrowserTestUtils.waitForCondition(
        () =>
          sidebarBrowser.contentDocument?.querySelector("ai-window:defined"),
        "Sidebar ai-window should be loaded"
      );

      await typeInSmartbar(sidebarBrowser, "test");
      await submitSmartbar(sidebarBrowser);

      const chipLabels = await getUserMessageChipLabels(sidebarBrowser);

      Assert.equal(chipLabels.length, 1, "Should have one context chip");
      Assert.equal(
        chipLabels[0],
        "Example Domain",
        `Expected user message context chip labeled 'Example Domain', got: ${chipLabels[0]}`
      );
    });
  });
});
