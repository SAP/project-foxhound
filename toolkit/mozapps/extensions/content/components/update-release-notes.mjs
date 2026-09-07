/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* globals windowRoot */

import { loadReleaseNotes } from "../aboutaddons-utils.mjs";

class UpdateReleaseNotes extends HTMLElement {
  connectedCallback() {
    this.addEventListener("click", this);
  }

  disconnectedCallback() {
    this.removeEventListener("click", this);
  }

  handleEvent(e) {
    // We used to strip links, but ParserUtils.parseFragment() leaves them in,
    // so just make sure we open them using the null principal in a new tab.
    if (e.type == "click" && e.target.localName == "a" && e.target.href) {
      e.preventDefault();
      e.stopPropagation();
      windowRoot.window.openWebLinkIn(e.target.href, "tab");
    }
  }

  async loadForUri(uri) {
    // Can't load the release notes without a URL to load.
    if (!uri || !uri.spec) {
      this.setErrorMessage();
      this.dispatchEvent(new CustomEvent("release-notes-error"));
      return;
    }

    // Don't try to load for the same update a second time.
    if (this.url == uri.spec) {
      this.dispatchEvent(new CustomEvent("release-notes-cached"));
      return;
    }

    // Store the URL to skip the network if loaded again.
    this.url = uri.spec;

    // Set the loading message before hitting the network.
    this.setLoadingMessage();
    this.dispatchEvent(new CustomEvent("release-notes-loading"));

    try {
      // loadReleaseNotes will fetch and sanitize the release notes.
      let fragment = await loadReleaseNotes(uri);
      this.textContent = "";
      this.appendChild(fragment);
      this.dispatchEvent(new CustomEvent("release-notes-loaded"));
    } catch (e) {
      this.setErrorMessage();
      this.dispatchEvent(new CustomEvent("release-notes-error"));
    }
  }

  setMessage(id) {
    this.textContent = "";
    let message = document.createElement("p");
    document.l10n.setAttributes(message, id);
    this.appendChild(message);
  }

  setLoadingMessage() {
    this.setMessage("release-notes-loading");
  }

  setErrorMessage() {
    this.setMessage("release-notes-error");
  }
}
customElements.define("update-release-notes", UpdateReleaseNotes);
