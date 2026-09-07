/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* globals windowRoot */

class ProxyContextMenu extends HTMLElement {
  openPopupAtScreen(...args) {
    // prettier-ignore
    const parentContextMenuPopup =
      windowRoot.window.document.getElementById("contentAreaContextMenu");
    return parentContextMenuPopup.openPopupAtScreen(...args);
  }
}
customElements.define("proxy-context-menu", ProxyContextMenu);
