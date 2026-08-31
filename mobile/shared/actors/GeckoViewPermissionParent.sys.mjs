/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewUtils } from "resource://gre/modules/GeckoViewUtils.sys.mjs";
import { GeckoViewActorParent } from "resource://gre/modules/GeckoViewActorParent.sys.mjs";

export class GeckoViewPermissionParent extends GeckoViewActorParent {
  _appPermissions = {};

  async getAppPermissions(aPermissions) {
    const perms = aPermissions.filter(perm => !this._appPermissions[perm]);
    if (!perms.length) {
      return Promise.resolve(/* granted */ true);
    }

    const granted = await this.eventDispatcher.sendRequestForResult(
      "GeckoView:AndroidPermission",
      { perms }
    );

    if (granted) {
      for (const perm of perms) {
        this._appPermissions[perm] = true;
      }
    }

    return granted;
  }

  async getContentPermission(aData) {
    return this.eventDispatcher.sendRequestForResult(
      "GeckoView:ContentPermission",
      aData
    );
  }

  addCameraPermission() {
    const principal =
      Services.scriptSecurityManager.createContentPrincipalFromOrigin(
        this.browsingContext.top.currentWindowGlobal.documentPrincipal.origin
      );

    // Although the lifetime is "session" it will be removed upon
    // use so it's more of a one-shot.
    Services.perms.addFromPrincipal(
      principal,
      "MediaManagerVideo",
      Services.perms.ALLOW_ACTION,
      Services.perms.EXPIRE_SESSION
    );

    return null;
  }

  receiveMessage(aMessage) {
    debug`receiveMessage ${aMessage.name}`;

    switch (aMessage.name) {
      case "GeckoView:AddCameraPermission": {
        return this.addCameraPermission();
      }
      case "GeckoView:MediaPermission": {
        return this.eventDispatcher.sendRequestForResult(
          "GeckoView:MediaPermission",
          {
            ...aMessage.data,
            uri: this.manager.documentURI?.spec ?? "",
          }
        );
      }
      case "GeckoView:MediaRecordingStatusChanged": {
        return this.eventDispatcher.sendRequest(
          "GeckoView:MediaRecordingStatusChanged",
          aMessage.data
        );
      }
    }

    return super.receiveMessage(aMessage);
  }
}

const { debug, warn } = GeckoViewUtils.initLogging("GeckoViewPermissionParent");
