/*
 This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import { getKeepSidebarOpenState } from "moz-src:///browser/components/aiwindow/ui/modules/ChatUtils.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AIWINDOW_URL:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
  AIWindowUI:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs",
  ChatStore:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs",
  SmartWindowTelemetry:
    "moz-src:///browser/components/aiwindow/ui/modules/SmartWindowTelemetry.sys.mjs",
  SessionStore: "resource:///modules/sessionstore/SessionStore.sys.mjs",
});

const SIDEBAR_EMPTY_CLOSE_COUNT_PREF =
  "browser.smartwindow.sidebar.emptyCloseCount";

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "sidebarOpenByDefault",
  "browser.smartwindow.sidebar.openByDefault"
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "sidebarEmptyCloseCount",
  SIDEBAR_EMPTY_CLOSE_COUNT_PREF,
  0
);

/**
 * At which count the empty close prompt should be shown.
 *
 * If this value needs to be updated it should also be updated in
 * the trigger string in FeatureCalloutMessages.sys.mjs
 */
const SIDEBAR_EMPTY_CLOSE_PROMPT_TRIGGER_COUNT = 2;

const SESSION_STORE_KEY = "ai-window-tab-state";

/**
 * @typedef {import("chrome://browser/content/aiwindow/components/ai-window/ai-window.mjs").SmartbarInputState} SmartbarInputState
 *
 * @typedef {{
 *   input: SmartbarInputState,
 *   mode: string,
 *   pageUrl: URL,
 *   conversationId: string,
 *   keepSidebarOpen: boolean,
 *   conversation: ChatConversation,
 * }} TabState
 */

export const EMPTY_SMARTBAR_INPUT_STATE = Object.freeze({
  text: "",
  mentions: [],
});

function hasInputContent(input) {
  return Boolean(input?.text || input?.mentions?.length);
}

/**
 * Manages state changes of the tabs in AIWindow to keep both the
 * fullwindow and sidebar chats in sync as tabs are created/selected.
 *
 * @todo Bug 2016599
 * Handle close tab event to manage tabState in case of undo close tab
 */
export class AIWindowTabStatesManager {
  /**
   * The browser window instance that this manager operates on
   */
  #window;
  /**
   * A map of tabs and their states
   *
   * @type {WeakMap<MozTabbrowserTab, TabState>}
   */
  #tabStates;
  /**
   * Global progress listener for all tabs
   */
  #tabsListener;
  /**
   * Promise that resolves when the initial sidebar restore is complete
   */
  #restorePromise;
  /**
   * True once #restoreInitialTabSidebar has completed
   */
  #restoreCompleted = false;

  constructor(win) {
    this.#init(win);
  }

  /**
   * Get the active conversation from the current selected tab.
   *
   * @returns {ChatConversation|null}
   */

  getActiveConversation() {
    const tab = this.#window?.gBrowser.selectedTab;
    return this.#tabStates.get(tab)?.state?.conversation ?? null;
  }

  /**
   * Get the tab associated with a particular conversation, if there is one.
   *
   * @param {string} conversationId
   *
   * @returns {?MozTabbrowserTab}
   */
  getConversationTab(conversationId) {
    const tabs = [...this.#window.gBrowser.tabs];
    const tab = tabs.find(t => {
      const tabState = this.#tabStates.get(t);

      return tabState && tabState.state.conversationId === conversationId;
    });

    return tab;
  }

  /**
   * Opens the sidebar for a returning user, waiting for the initial restore to
   * complete first so the two don't race. Does nothing if the restore already
   * opened the sidebar.
   */
  async openSidebarForReturningUser() {
    await this.#restorePromise;
    // Guard against the window being closed (uninit called) while awaiting.
    if (!this.#window) {
      return;
    }
    const tab = this.#window.gBrowser.selectedTab;
    const tabUrl = tab.linkedBrowser.currentURI.spec;
    const tabState = this.#getTabState(tab);
    // AIWINDOW_URL tabs are fullpage and don't use the sidebar.
    if (
      tabUrl === lazy.AIWINDOW_URL ||
      lazy.AIWindowUI.isSidebarOpen(this.#window) ||
      tabState?.state?.keepSidebarOpen === false
    ) {
      return;
    }
    if (
      getKeepSidebarOpenState(
        this.#getTabState(tab)?.state,
        lazy.sidebarOpenByDefault
      )
    ) {
      lazy.AIWindowUI.openSidebar(this.#window);
    }
  }

  /**
   * Adds event listeners needed to manage tab states
   *
   * @param {ChromeWindow} win
   *
   * @private
   */
  #init(win) {
    this.#window = win;
    this.#tabStates = new WeakMap();

    const tabContainer = this.#window.gBrowser.tabContainer;
    tabContainer.addEventListener("TabOpen", this);
    tabContainer.addEventListener("TabSelect", this);
    tabContainer.addEventListener("TabClose", this);

    this.#tabsListener = this.#getTabsListener();
    this.#window.gBrowser.addProgressListener(this.#tabsListener);

    this.#setUpInitialTabs();
    this.#addWindowEventListeners();
    this.#restorePromise = this.#restoreInitialTabSidebar().then(() => {
      this.#restoreCompleted = true;
    });
  }

