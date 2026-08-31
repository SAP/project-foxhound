/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * For https channels, ensures that a certificate is present. Optionally
 * ensures that the root of trust for that certificate is a builtin (as in, it
 * shipped with the platform).
 *
 * @param  aChannel
 *         The nsIChannel that will have its certificate checked.
 * @param  aAllowNonBuiltInCerts (optional)
 *         When true certificates that aren't builtin are allowed. When false
 *         or not specified the certificate must be a builtin certificate.
 * @throws NS_ERROR_ABORT if the certificate isn't present or its issuer is not
 *         built-in.
 */
function checkCert(aChannel, aAllowNonBuiltInCerts) {
  if (!aChannel.originalURI.schemeIs("https")) {
    return;
  }

  let secInfo = aChannel.securityInfo;
  if (!secInfo.serverCert) {
    const noCertErr = "No server certificate.";
    throw new Components.Exception(noCertErr, Cr.NS_ERROR_ABORT);
  }

  if (aAllowNonBuiltInCerts === true) {
    return;
  }

  if (!secInfo.isBuiltCertChainRootBuiltInRoot) {
    const certNotBuiltInErr = "Certificate issuer is not built-in.";
    throw new Components.Exception(certNotBuiltInErr, Cr.NS_ERROR_ABORT);
  }
}

/**
 * This class implements nsIChannelEventSink. Its job is to perform extra checks
 * on the certificates used for some connections when those connections
 * redirect.
 *
 * @param  aAllowNonBuiltInCerts (optional)
 *         When true certificates that aren't builtin are allowed. When false
 *         or not specified the certificate must be a builtin certificate.
 */
function BadCertHandler(aAllowNonBuiltInCerts) {
  this.allowNonBuiltInCerts = aAllowNonBuiltInCerts;
}
BadCertHandler.prototype = {
  // nsIChannelEventSink
  asyncOnChannelRedirect(oldChannel, newChannel, flags, callback) {
    if (this.allowNonBuiltInCerts) {
      callback.onRedirectVerifyCallback(Cr.NS_OK);
      return;
    }

    // make sure the certificate of the old channel checks out before we follow
    // a redirect from it.  See bug 340198.
    // Don't call checkCert for internal redirects. See bug 569648.
    if (!(flags & Ci.nsIChannelEventSink.REDIRECT_INTERNAL)) {
      checkCert(oldChannel);
    }

    callback.onRedirectVerifyCallback(Cr.NS_OK);
  },

  // nsIInterfaceRequestor
  getInterface(iid) {
    return this.QueryInterface(iid);
  },

  // nsISupports
  QueryInterface: ChromeUtils.generateQI([
    "nsIChannelEventSink",
    "nsIInterfaceRequestor",
  ]),
};

export var CertUtils = {
  BadCertHandler,
  checkCert,
};
