/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @import { SmartbarCommitDetails } from "resource:///modules/AISmartBarParent.sys.mjs"
 */

/**
 * Represents a child actor for getting query requests from the browser.
 */
export class AISmartBarChild extends JSWindowActorChild {
  /**
   * @param {{ name: string, data: SmartbarCommitDetails }} msg
   */
  receiveMessage(msg) {
    if (msg.name === "AskFromParent") {
      const {
        contextMentions,
        contextPageUrl,
        detectedIntent,
        location,
        submitType,
        value,
      } = msg.data;
      let event = new this.contentWindow.CustomEvent("smartbar-commit", {
        detail: {
          action: "chat",
          contextMentions,
          contextPageUrl,
          detectedIntent,
          location,
          submitType,
          value,
        },
        bubbles: true,
        composed: true,
      });
      this.contentWindow.document.dispatchEvent(event);
    }
  }
}
