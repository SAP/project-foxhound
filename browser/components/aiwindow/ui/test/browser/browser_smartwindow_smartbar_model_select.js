/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for the input-model-select component in the Smartbar.
 */

"use strict";

const { _clearModelsDataCacheForTesting, FALLBACK_MODELS } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
  );
const { MockEngineManager } = ChromeUtils.importESModule(
  "resource://testing-common/AIWindowTestUtils.sys.mjs"
);

const DEFAULT_MODEL_CHOICE_ID = "2";

add_setup(async function () {
  _clearModelsDataCacheForTesting();
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.firstrun.modelChoice", DEFAULT_MODEL_CHOICE_ID],
    ],
  });
});

/**
 * Waits for the expected model in the smartbar model select.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {string} expectedModel - The expected model name
 */
async function waitForSelectedModel(browser, expectedModel) {
  await SpecialPowers.spawn(browser, [expectedModel], async expected => {
    const aiWindowElement = content.document.querySelector("ai-window");
    await ContentTaskUtils.waitForMutationCondition(
      aiWindowElement,
      { attributes: true },
      () => aiWindowElement.selectedModelId === expected
    );
  });
}

add_task(async function test_smartbar_model_select_shows_default_model() {
  const { restore } = await stubEngineNetworkBoundaries({
    serverOptions: null,
  });

  try {
    const expectedDefaultModel = FALLBACK_MODELS[DEFAULT_MODEL_CHOICE_ID].model;
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const { selectedModelId } = await getSmartbarModelSelectData(browser);
    Assert.equal(
      selectedModelId,
      expectedDefaultModel,
      "Should show the default model based on modelChoice pref"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    await restore();
  }
});

add_task(async function test_smartbar_model_select_panel_shows_default_badge() {
  const { restore } = await stubEngineNetworkBoundaries({
    serverOptions: null,
  });

  try {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const defaultItemHasBadge = await SpecialPowers.spawn(
      browser,
      [DEFAULT_MODEL_CHOICE_ID],
      async defaultModelChoiceId => {
        const aiWindowElement = content.document.querySelector("ai-window");
        const smartbar = aiWindowElement.shadowRoot.querySelector(
          "#ai-window-smartbar"
        );
        const modelSelect = smartbar.querySelector("input-model-select");
        const triggerButton =
          modelSelect.shadowRoot.querySelector("moz-button");
        triggerButton.click();

        const panelList = modelSelect.shadowRoot.querySelector("panel-list");
        await ContentTaskUtils.waitForMutationCondition(
          panelList,
          { attributes: true },
          () => panelList.hasAttribute("open")
        );

        const defaultItem = panelList.querySelector(
          `button.model-item:has(.model-item-icon[src*="model-choice-${defaultModelChoiceId}.svg"])`
        );
        return !!defaultItem.querySelector("moz-badge");
      }
    );

    Assert.ok(defaultItemHasBadge, "Default model item should have the badge");

    await BrowserTestUtils.closeWindow(win);
  } finally {
    await restore();
  }
});

add_task(
  async function test_smartbar_model_select_shows_custom_model_when_configured() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.customEndpoint", "https://custom.endpoint/v1"],
      ],
    });

    const { restore } = await stubEngineNetworkBoundaries({
      serverOptions: null,
    });

    try {
      const win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;

      const { availableModels } = await getSmartbarModelSelectData(browser);

      const hasCustomModel = Object.values(availableModels).some(
        m => m.model === "custom-model"
      );
      Assert.ok(hasCustomModel, "Custom model should show when configured");

      await BrowserTestUtils.closeWindow(win);
    } finally {
      await restore();
      await SpecialPowers.popPrefEnv();
    }
  }
);

add_task(
  async function test_smartbar_model_select_hides_custom_model_without_custom_endpoint() {
    await SpecialPowers.pushPrefEnv({
      clear: [["browser.smartwindow.customEndpoint"]],
    });

    const { restore } = await stubEngineNetworkBoundaries({
      serverOptions: null,
    });

    try {
      const win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;

      const { availableModels } = await getSmartbarModelSelectData(browser);

      const hasCustomModel = Object.values(availableModels).some(
        m => m.model === "custom-model"
      );
      Assert.ok(
        !hasCustomModel,
        "Custom model should NOT be available without a custom endpoint"
      );

      await BrowserTestUtils.closeWindow(win);
    } finally {
      await restore();
      await SpecialPowers.popPrefEnv();
    }
  }
);

