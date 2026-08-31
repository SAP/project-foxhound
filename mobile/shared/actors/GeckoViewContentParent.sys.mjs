/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewUtils } from "resource://gre/modules/GeckoViewUtils.sys.mjs";
import { GeckoViewActorParent } from "resource://gre/modules/GeckoViewActorParent.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  SessionHistory: "resource://gre/modules/sessionstore/SessionHistory.sys.mjs",
  SessionStoreHelper:
    "resource://gre/modules/sessionstore/SessionStoreHelper.sys.mjs",
});

const { debug, warn } = GeckoViewUtils.initLogging("GeckoViewContentParent");

export class GeckoViewContentParent extends GeckoViewActorParent {
  didDestroy() {
    this._didDestroy = true;
  }

  async containsFormData() {
    return this.sendQuery("ContainsFormData");
  }

  async receiveMessage(aMsg) {
    switch (aMsg.name) {
      case "GeckoView:PinOnScreen": {
        return this.eventDispatcher.sendRequest(
          "GeckoView:PinOnScreen",
          aMsg.data
        );
      }
      default: {
        return super.receiveMessage(aMsg);
      }
    }
  }

  restoreState({ history, switchId, formdata, scrolldata }) {
    const { browsingContext } = this.browser;
    lazy.SessionHistory.restoreFromParent(
      browsingContext.sessionHistory,
      history
    );

    // TODO Bug 1648158 this should include scroll, form history, etc
    return SessionStoreUtils.initializeRestore(
      browsingContext,
      lazy.SessionStoreHelper.buildRestoreData(formdata, scrolldata)
    );
  }

  // This is a copy of browser/actors/DOMFullscreenParent.sys.mjs
  hasBeenDestroyed() {
    if (this._didDestroy) {
      return true;
    }

    // The 'didDestroy' callback is not always getting called.
    // So we can't rely on it here. Instead, we will try to access
    // the browsing context to judge wether the actor has
    // been destroyed or not.
    try {
      return !this.browsingContext;
    } catch {
      return true;
    }
  }
}
