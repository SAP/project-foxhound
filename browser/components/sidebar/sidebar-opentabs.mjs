/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

import { html, when } from "chrome://global/content/vendor/lit.all.mjs";

import { SidebarPage } from "./sidebar-page.mjs";

ChromeUtils.defineESModuleGetters(lazy, {
  NonPrivateTabs: "resource:///modules/OpenTabs.sys.mjs",
  OpenTabsController: "resource:///modules/OpenTabsController.sys.mjs",
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
  SidebarTreeView:
    "moz-src:///browser/components/sidebar/SidebarTreeView.sys.mjs",
  getTabsTargetForWindow: "resource:///modules/OpenTabs.sys.mjs",
});

export class SidebarOpenTabs extends SidebarPage {
  static properties = {
    windows: { type: Array },
  };

  initialWindowsReady = false;

  constructor() {
    super();
    this.windows = [];
    this.controller = new lazy.OpenTabsController();
    this.treeView = new lazy.SidebarTreeView(this, { multiSelect: false });
  }

  connectedCallback() {
    super.connectedCallback();
    const topWindow = this.topWindow;
    if (lazy.PrivateBrowsingUtils.isWindowPrivate(topWindow)) {
      this.openTabsTarget = lazy.getTabsTargetForWindow(topWindow);
    } else {
      this.openTabsTarget = lazy.NonPrivateTabs;
    }
    this.openTabsTarget.addEventListener("TabChange", this);
    this.openTabsTarget.readyWindowsPromise.finally(() => {
      this.initialWindowsReady = true;
      this.#updateWindowList();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.openTabsTarget.removeEventListener("TabChange", this);
  }

  shouldUpdate(changedProperties) {
    if (!this.initialWindowsReady) {
      return false;
    }
    return super.shouldUpdate(changedProperties);
  }

  handleEvent(e) {
    switch (e.type) {
      case "TabChange":
        this.#updateWindowList();
        break;
      default:
        super.handleEvent(e);
        break;
    }
  }

  #updateWindowList() {
    this.windows = [...this.openTabsTarget.currentWindows];
  }

  getTabItemsForWindow(win) {
    const tabs = this.openTabsTarget.getTabsForWindow(win);
    return this.controller.getTabListItems(tabs, false).map(item => ({
      ...item,
      secondaryL10nId: "fxviewtabrow-close-tab-button",
      secondaryL10nArgs: JSON.stringify({ tabTitle: item.title }),
    }));
  }

  #activateTab(tabElement) {
    if (!tabElement) {
      return;
    }
    const browserWindow = tabElement.documentGlobal;
    browserWindow.focus();
    browserWindow.gBrowser.selectedTab = tabElement;
  }

  #getPinnedIconSrc(item) {
    const { icon, url } = item;
    if (
      icon &&
      !icon.startsWith("http") &&
      !icon.startsWith("moz-remote-image:")
    ) {
      return icon;
    }
    if (url) {
      return `page-icon:${url}`;
    }
    return "chrome://global/skin/icons/defaultFavicon.svg";
  }

  onPrimaryAction(e) {
    this.#activateTab(e.originalTarget.tabElement);
  }

  onSecondaryAction(e) {
    const { tabElement } = e.detail.item;
    if (!tabElement) {
      return;
    }
    tabElement.documentGlobal.gBrowser.removeTabs([tabElement]);
  }

  #pinnedTabsTemplate(pinnedTabItems) {
    return html`
      <div
        class="pinned-tabs"
        role="tablist"
        data-l10n-id="sidebar-opentabs-pinned-tabs"
      >
        ${pinnedTabItems.map(
          item => html`
            <moz-button
              type="icon ghost"
              .iconSrc=${this.#getPinnedIconSrc(item)}
              title=${item.title}
              @click=${() => this.#activateTab(item.tabElement)}
            ></moz-button>
          `
        )}
      </div>
    `;
  }

  #windowCardTemplate(win, winID, isCurrent) {
    const items = this.getTabItemsForWindow(win);
    const pinnedTabItems = items.filter(item =>
      item.indicators?.includes("pinned")
    );
    const unpinnedTabItems = items.filter(
      item => !item.indicators?.includes("pinned")
    );
    const headerL10nId = isCurrent
      ? "sidebar-opentabs-current-window-header"
      : "sidebar-opentabs-window-header";
    return html`
      <moz-card
        type="accordion"
        expanded
        class="window-card"
        data-inner-id=${win.windowGlobalChild.innerWindowId}
        data-l10n-id=${headerL10nId}
        data-l10n-args=${JSON.stringify({ winID })}
      >
        ${when(pinnedTabItems.length, () =>
          this.#pinnedTabsTemplate(pinnedTabItems)
        )}
        <sidebar-tab-list
          maxTabsLength="-1"
          secondaryActionClass="dismiss-button"
          .multiSelect=${false}
          .tabItems=${unpinnedTabItems}
          @fxview-tab-list-primary-action=${this.onPrimaryAction}
          @fxview-tab-list-secondary-action=${this.onSecondaryAction}
        ></sidebar-tab-list>
      </moz-card>
    `;
  }

  render() {
    const topWindow = this.topWindow;
    let currentCard;
    const otherCards = [];
    let index = 1;
    for (const win of this.windows) {
      const winID = index++;
      const isCurrent = win === topWindow;
      const card = this.#windowCardTemplate(win, winID, isCurrent);
      if (isCurrent) {
        currentCard = card;
      } else {
        otherCards.push(card);
      }
    }
    return html`
      ${this.stylesheet()}
      <link
        rel="stylesheet"
        href="chrome://browser/content/sidebar/sidebar-opentabs.css"
      />
      <div class="sidebar-panel">
        <sidebar-panel-header
          data-l10n-id="sidebar-menu-open-tabs-header"
          data-l10n-attrs="heading"
          view="viewOpenTabsSidebar"
        ></sidebar-panel-header>
        <div class="sidebar-panel-scrollable-content">
          ${currentCard}${otherCards}
        </div>
      </div>
    `;
  }
}

customElements.define("sidebar-opentabs", SidebarOpenTabs);