  /**
   * Removes all event listeners and cleans up state.
   */
  uninit() {
    const tabContainer = this.#window.gBrowser.tabContainer;
    tabContainer.removeEventListener("TabOpen", this);
    tabContainer.removeEventListener("TabSelect", this);
    tabContainer.removeEventListener("TabClose", this);

    this.#window.gBrowser.removeProgressListener(this.#tabsListener);
    this.#removeWindowEventListeners();
    this.#tabsListener = null;
    this.#tabStates = null;
    this.#window = null;
  }

  /**
   * Add event listeners to the window for ai-window:* events
   */
  #addWindowEventListeners() {
    this.#window.addEventListener(
      "ai-window:smartbar-input",
      this.#onSmartbarInput
    );

    this.#window.addEventListener(
      "ai-window:connected",
      this.#onAIWindowConnected
    );

    this.#window.addEventListener(
      "ai-window:opened-conversation",
      this.#onConversationOpened
    );

    this.#window.addEventListener(
      "ai-window:clear-conversation",
      this.#onConversationCleared
    );

    this.#window.addEventListener(
      "ai-window:conversation-changed",
      this.#onConversationChanged
    );

    this.#window.addEventListener(
      "ai-window:sidebar-toggle",
      this.#onSidebarToggle
    );

    this.#window.addEventListener(
      "ai-window:sidebar-navigating",
      this.#onSidebarNavigating
    );

    this.#window.addEventListener(
      "ai-window:close-sidebar",
      this.#onCloseSidebar
    );
  }

  /**
   * Remove event listeners from the window for ai-window:* events
   */
  #removeWindowEventListeners() {
    this.#window.removeEventListener(
      "ai-window:smartbar-input",
      this.#onSmartbarInput
    );

    this.#window.removeEventListener(
      "ai-window:connected",
      this.#onAIWindowConnected
    );

    this.#window.removeEventListener(
      "ai-window:opened-conversation",
      this.#onConversationOpened
    );

    this.#window.removeEventListener(
      "ai-window:clear-conversation",
      this.#onConversationCleared
    );

    this.#window.removeEventListener(
      "ai-window:conversation-changed",
      this.#onConversationChanged
    );

    this.#window.removeEventListener(
      "ai-window:sidebar-toggle",
      this.#onSidebarToggle
    );

    this.#window.removeEventListener(
      "ai-window:sidebar-navigating",
      this.#onSidebarNavigating
    );

    this.#window.removeEventListener(
      "ai-window:close-sidebar",
      this.#onCloseSidebar
    );
  }

  /**
   * Adds event listeners for any tabs that are present when the window opens.
   * The TabOpen event does not fire for the initial tab of a new window, for example.
   *
   * @private
   */
  #setUpInitialTabs() {
    this.#window.gBrowser.tabs.forEach(tab => {
      if (this.#tabStates.has(tab)) {
        return;
      }

      this.#addTabState(tab);
    });
  }

  /**
   * Handles tab events
   *
   * @param {Event} event
   *
   * @private
   */
  handleEvent(event) {
    switch (event.type) {
      case "TabOpen":
        this.#onTabOpen(event);
        break;

      case "TabSelect":
        this.#onTabSelect(event);
        break;

      case "TabClose":
        this.#onTabClose(event);
        break;
    }
  }

  /**
   * Handles TabOpen events from a new browser tab to add
   * event listeners to it.
   *
   * @param {Event} event
   *
   * @private
   */
  #onTabOpen(event) {
    this.#addTabState(event.target);
    Glean.smartWindow.tabsOpened.add(1);
  }

  /**
   * Handles TabSelect events from a new browser tab to
   * update the state of the sidebar.
   *
   * Sidebar behavior logic:
   * - shouldOpenSidebar defaults to true when no explicit state is set
   * - keepSidebarOpen can be explicitly set to false to close sidebar
   * - When shouldOpenSidebar is true, openSidebar is called with the tab's conversation
   * - If conversation is null/undefined, openSidebar will kick off creating a new conversation
   * - AI Window tabs (AIWINDOW_URL) always close the sidebar regardless of state
   * - If no convisationId is present but restore hasn't completed, we wait for restore to complete
   *   and re-check state in case the conversationId is from a restored
   *
   * @param {Event} event
   *
   * @private
   */
  async #onTabSelect(event) {
    if (!this.#window) {
      return;
    }

    const tab = event.target;

    const tabState = this.#getTabState(tab);
    const convId = tabState?.state?.conversationId;
    const tabUrl = tab.linkedBrowser?.currentURI?.spec ?? "";
    const isAIWindowTab = tabUrl === lazy.AIWINDOW_URL;
    const shouldKeepSidebar = getKeepSidebarOpenState(
      tabState?.state,
      lazy.sidebarOpenByDefault
    );

    // AI Window tab doesn't need sidebar
    if (isAIWindowTab) {
      lazy.AIWindowUI.restoreMemoriesState(this.#window, tab);
      lazy.AIWindowUI.closeSidebar(this.#window);
      return;
    }

    if (!shouldKeepSidebar) {
      lazy.AIWindowUI.updateSidebarInput(
        this.#window,
        EMPTY_SMARTBAR_INPUT_STATE
      );
      lazy.AIWindowUI.closeSidebar(this.#window);
      return;
    }

    let conversation = tabState?.state?.conversation ?? null;

    if (convId && !conversation) {
      conversation = await this.#computeConversation(tab, tabState);

      // Bail if the user switched tabs while we were awaiting the DB lookup.
      if (this.#window?.gBrowser.selectedTab !== tab) {
        return;
      }
    } else if (!convId && !this.#restoreCompleted) {
      // Restore hasn't completed yet so we wait and re-read state in case this
      // tab had a saved conversation that hasn't been loaded yet.
      await this.#restorePromise;

      if (this.#window?.gBrowser.selectedTab !== tab) {
        return;
      }

      conversation = this.#getTabState(tab)?.state?.conversation ?? null;
    }

    lazy.AIWindowUI.openSidebar(this.#window, conversation);
    if (tabState?.state) {
      lazy.AIWindowUI.updateSidebarInput(
        this.#window,
        tabState.state.input ?? EMPTY_SMARTBAR_INPUT_STATE
      );
    }
  }

  /**
   * Resolves the conversation object for a tab. If the tab state already has a
   * conversation in memory it is returned directly. If only a conversation ID is
   * present (e.g. restored from SessionStore), the DB is queried and the result
   * is cached back into the tab state.
   *
   * @param {MozTabbrowserTab} tab
   * @param {object} tabState
   * @returns {Promise<ChatConversation|null>}
   */
  async #computeConversation(tab, tabState) {
    const conversation = tabState?.state?.conversation ?? null;
    if (conversation) {
      return conversation;
    }

    const convId = tabState?.state?.conversationId;
    if (!convId) {
      return null;
    }

    const found = await lazy.ChatStore.findConversationById(convId);
    if (found) {
      this.#getTabState(tab, { conversation: found });
    }
    return found;
  }

  /**
   * Handles TabClose events from a new browser tab to
   * clean up after the tab is gone.
   *
   * @param {Event} event
   *
   * @private
   */
  #onTabClose(event) {
    this.#removeEventListeners(event.target);
  }

  /**
   * Adds a tab to the state map.
   *
   * @param {MozTabbrowserTab} tab
   *
   * @private
   */
  #addTabState(tab) {
    this.#tabStates.set(tab, { state: null });
  }

  /**
   * Removes necessary event listeners from a tab.
   *
   * @param {MozTabbrowserTab} tab
   *
   * @private
   */
  #removeEventListeners(tab) {
    this.#tabStates.delete(tab);
  }

  /**
   * Listens for ai-window:connected events from ai-window.mjs instances
   *
   * @param {AIWindowStateEvent} event
   *
   * @private
   */
  #onAIWindowConnected = async event => {
    if (!this.#window) {
      return;
    }

    const { mode, pageUrl, conversationId, tab } = event.detail;
    const stateUpdate = { pageUrl };
    // When a fullpage conversation moves to the sidebar, the sidebar's
    // ai-window also fires this event with mode "sidebar". Writing that
    // to the tab state would break onLocationChange, which uses the mode
    // to decide if it should auto-open/close the sidebar during navigation.
    if (mode === "fullpage") {
      stateUpdate.mode = mode;
    }

    const tabState = this.#getTabState(tab, stateUpdate);
    if (!tabState.state?.conversationId) {
      this.#getTabState(tab, { conversationId });
    }
    const { input } = tabState.state;

    const storedConversationId =
      tabState.state?.conversationId || conversationId;
    const conversation =
      await lazy.ChatStore.findConversationById(storedConversationId);
    const isAIWindow = pageUrl === lazy.AIWINDOW_URL;

    const selectedTab = this.#window?.gBrowser.selectedTab;

    const needsSidebar =
      selectedTab === tab &&
      mode === "fullpage" &&
      !isAIWindow &&
      hasInputContent(input) &&
      conversation &&
      conversation.messages.length;

    // NOTE: Don't need to fire open/close sidebar from here, the location change
    // event handler is taking care of that logic.
    if (needsSidebar) {
      lazy.AIWindowUI.updateSidebarInput(
        this.#window,
        tabState.state.input ?? EMPTY_SMARTBAR_INPUT_STATE
      );
    }

    // Update the sidebar input when the sidebar ai-window connects
    if (mode === "sidebar" && selectedTab === tab) {
      lazy.AIWindowUI.updateSidebarInput(
        this.#window,
        tabState.state.input ?? EMPTY_SMARTBAR_INPUT_STATE
      );
    }
  };

  /**
   * On init, opens the sidebar for the currently selected tab if its persisted
   * state indicates a conversation should be shown.
   *
   * @private
   */
  async #restoreInitialTabSidebar() {
    await lazy.SessionStore.promiseAllWindowsRestored;

    if (!this.#window) {
      return;
    }

    const tab = this.#window.gBrowser.selectedTab;
    const tabUrl = tab.linkedBrowser?.currentURI?.spec ?? "";

    if (tabUrl === lazy.AIWINDOW_URL) {
      return;
    }

    let restoredState;
    try {
      const saved = lazy.SessionStore.getCustomTabValue(tab, SESSION_STORE_KEY);
      restoredState = saved ? JSON.parse(saved) : null;
    } catch {
      restoredState = null;
    }

    const { conversationId, keepSidebarOpen } = restoredState ?? {};

    if (
      !conversationId ||
      !getKeepSidebarOpenState(restoredState, lazy.sidebarOpenByDefault)
    ) {
      return;
    }

    const conversation =
      await lazy.ChatStore.findConversationById(conversationId);

    if (!this.#window || this.#window.gBrowser.selectedTab !== tab) {
      return;
    }

    this.#getTabState(tab, { conversationId, conversation, keepSidebarOpen });
    lazy.AIWindowUI.openSidebar(this.#window, conversation);
  }

  /**
   * Gets the state for the specified tab. Will update the state
   * if a newState is passed in.
   *
   * @param {*} tab The browser tab to get state for
   * @param {*} [newState=null] New state to update the tab with
   *
   * @returns {TabState}
   *
   * @private
   */
  #getTabState(tab, newState = null) {
    if (!this.#tabStates) {
      return {};
    }

    const tabState = this.#tabStates.get(tab) ?? {};

    if (tabState.state === null) {
      const saved = lazy.SessionStore.getCustomTabValue(tab, SESSION_STORE_KEY);
      try {
        tabState.state = saved ? JSON.parse(saved) : {};
      } catch {
        tabState.state = {};
      }
      this.#tabStates.set(tab, tabState);
    }

    if (newState) {
      // Remove tab reference so a strong reference to the
      // tab is not stored in the value of the WeakMap
      delete newState.tab;

      const oldState = tabState.state ?? { input: EMPTY_SMARTBAR_INPUT_STATE };
      // Set input to empty if oldState.mode is fullpage so the input
      // is empty when the fullpage mode swaps to sidebar mode. We
      // don't need to track the input state for fullpage mode so
      // it stays empty until it's in sidebar mode.
      const oldInput =
        oldState.mode === "fullpage"
          ? EMPTY_SMARTBAR_INPUT_STATE
          : oldState.input;

      // Overlay the newState to override the oldState values
      tabState.state = {
        ...oldState,
        input: oldInput,
        ...newState,
      };

      // Enforce the above: newState may carry an input value, but fullpage
      // mode input should never be stored.
      if (tabState.state.mode === "fullpage") {
        tabState.state.input = EMPTY_SMARTBAR_INPUT_STATE;
      }

      this.#tabStates.set(tab, tabState);

      const { conversationId, keepSidebarOpen } = tabState.state;
      if (conversationId && keepSidebarOpen !== false) {
        lazy.SessionStore.setCustomTabValue(
          tab,
          SESSION_STORE_KEY,
          JSON.stringify({ conversationId, keepSidebarOpen })
        );
      } else {
        lazy.SessionStore.deleteCustomTabValue(tab, SESSION_STORE_KEY);
      }
    }

    return tabState;
  }

  /**
   * Handles input events from the Smartbar, updates the state
   * with the latest input
   *
   * @param {TabStateEvent} event
   */
  #onSmartbarInput = event => {
    this.#getTabState(event.detail.tab, event.detail);
  };

  /**
   * Handles ai-window:opened-conversation events from the ai-window.mjs,
   * updates the state with conversation info
   *
   * @param {TabStateEvent} event
   */
  #onConversationOpened = event => {
    const { mode, conversationId, tab, conversation } = event.detail;

    const stateUpdate = {
      conversation,
      conversationId,
    };
    // When a fullpage conversation moves to the sidebar, the sidebar's
    // ai-window also fires this event with mode "sidebar". Writing that
    // to the tab state would break onLocationChange, which uses the mode
    // to decide if it should auto-open/close the sidebar during navigation.
    if (mode === "fullpage") {
      stateUpdate.mode = mode;
    }
    this.#getTabState(tab, stateUpdate);
  };

  /**
   * Handles ai-window:clear-conversation events from the ai-window.mjs,
   * clears the conversation ID from the tab state but preserves other state
   *
   * @param {TabStateEvent} event
   */
  #onConversationCleared = event => {
    const { tab, conversation, conversationId } = event.detail;
    const currentTabState = this.#getTabState(tab);

    // Preserve existing state and keep the newly-swapped empty conversation
    // so tab switches back to this tab reuse the same instance (and its
    // cached transient starter prompts).
    if (currentTabState?.state) {
      this.#getTabState(tab, {
        ...currentTabState.state,
        conversationId,
        conversation,
      });
    }
  };

  /**
   * Handles ai-window:conversation-changed events dispatched whenever
   * an ai-window's active conversation is swapped. Keeps the tab state's
   * conversation in sync with the live ai-window so consumers (e.g. the
   * empty-close count) read the conversation the user actually engaged with,
   * then triggers starter prompt loading when the conversation is empty and
   * the current page URL differs from the one starters were already loaded for.
   *
   * @param {TabStateEvent} event
   */
  #onConversationChanged = event => {
    const { conversation, mode, tab } = event.detail;

    if (tab && conversation) {
      this.#getTabState(tab, {
        conversation,
        conversationId: conversation.id,
      });
    }

    if (!conversation || conversation.messageCount) {
      return;
    }

    const currentUrl = tab.linkedBrowser.currentURI.spec ?? "";
    const dedupSkip = conversation.transientStarterUrl === currentUrl;
    if (dedupSkip) {
      return;
    }

    lazy.AIWindowUI.updateStarterPrompts(this.#window, false, mode, tab);
  };

  /**
   * Handles ai-window:sidebar-toggle events from the AIWindowUI.sys.mjs,
   * updates sidebar state flags based on toggle action
   *
   * @param {TabStateEvent} event
   */
  #onSidebarToggle = event => {
    const { tab, isOpen, source } = event.detail;
    const currentTabState = this.#getTabState(tab);

    // Only update the keepSidebarOpen state if the sidebar was
    // toggled by a user action.
    if (currentTabState?.state && source === "toggle") {
      this.#getTabState(tab, {
        ...currentTabState.state,
        keepSidebarOpen: isOpen,
      });
    }

    if (isOpen) {
      if (source === "toggle") {
        lazy.AIWindowUI.openSidebar(
          this.#window,
          currentTabState?.state?.conversation ?? null
        );
      }
      lazy.AIWindowUI.updateSidebarInput(
        this.#window,
        currentTabState?.state?.input ?? EMPTY_SMARTBAR_INPUT_STATE
      );
    } else {
      this.#updateEmptyCloseCount(
        currentTabState?.state?.conversation ?? null,
        source
      );
    }
  };

  /**
   * Updates the empty-close count when the sidebar closes. A started
   * conversation means the user engaged with the sidebar, so the count is reset
   * to 0 to keep the "keep closed" prompt from targeting active users. This
   * reset runs even once the trigger count is reached, otherwise an engaged user
   * stays stuck at the trigger and keeps seeing the prompt. An empty close
   * increments the count, capped at the trigger.
   *
   * @param {?ChatConversation} conversation The closed sidebar's conversation.
   * @param {'close' | 'toggle'} source
   */
  #updateEmptyCloseCount(conversation, source) {
    if (!["close", "toggle"].includes(source)) {
      return;
    }

    if (conversation?.messageCount) {
      if (lazy.sidebarEmptyCloseCount !== 0) {
        Services.prefs.setIntPref(SIDEBAR_EMPTY_CLOSE_COUNT_PREF, 0);
      }
      return;
    }

    if (
      lazy.sidebarEmptyCloseCount >= SIDEBAR_EMPTY_CLOSE_PROMPT_TRIGGER_COUNT
    ) {
      return;
    }

    Services.prefs.setIntPref(
      SIDEBAR_EMPTY_CLOSE_COUNT_PREF,
      lazy.sidebarEmptyCloseCount + 1
    );
  }

  /**
   * Handles ai-window:sidebar-navigating events dispatched when the
   * sidebar's smartbar commits a navigate or search action.
   * Clears the stored input for the current tab.
   *
   * @param {Event} event
   */
  #onSidebarNavigating = event => {
    const tab = event.detail.tab;
    if (!tab) {
      return;
    }

    this.#getTabState(tab, { input: EMPTY_SMARTBAR_INPUT_STATE });
  };

  #onCloseSidebar = () => {
    lazy.AIWindowUI.closeSidebar(this.#window, "toggle");
  };

  /**
   * Gets a progress listener for the selected tab.
   */
  #getTabsListener() {
    return {
      QueryInterface: ChromeUtils.generateQI([
        "nsIWebProgressListener",
        "nsISupportsWeakReference",
      ]),

      onLocationChange: async (
        webProgress,
        _request,
        locationURI,
        _flags,
        isTabSwitch
      ) => {
        // tabbrowser.updateCurrentBrowser synthesizes onLocationChange on tab
        // switch, but we already have onTabSelect with separate logic for now
        if (!webProgress.isTopLevel || isTabSwitch || !this.#tabStates) {
          return;
        }

        const tab = this.#window.gBrowser.selectedTab;
        let tabState = this.#tabStates.get(tab);

        lazy.AIWindowUI.updateStarterPrompts(this.#window, true);

        if (!tabState || !tabState.state?.conversationId) {
          return;
        }

        // If the new URL is going away from fullpage mode
        const isAiWindowUrl = locationURI.spec === lazy.AIWINDOW_URL;

        if (!isAiWindowUrl) {
          lazy.SmartWindowTelemetry.recordUriLoad();
        }

        const isSidebarOpen = lazy.AIWindowUI.isSidebarOpen(this.#window);
        const isFullPageMode = tabState.state.mode === "fullpage";

        const shouldKeepSidebarOpen = getKeepSidebarOpenState(
          tabState.state,
          lazy.sidebarOpenByDefault
        );

        if (isFullPageMode && isAiWindowUrl && isSidebarOpen) {
          lazy.AIWindowUI.closeSidebar(this.#window);
        } else if (
          isFullPageMode &&
          !isAiWindowUrl &&
          !isSidebarOpen &&
          shouldKeepSidebarOpen
        ) {
          lazy.AIWindowUI.openSidebar(
            this.#window,
            tabState.state.conversation
          );
          tabState = this.#getTabState(tab, {
            input: EMPTY_SMARTBAR_INPUT_STATE,
          });
        }

        if (!isAiWindowUrl && lazy.AIWindowUI.isSidebarOpen(this.#window)) {
          lazy.AIWindowUI.updateSidebarInput(
            this.#window,
            tabState.state.input ?? EMPTY_SMARTBAR_INPUT_STATE
          );
        }
      },

      onStateChange() {},
      onProgressChange() {},
      onStatusChange() {},
      onSecurityChange() {},
      onContentBlockingEvent() {},
    };
  }
}
