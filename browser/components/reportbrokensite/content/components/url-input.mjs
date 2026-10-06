/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

/**
 * Element showing a URL with a favicon, emphasizing its hostname.
 * When a user focuses on it, it hides the emphasized URL and shows an input to edit the URL instead.
 */
export default class UrlInputCustomElement extends MozLitElement {
  static properties = {
    url: { type: String, state: true },
    favicon: { type: String, state: true },
  };

  static queries = {
    emphasizedUrl: "#emphasized-url",
    emphasizedUrlText: "#emphasized-url-text",
    errorMessage: ".invalid-message",
    faviconImg: "#favicon",
    input: "input",
    reset: "#reset",
    wrapper: ":host > div",
  };

  checkValidity() {
    return this.input.checkValidity();
  }

  // Needed so we can make Escape presses simply blur the input,
  // rather than closing the entire panelview.
  requestBlur() {
    this.input.blur();
  }

  #updateUrl() {
    const { input, url } = this;
    input.value = url + "";
    if (url?.hostname) {
      let [pre, ...post] = url.href.split(url.hostname);
      post = post.join(url.hostname);
      this.emphasizedUrlText.setHTML(
        `<span>${pre}</span><b>${url.hostname}</b><span>${post}</span>`
      );
    } else {
      this.emphasizedUrlText.innerText = url;
    }
  }

  #updateFavicon() {
    const { favicon } = this;
    this.faviconImg.src = favicon ?? "";
    this.wrapper.classList.toggle("has-favicon", favicon);
  }

  willUpdate(changes) {
    if (!this.hasUpdated) {
      return;
    }
    if (changes.has("url")) {
      this.#updateUrl();
    }
    if (changes.has("favicon")) {
      this.#updateFavicon();
    }
  }

  firstUpdated() {
    super.firstUpdated();
    this.#updateUrl();
    this.#updateFavicon();
  }

  #fireEvent(eventName, detail) {
    return this.dispatchEvent(
      new CustomEvent(eventName, { bubbles: true, composed: true, detail })
    );
  }

  #resetClicked() {
    this.#fireEvent("reset");
  }

  #inputEdited() {
    this.#fireEvent("input");
  }

  #inputChanged() {
    this.#fireEvent("change", { newValue: this.input.value });
  }

  render() {
    return html`<link
        rel="stylesheet"
        href="chrome://global/skin/in-content/common.css"
      />
      <link
        rel="stylesheet"
        href="chrome://browser/content/reportbrokensite/components/url-input.css"
      />
      <div>
        <img id="favicon" class="icon" />
        <input
          type="url"
          @input=${this.#inputEdited}
          @change=${this.#inputChanged}
          required="required"
          aria-required="true"
          data-l10n-id="report-broken-site-panel-url-input-label"
          data-l10n-attrs="aria-label"
        />
        <span id="reset" class="icon" @click=${this.#resetClicked}></span>
        <div id="emphasized-url">
          <div id="emphasized-url-text"></div>
          <span id="edit" class="icon"></span>
        </div>
      </div>
      <label
        class="invalid-message text-error"
        role="alert"
        data-l10n-id="report-broken-site-panel-invalid-url-label"
      ></label> `;
  }
}
customElements.define("url-input", UrlInputCustomElement);
