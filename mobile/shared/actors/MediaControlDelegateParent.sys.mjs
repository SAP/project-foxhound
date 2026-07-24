/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewActorParent } from "resource://gre/modules/GeckoViewActorParent.sys.mjs";

export class MediaControlDelegateParent extends GeckoViewActorParent {
  async receiveMessage({ name, data }) {
    switch (name) {
      case "GeckoView:MediaSession:Fullscreen": {
        return this.eventDispatcher.sendRequestForResult({
          ...data,
          type: "GeckoView:MediaSession:Fullscreen",
        });
      }
      default: {
        return super.receiveMessage({ name, data });
      }
    }
  }
}
