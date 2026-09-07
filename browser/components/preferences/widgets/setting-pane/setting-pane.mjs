/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { SettingPaneManager } from "chrome://browser/content/preferences/config/SettingPaneManager.mjs";

/**
 * @import { MozPageHeader } from "chrome://global/content/elements/moz-page-header.mjs"
 */

/**
 * Whether the sub-pane back arrow should call `history.back()` (and let
 * the browser restore the parent pane's saved scroll position) instead of
 * doing a fresh navigation. True when the previous history entry is the
 * current sub-pane's parent; false when the sub-pane was loaded directly
 * (e.g. via the URL bar).
 *
 * @param {Window} win
 * @param {string} parentCategory The friendly id of this sub-pane's parent.
 * @returns {boolean}
 */
function shouldGoBackToParent(win, parentCategory) {
  if (win.history.state?.previousCategory !== parentCategory) {
    return false;
  }
  // Defense in depth: confirm with the Navigation API where available. If
  // the API is missing, trust the recorded previous category.
  return win.navigation?.canGoBack ?? true;
}

/**
 * @typedef {object} SettingPaneConfig
 * @property {string} [parent] The pane that links to this one.
 * @property {string} l10nId Fluent id for the heading/description.
 * @property {string[]} groupIds What setting groups should be rendered.
 * @property {string} [iconSrc] Optional icon shown in the page header.
 * @property {string} [supportPage] Optional support page for the page header.
 * @property {string} [module] Import path for module housing the config.
 * @property {"beta" | "new"} [badge] Badge type to display in the page header.
 * @property {() => boolean} [visible] If this pane is visible.
 * @property {string} [replaces] ID of legacy pane getting replaced by new pane.
 * @property {boolean} [showRedesignPromo] Whether the settings redesign promo should show.
 *
 * @typedef {string} SettingPaneId
 * @typedef {SettingPaneConfig & { id: SettingPaneId }} SettingPaneFullConfig
 */

export class SettingPane extends MozLitElement {
  static properties = {
    name: { type: String },
    isSubPane: { type: Boolean },
    config: { type: Object },
    showRedesignPromo: { type: Boolean, attribute: false },
    onSearchPane: { type: Boolean, reflect: true },
    initialized: { type: Boolean, state: true },
  };

  /** @returns {MozPageHeader} */
  get pageHeaderEl() {
    return this.renderRoot.querySelector("moz-page-header");
  }

  get paneId() {
    return this.config.id;
  }

  constructor() {
    super();
    /** @type {string} */
    this.name = undefined;
    /** @type {boolean} */
    this.isSubPane = false;
    /** @type {SettingPaneFullConfig} */
    this.config = undefined;
    /** @type {boolean} */
    this.showRedesignPromo = false;
    /**
     * True while this pane is rendered as part of a search result. When set,
     * the pane's heading is rendered one level deeper so the "Search results"
     * h2 stays above it in the heading hierarchy.
     */
    this.onSearchPane = false;
    /** @type {boolean} */
    this.initialized = false;
  }

  createRenderRoot() {
    return this;
  }

  async getUpdateComplete() {
    let result = await super.getUpdateComplete();
    await this.pageHeaderEl.updateComplete;
    return result;
  }

  goBack() {
    if (shouldGoBackToParent(window, this.config.parent)) {
      window.history.back();
      return;
    }
    window.gotoPref(this.config.parent);
  }

  handleVisibility() {
    if (this.config.visible) {
      let visible = this.config.visible();
      let categoryButton = /** @type {HTMLElement} */ (
        document.querySelector(
          `#categories moz-page-nav-button[view="${this.name}"]`
        )
      );
      if (!visible && !this.isSubPane) {
        if (categoryButton) {
          categoryButton.remove();
        }
        this.remove();
      } else if (visible && categoryButton) {
        categoryButton.hidden = false;
      }
    }
  }

