/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var EXPORTED_SYMBOLS = ["ContentDelegateParent"];

const { GeckoViewUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/GeckoViewUtils.sys.mjs"
);

const { GeckoViewActorParent } = ChromeUtils.importESModule(
  "resource://gre/modules/GeckoViewActorParent.sys.mjs"
);

const { debug, warn } = GeckoViewUtils.initLogging("ContentDelegateParent");

class ContentDelegateParent extends GeckoViewActorParent {
  async receiveMessage(aMsg) {
    debug`receiveMessage: ${aMsg.name}`;

    switch (aMsg.name) {
      case "GeckoView:DOMFullscreenExit": {
        this.window.windowUtils.remoteFrameFullscreenReverted();
        return null;
      }

      case "GeckoView:DOMFullscreenRequest": {
        this.window.windowUtils.remoteFrameFullscreenChanged(this.browser);
        return null;
      }
    }

    return super.receiveMessage(aMsg);
  }
}
