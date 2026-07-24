/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  AppInfo: "chrome://remote/content/shared/AppInfo.sys.mjs",
  EventPromise: "chrome://remote/content/shared/Sync.sys.mjs",
  MobileTabBrowser: "chrome://remote/content/shared/MobileTabBrowser.sys.mjs",
  UserContextManager:
    "chrome://remote/content/shared/UserContextManager.sys.mjs",
  windowManager: "chrome://remote/content/shared/WindowManager.sys.mjs",
});

class TabManagerClass {
  /**
   * Retrieve all the tabs in open browser windows.
   *
   * @returns {Array<Tab>}
   *     All the open browser tabs. Will return an empty list if tab browser
   *     is not available or tabs are undefined.
   */
  get allTabs() {
    return lazy.windowManager.windows.flatMap(win =>
      this.getTabsForWindow(win)
    );
  }

  /**
   * Get the linked `xul:browser` for the specified tab.
   *
   * @param {Tab} tab
   *     The tab whose browser needs to be returned.
   *
   * @returns {XULBrowser|null}
   *     The linked browser for the tab or `null` if no browser can be found.
   */
  getBrowserForTab(tab) {
    return tab?.linkedBrowser ?? null;
  }

  /**
   * Retrieve all the browser elements from tabs as contained in open windows.
   *
   * By default excludes browsers for unloaded tabs.
   *
   * @param {object=} options
   * @param {boolean=} options.unloaded
   *     Pass true to also retrieve browsers for unloaded tabs. Defaults to
   *     false.
   *
   * @returns {Array<XULBrowser>}
   *     All the found <xul:browser>s. Will return an empty array if
   *     no windows and tabs can be found.
   */
  getBrowsers(options = {}) {
    const { unloaded = false } = options;

    return this.allTabs
      .map(tab => this.getBrowserForTab(tab))
      .filter(browser => {
        return (
          browser !== null &&
          (unloaded ||
            this.isValidCanonicalBrowsingContext(browser.browsingContext))
        );
      });
  }

  /**
   * Return the tab browser for the specified chrome window.
   *
   * @param {ChromeWindow} win
   *     Window whose <code>tabbrowser</code> needs to be accessed.
   *
   * @returns {TabBrowser|null}
   *     Tab browser or `null` if it's not a browser window.
   */
  getTabBrowser(win) {
    if (!win) {
      return null;
    }

    if (lazy.AppInfo.isAndroid) {
      return new lazy.MobileTabBrowser(win);
    } else if (lazy.AppInfo.isFirefox) {
      return win.gBrowser;
    }

    return null;
  }

  /**
   * Create a new tab.
   *
   * @param {object} options
   * @param {boolean=} options.focus
   *     Set to true if the new tab should be focused (selected). Defaults to
   *     false. `false` value is not properly supported on Android, additional
   *     focus of previously selected tab is required after initial navigation.
   * @param {Tab=} options.referenceTab
   *     The reference tab after which the new tab will be added. If no
   *     reference tab is provided, the new tab will be added after all the
   *     other tabs.
   * @param {string=} options.userContextId
   *     A user context id from UserContextManager.
   * @param {window=} options.window
   *     The window where the new tab will open. Defaults to
   *     Services.wm.getMostRecentBrowserWindow if no window is provided.
   *     Will be ignored if referenceTab is provided.
   */
  async addTab(options = {}) {
    let {
      focus = false,
      referenceTab = null,
      userContextId = null,
      window = Services.wm.getMostRecentBrowserWindow(),
    } = options;

    let tabIndex;
    if (referenceTab != null) {
      // If a reference tab was specified, the window should be the window
      // owning the reference tab.
      window = this.getWindowForTab(referenceTab);
    }

    if (referenceTab != null) {
      tabIndex = this.getTabsForWindow(window).indexOf(referenceTab) + 1;
    }

    const tabBrowser = this.getTabBrowser(window);

    const tab = await tabBrowser.addTab("about:blank", {
      tabIndex,
      triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
      userContextId: lazy.UserContextManager.getInternalIdById(userContextId),
    });

    if (focus) {
      await this.selectTab(tab);
    }

    return tab;
  }