add_task(async function test_model_switch_uses_correct_model_for_requests() {
  const { restore } = await stubEngineNetworkBoundaries({
    serverOptions: null,
  });

  try {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const { selectedModelId: initialModelId } =
      await getSmartbarModelSelectData(browser);

    await switchSmartbarModel(browser, "1");
    const { selectedModelId: updatedModelId } =
      await getSmartbarModelSelectData(browser);

    Assert.notEqual(
      initialModelId,
      updatedModelId,
      "Model should have changed"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    await restore();
  }
});

add_task(
  async function test_model_switch_updates_system_prompt_mid_conversation() {
    let { promise: requestPromise, resolve: resolveRequest } =
      Promise.withResolvers();

    const { restore } = await stubEngineNetworkBoundaries({
      serverOptions: {
        streamChunks: ["Hello", "from mock server."],
        onRequest(body) {
          resolveRequest(body);
          ({ promise: requestPromise, resolve: resolveRequest } =
            Promise.withResolvers());
        },
      },
    });

    try {
      const win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;

      await typeInSmartbar(browser, "First message");
      await submitSmartbar(browser);
      const firstRequest = await requestPromise;

      await switchSmartbarModel(browser, "1");

      await typeInSmartbar(browser, "Second message");
      await submitSmartbar(browser);
      const secondRequest = await requestPromise;

      const userMessages = secondRequest.messages
        .filter(message => message.role === "user")
        .map(message => message.content);

      Assert.notEqual(
        firstRequest.model,
        secondRequest.model,
        "Model should change after model switch"
      );
      Assert.ok(
        userMessages.some(message => message.includes("First message")),
        "Should include first message"
      );
      Assert.ok(
        userMessages.some(message => message.includes("Second message")),
        "Should include second message"
      );

      await BrowserTestUtils.closeWindow(win);
    } finally {
      await restore();
    }
  }
);

add_task(async function test_model_switch_routes_to_correct_endpoint() {
  let customServer;
  let stubRestore;
  const customRequests = [];
  const presetRequests = [];

  try {
    const { server, port: customPort } = startMockOpenAI({
      streamChunks: ["Custom reply"],
      onRequest(body) {
        customRequests.push(body);
      },
    });
    customServer = server;
    await SpecialPowers.pushPrefEnv({
      set: [
        [
          "browser.smartwindow.customEndpoint",
          `http://localhost:${customPort}/v1`,
        ],
        ["browser.smartwindow.model", "custom-model"],
        ["browser.smartwindow.apiKey", "custom-key"],
      ],
    });

    const { restore } = await stubEngineNetworkBoundaries({
      serverOptions: {
        streamChunks: ["Preset reply"],
        onRequest(body) {
          presetRequests.push(body);
        },
      },
    });
    stubRestore = restore;

    // Waits for the smartbar to return to idle after a turn completes.
    const waitForIdle = browser =>
      SpecialPowers.spawn(browser, [], async () => {
        const inputCta = ContentTaskUtils.querySelectorDeep(
          content.document,
          "input-cta"
        );
        await ContentTaskUtils.waitForCondition(
          () => inputCta.getAttribute("action") !== "stop",
          "Smartbar should return to idle after generating"
        );
      });

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    // The custom model choice option "0" is available when configured
    const { availableModels } = await getSmartbarModelSelectData(browser);
    Assert.ok(availableModels["0"], "Custom model is available");

    // Test initial preset turn
    await typeInSmartbar(browser, "Preset message");
    await submitSmartbar(browser);
    await BrowserTestUtils.waitForCondition(
      () => presetRequests.length,
      "MLPA endpoint should receive the preset request"
    );
    Assert.equal(
      customRequests.length,
      0,
      "Custom endpoint should not receive the preset request"
    );
    await waitForIdle(browser);

    // Test switch to custom model
    await switchSmartbarModel(browser, "0");
    await typeInSmartbar(browser, "Custom message");
    await submitSmartbar(browser);
    await BrowserTestUtils.waitForCondition(
      () => customRequests.length,
      "Custom endpoint should receive the custom-model request"
    );
    Assert.equal(
      presetRequests.length,
      1,
      "Mozilla endpoint must not receive the custom-model request"
    );

    // Custom model choice stays available
    const { availableModels: afterSwitch } =
      await getSmartbarModelSelectData(browser);
    Assert.ok(
      Object.values(afterSwitch).some(m => m.model === "custom-model"),
      "Custom option stays available"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    await stubRestore();
    await SpecialPowers.popPrefEnv();
    await stopMockOpenAI(customServer);
  }
});

add_task(async function test_model_choice_pref_change_updates_selected_model() {
  const { restore } = await stubEngineNetworkBoundaries({
    serverOptions: null,
  });

  try {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const { selectedModelId: initialModelId } =
      await getSmartbarModelSelectData(browser);
    Assert.equal(
      initialModelId,
      FALLBACK_MODELS[DEFAULT_MODEL_CHOICE_ID].model,
      "Should be the initial default model"
    );

    const newModelChoiceId = "1";
    const expectedNewModel = FALLBACK_MODELS[newModelChoiceId].model;
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.firstrun.modelChoice", newModelChoiceId]],
    });

    await SpecialPowers.spawn(
      browser,
      [expectedNewModel],
      async expectedModel => {
        const aiWindowElement = content.document.querySelector("ai-window");
        await ContentTaskUtils.waitForMutationCondition(
          aiWindowElement,
          { attributes: true },
          () => aiWindowElement.selectedModelId === expectedModel
        );
      }
    );

    const { selectedModelId: updatedModelId } =
      await getSmartbarModelSelectData(browser);
    Assert.equal(
      updatedModelId,
      expectedNewModel,
      "Selected model should update when pref changes"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    await restore();
    await SpecialPowers.popPrefEnv();
  }
});

add_task(
  async function test_model_choice_pref_change_updates_fullpage_and_sidebar_on_default() {
    const mockEngineManager = new MockEngineManager();

    try {
      const win = await openAIWindow();
      const browserFullpage = win.gBrowser.selectedBrowser;

      // Open second tab with sidebar
      await BrowserTestUtils.openNewForegroundTab(
        win.gBrowser,
        "https://example.com/"
      );
      Assert.ok(AIWindowUI.isSidebarOpen(win), "Sidebar should be open");
      const browserSidebar = await waitForSidebarReady(win);

      // Both tabs match the default
      const defaultModel = FALLBACK_MODELS[DEFAULT_MODEL_CHOICE_ID].model;
      await waitForSelectedModel(browserFullpage, defaultModel);
      await waitForSelectedModel(browserSidebar, defaultModel);

      // Change the default model
      const newModel = FALLBACK_MODELS["1"].model;
      await SpecialPowers.pushPrefEnv({
        set: [["browser.smartwindow.firstrun.modelChoice", "1"]],
      });
      await waitForSelectedModel(browserFullpage, newModel);
      await waitForSelectedModel(browserSidebar, newModel);

      await BrowserTestUtils.closeWindow(win);
    } finally {
      mockEngineManager.cleanupMocks();
      await SpecialPowers.popPrefEnv();
    }
  }
);

add_task(async function test_sidebar_model_switch_persists_across_tabs() {
  const mockEngineManager = new MockEngineManager();

  try {
    const win = await openAIWindow();

    const tabA = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "https://example.com/"
    );
    const tabB = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "https://example.org/"
    );
    Assert.ok(AIWindowUI.isSidebarOpen(win), "Sidebar should be open");
    const browserSidebar = await waitForSidebarReady(win);

    const defaultModel = FALLBACK_MODELS[DEFAULT_MODEL_CHOICE_ID].model;
    const fastModel = FALLBACK_MODELS["1"].model;

    // Tab B starts with the default and then overrides
    await waitForSelectedModel(browserSidebar, defaultModel);
    await switchSmartbarModel(browserSidebar, "1");

    // Tab A stays on the default
    await BrowserTestUtils.switchTab(win.gBrowser, tabA);
    await waitForSelectedModel(browserSidebar, defaultModel);

    // Tab B restores its override choice
    await BrowserTestUtils.switchTab(win.gBrowser, tabB);
    await waitForSelectedModel(browserSidebar, fastModel);

    await BrowserTestUtils.closeWindow(win);
  } finally {
    mockEngineManager.cleanupMocks();
  }
});

