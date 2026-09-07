/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for the Smartbar's suggestions view in the Smart Window: when it
 * opens, when it stays closed, and click-through behavior. Split out from
 * browser_aiwindow_smartbar.js to keep each file's runtime under the per-file
 * mochitest timeout (bug 2026508).
 */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  PlacesTestUtils: "resource://testing-common/PlacesTestUtils.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
});

add_setup(async function () {
  // Prevent network requests for remote search suggestions during testing.
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
    ],
  });

  const fakeIntentEngine = {
    run({ args: [[query]] }) {
      const searchKeywords = ["search", "find", "look up"];
      const navigateKeywords = ["https://", "www.", ".com"];
      const formattedPrompt = query.toLowerCase();

      const isSearch = searchKeywords.some(keyword =>
        formattedPrompt.includes(keyword)
      );
      const isNavigate = navigateKeywords.some(keyword =>
        formattedPrompt.includes(keyword)
      );

      if (isNavigate) {
        return [
          { label: "navigate", score: 0.95 },
          { label: "chat", score: 0.05 },
        ];
      }
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

/**
 * Dispatch a `smartbar-commit` event.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {string} value - The value to submit
 * @param {string} action - The action type
 */
async function dispatchSmartbarCommit(browser, value, action) {
  await SpecialPowers.spawn(browser, [value, action], async (val, act) => {
    const aiWindowElement = content.document.querySelector("ai-window");

    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot.querySelector("#ai-window-smartbar"),
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

add_task(
  async function test_smartbar_shows_suggestions_on_input_below_in_fullpage() {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await promiseSmartbarSuggestionsOpen(browser, () =>
      typeInSmartbar(browser, "test")
    );
    await assertSmartbarSuggestionsVisible(browser, true, "bottom");

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(
  async function test_smartbar_shows_suggestions_on_input_above_in_sidebar() {
    const { win, sidebarBrowser } = await openAIWindowWithSidebar();

    await promiseSmartbarSuggestionsOpen(sidebarBrowser, () =>
      typeInSmartbar(sidebarBrowser, "test")
    );
    await assertSmartbarSuggestionsVisible(sidebarBrowser, true, "top");

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(
  async function test_smartbar_hides_suggestions_on_submitting_initial_prompt() {
    const sb = this.sinon.createSandbox();

    try {
      sb.stub(this.Chat, "fetchWithHistory");
      sb.stub(this.openAIEngine, "build");

      const win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;

      await promiseSmartbarSuggestionsOpen(browser, () =>
        typeInSmartbar(browser, "test")
      );
      await assertSmartbarSuggestionsVisible(browser, true);
      await submitSmartbar(browser);
      await promiseSmartbarSuggestionsClose(browser);
      await assertSmartbarSuggestionsVisible(browser, false);

      await BrowserTestUtils.closeWindow(win);
    } finally {
      sb.restore();
    }
  }
);

add_task(async function test_smartbar_click_on_suggestion_is_registered() {
  const sb = this.sinon.createSandbox();

  try {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await promiseSmartbarSuggestionsOpen(browser, () =>
      typeInSmartbar(browser, "test")
    );

    // TODO (Bug 2016696): `SpecialPowers.spawn` would be more reliable and is
    // preferred over accessing content via cross-process wrappers like
    // `browser.contentWindow`.
    const aiWindowElement =
      browser.contentWindow.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const pickElementStub = sb.stub(smartbar, "pickElement");
    const firstSuggestion = smartbar.querySelector(".urlbarView-row");

    EventUtils.synthesizeMouseAtCenter(
      firstSuggestion,
      {},
      browser.contentWindow
    );

    Assert.ok(
      pickElementStub.calledOnce,
      "pickElement should be called when clicking a suggestion"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(async function test_smartbar_click_on_suggestion_navigates() {
  const sb = sinon.createSandbox();

  try {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const testUrl = "https://example.com/";
    await promiseSmartbarSuggestionsOpen(browser, () =>
      typeInSmartbar(browser, testUrl)
    );

    const aiWindowElement =
      browser.contentWindow.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const loadURLStub = sb.stub(smartbar, "_loadURL");
    const firstSuggestion = smartbar.querySelector(".urlbarView-row");

    EventUtils.synthesizeMouseAtCenter(
      firstSuggestion,
      {},
      browser.contentWindow
    );

    Assert.ok(
      loadURLStub.calledOnce,
      "_loadURL should be called when clicking a suggestion"
    );
    Assert.equal(
      loadURLStub.firstCall.args[0],
      testUrl,
      "Should navigate to the test URL"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(
  async function test_smartbar_navigation_suggestion_does_not_submit_to_chat() {
    const testUrl = "https://example.com/aiwindow-nav-suggestion/";
    await PlacesTestUtils.addVisits([
      { uri: testUrl, title: "AI Window Nav Suggestion" },
    ]);
    registerCleanupFunction(() => PlacesUtils.history.clear());

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    // Typing a plain question makes the smartbar default to "chat" mode, with an
    // "Ask" suggestion on top. The history visit added above puts a clickable URL
    // suggestion below it, which is the one we click.
    await promiseSmartbarSuggestionsOpen(browser, () =>
      typeInSmartbar(browser, "aiwindow-nav-suggestion")
    );
    await waitForSmartbarAction(browser, "chat");
    await stubLoadURL(browser, { captureURL: true });

    const committedAction = await SpecialPowers.spawn(
      browser,
      [testUrl],
      async url => {
        const { UrlbarUtils } = ChromeUtils.importESModule(
          "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs"
        );
        const aiWindowElement = content.document.querySelector("ai-window");
        const smartbar = aiWindowElement.shadowRoot.querySelector(
          "#ai-window-smartbar"
        );

        const urlRow = await ContentTaskUtils.waitForCondition(() => {
          for (const row of smartbar.querySelectorAll(".urlbarView-row")) {
            const res = smartbar.view.getResultFromElement(row);
            if (
              res?.type === UrlbarUtils.RESULT_TYPE.URL &&
              res.payload.url === url
            ) {
              return row;
            }
          }
          return null;
        }, "Wait for the navigation URL suggestion row");

        let action = null;
        smartbar.addEventListener(
          "smartbar-commit",
          e => {
            action = e.detail.action;
          },
          { once: true }
        );

        EventUtils.synthesizeMouseAtCenter(urlRow, {}, content);

        await ContentTaskUtils.waitForCondition(
          () => action !== null,
          "Wait for the smartbar-commit event"
        );

        return action;
      }
    );

    Assert.equal(
      committedAction,
      "navigate",
      "Picking a URL suggestion should commit as a navigation, not chat"
    );

    const { called, url: loadedUrl } = await getStubLoadURLResult(browser);
    Assert.ok(called, "Clicking the URL suggestion should navigate");
    Assert.equal(loadedUrl, testUrl, "Should navigate to the suggestion URL");

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(async function test_smartbar_enter_in_chat_mode_commits_chat() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  // Typing a plain question puts the smartbar in "chat" mode. Pressing Enter
  // should commit as chat, not navigate.
  await promiseSmartbarSuggestionsOpen(browser, () =>
    typeInSmartbar(browser, "what is the capital of france")
  );
  await waitForSmartbarAction(browser, "chat");
  await stubLoadURL(browser);

  const committedAction = await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );

    let action = null;
    content.document.addEventListener(
      "smartbar-commit",
      e => {
        action = e.detail.action;
      },
      { once: true }
    );

    const inputCta = smartbar.querySelector("input-cta");
    await ContentTaskUtils.waitForCondition(
      () => inputCta.getAttribute("action") !== "stop",
      "Wait for generation to complete before submitting via Enter"
    );

    smartbar.inputField.focus();
    EventUtils.synthesizeKey("KEY_Enter", {}, content);

    await ContentTaskUtils.waitForCondition(
      () => action !== null,
      "Wait for the smartbar-commit event"
    );

    return action;
  });

  Assert.equal(
    committedAction,
    "chat",
    "Pressing Enter with the CTA in chat mode should commit as chat"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(
  async function test_smartbar_suggestions_suppressed_on_typing_when_chat_active() {
    const sb = this.sinon.createSandbox();

    try {
      sb.stub(this.Chat, "fetchWithHistory");
      sb.stub(this.openAIEngine, "build").resolves({});

      const win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;

      await dispatchSmartbarCommit(browser, "initial prompt", "chat");
      await TestUtils.waitForTick();

      await typeInSmartbar(browser, "follow up");

      const viewIsOpen = await SpecialPowers.spawn(browser, [], async () => {
        const aiWindowElement = content.document.querySelector("ai-window");
        const smartbar = aiWindowElement.shadowRoot.querySelector(
          "#ai-window-smartbar"
        );
        return smartbar.view.isOpen;
      });

      Assert.ok(
        !viewIsOpen,
        "Suggestions view should not open when chat is active"
      );

      await BrowserTestUtils.closeWindow(win);
    } finally {
      sb.restore();
    }
  }
);

add_task(
  async function test_smartbar_suggestions_suppressed_on_focus_when_chat_active() {
    const sb = this.sinon.createSandbox();

    try {
      sb.stub(this.Chat, "fetchWithHistory");
      sb.stub(this.openAIEngine, "build").resolves({});

      const win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;

      await dispatchSmartbarCommit(browser, "initial prompt", "chat");
      await TestUtils.waitForTick();

      const viewIsOpen = await SpecialPowers.spawn(browser, [], async () => {
        const aiWindowElement = content.document.querySelector("ai-window");
        const smartbar = aiWindowElement.shadowRoot.querySelector(
          "#ai-window-smartbar"
        );
        smartbar.inputField.blur();
        smartbar.dispatchEvent(
          new content.MouseEvent("mousedown", { bubbles: true })
        );
        smartbar.inputField.focus();
        return smartbar.view.isOpen;
      });

      Assert.ok(
        !viewIsOpen,
        "Suggestions view should not open on focus when chat is active"
      );

      await BrowserTestUtils.closeWindow(win);
    } finally {
      sb.restore();
    }
  }
);

add_task(
  async function test_smartbar_no_duplicate_firefox_suggest_group_labels() {
    const FIREFOX_SUGGEST_LABEL = "Firefox Suggest";
    const searchQuery = "test";

    // Add two Places visits. The first stays in the GENERAL result group and
    // the second is promoted to an INPUT_HISTORY result. Both render with a
    // “Firefox Suggest” label and a duplicate label was created when the AiChat
    // search fallback result lands between the groups.
    await PlacesTestUtils.addVisits([
      { uri: "https://example.com/one", title: "Test Page One" },
      { uri: "https://example.com/two", title: "Test Page Two" },
    ]);
    await UrlbarUtils.addToInputHistory("https://example.com/two", searchQuery);

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await promiseSmartbarSuggestionsOpen(browser, () =>
      typeInSmartbar(browser, searchQuery)
    );

    const labelCount = await SpecialPowers.spawn(
      browser,
      [FIREFOX_SUGGEST_LABEL],
      async groupLabel => {
        const smartbar = content.document
          .querySelector("ai-window")
          .shadowRoot.querySelector("#ai-window-smartbar");
        // Wait for the history results
        await ContentTaskUtils.waitForCondition(
          () =>
            smartbar.querySelector(
              '.urlbarView-row[type="history"], .urlbarView-row[type="adaptive-history"]'
            ),
          "Wait for rows to render"
        );
        return [...smartbar.querySelectorAll(".urlbarView-row")].filter(
          row => row.getAttribute("label") === groupLabel
        ).length;
      }
    );

    Assert.equal(
      labelCount,
      1,
      `"${FIREFOX_SUGGEST_LABEL}" should appear exactly once`
    );

    await PlacesUtils.history.clear();
    await BrowserTestUtils.closeWindow(win);
  }
);
