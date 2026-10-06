/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  E10SUtils: "resource://gre/modules/E10SUtils.sys.mjs",
  SpecialMessageActions:
    "resource://messaging-system/lib/SpecialMessageActions.sys.mjs",
});

export class ASRouterNewTabMessageParent extends JSWindowActorParent {
  receiveMessage(message) {
    /**
     * @backward-compat {version 151}
     *
     * remoteType only became available on WindowGlobalParent starting in 151,
     * so fallback to this.manager.domProcess.remoteType until 151 hits release.
     */
    if (
      this.manager.remoteType !== lazy.E10SUtils.PRIVILEGEDABOUT_REMOTE_TYPE &&
      this.manager.domProcess.remoteType !==
        lazy.E10SUtils.PRIVILEGEDABOUT_REMOTE_TYPE
    ) {
      return null;
    }
    switch (message.name) {
      case "SpecialMessageAction": {
        let browser = this.browsingContext.top.embedderElement;
        lazy.SpecialMessageActions.handleAction(message.data.action, browser);
      }
    }

    return null;
  }
}
