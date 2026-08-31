/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export class UnselectedTabHoverParent extends JSWindowActorParent {
  receiveMessage(message) {
    const topBrowsingContext = this.manager.browsingContext.top;
    const browser = topBrowsingContext.embedderElement;
    if (!browser) {
      return;
    }
    browser.shouldHandleUnselectedTabHover = message.data.enable;
  }
}
