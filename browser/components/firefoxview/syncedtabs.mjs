/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  BrowserUtils: "resource://gre/modules/BrowserUtils.sys.mjs",
  SyncedTabs: "resource://services-sync/SyncedTabs.sys.mjs",
});

const { SyncedTabsErrorHandler } = ChromeUtils.importESModule(
  "resource:///modules/firefox-view-synced-tabs-error-handler.sys.mjs"
);
const { TabsSetupFlowManager } = ChromeUtils.importESModule(
  "resource:///modules/firefox-view-tabs-setup-manager.sys.mjs"
);

import {
  html,
  ifDefined,
  when,
} from "chrome://global/content/vendor/lit.all.mjs";
import { ViewPage } from "./viewpage.mjs";
import {
  escapeHtmlEntities,
  isSearchEnabled,
  searchTabList,
  MAX_TABS_FOR_RECENT_BROWSING,
} from "./helpers.mjs";

const SYNCED_TABS_CHANGED = "services.sync.tabs.changed";
const TOPIC_SETUPSTATE_CHANGED = "firefox-view.setupstate.changed";
const UI_OPEN_STATE = "browser.tabs.firefox-view.ui-state.tab-pickup.open";

class SyncedTabsInView extends ViewPage {
  constructor() {
    super();
    this._started = false;
    this.boundObserve = (...args) => this.observe(...args);
    this._currentSetupStateIndex = -1;
    this.errorState = null;
    this._id = Math.floor(Math.random() * 10e6);
    this.currentSyncedTabs = [];
    if (this.recentBrowsing) {
      this.maxTabsLength = MAX_TABS_FOR_RECENT_BROWSING;
    } else {
      // Setting maxTabsLength to -1 for no max
      this.maxTabsLength = -1;
    }
    this.devices = [];
    this.fullyUpdated = false;
    this.searchQuery = "";
    this.showAll = false;
    this.cumulativeSearches = 0;
  }

  static properties = {
    ...ViewPage.properties,
    errorState: { type: Number },
    currentSyncedTabs: { type: Array },
    _currentSetupStateIndex: { type: Number },
    devices: { type: Array },
    searchQuery: { type: String },
    showAll: { type: Boolean },
    cumulativeSearches: { type: Number },
  };

