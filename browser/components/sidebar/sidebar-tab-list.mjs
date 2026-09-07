/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  classMap,
  html,
  ifDefined,
  when,
} from "chrome://global/content/vendor/lit.all.mjs";

import {
  FxviewTabListBase,
  FxviewTabRowBase,
} from "chrome://browser/content/firefoxview/fxview-tab-list.mjs";

export class SidebarTabList extends FxviewTabListBase {
  constructor() {
    super();
    // Panel is open, assume we always want to react to updates.
    this.updatesPaused = false;
    this.multiSelect = true;
  }

  static queries = {
    ...FxviewTabListBase.queries,
    rowEls: {
      all: "sidebar-tab-row",
    },
  };

  /**
   * The tree view controller that owns selection state for the page this list
   * belongs to.
   *
   * @returns {SidebarTreeView}
   */
  get treeView() {
    let host = this.getRootNode()?.host;
    while (host) {
      if (host.treeView) {
        return host.treeView;
      }
      host = host.getRootNode()?.host;
    }
    return null;
  }

  #dispatchFocusRowEvent = event => {
    const [row] = event.composedPath();
    if (row.localName !== "sidebar-tab-row") {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("focus-row", {
        bubbles: true,
        composed: true,
        detail: { guid: row.guid },
      })
    );
  };

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("focusin", this.#dispatchFocusRowEvent);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("focusin", this.#dispatchFocusRowEvent);
  }

  willUpdate(changedProperties) {
    if (changedProperties.has("tabItems") && Array.isArray(this.tabItems)) {
      for (const item of this.tabItems) {
        item.guid ??= Services.uuid.generateUUID().toString();
      }
    }
  }

  handleFocusElementInRow(e) {
    if (!this.treeView) {
      super.handleFocusElementInRow(e);
      return;
    }
    this.treeView.handleKeydown(e);
    if (e.defaultPrevented) {
      e.stopPropagation();
    }
  }

  toggleRowSelection(guid) {
    this.treeView?.toggleSelection(this, guid);
  }

  clearSelection() {
    this.treeView?.resetSelection();
  }

  selectAll() {
    this.treeView?.selectAllInList(this);
  }

  itemTemplate = (tabItem, i) => {
    let tabIndex = -1;
    if ((this.searchQuery || this.sortOption == "lastvisited") && i == 0) {
      // Make the first row focusable if there is no header.
      tabIndex = 0;
    } else if (!this.searchQuery) {
      tabIndex = 0;
    }
    return html`
      <sidebar-tab-row
        ?active=${i == this.activeIndex}
        .canClose=${ifDefined(tabItem.canClose)}
        .closedId=${ifDefined(tabItem.closedId)}
        compact
        .currentActiveElementId=${this.currentActiveElementId}
        .closeRequested=${tabItem.closeRequested}
        .containerObj=${tabItem.containerObj}
        .fxaDeviceId=${ifDefined(tabItem.fxaDeviceId)}
        .favicon=${tabItem.icon}
        .guid=${tabItem.guid}
        .hasPopup=${this.hasPopup}
        .indicators=${tabItem.indicators}
        .primaryL10nArgs=${ifDefined(tabItem.primaryL10nArgs)}
        .primaryL10nId=${tabItem.primaryL10nId}
        role="listitem"
        .searchQuery=${ifDefined(this.searchQuery)}
        .secondaryActionClass=${ifDefined(
          this.secondaryActionClass ?? tabItem.secondaryActionClass
        )}
        .secondaryL10nArgs=${ifDefined(tabItem.secondaryL10nArgs)}
        .secondaryL10nId=${tabItem.secondaryL10nId}
        .selected=${this.isTabItemSelected(tabItem)}
        .sourceClosedId=${ifDefined(tabItem.sourceClosedId)}
        .sourceWindowId=${ifDefined(tabItem.sourceWindowId)}
        .tabElement=${ifDefined(tabItem.tabElement)}
        tabindex=${tabIndex}
        .title=${tabItem.title}
        .url=${tabItem.url}
        @keydown=${e => e.currentTarget.primaryActionHandler(e)}
      ></sidebar-tab-row>
    `;
  };

  isTabItemSelected(tabItem) {
    return !!this.treeView?.isSelected(this, tabItem.guid);
  }

  stylesheets() {
    return [
      super.stylesheets(),
      html`<link
        rel="stylesheet"
        href="chrome://browser/content/sidebar/sidebar-tab-list.css"
      />`,
    ];
  }
}
customElements.define("sidebar-tab-list", SidebarTabList);

