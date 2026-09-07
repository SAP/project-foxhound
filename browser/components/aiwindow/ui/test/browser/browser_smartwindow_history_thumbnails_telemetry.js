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
    it("records a history_displayed event", async () => {
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
      Assert.ok(hasAIChatGrid, "Should have rendered the grid");

      const events = await waitForHistoryTelemetry("historyDisplayed");
      Assert.equal(
        events.length,
        1,
        "Should record one history_displayed event"
      );

      const { extra } = events[0];
      Assert.equal(extra.location, "fullpage", "Should record the location");
      Assert.ok(extra.chat_id, "Should record a chat_id");
      Assert.notStrictEqual(
        extra.message_seq,
        undefined,
        "Should record a message_seq"
      );
      Assert.equal(
        extra.total,
        String(fakeHistoryResults.length),
        "Should record the number of displayed entries"
      );
      Assert.equal(extra.reason, "ask", "Should record the display reason");
    });

    describe("when the user clicks on an item", () => {
      let newTab;
      afterEach(async () => {
        if (newTab) {
          BrowserTestUtils.removeTab(newTab);
        }
      });

      it("records a history_click event", async () => {
        const browser = win.gBrowser.selectedBrowser;

        await typeInSmartbar(browser, "show me sites in browsing history");
        await submitSmartbar(browser);

        await mockResponseWithSearchBrowsingHistory(
          mockEngineMan,
          fakeHistoryResults
        );

        const newTabPromise = BrowserTestUtils.waitForNewTab(win.gBrowser);

        const clicked = await clickNthGridItem(browser, 1);
        Assert.ok(clicked, "Should have clicked a grid item");
        newTab = await newTabPromise;

        const events = await waitForHistoryTelemetry("historyClick");
        Assert.equal(events.length, 1, "Should record one history_click event");

        const { extra } = events[0];
        Assert.equal(extra.location, "fullpage", "Should record the location");
        Assert.ok(extra.chat_id, "Should record a chat_id");
        Assert.notStrictEqual(
          extra.message_seq,
          undefined,
          "Should record a message_seq"
        );
        Assert.equal(
          extra.total,
          String(fakeHistoryResults.length),
          "Should record the total number of entries"
        );
        Assert.equal(
          extra.position,
          "1",
          "Should record the position of the clicked entry"
        );
      });
    });
  });
});
