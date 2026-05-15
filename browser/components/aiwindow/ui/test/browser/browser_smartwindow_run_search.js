/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test that run_search tool calls work end-to-end from the AI window.
 *
 * This catches the browsingContext vs win context mismatch (Bug 2012830):
 * ai-window.mjs must pass { browsingContext } to Chat.fetchWithHistory so that
 * RunSearch.runSearch and the post-tool sidebar handoff can find the window.
 */

async function dispatchSmartbarCommit(browser, value, action) {
  await SpecialPowers.spawn(browser, [value, action], async (val, act) => {
    const aiWindowElement = content.document.querySelector("ai-window");

    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    const commitEvent = new content.CustomEvent("smartbar-commit", {
      detail: {
        value: val,
        action: act,
      },
      bubbles: true,
      composed: true,
    });

    smartbar.ownerDocument.dispatchEvent(commitEvent);
  });
}

// Fullpage run_search: the tool navigates the tab away, then the post-tool
// handoff in Chat.sys.mjs opens the sidebar to continue streaming.
add_task(async function test_run_search_fullpage_opens_sidebar() {
  const sb = sinon.createSandbox();

  try {
    // Stub run_search to navigate the browser away (like the real
    // RunSearch does) so the original browsingContext becomes stale.
    const runSearchStub = sb
      .stub(Chat.toolMap, "run_search")
      .callsFake(async (_params, ctx) => {
        const browser = ctx.browsingContext.embedderElement;
        BrowserTestUtils.startLoadingURIString(
          browser,
          "https://example.com/search_results"
        );
        await BrowserTestUtils.browserLoaded(browser);
        return "Mock search results";
      });

    await withServer(
      {
        toolCall: {
          name: "run_search",
          args: JSON.stringify({ query: "test search query" }),
        },
        followupChunks: ["Here are your search results."],
      },
      async () => {
        const win = await openAIWindow();
        const browser = win.gBrowser.selectedBrowser;
        await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

        await dispatchSmartbarCommit(
          browser,
          "search the web for something",
          "chat"
        );

        await TestUtils.waitForCondition(
          () => runSearchStub.calledOnce,
          "run_search tool should be called"
        );

        // The sidebar opening is the observable effect of the full handoff
        // chain: pre-captured browsingContext was valid, getTabForBrowser
        // found the tab, and openSidebarAndContinue ran.
        await TestUtils.waitForCondition(
          () => AIWindowUI.isSidebarOpen(win),
          "Sidebar should open after fullpage run_search handoff"
        );

        await BrowserTestUtils.closeWindow(win);
      }
    );
  } finally {
    sb.restore();
  }
});

// When the AI window is already in sidebar mode, run_search must receive the
// adjacent tab's browsingContext (not the sidebar's own). Without the fix in
// ai-window.mjs, the sidebar's browsingContext.embedderElement is the sidebar
// <browser> (#ai-window-browser), causing gBrowser.getTabForBrowser() to
// return null and aborting the search handoff.
add_task(
  async function test_run_search_from_sidebar_uses_tab_browsingContext() {
    const sb = sinon.createSandbox();

    try {
      const runSearchStub = sb
        .stub(Chat.toolMap, "run_search")
        .callsFake(async (_params, ctx) => {
          const ctxBrowser = ctx.browsingContext.embedderElement;
          Assert.notEqual(
            ctxBrowser.id,
            "ai-window-browser",
            "browsingContext should be a tab browser, not the sidebar browser"
          );
          Assert.ok(
            ctxBrowser.ownerGlobal.gBrowser.getTabForBrowser(ctxBrowser),
            "browsingContext embedderElement should belong to a tab"
          );
          BrowserTestUtils.startLoadingURIString(
            ctxBrowser,
            "https://example.com/search_results"
          );
          await BrowserTestUtils.browserLoaded(ctxBrowser);
          return "Mock search results";
        });

      // Track whether the server receives the follow-up request with tool
      // results, which proves openSidebarAndContinue -> reloadAndContinue
      // -> #fetchAIResponse() fired successfully.
      let gotToolResultRequest = false;

      await withServer(
        {
          toolCall: {
            name: "run_search",
            args: JSON.stringify({ query: "sidebar search query" }),
          },
          followupChunks: ["Sidebar search results."],
          onRequest(body) {
            const messages = Array.isArray(body.messages) ? body.messages : [];
            if (messages.some(m => m && m.role === "tool")) {
              gotToolResultRequest = true;
            }
          },
        },
        async () => {
          const win = await openAIWindow();
          const browser = win.gBrowser.selectedBrowser;
          await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

          // Open a content tab so there's a real tab adjacent to the sidebar.
          const tab = await BrowserTestUtils.openNewForegroundTab(
            win.gBrowser,
            "https://example.com/"
          );

          AIWindowUI.openSidebar(win);
          Assert.ok(AIWindowUI.isSidebarOpen(win), "Sidebar should be open");

          const sidebarBrowser =
            win.document.getElementById("ai-window-browser");
          await BrowserTestUtils.waitForCondition(() => {
            const el =
              sidebarBrowser.contentDocument?.querySelector("ai-window");
            return el?.shadowRoot;
          }, "Wait for sidebar ai-window element and shadow root");

          await dispatchSmartbarCommit(
            sidebarBrowser,
            "search the web from sidebar",
            "chat"
          );

          await TestUtils.waitForCondition(
            () => runSearchStub.calledOnce,
            "run_search tool should be called from sidebar"
          );

          // The follow-up request proves the full chain completed:
          // openSidebarAndContinue called reloadAndContinue which triggered
          // a new fetchAIResponse with the tool result.
          await TestUtils.waitForCondition(
            () => gotToolResultRequest,
            "Server should receive follow-up request with tool results"
          );

          Assert.ok(
            AIWindowUI.isSidebarOpen(win),
            "Sidebar should remain open after sidebar run_search"
          );

          await BrowserTestUtils.removeTab(tab);
          await BrowserTestUtils.closeWindow(win);
        }
      );
    } finally {
      sb.restore();
    }
  }
);