export class SidebarTabRow extends FxviewTabRowBase {
  static properties = {
    containerObj: { type: Object },
    guid: { type: String, reflect: true, attribute: "data-guid" },
    selected: { type: Boolean, reflect: true },
    indicators: { type: Array },
  };

  get tooltipText() {
    return !this.primaryL10nId ? this.url : null;
  }

  /**
   * Fallback to the native implementation in sidebar. We want to focus the
   * entire row instead of delegating it to link or hover buttons.
   */
  focus(options) {
    HTMLElement.prototype.focus.call(this, options);
  }

  #getContainerClasses() {
    let containerClasses = ["fxview-tab-row-container-indicator", "icon"];
    if (this.containerObj) {
      let { icon, color } = this.containerObj;
      containerClasses.push(`identity-icon-${icon}`);
      containerClasses.push(`identity-color-${color}`);
    }
    return containerClasses;
  }

  #containerIndicatorTemplate() {
    let tabList = this.getRootNode().host;
    let tabsToCheck = tabList.tabItems;
    return html`${when(
      tabsToCheck.some(tab => tab.containerObj),
      () => html`<span class=${this.#getContainerClasses().join(" ")}></span>`
    )}`;
  }

  secondaryButtonTemplate() {
    return html`${when(
      this.secondaryL10nId && this.secondaryActionClass,
      () =>
        html`<moz-button
          aria-haspopup=${ifDefined(this.hasPopup)}
          class=${classMap({
            "fxview-tab-row-button": true,
            [this.secondaryActionClass]: this.secondaryActionClass,
          })}
          data-l10n-args=${ifDefined(this.secondaryL10nArgs)}
          data-l10n-id=${this.secondaryL10nId}
          id="fxview-tab-row-secondary-button"
          type="icon ghost"
          @click=${this.secondaryActionHandler}
          iconSrc=${this.getIconSrc(this.secondaryActionClass)}
        ></moz-button>`
    )}`;
  }

  render() {
    return html`
      ${this.stylesheets()}
      ${when(
        this.containerObj,
        () => html`
          <link
            rel="stylesheet"
            href="chrome://browser/content/usercontext/usercontext.css"
          />
        `
      )}
      <link
        rel="stylesheet"
        href="chrome://browser/content/sidebar/sidebar-tab-row.css"
      />
      <a
        class=${classMap({
          "fxview-tab-row-main": true,
          "no-action-button-row": this.canClose === false,
          muted: this.indicators?.includes("muted"),
          attention: this.indicators?.includes("attention"),
          soundplaying: this.indicators?.includes("soundplaying"),
          "activemedia-blocked": this.indicators?.includes(
            "activemedia-blocked"
          ),
        })}
        ?disabled=${this.closeRequested}
        data-l10n-args=${ifDefined(this.primaryL10nArgs)}
        data-l10n-id=${ifDefined(this.primaryL10nId)}
        href=${ifDefined(this.url)}
        id="fxview-tab-row-main"
        tabindex="-1"
        title=${this.tooltipText}
        @click=${this.primaryActionHandler}
        @auxclick=${this.auxActionHandler}
        @keydown=${this.primaryActionHandler}
      >
        ${this.faviconTemplate()} ${this.titleTemplate()}
      </a>
      ${this.secondaryButtonTemplate()} ${this.#containerIndicatorTemplate()}
    `;
  }
}
customElements.define("sidebar-tab-row", SidebarTabRow);
