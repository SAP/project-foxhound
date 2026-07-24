/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

/**
 * JSWindowActorChild that tracks popups and redirects blocked for the
 * current document and reports them to the parent.
 *
 * - Listens for "DOMPopupBlocked" and "DOMRedirectBlocked" events.
 * - Stores per-document state in a WeakMap.
 * - Exposes messages:
 *   • "GetBlockedPopups" / "GetBlockedRedirect" → return recorded info
 *   • "UnblockPopup" → replays a blocked window.open if still valid
 * - Notifies parent on changes via "UpdateBlockedPopups"/"UpdateBlockedRedirect".
 */
export class PopupAndRedirectBlockingChild extends JSWindowActorChild {
  /**
   * @typedef {object} DocState
   * @property {Array<{
   *   popupWindowURISpec: string,
   *   popupWindowFeatures: string,
   *   popupWindowName: string,
   *   requestingWindow: Window,
   *   requestingDocument: Document
   * }>} popups
   *   List of blocked popup attempts for the document.
   *
   * @property {null | {
   *   redirectURISpec: string,
   *   requestingWindow: Window,
   *   requestingDocument: Document
   * }} redirect
   *   First blocked redirect for the document, or null if none.
   */

  /**
   * WeakMap keyed by `document`, holding per-document popup/redirect state.
   *
   * @type {WeakMap<Document, DocState>}
   */
  #mWeakDocStates;

  constructor() {
    super();
    this.#mWeakDocStates = new WeakMap();
  }

  /**
   * Returns the per-document state object for the current `document`,
   * creating and storing a new one in the WeakMap if it does not exist.
   *
   * @returns {DocState} The state object for the current document.
   */
  #getOrCreateDocState() {
    let state = this.#mWeakDocStates.get(this.document);
    if (!state) {
      state = {
        popups: [],
        redirect: null,
      };
      this.#mWeakDocStates.set(this.document, state);
    }

    return state;
  }

  receiveMessage(aMessage) {
    switch (aMessage.name) {
      case "GetBlockedPopups":
        return this.#getBlockedPopups();
      case "GetBlockedRedirect":
        return this.#getBlockedRedirect();
      case "UnblockPopup":
        this.#unblockPopup(aMessage);
        break;
    }

    return null;
  }

  #getBlockedPopups() {
    const state = this.#getOrCreateDocState();
    // Taking the minimum to ensure that `length` is always less than
    // `PopupAndRedirectBlockingChild.maxReportedPopups`, but no greater
    // than `state.popups.length`.
    const length = Math.min(
      state.popups.length,
      PopupAndRedirectBlockingChild.maxReportedPopups
    );
    const result = [];

    for (let i = 0; i < length; ++i) {
      const popup = state.popups[i];
      const { popupWindowURISpec } = popup;
      result.push({
        popupWindowURISpec,
      });
    }

    return result;
  }

  #getBlockedRedirect() {
    const redirect = this.#getOrCreateDocState().redirect;
    if (!redirect) {
      return null;
    }

    return {
      redirectURISpec: redirect.redirectURISpec,
    };
  }

  #unblockPopup(aMessage) {
    const idx = aMessage.data.index;
    const popup = this.#getOrCreateDocState().popups[idx];

    if (popup?.requestingWindow?.document == popup.requestingDocument) {
      popup.requestingWindow.open(
        popup.popupWindowURISpec,
        popup.popupWindowName,
        popup.popupWindowFeatures
      );
    }
  }

  handleEvent(aEvent) {
    // Ignore events from other docs (e.g. subframes or old navigated docs).
    if (aEvent.target != this.document) {
      return;
    }

    switch (aEvent.type) {
      case "DOMPopupBlocked":
        this.#onPopupBlocked(aEvent);
        break;
      case "DOMRedirectBlocked":
        this.#onRedirectBlocked(aEvent);
        break;
    }
  }

  #onPopupBlocked(aEvent) {
    const state = this.#getOrCreateDocState();
    if (
      state.popups.length >= PopupAndRedirectBlockingChild.maxReportedPopups
    ) {
      return;
    }

    const popup = {
      // If an empty string is passed to window.open, it will open
      // "about:blank".
      popupWindowURISpec: aEvent.popupWindowURI?.spec ?? "about:blank",
      popupWindowFeatures: aEvent.popupWindowFeatures,
      popupWindowName: aEvent.popupWindowName,
      requestingWindow: aEvent.requestingWindow,
      requestingDocument: aEvent.requestingWindow.document,
    };
    state.popups.push(popup);

    this.#updateParentAboutBlockedPopups();
  }

  #onRedirectBlocked(aEvent) {
    const state = this.#getOrCreateDocState();
    // In case of multiple blocked redirects, we only store the first
    // since after redirecting the whole state would be destroyed anyway.
    if (state.redirect) {
      return;
    }

    const redirect = {
      redirectURISpec: aEvent.redirectURI.spec,
      requestingWindow: aEvent.requestingWindow,
      requestingDocument: aEvent.requestingWindow.document,
    };
    state.redirect = redirect;

    this.#updateParentAboutBlockedRedirect();
  }

  #updateParentAboutBlockedPopups() {
    this.sendAsyncMessage("UpdateBlockedPopups", {
      count: this.#getOrCreateDocState().popups.length,
    });
  }

  #updateParentAboutBlockedRedirect() {
    this.sendAsyncMessage("UpdateBlockedRedirect");
  }
}

XPCOMUtils.defineLazyPreferenceGetter(
  PopupAndRedirectBlockingChild,
  "maxReportedPopups",
  "privacy.popups.maxReported"
);