// Change default while override tab is focused: Override tab keeps model choice
// and the background tab mirrors default when switching back to tab.
add_task(async function test_default_change_with_override_tab_focused() {
  const mockEngineManager = new MockEngineManager();

  try {
    const win = await openAIWindow();

    // Tab A mirrors the default and tab B overrides model choice
    const tabA = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "https://example.com/"
    );
    // Tab B stays focused as the override tab.
    await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "https://example.org/"
    );
    Assert.ok(AIWindowUI.isSidebarOpen(win), "Sidebar should be open");
    const browserSidebar = await waitForSidebarReady(win);

    await switchSmartbarModel(browserSidebar, "1");

    // Change the default model
    const newDefaultModel = FALLBACK_MODELS["3"].model;
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.firstrun.modelChoice", "3"]],
    });

    // Focused override tab B does not change
    Assert.equal(
      (await getSmartbarModelSelectData(browserSidebar)).selectedModelId,
      FALLBACK_MODELS["1"].model,
      "Override tab B should keep its picked model"
    );

    // Tab A updates to the new default on switching back
    await BrowserTestUtils.switchTab(win.gBrowser, tabA);
    await waitForSelectedModel(browserSidebar, newDefaultModel);

    await BrowserTestUtils.closeWindow(win);
  } finally {
    mockEngineManager.cleanupMocks();
    await SpecialPowers.popPrefEnv();
  }
});

