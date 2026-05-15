/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Represents a child actor for getting query requests from the browser.
 */
export class AISmartBarChild extends JSWindowActorChild {
  receiveMessage(msg) {
    if (msg.name === "AskFromParent") {
      let event = new this.contentWindow.CustomEvent("smartbar-commit", {
        detail: { value: msg.data.query, action: "chat" },
        bubbles: true,
        composed: true,
      });
      this.contentWindow.document.dispatchEvent(event);
    }
  }
}
