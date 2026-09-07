/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, when } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/panel-list.mjs";

class AutocompleteRowItem extends MozLitElement {
  static properties = {
    label: { type: String, fluent: true },
    description: { type: String, fluent: true },
    value: { type: String },
    icon: { type: String },
    actions: { type: Object },
  };

  #openActionsMenu(anchor, actions) {
    const XUL_NS =
      "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

    const menupopup = document.createElementNS(XUL_NS, "menupopup");

    for (const { label, action } of actions) {
      const menuitem = document.createElementNS(XUL_NS, "menuitem");
      menuitem.setAttribute("label", label);
      menuitem.addEventListener("command", () => action());
      menupopup.appendChild(menuitem);
    }

    const panel = this.closest("panel");

    panel?.setAttribute("noautohide", "true");

    menupopup.addEventListener("popuphiding", () => {
      panel?.removeAttribute("noautohide");
      menupopup.remove();
    });

    document.documentElement.appendChild(menupopup);
    menupopup.openPopup(anchor, "after_start");
  }

  getSecondaryActionItemIcon(type) {
    switch (type) {
      case "edit":
        return "chrome://global/skin/icons/edit.svg";
      case "menupopup":
        return "chrome://global/skin/icons/more.svg";
      default:
        return "chrome://global/skin/icons/settings.svg";
    }
  }

  renderSecondaryActionButton() {
    const { type, action, actions } = this.actions.secondary;
    const stopMouseEvents = e => e.stopPropagation();

    // We're expecting a single action
    if (action) {
      return html`<moz-button
        @mousedown=${stopMouseEvents}
        @mouseup=${stopMouseEvents}
        @click=${e => {
          e.stopPropagation();
          action();
        }}
        type="icon ghost"
        .iconSrc=${this.getSecondaryActionItemIcon(type)}
        class="secondary-action"
      ></moz-button>`;
    }

    // We're expecting multiple actions for this item
    if (actions) {
      return html`<moz-button
        @mousedown=${stopMouseEvents}
        @mouseup=${stopMouseEvents}
        @click=${e => {
          e.stopPropagation();
          this.#openActionsMenu(e.currentTarget, actions);
        }}
        type="icon ghost"
        type="icon ghost"
        .iconSrc=${this.getSecondaryActionItemIcon(type)}
        class="secondary-action"
        menuId="secondary-action-menu"
      ></moz-button>`;
    }

    return "";
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://global/content/autocomplete-row-item/autocomplete-row-item.css"
      />
      <div @click=${this.actions?.primary} class="row-item">
        ${when(
          this.icon,
          () => html`<img role="presentation" class="icon" src=${this.icon} />`
        )}
        <div class="labels-container">
          <span class="label">${this.label}</span>
          ${when(
            this.description,
            () => html`<span class="description">${this.description}</span>`
          )}
        </div>
        ${when(this.actions?.secondary, () =>
          this.renderSecondaryActionButton()
        )}
      </div>
    `;
  }
}

customElements.define("autocomplete-row-item", AutocompleteRowItem);