// Change default while tab without override is focused: Default tab choice
// changes and the override tab restores its pick when switching back to the tab.
add_task(async function test_default_change_with_default_tab_focused() {
  const mockEngineManager = new MockEngineManager();

  try {
    const win = await openAIWindow();

    // Tab A overrides the default model
    const tabA = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "https://example.com/"
    );
    Assert.ok(AIWindowUI.isSidebarOpen(win), "Sidebar should be open");
    const browserSidebar = await waitForSidebarReady(win);
    await switchSmartbarModel(browserSidebar, "1");

    // Tab B mirrors the default and stays focused while the default changes
    await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "https://example.org/"
    );

    // Change the default model
    const newDefaultModel = FALLBACK_MODELS["3"].model;
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.firstrun.modelChoice", "3"]],
    });

    // Focused tab B changes to the new default
    await waitForSelectedModel(browserSidebar, newDefaultModel);

    // Background override tab A keeps its model when switching back
    await BrowserTestUtils.switchTab(win.gBrowser, tabA);
    await waitForSelectedModel(browserSidebar, FALLBACK_MODELS["1"].model);

    await BrowserTestUtils.closeWindow(win);
  } finally {
    mockEngineManager.cleanupMocks();
    await SpecialPowers.popPrefEnv();
  }
});

// Model override persists even after the global default changes to match.
add_task(async function test_override_persists_when_default_matches() {
  const mockEngineManager = new MockEngineManager();

  try {
    const win = await openAIWindow();

    // Tab A overrides the default model
    const tabA = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "https://example.com/"
    );
    Assert.ok(AIWindowUI.isSidebarOpen(win), "Sidebar should be open");
    const browserSidebar = await waitForSidebarReady(win);
    await switchSmartbarModel(browserSidebar, "1");

    // Tab B mirrors the default
    await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "https://example.org/"
    );

    // Move the default to match the override of tab A
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.firstrun.modelChoice", "1"]],
    });

    // Tab A keeps its override even though it now matches the default
    await BrowserTestUtils.switchTab(win.gBrowser, tabA);
    await waitForSelectedModel(browserSidebar, FALLBACK_MODELS["1"].model);

    // Change the default model away again
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.firstrun.modelChoice", "3"]],
    });
    // Tab A keeps the overridden model instead of following the default
    await waitForSelectedModel(browserSidebar, FALLBACK_MODELS["1"].model);

    await BrowserTestUtils.closeWindow(win);
  } finally {
    mockEngineManager.cleanupMocks();
    await SpecialPowers.popPrefEnv();
    await SpecialPowers.popPrefEnv();
  }
});

// Typing in the smartbar should not persist a model override.
add_task(async function test_smartbar_input_does_not_persist_model_choice() {
  const mockEngineManager = new MockEngineManager();

  try {
    const win = await openAIWindow();

    // Tab A mirrors the default
    const tabA = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "https://example.com/"
    );
    Assert.ok(AIWindowUI.isSidebarOpen(win), "Sidebar should be open");
    const browserSidebar = await waitForSidebarReady(win);

    // Type into the smartbar without picking a model from the select
    const defaultModel = FALLBACK_MODELS[DEFAULT_MODEL_CHOICE_ID].model;
    await waitForSelectedModel(browserSidebar, defaultModel);
    await typeInSmartbar(browserSidebar, "Hello there");

    // Open tab B and change the global default
    const tabB = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "https://example.org/"
    );
    const newDefaultModel = FALLBACK_MODELS["3"].model;
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.firstrun.modelChoice", "3"]],
    });
    await waitForSelectedModel(browserSidebar, newDefaultModel);

    // Tab A should mirror the new default
    await BrowserTestUtils.switchTab(win.gBrowser, tabA);
    await waitForSelectedModel(browserSidebar, newDefaultModel);

    await BrowserTestUtils.switchTab(win.gBrowser, tabB);
    await waitForSelectedModel(browserSidebar, newDefaultModel);

    await BrowserTestUtils.closeWindow(win);
  } finally {
    mockEngineManager.cleanupMocks();
    await SpecialPowers.popPrefEnv();
  }
});
