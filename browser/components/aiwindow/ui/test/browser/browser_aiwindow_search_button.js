/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  SearchUIUtils: "moz-src:///browser/components/search/SearchUIUtils.sys.mjs",
  SearchUITestUtils: "resource://testing-common/SearchUITestUtils.sys.mjs",
  SearchTestUtils: "resource://testing-common/SearchTestUtils.sys.mjs",
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
});

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const TEST_PAGE =
  "chrome://mochitests/content/browser/browser/components/aiwindow/ui/test/browser/test_chat_search_button.html";

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
    ],
  });
});

/**
 * Test the chat search hanfoff button params and if it was clicked
 */
add_task(async function test_chat_search_button() {
  await BrowserTestUtils.withNewTab(TEST_PAGE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      await content.customElements.whenDefined("ai-chat-message");
      await content.customElements.whenDefined("ai-chat-search-button");

      const aiChatMessage = content.document.querySelector("ai-chat-message");
      Assert.ok(aiChatMessage, "ai-chat-message exists");

      // Set up the element so it actually renders a search button now.
      aiChatMessage.role = "assistant";
      aiChatMessage.setAttribute("role", "assistant");
      aiChatMessage.message = "Test AI response";
      aiChatMessage.setAttribute("message", "Test AI response");
      aiChatMessage.searchTokens = ["Ada Lovelace"];

      function sleep(ms) {
        return new content.Promise(resolve => content.setTimeout(resolve, ms));
      }

      async function waitFor(fn, msg, maxTicks = 200) {
        for (let i = 0; i < maxTicks; i++) {
          try {
            const val = fn();
            if (val) {
              return val;
            }
          } catch (_) {}
          await sleep(0);
        }
        throw new Error(`Timed out waiting: ${msg}`);
      }

      let resolveEvent;
      content.wrappedJSObject.__aiwindowChatSearchEvent = null;
      content.wrappedJSObject.__aiwindowSearchPromise = new Promise(
        r => (resolveEvent = r)
      );

      content.document.addEventListener(
        "AIWindow:chat-search",
        e => {
          content.wrappedJSObject.__aiwindowChatSearchEvent = {
            type: e?.type,
            detail: e?.detail,
          };
          resolveEvent();
        },
        { once: true }
      );

      const chatSearchButtonHost = await waitFor(() => {
        return aiChatMessage.shadowRoot?.querySelector("ai-chat-search-button");
      }, "ai-chat-search-button host should render inside ai-chat-message");

      Assert.ok(chatSearchButtonHost, "ai-chat-search-button exists");
      Assert.equal(
        chatSearchButtonHost.label,
        "Ada Lovelace",
        "Button has correct label"
      );
      Assert.equal(
        chatSearchButtonHost.query,
        "Ada Lovelace",
        "Button has correct query"
      );

      const chatSearchButton = await waitFor(() => {
        return chatSearchButtonHost.shadowRoot?.querySelector(
          "#ai-chat-search-button"
        );
      }, "#ai-chat-search-button should exist inside host shadowRoot");

      EventUtils.synthesizeMouseAtCenter(chatSearchButton, {}, content);
    });

    await SpecialPowers.spawn(browser, [], async () => {
      await content.wrappedJSObject.__aiwindowSearchPromise;
    });

    let event = browser.contentWindow.wrappedJSObject.__aiwindowChatSearchEvent;

    Assert.equal(
      event.type,
      "AIWindow:chat-search",
      "AIWindow:chat-search event was fired"
    );

    Assert.equal(
      event.detail,
      "Ada Lovelace",
      "AIWindow:chat-search event includes the correct query"
    );
  });
});

/**
 * Test the telemetry from the performSearch function called by the search handoff button
 */
add_task(async function test_telemetry_chat_search_button() {
  // Clear telemetry
  lazy.TelemetryTestUtils.getAndClearKeyedHistogram("SEARCH_COUNTS");
  Services.fog.testResetFOG();

  lazy.SearchUITestUtils.init(this);
  lazy.SearchTestUtils.init(this);
  await lazy.SearchTestUtils.updateRemoteSettingsConfig([
    { identifier: "other" },
  ]);

  const loadSearchSpy = sinon.spy(lazy.SearchUIUtils, "loadSearch");
  const { topChromeWindow } = window.browsingContext;

  await lazy.AIWindow.performSearch("Ada Lovelace", topChromeWindow);

  Assert.ok(
    loadSearchSpy.calledOnce,
    "SearchUIUtils.loadSearch was called from Smart Window Perform Search"
  );

  const args = loadSearchSpy.firstCall.args[0];
  Assert.equal(
    args.searchText,
    "Ada Lovelace",
    "Correct query/searchText passed"
  );
  Assert.equal(
    args.sapSource,
    "smartwindow_assistant",
    "Smart Window sapSource passed"
  );

  await lazy.SearchUITestUtils.assertSAPTelemetry({
    engineId: "other",
    engineName: "other",
    source: "smartwindow_assistant",
    count: 1,
  });

  loadSearchSpy.restore();
});
