/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

const lazy = {};
const BROWSER_NEW_TAB_URL = "about:newtab";
const BROWSER_OPEN_TABS_URL = "about:opentabs";

ChromeUtils.defineESModuleGetters(lazy, {
  OpenTabsController: "resource:///modules/OpenTabsController.sys.mjs",
  NonPrivateTabs: "resource:///modules/OpenTabs.sys.mjs",
  getTabsTargetForWindow: "resource:///modules/OpenTabs.sys.mjs",
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
});

/**
 * A collection of open, unpinned, unsplit tabs for the current by window.
 */
class OpenTabsInSplitView extends MozLitElement {
  currentWindow = null;
  openTabsTarget = null;

  constructor() {
    super();
    this.currentWindow =
      this.ownerGlobal.top.browsingContext.embedderWindowGlobal.browsingContext.window;
    if (lazy.PrivateBrowsingUtils.isWindowPrivate(this.currentWindow)) {
      this.openTabsTarget = lazy.getTabsTargetForWindow(this.currentWindow);
    } else {
      this.openTabsTarget = lazy.NonPrivateTabs;
    }
    this.controller = new lazy.OpenTabsController(this, {
      component: "splitview",
    });
    this.listenersAdded = false;
  }

  static queries = {
    sidebarTabList: "sidebar-tab-list",
  };

  connectedCallback() {
    super.connectedCallback();
    this.addListeners(true);
    this.currentWindow.addEventListener("TabSelect", this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeListeners();
    this.currentWindow.removeEventListener("TabSelect", this);
  }

  addListeners(skipUpdate) {
    if (!this.listenersAdded) {
      this.openTabsTarget.addEventListener("TabChange", this);
      if (!skipUpdate) {
        this.requestUpdate();
      }
      this.listenersAdded = true;
    }
  }

  removeListeners() {
    if (this.listenersAdded) {
      this.openTabsTarget.removeEventListener("TabChange", this);
      this.listenersAdded = false;
    }
  }

  handleEvent(e) {
    switch (e.type) {
      case "TabChange":
        this.requestUpdate();
        break;
      case "TabSelect":
        if (this.currentSplitView) {
          this.addListeners();
          this.requestUpdate();
        } else {
          this.removeListeners();
        }
        break;
    }
  }

  getWindow() {
    return window.browsingContext.embedderWindowGlobal.browsingContext.window;
  }

  get currentSplitView() {
    const { gBrowser } = this.getWindow();
    return gBrowser.selectedTab.splitview;
  }

  onTabListRowClick(event) {
    const { gBrowser } = this.getWindow();
    const tab = event.originalTarget.tabElement;
    if (this.currentSplitView) {
      let aboutOpenTabsTab = gBrowser.getTabForBrowser(
        window.browsingContext.embedderElement
      );
      this.currentSplitView.replaceTab(aboutOpenTabsTab, tab);
    }
  }

  get nonSplitViewUnpinnedTabs() {
    const { gBrowser } = this.getWindow();
    return gBrowser.visibleTabs.filter(tab => {
      return (
        !tab.pinned &&
        !tab.splitview &&
        tab?.linkedBrowser?.currentURI?.spec !== BROWSER_OPEN_TABS_URL
      );
    });
  }

  render() {
    const { gBrowser } = this.getWindow();
    let tabs = this.nonSplitViewUnpinnedTabs;
    if (
      !tabs.length ||
      (gBrowser.selectedTab.linkedBrowser.currentURI.spec ===
        BROWSER_OPEN_TABS_URL &&
        !this.currentSplitView)
    ) {
      // If there are no unpinned, unsplit tabs to display or about:opentabs
      // is opened outside of a split view, open about:newtab instead
      this.getWindow().openTrustedLinkIn(BROWSER_NEW_TAB_URL, "current");
    }
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/tabbrowser/opentabs-splitview.css"
      />
      <link
        rel="stylesheet"
        href="chrome://browser/content/firefoxview/firefoxview.css"
      />
      <moz-card>
        <sidebar-tab-list
          maxTabsLength="-1"
          .tabItems=${this.controller.getTabListItems(tabs)}
          @fxview-tab-list-primary-action=${this.onTabListRowClick}
        >
        </sidebar-tab-list>
      </moz-card>
    `;
  }
}
customElements.define("splitview-opentabs", OpenTabsInSplitView);

window.addEventListener(
  "unload",
  () => {
    // Clear out the document so the disconnectedCallback will trigger
    // properly
    document.body.textContent = "";
  },
  { once: true }
);
