/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

/**
 * @typedef {object} SettingPaneConfig
 * @property {string} [parent] The pane that links to this one.
 * @property {string} l10nId Fluent id for the heading/description.
 * @property {string[]} groupIds What setting groups should be rendered.
 * @property {string} [iconSrc] Optional icon shown in the page header.
 * @property {string} [module] Import path for module housing the config.
 * @property {() => boolean} [visible] If this pane is visible.
 */

export class SettingPane extends MozLitElement {
  static properties = {
    name: { type: String },
    isSubPane: { type: Boolean },
    config: { type: Object },
  };

  static queries = {
    pageHeaderEl: "moz-page-header",
  };

  constructor() {
    super();
    /** @type {string} */
    this.name = undefined;
    /** @type {boolean} */
    this.isSubPane = false;
    /** @type {SettingPaneConfig} */
    this.config = undefined;
  }

  createRenderRoot() {
    return this;
  }

  async getUpdateComplete() {
    let result = await super.getUpdateComplete();
    // @ts-ignore bug 1997478
    await this.pageHeaderEl.updateComplete;
    return result;
  }

  goBack() {
    window.gotoPref(this.config.parent);
  }

  handleVisibility() {
    if (this.config.visible) {
      let visible = this.config.visible();
      if (!visible && !this.isSubPane) {
        let categoryButton = /** @type {XULElement} */ (
          document.querySelector(`#categories [value="${this.name}"]`)
        );
        if (categoryButton) {
          categoryButton.remove();
        }
        this.remove();
      }
    }
  }

  connectedCallback() {
    super.connectedCallback();

    this.handleVisibility();

    document.addEventListener(
      "paneshown",
      /**
       * @param {CustomEvent} e
       */
      e => {
        if (this.isSubPane && e.detail.category === this.name) {
          this.pageHeaderEl.backButtonEl.focus();
        }
      }
    );
    this.setAttribute("data-category", this.name);
    this.hidden = true;
    if (this.isSubPane) {
      this.setAttribute("data-hidden-from-search", "true");
      this.setAttribute("data-subpanel", "true");
      this._createCategoryButton();
    }
  }

  init() {
    if (!this.hasUpdated) {
      this.performUpdate();
    }
    if (this.config.module) {
      ChromeUtils.importESModule(this.config.module, { global: "current" });
    }
    for (let groupId of this.config.groupIds) {
      window.initSettingGroup(groupId);
    }
  }

  _createCategoryButton() {
    let categoryButton = document.createXULElement("richlistitem");
    categoryButton.classList.add("category");
    if (this.isSubPane) {
      categoryButton.classList.add("hidden-category");
    }
    categoryButton.setAttribute("value", this.name);
    document.getElementById("categories").append(categoryButton);
  }

  /** @param {string} groupId */
  groupTemplate(groupId) {
    return html`<setting-group
      groupid=${groupId}
      .inSubPane=${this.isSubPane}
    ></setting-group>`;
  }

  render() {
    return html`
      <section>
        <moz-page-header
          data-l10n-id=${this.config.l10nId}
          .iconSrc=${this.config.iconSrc}
          .supportPage=${this.config.supportPage}
          .backButton=${this.isSubPane}
          @navigate-back=${this.goBack}
        ></moz-page-header>
        ${this.config.groupIds.map(groupId => this.groupTemplate(groupId))}
      </section>
    `;
  }
}
customElements.define("setting-pane", SettingPane);
