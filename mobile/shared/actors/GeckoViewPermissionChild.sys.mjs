/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewActorChild } from "resource://gre/modules/GeckoViewActorChild.sys.mjs";

export class GeckoViewPermissionChild extends GeckoViewActorChild {
  getMediaPermission(aPermission) {
    return this.sendQuery("GeckoView:MediaPermission", {
      ...aPermission,
    });
  }

  addCameraPermission() {
    return this.sendQuery("GeckoView:AddCameraPermission");
  }

  mediaRecordingStatusChanged(aDevices) {
    return this.sendAsyncMessage("GeckoView:MediaRecordingStatusChanged", {
      devices: aDevices,
    });
  }
}

const { debug, warn } = GeckoViewPermissionChild.initLogging(
  "GeckoViewPermissionChild"
);
