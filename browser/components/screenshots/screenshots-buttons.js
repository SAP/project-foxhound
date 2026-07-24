/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// This is loaded into chrome windows with the subscript loader. Wrap in
// a block to prevent accidentally leaking globals onto `window`.
{
  ChromeUtils.defineESModuleGetters(this, {
    ScreenshotsUtils: "resource:///modules/ScreenshotsUtils.sys.mjs",
  });

  class ScreenshotsButtons extends MozXULElement {
    static #template = null;

    static get markup() {
      return `
        <html:link rel="stylesheet" href="chrome://global/skin/global.css" />
        <html:link rel="stylesheet" href="chrome://browser/content/screenshots/screenshots-buttons.css" />
        <html:moz-button-group>
          <html:button id="visible-page" class="screenshot-button footer-button" data-l10n-id="screenshots-save-visible-button"></html:button>
          <html:button id="full-page" class="screenshot-button footer-button primary" data-l10n-id="screenshots-save-page-button"></html:button>
        </html:moz-button-group>
      `;
    }

    static get fragment() {
      if (!ScreenshotsButtons.#template) {
        ScreenshotsButtons.#template = MozXULElement.parseXULToFragment(
          ScreenshotsButtons.markup
        );
      }
      return ScreenshotsButtons.#template;
    }

    get buttonGroup() {
      return this.shadowRoot?.querySelector("moz-button-group");
    }
    get visibleButton() {
      return this.shadowRoot?.getElementById("visible-page");
    }
    get fullpageButton() {
      return this.shadowRoot?.getElementById("full-page");
    }

    connectedCallback() {
      if (this.shadowRoot) {
        this.ownerDocument.l10n.connectRoot(this.shadowRoot);
      } else {
        const shadowRoot = this.attachShadow({ mode: "open" });
        this.ownerDocument.l10n.connectRoot(shadowRoot);
        shadowRoot.append(ScreenshotsButtons.fragment.cloneNode(true));
      }
      this.buttonGroup.addEventListener("click", this);
    }

    disconnectedCallback() {
      this.ownerDocument.l10n.disconnectRoot(this.shadowRoot);
      this.buttonGroup.removeEventListener("click", this);
    }

    handleEvent(event) {
      switch (event.target) {
        case this.visibleButton:
          ScreenshotsUtils.takeScreenshot(gBrowser.selectedBrowser, "Visible");
          break;
        case this.fullpageButton:
          ScreenshotsUtils.takeScreenshot(gBrowser.selectedBrowser, "FullPage");
          break;
      }
    }

    /**
     * Focus the last used button.
     * This will default to the visible page button.
     *
     * @param {string} buttonToFocus
     */
    async focusButton(buttonToFocus) {
      await this.buttonGroup.updateComplete;
      if (buttonToFocus === "fullpage") {
        this.fullpageButton.focus({ focusVisible: true });
      } else if (buttonToFocus === "first") {
        this.buttonGroup.firstElementChild.focus({ focusVisible: true });
      } else if (buttonToFocus === "last") {
        this.buttonGroup.lastElementChild.focus({ focusVisible: true });
      } else {
        this.visibleButton.focus({ focusVisible: true });
      }
    }
  }

  customElements.define("screenshots-buttons", ScreenshotsButtons);
}
