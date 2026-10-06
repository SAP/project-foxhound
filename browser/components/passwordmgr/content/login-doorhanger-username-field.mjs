/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, ifDefined } from "chrome://global/content/vendor/lit.all.mjs";
import MozInputText from "chrome://global/content/elements/moz-input-text.mjs";

/**
 * Username input for the save/update password doorhanger. Wraps a XUL
 * autocomplete input with an optional dropmarker for showing saved login
 * suggestions.
 *
 * @tagname login-doorhanger-username-field
 * @property {string} label - The text of the label element.
 * @property {string} name - The name of the input control.
 * @property {string} value - The value of the input control.
 * @property {boolean} disabled - The disabled state of the input control.
 * @property {string} placeholder - Text to display when the input has no value.
 * @property {string} autocompleteSearch - Value for the autocompletesearch attribute, enabling XUL autocomplete.
 * @property {string} autocompletePopup - The autocompletepopup attribute forwarded to the inner input.
 * @property {string} maxRows - The maxrows attribute forwarded to the inner input.
 * @property {string} maxDropmarkerRows - The maxdropmarkerrows attribute forwarded to the inner input.
 * @property {boolean} showDropmarker - When true, shows the autocomplete dropdown arrow inside the input.
 */
class LoginDoorhangerUsernameField extends MozInputText {
  static properties = {
    autocompleteSearch: { type: String, attribute: "autocompletesearch" },
    autocompletePopup: { type: String, attribute: "autocompletepopup" },
    maxRows: { type: String, attribute: "maxrows" },
    maxDropmarkerRows: { type: String, attribute: "maxdropmarkerrows" },
    showDropmarker: { type: Boolean },
  };

  constructor() {
    super();
    this.showDropmarker = false;
  }

  get inputEl() {
    return this.shadowRoot?.querySelector("#input") ?? null;
  }

  get dropmarkerEl() {
    return this.shadowRoot?.querySelector(".ac-dropmarker") ?? null;
  }

  /** @param {MouseEvent} e */
  #handleDropmarkerMousedown(e) {
    e.preventDefault();
  }

  #handleDropmarkerClick() {
    this.dispatchEvent(new CustomEvent("dropmarker-click", { bubbles: true }));
  }

  inputStylesTemplate() {
    return html`
      ${super.inputStylesTemplate()}
      <link
        rel="stylesheet"
        href="chrome://browser/content/passwordmgr/login-doorhanger-username-field.css"
      />
    `;
  }

  inputTemplate(options = {}) {
    let { classes, styles, inputValue } = options;
    return html`
      <div
        class="autocomplete-container${this.showDropmarker
          ? " has-dropmarker"
          : ""}"
      >
        <input
          id="input"
          is="autocomplete-input"
          part="input"
          type="text"
          class=${ifDefined(classes)}
          style=${ifDefined(styles)}
          name=${this.name}
          .value=${inputValue || this.value}
          ?disabled=${this.disabled || this.parentDisabled}
          ?readonly=${this.readonly}
          accesskey=${ifDefined(this.accessKey)}
          placeholder=${ifDefined(this.placeholder)}
          aria-label=${ifDefined(this.ariaLabel ?? undefined)}
          aria-describedby="description"
          aria-description=${ifDefined(
            this.hasDescription ? undefined : this.ariaDescription
          )}
          autocompletesearch=${ifDefined(this.autocompleteSearch)}
          autocompletepopup=${ifDefined(this.autocompletePopup)}
          maxrows=${ifDefined(this.maxRows)}
          maxdropmarkerrows=${ifDefined(this.maxDropmarkerRows)}
          @input=${this.handleInput}
          @change=${this.redispatchEvent}
        />
        <span
          class="ac-dropmarker"
          ?hidden=${!this.showDropmarker}
          @mousedown=${this.#handleDropmarkerMousedown}
          @click=${this.#handleDropmarkerClick}
        ></span>
      </div>
    `;
  }
}
customElements.define(
  "login-doorhanger-username-field",
  LoginDoorhangerUsernameField
);
