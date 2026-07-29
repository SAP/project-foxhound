/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewUtils } from "resource://gre/modules/GeckoViewUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  E10SUtils: "resource://gre/modules/E10SUtils.sys.mjs",
  EventDispatcher: "resource://gre/modules/Messaging.sys.mjs",
});

const PERM_ACCESS_FINE_LOCATION = "android.permission.ACCESS_FINE_LOCATION";

const MAPPED_TO_EXTENSION_PERMISSIONS = [
  "persistent-storage",
  // TODO(Bug 1336194): support geolocation manifest permission
  // (see https://bugzilla.mozilla.org/show_bug.cgi?id=1336194#c17)l
];

export class GeckoViewPermission {
  // In-flight content permission requests keyed by the id we mint and send to
  // the Android side, so we can fire notifyShown() once the prompt UI is
  // actually visible.
  #pendingShownRequests = new Map();

  constructor() {
    this.wrappedJSObject = this;
    lazy.EventDispatcher.instance.registerListener(this, [
      "GeckoView:ContentPermissionShown",
    ]);
  }

  onEvent(aEvent, aData, aCallback) {
    if (aEvent === "GeckoView:ContentPermissionShown") {
      const id = aData?.requestId;
      const request = id ? this.#pendingShownRequests.get(id) : null;
      if (request) {
        // Remove before invoking notifyShown so a duplicate event (or a
        // misbehaving embedder calling notifyShown() twice) does not
        // double-count telemetry on the Gecko side.
        this.#pendingShownRequests.delete(id);
        try {
          request.notifyShown();
        } catch (error) {
          console.error(
            "GeckoView:ContentPermissionShown: notifyShown failed:",
            error
          );
        }
      }
    }
  }

  async prompt(aRequest) {
    const result = await this.promptPermission(aRequest);
    if (!result.allow) {
      aRequest.cancel();
    } else {
      // Note: permission could be undefined, that's what aRequest expects.
      const { permission } = result;
      aRequest.allow(permission);
    }
  }

  // Some WebAPI permissions can be requested and granted to extensions through the
  // the extension manifest.json, which the user have been already prompted for
  // (e.g. at install time for the one listed in the manifest.json permissions property,
  // or at runtime through the optional_permissions property and the permissions.request
  // WebExtensions API method).
  //
  // WebAPI permission that are expected to be mapped to extensions permissions are listed
  // in the MAPPED_TO_EXTENSION_PERMISSIONS array.
  //
  // @param {nsIContentPermissionType} perm
  //        The WebAPI permission being requested
  // @param {nsIContentPermissionRequest} aRequest
  //        The nsIContentPermissionRequest as received by the promptPermission method.
  //
  // @returns {null | { allow: boolean, permission: Object }
  //          Returns null if the request was not handled and should continue with the
  //          regular permission prompting flow, otherwise it returns an object to
  //          allow or disallow the permission request right away.
  checkIfGrantedByExtensionPermissions(perm, aRequest) {
    if (!aRequest.principal.addonPolicy) {
      // Not an extension, continue with the regular permission prompting flow.
      return null;
    }

    // Return earlier and continue with the regular permission prompting flow if the
    // the permission is no one that can be requested from the extension manifest file.
    if (!MAPPED_TO_EXTENSION_PERMISSIONS.includes(perm.type)) {
      return null;
    }

    // Disallow if the extension is not active anymore.
    if (!aRequest.principal.addonPolicy.active) {
      return { allow: false };
    }

    // Check if the permission have been already granted to the extension, if it is allow it right away.
    const isGranted =
      Services.perms.testPermissionFromPrincipal(
        aRequest.principal,
        perm.type
      ) === Services.perms.ALLOW_ACTION;
    if (isGranted) {
      return {
        allow: true,
        permission: { [perm.type]: Services.perms.ALLOW_ACTION },
      };
    }

    // continue with the regular permission prompting flow otherwise.
    return null;
  }

  async promptPermission(aRequest) {
    // Only allow exactly one permission request here.
    const types = aRequest.types.QueryInterface(Ci.nsIArray);
    if (types.length !== 1) {
      return { allow: false };
    }

    const perm = types.queryElementAt(0, Ci.nsIContentPermissionType);

    // Check if the request principal is an extension principal and if the permission requested
    // should be already granted based on the extension permissions (or disallowed right away
    // because the extension is not enabled anymore.
    const extensionResult = this.checkIfGrantedByExtensionPermissions(
      perm,
      aRequest
    );
    if (extensionResult) {
      return extensionResult;
    }

    if (
      perm.type === "desktop-notification" &&
      !aRequest.hasValidTransientUserGestureActivation &&
      Services.prefs.getBoolPref(
        "dom.webnotifications.requireuserinteraction",
        true
      )
    ) {
      // We need user interaction and don't have it.
      return { allow: false };
    }

    const principal =
      perm.type === "storage-access"
        ? aRequest.principal
        : aRequest.topLevelPrincipal;

    const window = aRequest.window
      ? aRequest.window
      : aRequest.element.documentGlobal;

    const actor = window.browsingContext.currentWindowGlobal.getActor(
      "GeckoViewPermission"
    );

    const requestId = Services.uuid.generateUUID().toString().slice(1, -1);
    this.#pendingShownRequests.set(requestId, aRequest);

    let allowOrDeny;
    try {
      allowOrDeny = await actor.getContentPermission({
        uri: principal.URI.displaySpec,
        thirdPartyOrigin: aRequest.principal.origin,
        principal: lazy.E10SUtils.serializePrincipal(principal),
        perm: perm.type,
        value: perm.capability,
        contextId: principal.originAttributes.geckoViewSessionContextId ?? null,
        privateMode: principal.privateBrowsingId != 0,
        requestId,
      });

      if (allowOrDeny === Services.perms.ALLOW_ACTION) {
        // Ask for app permission after asking for content permission.
        if (perm.type === "geolocation") {
          const granted = await actor.getAppPermissions([
            PERM_ACCESS_FINE_LOCATION,
          ]);
          allowOrDeny = granted
            ? Services.perms.ALLOW_ACTION
            : Services.perms.DENY_ACTION;
        }
      }
    } catch (error) {
      console.error("Permission error:", error);
      allowOrDeny = Services.perms.DENY_ACTION;
    } finally {
      this.#pendingShownRequests.delete(requestId);
    }

    // Manually release the target request here to facilitate garbage collection.
    aRequest = undefined;

    const allow = allowOrDeny === Services.perms.ALLOW_ACTION;

    // The storage access code adds itself to the perm manager; no need for us to do it.
    if (perm.type === "storage-access") {
      if (allow) {
        return { allow, permission: { "storage-access": "allow" } };
      }
      return { allow };
    }

    Services.perms.addFromPrincipal(
      principal,
      perm.type,
      allowOrDeny,
      Services.perms.EXPIRE_NEVER
    );

    return { allow };
  }
}

GeckoViewPermission.prototype.classID = Components.ID(
  "{42f3c238-e8e8-4015-9ca2-148723a8afcf}"
);
GeckoViewPermission.prototype.QueryInterface = ChromeUtils.generateQI([
  "nsIContentPermissionPrompt",
]);

const { debug, warn } = GeckoViewUtils.initLogging("GeckoViewPermission");
