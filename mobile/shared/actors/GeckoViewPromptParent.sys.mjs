/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewActorParent } from "resource://gre/modules/GeckoViewActorParent.sys.mjs";

export class GeckoViewPromptParent extends GeckoViewActorParent {
  receiveMessage({ name, data }) {
    if (name === "GeckoView:UnblockRedirect") {
      this.unblockRedirect(data.redirectURISpec);
      return null;
    }

    return super.receiveMessage({ name, data });
  }

  unblockRedirect(aRedirectURISpec) {
    const sourceWG = this.browsingContext.currentWindowGlobal;
    if (!sourceWG) {
      return;
    }

    const uri = Services.io.newURI(aRedirectURISpec);
    this.browsingContext.top.loadURI(uri, {
      triggeringPrincipal: sourceWG.documentPrincipal,
    });
  }
}
