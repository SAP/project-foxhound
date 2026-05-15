/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewActorChild } from "resource://gre/modules/GeckoViewActorChild.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  LoadURIDelegate: "resource://gre/modules/LoadURIDelegate.sys.mjs",
});

// Implements nsILoadURIDelegate.
export class LoadURIDelegateChild extends GeckoViewActorChild {
  // nsILoadURIDelegate.
  handleLoadError(aUri, aError, aErrorModule) {
    debug`handleLoadError: uri=${aUri && aUri.spec}
                             displaySpec=${aUri && aUri.displaySpec}
                             error=${aError}`;
    let errorClass = 0;
    try {
      const nssErrorsService = Cc[
        "@mozilla.org/nss_errors_service;1"
      ].getService(Ci.nsINSSErrorsService);
      errorClass = nssErrorsService.getErrorClass(aError);
    } catch (e) {}

    const msg = {
      uri: aUri && aUri.spec,
      error: aError,
      errorModule: aErrorModule,
      errorClass,
    };

    let errorPagePromise = this.sendQuery("GeckoView:OnLoadError", msg);

    return lazy.LoadURIDelegate.handleLoadError(
      this.contentWindow,
      errorPagePromise
    );
  }
}

LoadURIDelegateChild.prototype.QueryInterface = ChromeUtils.generateQI([
  "nsILoadURIDelegate",
]);

const { debug, warn } = LoadURIDelegateChild.initLogging("LoadURIDelegate");
