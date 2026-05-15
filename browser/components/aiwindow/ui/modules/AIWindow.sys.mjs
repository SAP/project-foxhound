/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * @import {SmartbarInput} from "chrome://browser/content/urlbar/SmartbarInput.mjs"
 */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

export const AIWINDOW_URL = "chrome://browser/content/aiwindow/aiWindow.html";
const AIWINDOW_URI = Services.io.newURI(AIWINDOW_URL);
const FIRSTRUN_URL = "chrome://browser/content/aiwindow/firstrun.html";
const FIRSTRUN_URI = Services.io.newURI(FIRSTRUN_URL);

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AIWindowTabStatesManager:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowTabStatesManager.sys.mjs",
  AIWindowAccountAuth:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowAccountAuth.sys.mjs",
  AIWindowMenu:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowMenu.sys.mjs",
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.sys.mjs",
  AIWindowUI:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs",
  ChatStore:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs",
  NewTabPagePreloading:
    "moz-src:///browser/components/tabbrowser/NewTabPagePreloading.sys.mjs",
  ONLOGOUT_NOTIFICATION: "resource://gre/modules/FxAccountsCommon.sys.mjs",
  PanelMultiView:
    "moz-src:///browser/components/customizableui/PanelMultiView.sys.mjs",
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
  SearchService: "moz-src:///toolkit/components/search/SearchService.sys.mjs",
  SearchUIUtils: "moz-src:///browser/components/search/SearchUIUtils.sys.mjs",
  MemoriesSchedulers:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesSchedulers.sys.mjs",
});

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "hasFirstrunCompleted",
  "browser.smartwindow.firstrun.hasCompleted"
);

/**
 * AI Window Service
 */

