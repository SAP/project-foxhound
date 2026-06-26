/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { MockEngineManager } = ChromeUtils.importESModule(
  "resource://testing-common/AIWindowTestUtils.sys.mjs"
);
const { toolFns } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Tools.sys.mjs"
);

/* import-globals-from head_history_thumbnails.js */
Services.scriptloader.loadSubScript(
  getRootDirectory(gTestPath) + "head_history_thumbnails.js",
  this
);

describe("smartwindow history thumbnails", () => {
  let mockEngineMan, win, sandbox, fakeHistoryResults;

  beforeEach(async () => {
    await Services.fog.testFlushAllChildren();

    sandbox = sinon.createSandbox();
    mockEngineMan = new MockEngineManager();
    win = await openAIWindow();

    fakeHistoryResults = getFakeHistoryResults();

    sandbox
      .stub(toolFns, "searchBrowsingHistory")
      .callsFake(getSearchBrowsingHistoryFake(fakeHistoryResults));
  });

  afterEach(async () => {
    if (mockEngineMan) {
      // Reject any background engine requests (e.g. title-generation) that were
      // never explicitly responded to via respondTo() so their suspended async
      // chains resolve and release the window for GC
      mockEngineMan.rejectAllRequests();
      mockEngineMan.cleanupMocks();
    }

    sandbox.restore();

    if (win) {
      await BrowserTestUtils.closeWindow(win);
      win = null;
    }

    Services.fog.testResetFOG();
  });

  describe("when user searches for history results", () => {
    it("displays the history thumbnail grid", async () => {
      const browser = win.gBrowser.selectedBrowser;

      await typeInSmartbar(browser, "show me sites in browsing history");
      await submitSmartbar(browser);

      await mockResponseWithSearchBrowsingHistory(
        mockEngineMan,
        fakeHistoryResults
      );

      const hasAIChatGrid = await checkForElementInChatMessage(
        browser,
        "ai-chat-grid",
        -1
      );

      Assert.ok(
        hasAIChatGrid,
        "Should have a ai-chat-grid in the last message"
      );
    });

    it("renders the right amount of items", async () => {
      const browser = win.gBrowser.selectedBrowser;

      await typeInSmartbar(browser, "show me sites in browsing history");
      await submitSmartbar(browser);

      await mockResponseWithSearchBrowsingHistory(
        mockEngineMan,
        fakeHistoryResults
      );

      info("checking number of items");
      const hasCorrectNumItems = await checkForNumberOfElementsInChatMessage(
        browser,
        ".scroll-area",
        fakeHistoryResults.length
      );

      Assert.ok(
        hasCorrectNumItems,
        "Should have the right number of items in grid"
      );
    });

    describe("when the results are less than maximum amount", () => {
      beforeEach(async () => {
        fakeHistoryResults = getFakeHistoryResults(5);

        sandbox.restore();
        sandbox
          .stub(toolFns, "searchBrowsingHistory")
          .callsFake(getSearchBrowsingHistoryFake(fakeHistoryResults));
      });

      it("renders 5 items", async () => {
        const browser = win.gBrowser.selectedBrowser;

        await typeInSmartbar(browser, "show me sites in browsing history");
        await submitSmartbar(browser);

        await mockResponseWithSearchBrowsingHistory(
          mockEngineMan,
          fakeHistoryResults
        );

        info("checking number of items");
        const hasCorrectNumItems = await checkForNumberOfElementsInChatMessage(
          browser,
          ".scroll-area",
          5
        );

        Assert.ok(hasCorrectNumItems, "Should have 5 items in grid");
      });
    });

    describe("when the results are more than maximum amount", () => {
      beforeEach(async () => {
        fakeHistoryResults = getFakeHistoryResults(15);

        sandbox.restore();
        sandbox
          .stub(toolFns, "searchBrowsingHistory")
          .callsFake(getSearchBrowsingHistoryFake(fakeHistoryResults));
      });

      it("renders 12 items", async () => {
        const browser = win.gBrowser.selectedBrowser;

        await typeInSmartbar(browser, "show me sites in browsing history");
        await submitSmartbar(browser);

        await mockResponseWithSearchBrowsingHistory(
          mockEngineMan,
          fakeHistoryResults
        );

        info("checking number of items");
        const hasCorrectNumItems = await checkForNumberOfElementsInChatMessage(
          browser,
          ".scroll-area",
          12
        );

        Assert.ok(hasCorrectNumItems, "Should have 12 items in grid");
      });
    });

    describe("when the user clicks on an item", () => {
      let newTab;
      afterEach(async () => {
        if (newTab) {
          BrowserTestUtils.removeTab(newTab);
        }
      });

      it("opens in a new tab", async () => {
        const browser = win.gBrowser.selectedBrowser;

        await typeInSmartbar(browser, "show me sites in browsing history");
        await submitSmartbar(browser);

        await mockResponseWithSearchBrowsingHistory(
          mockEngineMan,
          fakeHistoryResults
        );

        const tabCount = win.gBrowser.tabs.length;
        const newTabPromise = BrowserTestUtils.waitForNewTab(win.gBrowser);

        const clicked = await clickNthGridItem(browser);
        Assert.ok(clicked, "Should have clicked a grid item");
        newTab = await newTabPromise;

        const newTabCount = win.gBrowser.tabs.length;
        Assert.greater(
          newTabCount,
          tabCount,
          `Should have a bigger new tab count (${newTabCount}) than initial tab count (${tabCount})`
        );
      });
    });

    describe("when the user clicks on the grid view toggle", () => {
      it("switches from one view to the next", async () => {
        const browser = win.gBrowser.selectedBrowser;

        await typeInSmartbar(browser, "show me sites in browsing history");
        await submitSmartbar(browser);

        await mockResponseWithSearchBrowsingHistory(
          mockEngineMan,
          fakeHistoryResults
        );

        const { showGrid, showList } = await getGridViewMode(browser);

        const toggled = await toggleGridViewMode(browser, showGrid, showList);
        Assert.ok(toggled, "Should toggle the view mode");

        const { showGrid: newShowGrid, showList: newShowList } =
          await getGridViewMode(browser);

        const actual = { showGrid: newShowGrid, showList: newShowList };
        const expected = { showGrid: !showGrid, showList: !showList };
        Assert.deepEqual(actual, expected, "Should flip the view mode flags");
      });
    });
  });
});