  /**
   * When any of the setting redesign promos (across all setting panes) is dismissed.
   */
  #onAnySettingsRedesignPromoDismissClick = () => {
    this.showRedesignPromo = false;
  };

  connectedCallback() {
    super.connectedCallback();

    this.handleVisibility();

    document.addEventListener("paneshown", this.handlePaneShown);

    document.addEventListener(
      "settings-redesign-promo-dismiss",
      this.#onAnySettingsRedesignPromoDismissClick
    );

    this.setAttribute("data-category", this.name);
    this.hidden = true;
    if (this.isSubPane) {
      this.setAttribute("data-hidden-from-search", "true");
      this.setAttribute("data-subpanel", "true");
      this._createCategoryButton();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("paneshown", this.handlePaneShown);
    document.removeEventListener(
      "settings-redesign-promo-dismiss",
      this.#onAnySettingsRedesignPromoDismissClick
    );
  }

  /**
   * @param {CustomEvent} e
   */
  handlePaneShown = e => {
    if (this.isSubPane && e.detail.category === this.name) {
      // preventScroll so that a previously saved scroll position (restored
      // by ScrollOffsets just before the paneshown event) is preserved.
      this.pageHeaderEl.backButtonEl.focus({ preventScroll: true });
    }
  };

  init() {
    if (!this.initialized) {
      this.initialized = true;
      this.performUpdate();
    }

    // Import the modules necessary to load this pane.
    SettingPaneManager.importPane(this.paneId);

    // Notify observers that the module is loaded. This needs to be done prior
    // to the initSettingGroup calls since the home pane relies on this event
    // to register additional groups.
    Services.obs.notifyObservers(
      /** @type {nsISupports} */ (window),
      `${this.config.id}-pane-loaded`
    );

    for (let groupId of this.config.groupIds) {
      window.initSettingGroup(groupId);
    }
  }

  _createCategoryButton() {
    let categoryButton = document.createElement("moz-page-nav-button");
    if (this.isSubPane) {
      categoryButton.classList.add("hidden-category");
    }
    categoryButton.setAttribute("view", this.name);
    document.getElementById("categories").append(categoryButton);
  }

  /** @param {string} groupId */
  groupTemplate(groupId) {
    return html`<setting-group
      groupid=${groupId}
      .inSubPane=${this.isSubPane}
    ></setting-group>`;
  }

  breadcrumbsTemplate() {
    if (!this.isSubPane) {
      return "";
    }
    return html`<moz-breadcrumb-group slot="breadcrumbs">
      ${SettingPaneManager.getWithParents(this.paneId).map(
        config =>
          html`<moz-breadcrumb
            data-l10n-id=${config.l10nId}
            .href=${"#" + config.id}
          ></moz-breadcrumb>`
      )}
    </moz-breadcrumb-group>`;
  }

  onDismiss() {
    const event = new CustomEvent("settings-redesign-promo-dismiss", {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  /**
   * Shows the settings redesign promo if user hasn't dismissed it.
   * Suppressed while the pane is displayed as a search result so the
   * promo doesn't repeat above every matching pane.
   */
  settingsRedesignPromoTemplate() {
    if (!this.showRedesignPromo || this.onSearchPane) {
      return "";
    }

    return html`<moz-promo
      data-l10n-id="settings-redesign-promo"
      class="settings-redesign-promo"
    >
      <moz-button
        slot="actions"
        data-l10n-id="settings-redesign-promo-dismiss-button"
        type="primary"
        @click=${this.onDismiss}
      ></moz-button>
    </moz-promo>`;
  }

  render() {
    if (!this.initialized) {
      return "";
    }
    return html`
      ${this.settingsRedesignPromoTemplate()}
      <section>
        <moz-page-header
          data-l10n-id=${this.config.l10nId}
          .iconSrc=${this.config.iconSrc}
          .supportPage=${this.config.supportPage}
          .badge=${this.config.badge}
          .backButton=${this.isSubPane}
          .headingLevel=${this.onSearchPane ? 3 : 2}
          @navigate-back=${this.goBack}
          >${this.breadcrumbsTemplate()}</moz-page-header
        >
        ${this.config.groupIds.map(groupId => this.groupTemplate(groupId))}
      </section>
    `;
  }
}
customElements.define("setting-pane", SettingPane);