export const AIWindow = {
  _initialized: false,
  _windowStates: new WeakMap(),
  _aiWindowMenu: null,

  /**
   * A WeakMap<window, AIWindowTabStatesManager> that keeps references
   * of AIWindowTabStatesManager per window.
   */
  _aiWindowTabStateManagers: new WeakMap(),

  /**
   * Handles startup tasks
   */

  init(win) {
    if (!this._windowStates.has(win)) {
      this._windowStates.set(win, {});
      this.initializeAITabsToolbar(win);
      this._initializeAskButtonOnToolbox(win);
      this._updateWindowSwitcherPosition(win);
    }

    if (
      !this._aiWindowTabStateManagers.has(win) &&
      this.isAIWindowActive(win)
    ) {
      this._aiWindowTabStateManagers.set(
        win,
        new lazy.AIWindowTabStatesManager(win)
      );
    }

    if (this._initialized) {
      return;
    }

    ChromeUtils.defineLazyGetter(AIWindow, "chatStore", () => lazy.ChatStore);
    Services.obs.addObserver(this, lazy.ONLOGOUT_NOTIFICATION);
    this._initialized = true;

    // On startup/restart, if the first window initialized is an
    // AI window, we need to start the memories schedulers.
    if (this.isAIWindowActive(win)) {
      lazy.MemoriesSchedulers.maybeRunAndSchedule();
    }
  },

  uninit() {
    if (!this._initialized) {
      return;
    }
    Services.obs.removeObserver(this, lazy.ONLOGOUT_NOTIFICATION);
    this._initialized = false;
  },

  observe(_subject, topic) {
    if (topic === lazy.ONLOGOUT_NOTIFICATION) {
      this._onAccountLogout();
    }
  },

  // Switches all active AI Windows back to classic mode when the user signs out
  // of their Firefox Account.
  _onAccountLogout() {
    for (const win of Services.wm.getEnumerator("navigator:browser")) {
      if (!win.closed && this.isAIWindowActive(win)) {
        this.toggleAIWindow(win, false);
      }
    }
  },

  // Checks if there are any open AI Windows. It's used to determine if certain
  // operations (like Account sign-out warnings) need to account for active AI
  // Window sessions.
  hasActiveAIWindows() {
    for (const win of Services.wm.getEnumerator("navigator:browser")) {
      if (!win.closed && this.isAIWindowActiveAndEnabled(win)) {
        return true;
      }
    }
    return false;
  },

  _reconcileNewTabPages(win, previousNewTabURL) {
    const newTabURI = Services.io.newURI(win.BROWSER_NEW_TAB_URL);
    const oldTabURI = Services.io.newURI(previousNewTabURL);
    const aboutNewTabURI = Services.io.newURI("about:newtab");
    const aboutHomeURI = Services.io.newURI("about:home");
    const triggeringPrincipal =
      Services.scriptSecurityManager.getSystemPrincipal();

    for (let tab of win.gBrowser.tabs) {
      const browser = tab.linkedBrowser;
      if (!browser?.currentURI) {
        continue;
      }

      const currentURI = browser.currentURI;

      if (
        currentURI.equalsExceptRef(oldTabURI) ||
        currentURI.equalsExceptRef(aboutNewTabURI) ||
        currentURI.equalsExceptRef(aboutHomeURI)
      ) {
        if (this._hasActiveChatInBrowser(browser)) {
          continue;
        }
        browser.loadURI(newTabURI, { triggeringPrincipal });
      }
    }
  },

  _hasActiveChatInBrowser(browser) {
    const aiWindowElement = browser.contentDocument?.querySelector("ai-window");
    if (!aiWindowElement) {
      return false;
    }
    return aiWindowElement.classList.contains("chat-active");
  },

  _onAIWindowEnabledPrefChange() {
    ChromeUtils.nondeterministicGetWeakMapKeys(this._windowStates).forEach(
      win => {
        if (win && !win.closed) {
          this._updateButtonVisibility(win);
        }
      }
    );
  },

  _updateButtonVisibility(win) {
    const isPrivateWindow = lazy.PrivateBrowsingUtils.isWindowPrivate(win);
    const modeSwitcherButton = win.document.getElementById("ai-window-toggle");
    if (modeSwitcherButton) {
      modeSwitcherButton.hidden = !this.isAIWindowEnabled() || isPrivateWindow;
    }
  },

  _onVerticalTabsPrefChange() {
    ChromeUtils.nondeterministicGetWeakMapKeys(this._windowStates).forEach(
      win => {
        if (win && !win.closed) {
          this._updateWindowSwitcherPosition(win);
        }
      }
    );
  },

  _updateWindowSwitcherPosition(win) {
    const modeSwitcherButton = win.document.getElementById("ai-window-toggle");

    const targetToolbar = win.document.getElementById(
      this.verticalTabsEnabled ? "nav-bar" : "TabsToolbar"
    );

    const titlebarContainer = targetToolbar.querySelector(
      ".titlebar-buttonbox-container"
    );

    titlebarContainer.before(modeSwitcherButton);
  },

  /*
   * Initializes the toolbox button that opens the assistant sidebar.
   */
  _initializeAskButtonOnToolbox(win) {
    const askButton = win.document.getElementById("smartwindow-ask-button");
    if (!askButton) {
      return;
    }
    askButton.hidden = !this.isAIWindowActive(win);
  },

  /**
   * Sets options for new AI Window if new or inherited conditions are met
   *
   * @param {object} options Used in BrowserWindowTracker.openWindow
   * @param {object} options.openerWindow Window making the BrowserWindowTracker.openWindow call
   * @param {object} options.args Array of arguments to pass to new window
   * @param {boolean} [options.aiWindow] Should new window be AI Window (true), Classic Window (false), or inherited from opener (undefined, default)
   * @param {boolean} [options.private] Should new window be Private Window
   * @param {string} [options.restoreSessionURL] URL of the selected tab being restored
   *
   * @returns {object} Modified arguments appended to the options object
   */
  handleAIWindowOptions({
    openerWindow,
    args,
    aiWindow = undefined,
    private: isPrivate = false,
    restoreSessionURL = "",
  } = {}) {
    // Indicates whether the new window should inherit AI Window state from opener window
    const canInheritAIWindow =
      this.isAIWindowActiveAndEnabled(openerWindow) &&
      !isPrivate &&
      typeof aiWindow === "undefined";

    const willOpenAIWindow =
      (aiWindow && this.isAIWindowEnabled()) || canInheritAIWindow;

    if (!willOpenAIWindow) {
      return args;
    }

    args ??= Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);

    let initialURL = "";
    if (!args.length) {
      const aiWindowURI = Cc["@mozilla.org/supports-string;1"].createInstance(
        Ci.nsISupportsString
      );
      if (!restoreSessionURL) {
        initialURL = lazy.hasFirstrunCompleted ? AIWINDOW_URL : FIRSTRUN_URL;
      }
      aiWindowURI.data = initialURL;
      args.appendElement(aiWindowURI);
    }

    let propBag;
    try {
      propBag = args.length > 1 && args.queryElementAt(1, Ci.nsIPropertyBag2);
    } catch (e) {
      console.error(
        new Error(
          "Tried to create AI window but property bag argument is wrong"
        ),
        propBag
      );
      return args;
    }
    if (!propBag) {
      propBag = Cc["@mozilla.org/hash-property-bag;1"].createInstance(
        Ci.nsIWritablePropertyBag2
      );
      args.appendElement(propBag);
    }

    propBag.setPropertyAsBool("ai-window", true);
    const willOpenImmersive = this.immersiveViewURIs.some(
      uri => uri.spec == (initialURL || restoreSessionURL)
    );
    if (willOpenImmersive) {
      propBag.setPropertyAsBool("aiwindow-immersive-view", true);
    }

    return args;
  },

  /**
   * Show Window Switcher button in tabs toolbar
   *
   * @param {object} win caller window
   */
  handleAIWindowSwitcher(win) {
    let view = lazy.PanelMultiView.getViewNode(
      win.document,
      "ai-window-toggle-view"
    );

    const isPrivateWindow = lazy.PrivateBrowsingUtils.isWindowPrivate(win);

    if (!isPrivateWindow) {
      view.querySelector("#ai-window-switch-classic").hidden = false;
      view.querySelector("#ai-window-switch-ai").hidden = false;
    }

    let windowState = this._windowStates.get(win);
    if (!windowState) {
      windowState = {};
      this._windowStates.set(win, windowState);
    }

    if (windowState.viewInitialized) {
      return;
    }

    view.addEventListener("command", event => {
      switch (event.target.id) {
        case "ai-window-switch-classic":
          this.toggleAIWindow(win, false);
          break;
        case "ai-window-switch-ai":
          this.launchWindow(win.gBrowser.selectedBrowser);
          break;
      }
    });

    windowState.viewInitialized = true;
  },

  /**
   * Show Window Switcher button in tabs toolbar
   *
   * @param {Window} win caller window
   */
  initializeAITabsToolbar(win) {
    const modeSwitcherButton = win.document.getElementById("ai-window-toggle");
    if (!modeSwitcherButton) {
      return;
    }

    this._updateButtonVisibility(win);

    modeSwitcherButton.addEventListener("command", event => {
      if (win.PanelUI.panel.state == "open") {
        win.PanelUI.hide();
      } else if (win.PanelUI.panel.state == "closed") {
        this.handleAIWindowSwitcher(win);
        win.PanelUI.showSubView("ai-window-toggle-view", event.target, event);
      }
    });
  },

  /**
   * Is current window an AI Window
   *
   * @param {Window} win current Window
   * @returns {boolean} whether current Window is an AI Window
   */
  isAIWindowActive(win) {
    return !!win && win.document.documentElement.hasAttribute("ai-window");
  },

  /**
   * Is AI Window enabled
   *
   * @returns {boolean} whether AI Window is enabled
   */
  isAIWindowEnabled() {
    return this.AIWindowEnabled;
  },

  isAIWindowActiveAndEnabled(win) {
    return this.isAIWindowActive(win) && this.AIWindowEnabled;
  },

  /**
   * Check if window is being opened as an AI Window.
   *
   * @param {Window} win - The window to check
   * @returns {boolean} whether the window is being opened as an AI Window
   */
  isOpeningAIWindow(win) {
    const windowArgs = win?.arguments?.[1];
    if (!(windowArgs instanceof Ci.nsIPropertyBag2)) {
      return false;
    }

    return windowArgs.hasKey("ai-window");
  },

  /**
   * Is AI Window content page active
   *
   * @param {nsIURI} uri current URI
   * @returns {boolean} whether AI Window content page is active
   */
  isAIWindowContentPage(uri) {
    return (
      AIWINDOW_URI.equalsExceptRef(uri) || FIRSTRUN_URI.equalsExceptRef(uri)
    );
  },

  /**
   * Adds the AI Window app menu options
   *
   * @param {Event} event - History menu click event
   * @param {Window} win - current Window reference
   *
   * @returns {Promise} - Resolves when menu is done being added
   */
  appMenu(event, win) {
    if (!this._aiWindowMenu) {
      this._aiWindowMenu = new lazy.AIWindowMenu();
    }

    return this._aiWindowMenu.addMenuitems(event, win);
  },

  get newTabURL() {
    return AIWINDOW_URL;
  },

  get firstrunURL() {
    return FIRSTRUN_URL;
  },

  /**
   * Performs a search in the default search engine with
   * passed query in the current tab.
   *
   * @param {string} query
   * @param {Window} window
   */
  async performSearch(query, window) {
    let engine = null;
    try {
      engine = await lazy.SearchService.getDefault();
    } catch (error) {
      console.error(`Failed to get default search engine:`, error);
    }

    const triggeringPrincipal =
      Services.scriptSecurityManager.getSystemPrincipal();

    await lazy.SearchUIUtils.loadSearch({
      window,
      searchText: query,
      where: "current",
      usePrivate: false,
      triggeringPrincipal,
      policyContainer: null,
      engine,
      searchUrlType: null,
      sapSource: "smartwindow_assistant",
    });
  },

  /**
   * Moves a full-page AI Window conversation into the sidebar.
   *
   * @param {Window} win
   * @param {object} tab
   * @returns {Promise<XULElement|null>}
   */
  async moveConversationToSidebar(win, tab) {
    return lazy.AIWindowUI.moveFullPageToSidebar(win, tab);
  },

  /**
   * Opens the sidebar with the given conversation and continues streaming
   * the model response after a tool result.
   *
   * @param {Window} win
   * @param {ChatConversation} conversation
   */
  openSidebarAndContinue(win, conversation) {
    lazy.AIWindowUI.openSidebar(win, conversation);

    try {
      const sidebar = win.document.getElementById("ai-window-box");
      const aiBrowser = sidebar?.querySelector("#ai-window-browser");
      const aiWindow = aiBrowser?.contentDocument?.querySelector("ai-window");
      if (aiWindow?.reloadAndContinue) {
        aiWindow.reloadAndContinue(conversation);
        return;
      }
    } catch {
      // Content may not be loaded yet
    }

    // Sidebar content isn't ready; set a flag for it to pick up on load
    try {
      const sidebar = win.document.getElementById("ai-window-box");
      const aiBrowser = sidebar?.querySelector("#ai-window-browser");
      if (aiBrowser) {
        aiBrowser.setAttribute("data-continue-streaming", "true");
      }
    } catch {
      // Sidebar may not be available
    }
  },

  toggleAIWindow(win, isTogglingToAIWindow) {
    let isActive = this.isAIWindowActive(win);
    if (isActive != isTogglingToAIWindow) {
      lazy.NewTabPagePreloading.removePreloadedBrowser(win);

      const previousNewTabURL = win.BROWSER_NEW_TAB_URL;

      win.document.documentElement.toggleAttribute("ai-window");

      this._reconcileNewTabPages(win, previousNewTabURL);
      this._initializeAskButtonOnToolbox(win);
      Services.obs.notifyObservers(win, "ai-window-state-changed");

      if (isTogglingToAIWindow) {
        if (!this._aiWindowTabStateManagers.has(win)) {
          this._aiWindowTabStateManagers.set(
            win,
            new lazy.AIWindowTabStatesManager(win)
          );
        }

        lazy.MemoriesSchedulers.maybeRunAndSchedule();
      } else {
        // Close sidebar when switching back to classic window if it is open
        lazy.AIWindowUI.closeSidebar(win);
      }
    }
  },

  async _authorizeAndToggleWindow(win) {
    const authorized = await lazy.AIWindowAccountAuth.ensureAIWindowAccess(
      win.gBrowser.selectedBrowser
    );

    if (!authorized) {
      return false;
    }

    this.toggleAIWindow(win, true);

    if (!lazy.hasFirstrunCompleted) {
      win.gBrowser.loadURI(FIRSTRUN_URI, {
        triggeringPrincipal:
          Services.scriptSecurityManager.getSystemPrincipal(),
      });
    }

    return true;
  },

  async launchWindow(browser, openNewWindow = false) {
    if (!this.isAIWindowEnabled()) {
      Services.prefs.setBoolPref("browser.smartwindow.enabled", true);
    }

    if (!browser && !openNewWindow) {
      return false;
    }

    if (!openNewWindow) {
      return this._authorizeAndToggleWindow(browser.ownerGlobal);
    }

    const isAuthorized = await lazy.AIWindowAccountAuth.canAccessAIWindow();
    const windowPromise = lazy.BrowserWindowTracker.promiseOpenWindow({
      aiWindow: isAuthorized,
      openerWindow: browser?.ownerGlobal,
    });

    return this._authorizeAndToggleWindow(await windowPromise);
  },

  /**
   * Toggles the immersive view (hidden address bar and disabled tabs) depending on the URL passed
   *
   * @param {nsIURI} currentURI
   * @param {Window} win
   */
  updateImmersiveView(currentURI, win) {
    const root = win.document.getElementById("main-window");

    if (!currentURI) {
      return;
    }

    const aboutNewtabURI = Services.io.newURI("about:newtab");
    const aboutHomeURI = Services.io.newURI("about:home");
    const shouldHideSidebarForNewtab =
      currentURI.equalsExceptRef(aboutNewtabURI) ||
      currentURI.equalsExceptRef(aboutHomeURI);

    if (!this.isAIWindowActiveAndEnabled(win)) {
      root.toggleAttribute("hide-ai-sidebar", shouldHideSidebarForNewtab);
      root.removeAttribute("aiwindow-immersive-view");
      return;
    }

    /* any URL that should have the immersive view */
    const isImmersiveView = this.shouldUseImmersiveView(currentURI);

    root.toggleAttribute("hide-ai-sidebar", isImmersiveView);

    /* sets attr only for first run for css reasons */
    const isFirstRun = currentURI.equalsExceptRef(FIRSTRUN_URI);
    root.toggleAttribute("aiwindow-first-run", isFirstRun && isImmersiveView);
    root.toggleAttribute("aiwindow-immersive-view", isImmersiveView);

    // Set attr on the specific browser that has content to override color scheme
    win.gBrowser.selectedBrowser?.toggleAttribute(
      "smartwindow-content",
      isImmersiveView
    );

    /* disabling the current tab from being clicked from the keyboard */
    const selectedTab = win.gBrowser.selectedTab;
    if (isFirstRun) {
      selectedTab?.setAttribute("tabindex", -1);
    } else {
      selectedTab?.removeAttribute("tabindex");
    }
  },

  immersiveViewURIs: [FIRSTRUN_URI, AIWINDOW_URI],
  /**
   * Whether the URI should trigger immersive view (hiding the address bar and disabling tabs)
   *
   * @param {nsIURI} uri
   */
  shouldUseImmersiveView(uri) {
    return (
      !!uri &&
      this.immersiveViewURIs.some(immersiveURI =>
        immersiveURI.equalsExceptRef(uri)
      )
    );
  },

  /**
   * Optimistically try to get the smartbar for the currently selected
   * browser in the window.
   *
   * @param {Window} window
   * @returns {SmartbarInput | null}
   */
  getSmartbarForWindow(window) {
    // In principle we could be called when some other tab is loaded, even in
    // a remote process, which means contentDocument would be null.
    // Even if we _do_ have aiWindow.html loaded, the smartbar might not be in
    // the DOM yet (it gets constructed lazily) - hence the nullchecks.
    let { contentDocument } = window.gBrowser.selectedBrowser;
    let aiWindowCE = contentDocument?.querySelector("ai-window");
    return aiWindowCE?.shadowRoot.getElementById("ai-window-smartbar");
  },
};

XPCOMUtils.defineLazyPreferenceGetter(
  AIWindow,
  "AIWindowEnabled",
  "browser.smartwindow.enabled",
  false,
  AIWindow._onAIWindowEnabledPrefChange.bind(AIWindow)
);

XPCOMUtils.defineLazyPreferenceGetter(
  AIWindow,
  "verticalTabsEnabled",
  "sidebar.verticalTabs",
  false,
  AIWindow._onVerticalTabsPrefChange.bind(AIWindow)
);
