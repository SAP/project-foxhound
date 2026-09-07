/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Handles application/x-xpinstall navigation requests in the parent process,
 * by initiating add-on installation.
 */

const XPI_CONTENT_TYPE = "application/x-xpinstall";

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = XPCOMUtils.declareLazy({
  AddonManager: "resource://gre/modules/AddonManager.sys.mjs",
  ThirdPartyUtil: {
    service: "@mozilla.org/thirdpartyutil;1",
    iid: Ci.mozIThirdPartyUtil,
  },
});

export function amContentHandler() {}

amContentHandler.prototype = {
  /**
   * Handles a new request for an application/x-xpinstall file.
   *
   * @param  aMimetype
   *         The mimetype of the file
   * @param  aContext
   *         The context passed to nsIChannel.asyncOpen
   * @param  aRequest
   *         The nsIRequest dealing with the content
   */
  handleContent(aMimetype, aContext, aRequest) {
    if (aMimetype != XPI_CONTENT_TYPE) {
      throw Components.Exception("", Cr.NS_ERROR_WONT_HANDLE_CONTENT);
    }

    if (!(aRequest instanceof Ci.nsIChannel)) {
      throw Components.Exception("", Cr.NS_ERROR_WONT_HANDLE_CONTENT);
    }

    const { loadInfo, URI: uri } = aRequest;
    let { triggeringPrincipal } = loadInfo;
    const browser = loadInfo.targetBrowsingContext.top.embedderElement;

    if (
      triggeringPrincipal.isSystemPrincipal &&
      loadInfo.triggeringRemoteType
    ) {
      // Navigations from the system principal are expected to be triggered
      // from the parent only; downgrade principal if from a content process.
      triggeringPrincipal = Services.scriptSecurityManager.createNullPrincipal(
        loadInfo.originAttributes
      );
    }

    // This check will allow a link to an xpi clicked by the user to trigger the
    // addon install flow, but prevents window.open or window.location from triggering
    // an addon install even when called from inside a event listener triggered by
    // user input.
    if (
      !triggeringPrincipal.isSystemPrincipal &&
      !loadInfo.hasValidUserGestureActivation &&
      Services.prefs.getBoolPref("xpinstall.userActivation.required", true)
    ) {
      const error = Components.Exception(
        `${uri.spec} install cancelled because of missing user gesture activation`,
        Cr.NS_ERROR_WONT_HANDLE_CONTENT
      );
      // Report the error in the BrowserConsole, the error thrown from here doesn't
      // seem to be visible anywhere.
      Cu.reportError(error);
      throw error;
    }

    aRequest.cancel(Cr.NS_BINDING_ABORTED);

    let sourceHost;
    let sourceURL;
    try {
      sourceURL =
        triggeringPrincipal.spec != "" ? triggeringPrincipal.spec : undefined;
      sourceHost = triggeringPrincipal.host;
    } catch (error) {
      // Ignore errors when retrieving the host for the principal (e.g. data URIs return
      // an NS_ERROR_FAILURE when principal.host is accessed).
    }

    const hasCrossOriginAncestor =
      lazy.ThirdPartyUtil.isThirdPartyChannel(aRequest);

    const telemetryInfo = {
      source: lazy.AddonManager.getInstallSourceFromHost(sourceHost),
      sourceURL,
      method: "link",
    };
    if (uri.scheme == "file") {
      telemetryInfo.source = "file-url";
      if (triggeringPrincipal.isSystemPrincipal) {
        delete telemetryInfo.sourceURL; // delete - undefined anyway.
        // Delete to distinguish between "link" and direct navigation.
        delete telemetryInfo.method;
      }
    }

    lazy.AddonManager.getInstallForURL(uri.spec, {
      browser,
      triggeringPrincipal,
      telemetryInfo,
      sendCookies: true,
    }).then(install => {
      if (!install) {
        return;
      }
      lazy.AddonManager.installAddonFromWebpage(
        XPI_CONTENT_TYPE,
        browser,
        triggeringPrincipal,
        install,
        { hasCrossOriginAncestor }
      );
    });
  },

  classID: Components.ID("{7beb3ba8-6ec3-41b4-b67c-da89b8518922}"),
  QueryInterface: ChromeUtils.generateQI(["nsIContentHandler"]),
};
