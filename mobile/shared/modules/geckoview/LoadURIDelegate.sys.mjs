// -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewUtils } from "resource://gre/modules/GeckoViewUtils.sys.mjs";

const { debug, warn } = GeckoViewUtils.initLogging("LoadURIDelegate");

export const LoadURIDelegate = {
  // Delegate URI loading to the app.
  // Return whether the loading has been handled.
  async load(
    aWindow,
    aEventDispatcher,
    aUri,
    aWhere,
    aFlags,
    aTriggeringPrincipal
  ) {
    if (!aWindow) {
      return false;
    }

    const triggerUri =
      aTriggeringPrincipal &&
      (aTriggeringPrincipal.isNullPrincipal ? null : aTriggeringPrincipal.URI);

    const message = {
      type: "GeckoView:OnLoadRequest",
      uri: aUri ? aUri.displaySpec : "",
      where: aWhere,
      flags: aFlags,
      triggerUri: triggerUri && triggerUri.displaySpec,
      hasUserGesture: aWindow.document.hasValidTransientUserGestureActivation,
    };

    try {
      return await aEventDispatcher.sendRequestForResult(message);
    } catch (e) {
      // There was an error or listener was not registered in GeckoSession,
      // treat as unhandled.
      return false;
    }
  },

  handleLoadError(aWindow, aErrorPagePromise) {
    let errorPageURI = undefined;
    aErrorPagePromise.then(
      response => {
        try {
          errorPageURI = response ? Services.io.newURI(response) : null;
        } catch (e) {
          warn`Failed to parse URI '${response}`;
          errorPageURI = null;
          Components.returnCode = Cr.NS_ERROR_ABORT;
        }
      },
      () => {
        errorPageURI = null;
        Components.returnCode = Cr.NS_ERROR_ABORT;
      }
    );
    Services.tm.spinEventLoopUntil(
      "LoadURIDelegate.sys.mjs:handleLoadError",
      () => aWindow.closed || errorPageURI !== undefined
    );

    return errorPageURI;
  },

  isSafeBrowsingError(aError) {
    return (
      aError === Cr.NS_ERROR_PHISHING_URI ||
      aError === Cr.NS_ERROR_MALWARE_URI ||
      aError === Cr.NS_ERROR_HARMFUL_URI ||
      aError === Cr.NS_ERROR_UNWANTED_URI ||
      aError === Cr.NS_ERROR_HARMFULADDON_URI
    );
  },
};