  static queries = {
    cardEls: { all: "card-container" },
    emptyState: "fxview-empty-state",
    searchTextbox: "fxview-search-textbox",
    tabLists: { all: "fxview-tab-list" },
  };

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("click", this);
  }

  start() {
    if (this._started) {
      return;
    }
    this._started = true;
    Services.obs.addObserver(this.boundObserve, TOPIC_SETUPSTATE_CHANGED);
    Services.obs.addObserver(this.boundObserve, SYNCED_TABS_CHANGED);

    this.updateStates();
    this.onVisibilityChange();

    if (this.recentBrowsing) {
      this.recentBrowsingElement.addEventListener(
        "fxview-search-textbox-query",
        this
      );
    }
  }

  stop() {
    if (!this._started) {
      return;
    }
    this._started = false;
    TabsSetupFlowManager.updateViewVisibility(this._id, "unloaded");
    this.onVisibilityChange();

    Services.obs.removeObserver(this.boundObserve, TOPIC_SETUPSTATE_CHANGED);
    Services.obs.removeObserver(this.boundObserve, SYNCED_TABS_CHANGED);

    if (this.recentBrowsing) {
      this.recentBrowsingElement.removeEventListener(
        "fxview-search-textbox-query",
        this
      );
    }
  }

  willUpdate(changedProperties) {
    if (changedProperties.has("searchQuery")) {
      this.cumulativeSearches = this.searchQuery
        ? this.cumulativeSearches + 1
        : 0;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stop();
  }

  handleEvent(event) {
    if (event.type == "click" && event.target.dataset.action) {
      const { ErrorType } = SyncedTabsErrorHandler;
      switch (event.target.dataset.action) {
        case `${ErrorType.SYNC_ERROR}`:
        case `${ErrorType.NETWORK_OFFLINE}`:
        case `${ErrorType.PASSWORD_LOCKED}`: {
          TabsSetupFlowManager.tryToClearError();
          break;
        }
        case `${ErrorType.SIGNED_OUT}`:
        case "sign-in": {
          TabsSetupFlowManager.openFxASignup(event.target.ownerGlobal);
          break;
        }
        case "add-device": {
          TabsSetupFlowManager.openFxAPairDevice(event.target.ownerGlobal);
          break;
        }
        case "sync-tabs-disabled": {
          TabsSetupFlowManager.syncOpenTabs(event.target);
          break;
        }
        case `${ErrorType.SYNC_DISCONNECTED}`: {
          const win = event.target.ownerGlobal;
          const { switchToTabHavingURI } =
            win.docShell.chromeEventHandler.ownerGlobal;
          switchToTabHavingURI(
            "about:preferences?action=choose-what-to-sync#sync",
            true,
            {}
          );
          break;
        }
      }
    }
    if (event.type == "change") {
      TabsSetupFlowManager.syncOpenTabs(event.target);
    }
    if (this.recentBrowsing && event.type === "fxview-search-textbox-query") {
      this.onSearchQuery(event);
    }
  }

  viewVisibleCallback() {
    this.start();
  }

  viewHiddenCallback() {
    this.stop();
  }

  onVisibilityChange() {
    const isOpen = this.open;
    const isVisible = this.isVisible;
    if (isVisible && isOpen) {
      this.update();
      TabsSetupFlowManager.updateViewVisibility(this._id, "visible");
    } else {
      TabsSetupFlowManager.updateViewVisibility(
        this._id,
        isVisible ? "closed" : "hidden"
      );
    }

    this.toggleVisibilityInCardContainer();
  }

  async observe(subject, topic, errorState) {
    if (topic == TOPIC_SETUPSTATE_CHANGED) {
      this.updateStates(errorState);
    }
    if (topic == SYNCED_TABS_CHANGED) {
      this.getSyncedTabData();
    }
  }

  updateStates(errorState) {
    let stateIndex = TabsSetupFlowManager.uiStateIndex;
    errorState = errorState || SyncedTabsErrorHandler.getErrorType();

    if (stateIndex == 4 && this._currentSetupStateIndex !== stateIndex) {
      // trigger an initial request for the synced tabs list
      this.getSyncedTabData();
    }

    this._currentSetupStateIndex = stateIndex;
    this.errorState = errorState;
  }

  actionMappings = {
    "sign-in": {
      header: "firefoxview-syncedtabs-signin-header",
      description: "firefoxview-syncedtabs-signin-description",
      buttonLabel: "firefoxview-syncedtabs-signin-primarybutton",
    },
    "add-device": {
      header: "firefoxview-syncedtabs-adddevice-header",
      description: "firefoxview-syncedtabs-adddevice-description",
      buttonLabel: "firefoxview-syncedtabs-adddevice-primarybutton",
      descriptionLink: {
        name: "url",
        url: "https://support.mozilla.org/kb/how-do-i-set-sync-my-computer#w_connect-additional-devices-to-sync",
      },
    },
    "sync-tabs-disabled": {
      header: "firefoxview-syncedtabs-synctabs-header",
      description: "firefoxview-syncedtabs-synctabs-description",
      buttonLabel: "firefoxview-tabpickup-synctabs-primarybutton",
    },
    loading: {
      header: "firefoxview-syncedtabs-loading-header",
      description: "firefoxview-syncedtabs-loading-description",
    },
  };

  generateMessageCard({ error = false, action, errorState }) {
    errorState = errorState || this.errorState;
    let header,
      description,
      descriptionLink,
      buttonLabel,
      headerIconUrl,
      mainImageUrl;
    let descriptionArray;
    if (error) {
      let link;
      ({ header, description, link, buttonLabel } =
        SyncedTabsErrorHandler.getFluentStringsForErrorType(errorState));
      action = `${errorState}`;
      headerIconUrl = "chrome://global/skin/icons/info-filled.svg";
      mainImageUrl =
        "chrome://browser/content/firefoxview/synced-tabs-error.svg";
      descriptionArray = [description];
      if (errorState == "password-locked") {
        descriptionLink = {};
        // This is ugly, but we need to special case this link so we can
        // coexist with the old view.
        descriptionArray.push("firefoxview-syncedtab-password-locked-link");
        descriptionLink.name = "syncedtab-password-locked-link";
        descriptionLink.url = link.href;
      }
    } else {
      header = this.actionMappings[action].header;
      description = this.actionMappings[action].description;
      buttonLabel = this.actionMappings[action].buttonLabel;
      descriptionLink = this.actionMappings[action].descriptionLink;
      mainImageUrl =
        "chrome://browser/content/firefoxview/synced-tabs-error.svg";
      descriptionArray = [description];
    }

    return html`
      <fxview-empty-state
        headerLabel=${header}
        .descriptionLabels=${descriptionArray}
        .descriptionLink=${ifDefined(descriptionLink)}
        class="empty-state synced-tabs error"
        ?isSelectedTab=${this.selectedTab}
        ?isInnerCard=${this.recentBrowsing}
        mainImageUrl="${ifDefined(mainImageUrl)}"
        ?errorGrayscale=${error}
        headerIconUrl="${ifDefined(headerIconUrl)}"
        id="empty-container"
      >
        <button
          class="primary"
          slot="primary-action"
          ?hidden=${!buttonLabel}
          data-l10n-id="${ifDefined(buttonLabel)}"
          data-action="${action}"
          @click=${this.handleEvent}
          aria-details="empty-container"
        ></button>
      </fxview-empty-state>
    `;
  }

  onOpenLink(event) {
    let currentWindow = this.getWindow();
    if (currentWindow.openTrustedLinkIn) {
      let where = lazy.BrowserUtils.whereToOpenLink(
        event.detail.originalEvent,
        false,
        true
      );
      if (where == "current") {
        where = "tab";
      }
      currentWindow.openTrustedLinkIn(event.originalTarget.url, where);
      Services.telemetry.recordEvent(
        "firefoxview_next",
        "synced_tabs",
        "tabs",
        null,
        {
          page: this.recentBrowsing ? "recentbrowsing" : "syncedtabs",
        }
      );
    }
    if (this.searchQuery) {
      const searchesHistogram = Services.telemetry.getKeyedHistogramById(
        "FIREFOX_VIEW_CUMULATIVE_SEARCHES"
      );
      searchesHistogram.add(
        this.recentBrowsing ? "recentbrowsing" : "syncedtabs",
        this.cumulativeSearches
      );
      this.cumulativeSearches = 0;
    }
  }

  onContextMenu(e) {
    this.triggerNode = e.originalTarget;
    e.target.querySelector("panel-list").toggle(e.detail.originalEvent);
  }

  panelListTemplate() {
    return html`
      <panel-list slot="menu" data-tab-type="syncedtabs">
        <panel-item
          @click=${this.openInNewWindow}
          data-l10n-id="fxviewtabrow-open-in-window"
          data-l10n-attrs="accesskey"
        ></panel-item>
        <panel-item
          @click=${this.openInNewPrivateWindow}
          data-l10n-id="fxviewtabrow-open-in-private-window"
          data-l10n-attrs="accesskey"
        ></panel-item>
        <hr />
        <panel-item
          @click=${this.copyLink}
          data-l10n-id="fxviewtabrow-copy-link"
          data-l10n-attrs="accesskey"
        ></panel-item>
      </panel-list>
    `;
  }

  noDeviceTabsTemplate(deviceName, deviceType, isSearchResultsEmpty = false) {
    const template = html`<h3
        slot=${ifDefined(this.recentBrowsing ? null : "header")}
        class="device-header"
      >
        <span class="icon ${deviceType}" role="presentation"></span>
        ${deviceName}
      </h3>
      ${when(
        isSearchResultsEmpty,
        () => html`
          <div
            slot=${ifDefined(this.recentBrowsing ? null : "main")}
            class="blackbox notabs search-results-empty"
            data-l10n-id="firefoxview-search-results-empty"
            data-l10n-args=${JSON.stringify({
              query: escapeHtmlEntities(this.searchQuery),
            })}
          ></div>
        `,
        () => html`
          <div
            slot=${ifDefined(this.recentBrowsing ? null : "main")}
            class="blackbox notabs"
            data-l10n-id="firefoxview-syncedtabs-device-notabs"
          ></div>
        `
      )}`;
    return this.recentBrowsing
      ? template
      : html`<card-container
          shortPageName=${this.recentBrowsing ? "syncedtabs" : null}
          >${template}</card-container
        >`;
  }

  onSearchQuery(e) {
    this.searchQuery = e.detail.query;
    this.showAll = false;
  }

  deviceTemplate(deviceName, deviceType, tabItems) {
    return html`<h3
        slot=${!this.recentBrowsing ? "header" : null}
        class="device-header"
      >
        <span class="icon ${deviceType}" role="presentation"></span>
        ${deviceName}
      </h3>
      <fxview-tab-list
        slot="main"
        class="with-context-menu"
        hasPopup="menu"
        .tabItems=${ifDefined(tabItems)}
        .searchQuery=${this.searchQuery}
        maxTabsLength=${this.showAll ? -1 : this.maxTabsLength}
        @fxview-tab-list-primary-action=${this.onOpenLink}
        @fxview-tab-list-secondary-action=${this.onContextMenu}
      >
        ${this.panelListTemplate()}
      </fxview-tab-list>`;
  }

  generateTabList() {
    let renderArray = [];
    let renderInfo = {};
    for (let tab of this.currentSyncedTabs) {
      if (!(tab.client in renderInfo)) {
        renderInfo[tab.client] = {
          name: tab.device,
          deviceType: tab.deviceType,
          tabs: [],
        };
      }
      renderInfo[tab.client].tabs.push(tab);
    }

    // Add devices without tabs
    for (let device of this.devices) {
      if (!(device.id in renderInfo)) {
        renderInfo[device.id] = {
          name: device.name,
          deviceType: device.clientType,
          tabs: [],
        };
      }
    }

    for (let id in renderInfo) {
      let tabItems = this.searchQuery
        ? searchTabList(this.searchQuery, this.getTabItems(renderInfo[id].tabs))
        : this.getTabItems(renderInfo[id].tabs);
      if (tabItems.length) {
        const template = this.recentBrowsing
          ? this.deviceTemplate(
              renderInfo[id].name,
              renderInfo[id].deviceType,
              tabItems
            )
          : html`<card-container
              shortPageName=${this.recentBrowsing ? "syncedtabs" : null}
              >${this.deviceTemplate(
                renderInfo[id].name,
                renderInfo[id].deviceType,
                tabItems
              )}
            </card-container>`;
        renderArray.push(template);
        if (this.isShowAllLinkVisible(tabItems)) {
          renderArray.push(html` <div class="show-all-link-container">
            <div
              class="show-all-link"
              @click=${this.enableShowAll}
              @keydown=${this.enableShowAll}
              data-l10n-id="firefoxview-show-all"
              tabindex="0"
              role="link"
            ></div>
          </div>`);
        }
      } else {
        // Check renderInfo[id].tabs.length to determine whether to display an
        // empty tab list message or empty search results message.
        // If there are no synced tabs, we always display the empty tab list
        // message, even if there is an active search query.
        renderArray.push(
          this.noDeviceTabsTemplate(
            renderInfo[id].name,
            renderInfo[id].deviceType,
            Boolean(renderInfo[id].tabs.length)
          )
        );
      }
    }
    return renderArray;
  }

  isShowAllLinkVisible(tabItems) {
    return (
      this.recentBrowsing &&
      this.searchQuery &&
      tabItems.length > this.maxTabsLength &&
      !this.showAll
    );
  }

  enableShowAll(event) {
    if (
      event.type == "click" ||
      (event.type == "keydown" && event.code == "Enter") ||
      (event.type == "keydown" && event.code == "Space")
    ) {
      event.preventDefault();
      this.showAll = true;
      Services.telemetry.recordEvent(
        "firefoxview_next",
        "search_show_all",
        "showallbutton",
        null,
        {
          section: "syncedtabs",
        }
      );
    }
  }

  generateCardContent() {
    switch (this._currentSetupStateIndex) {
      case 0 /* error-state */:
        if (this.errorState) {
          return this.generateMessageCard({ error: true });
        }
        return this.generateMessageCard({ action: "loading" });
      case 1 /* not-signed-in */:
        if (Services.prefs.prefHasUserValue("services.sync.lastversion")) {
          // If this pref is set, the user has signed out of sync.
          // This path is also taken if we are disconnected from sync. See bug 1784055
          return this.generateMessageCard({
            error: true,
            errorState: "signed-out",
          });
        }
        return this.generateMessageCard({ action: "sign-in" });
      case 2 /* connect-secondary-device*/:
        return this.generateMessageCard({ action: "add-device" });
      case 3 /* disabled-tab-sync */:
        return this.generateMessageCard({ action: "sync-tabs-disabled" });
      case 4 /* synced-tabs-loaded*/:
        // There seems to be an edge case where sync says everything worked
        // fine but we have no devices.
        if (!this.devices.length) {
          return this.generateMessageCard({ action: "add-device" });
        }
        return this.generateTabList();
    }
    return html``;
  }

  render() {
    this.open =
      !TabsSetupFlowManager.isTabSyncSetupComplete ||
      Services.prefs.getBoolPref(UI_OPEN_STATE, true);

    let renderArray = [];
    renderArray.push(html` <link
      rel="stylesheet"
      href="chrome://browser/content/firefoxview/view-syncedtabs.css"
    />`);
    renderArray.push(html` <link
      rel="stylesheet"
      href="chrome://browser/content/firefoxview/firefoxview.css"
    />`);

    if (!this.recentBrowsing) {
      renderArray.push(html`<div class="sticky-container bottom-fade">
        <h2
          class="page-header heading-large"
          data-l10n-id="firefoxview-synced-tabs-header"
        ></h2>
        ${when(
          isSearchEnabled() || this._currentSetupStateIndex === 4,
          () => html`<div class="syncedtabs-header">
            ${when(
              isSearchEnabled(),
              () => html`<div>
                <fxview-search-textbox
                  data-l10n-id="firefoxview-search-text-box-syncedtabs"
                  data-l10n-attrs="placeholder"
                  @fxview-search-textbox-query=${this.onSearchQuery}
                  .size=${this.searchTextboxSize}
                  pageName=${this.recentBrowsing
                    ? "recentbrowsing"
                    : "syncedtabs"}
                ></fxview-search-textbox>
              </div>`
            )}
            ${when(
              this._currentSetupStateIndex === 4,
              () => html`
                <button
                  class="small-button"
                  data-action="add-device"
                  @click=${this.handleEvent}
                >
                  <img
                    class="icon"
                    role="presentation"
                    src="chrome://global/skin/icons/plus.svg"
                    alt="plus sign"
                  /><span
                    data-l10n-id="firefoxview-syncedtabs-connect-another-device"
                    data-action="add-device"
                  ></span>
                </button>
              `
            )}
          </div>`
        )}
      </div>`);
    }

    if (this.recentBrowsing) {
      renderArray.push(
        html`<card-container
          preserveCollapseState
          shortPageName="syncedtabs"
          ?showViewAll=${this._currentSetupStateIndex == 4 &&
          this.currentSyncedTabs.length}
          ?isEmptyState=${!this.currentSyncedTabs.length}
        >
          >
          <h3
            slot="header"
            data-l10n-id="firefoxview-synced-tabs-header"
            class="recentbrowsing-header"
          ></h3>
          <div slot="main">${this.generateCardContent()}</div>
        </card-container>`
      );
    } else {
      renderArray.push(
        html`<div class="cards-container">${this.generateCardContent()}</div>`
      );
    }
    return renderArray;
  }

  async onReload() {
    await TabsSetupFlowManager.syncOnPageReload();
  }

  getTabItems(tabs) {
    tabs = tabs || this.tabs;
    return tabs?.map(tab => ({
      icon: tab.icon,
      title: tab.title,
      time: tab.lastUsed * 1000,
      url: tab.url,
      primaryL10nId: "firefoxview-tabs-list-tab-button",
      primaryL10nArgs: JSON.stringify({ targetURI: tab.url }),
      secondaryL10nId: "fxviewtabrow-options-menu-button",
      secondaryL10nArgs: JSON.stringify({ tabTitle: tab.title }),
    }));
  }

  updateTabsList(syncedTabs) {
    if (!syncedTabs.length) {
      this.currentSyncedTabs = syncedTabs;
      this.sendTabTelemetry(0);
    }

    const tabsToRender = syncedTabs;

    // Return early if new tabs are the same as previous ones
    if (
      JSON.stringify(tabsToRender) == JSON.stringify(this.currentSyncedTabs)
    ) {
      return;
    }

    this.currentSyncedTabs = tabsToRender;
    // Record the full tab count
    this.sendTabTelemetry(syncedTabs.length);
  }

  async getSyncedTabData() {
    this.devices = await lazy.SyncedTabs.getTabClients();
    let tabs = await lazy.SyncedTabs.createRecentTabsList(this.devices, 50, {
      removeAllDupes: false,
      removeDeviceDupes: true,
    });

    this.updateTabsList(tabs);
  }

  updated() {
    this.fullyUpdated = true;
    this.toggleVisibilityInCardContainer();
  }

  sendTabTelemetry(numTabs) {
    /*
    Services.telemetry.recordEvent(
      "firefoxview_next",
      "synced_tabs",
      "tabs",
      null,
      {
        count: numTabs.toString(),
      }
    );
*/
  }
}
customElements.define("view-syncedtabs", SyncedTabsInView);