  /**
   * Retrieve the count of all the open tabs.
   *
   * @returns {number} Number of open tabs.
   */
  getTabCount() {
    return lazy.windowManager.windows.reduce((total, win) => {
      // For browser windows count the tabs. Otherwise take the window itself.
      const tabsLength = this.getTabsForWindow(win).length;
      return total + (tabsLength ? tabsLength : 1);
    }, 0);
  }

  /**
   * Retrieve the tab owning a Browsing Context.
   *
   * @param {BrowsingContext=} browsingContext
   *     The browsing context to get the tab from.
   *
   * @returns {Tab|null}
   *     The tab owning the Browsing Context.
   */
  getTabForBrowsingContext(browsingContext) {
    const browser = browsingContext?.top.embedderElement;
    if (!browser) {
      return null;
    }

    const tabBrowser = this.getTabBrowser(browser.ownerGlobal);
    return tabBrowser.getTabForBrowser(browser);
  }

  /**
   * Retrieve the list of tabs for a given window.
   *
   * @param {ChromeWindow} win
   *     Window whose tabs need to be returned.
   *
   * @returns {Array<Tab>}
   *     The list of tabs. Will return an empty list if tab browser is not available
   *     or tabs are undefined.
   */
  getTabsForWindow(win) {
    const tabBrowser = this.getTabBrowser(win);

    // For web-platform reftests a faked tabbrowser is used,
    // which does not actually have tabs.
    if (tabBrowser && tabBrowser.tabs) {
      return tabBrowser.tabs;
    }

    return [];
  }

  getWindowForTab(tab) {
    // `.linkedBrowser.ownerGlobal` works both with Firefox Desktop and Mobile.
    // Other accessors (eg `.ownerGlobal` or `.browser.ownerGlobal`) fail on one
    // of the platforms.
    return tab.linkedBrowser.ownerGlobal;
  }

  /**
   * Check if the given argument is a valid canonical browsing context and was not
   * discarded.
   *
   * @param {BrowsingContext} browsingContext
   *     The browsing context to check.
   *
   * @returns {boolean}
   *     True if the browsing context is valid, false otherwise.
   */
  isValidCanonicalBrowsingContext(browsingContext) {
    return (
      CanonicalBrowsingContext.isInstance(browsingContext) &&
      !browsingContext.isDiscarded
    );
  }

  /**
   * Remove the given tab.
   *
   * @param {Tab} tab
   *     Tab to remove.
   * @param {object=} options
   * @param {boolean=} options.skipPermitUnload
   *     Flag to indicate if a potential beforeunload prompt should be skipped
   *     when closing the tab. Defaults to false.
   */
  async removeTab(tab, options = {}) {
    const { skipPermitUnload = false } = options;

    if (!tab) {
      return;
    }

    const ownerWindow = this.getWindowForTab(tab);
    const tabBrowser = this.getTabBrowser(ownerWindow);
    await tabBrowser.removeTab(tab, {
      skipPermitUnload,
    });
  }

  /**
   * Select the given tab.
   *
   * @param {Tab} tab
   *     Tab to select.
   *
   * @returns {Promise}
   *     Promise that resolves when the given tab has been selected.
   */
  async selectTab(tab) {
    if (!tab) {
      return Promise.resolve();
    }

    const ownerWindow = this.getWindowForTab(tab);
    const tabBrowser = this.getTabBrowser(ownerWindow);

    if (tab === tabBrowser.selectedTab) {
      return Promise.resolve();
    }

    const selected = new lazy.EventPromise(ownerWindow, "TabSelect");
    tabBrowser.selectedTab = tab;

    await selected;

    // Sometimes at that point window is not focused.
    if (Services.focus.activeWindow != ownerWindow) {
      const activated = new lazy.EventPromise(ownerWindow, "activate");
      ownerWindow.focus();
      return activated;
    }

    return Promise.resolve();
  }

  supportsTabs() {
    return lazy.AppInfo.isAndroid || lazy.AppInfo.isFirefox;
  }
}

// Expose a shared singleton.
export const TabManager = new TabManagerClass();
