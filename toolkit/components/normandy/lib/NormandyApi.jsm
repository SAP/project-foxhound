/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const lazy = {};

ChromeUtils.defineModuleGetter(
  lazy,
  "CanonicalJSON",
  "resource://gre/modules/CanonicalJSON.jsm"
);

var EXPORTED_SYMBOLS = ["NormandyApi"];

const prefs = Services.prefs.getBranch("app.normandy.");

let indexPromise = null;

function getChainRootIdentifier() {
  const normandy_url = Services.prefs.getCharPref("app.normandy.api_url");
  if (normandy_url == "https://normandy.cdn.mozilla.net/api/v1") {
    return Ci.nsIContentSignatureVerifier.ContentSignatureProdRoot;
  }
  if (normandy_url.includes("stage.")) {
    return Ci.nsIContentSignatureVerifier.ContentSignatureStageRoot;
  }
  if (normandy_url.includes("dev.")) {
    return Ci.nsIContentSignatureVerifier.ContentSignatureDevRoot;
  }
  if (Services.env.exists("XPCSHELL_TEST_PROFILE_DIR")) {
    return Ci.nsIX509CertDB.AppXPCShellRoot;
  }
  return Ci.nsIContentSignatureVerifier.ContentSignatureLocalRoot;
}

var NormandyApi = {
  InvalidSignatureError: class InvalidSignatureError extends Error {},

  clearIndexCache() {
    indexPromise = null;
  },

  get(endpoint, data) {
    const url = new URL(endpoint);
    if (data) {
      for (const key of Object.keys(data)) {
        url.searchParams.set(key, data[key]);
      }
    }
    return fetch(url.href, {
      method: "get",
      headers: { Accept: "application/json" },
      credentials: "omit",
    });
  },

  absolutify(url) {
    if (url.startsWith("http")) {
      return url;
    }
    const apiBase = prefs.getCharPref("api_url");
    const server = new URL(apiBase).origin;
    if (url.startsWith("/")) {
      return server + url;
    }
    throw new Error("Can't use relative urls");
  },

  async getApiUrl(name) {
    if (!indexPromise) {
      const apiBase = new URL(prefs.getCharPref("api_url"));
      if (!apiBase.pathname.endsWith("/")) {
        apiBase.pathname += "/";
      }
      indexPromise = this.get(apiBase.toString()).then(res => res.json());
    }
    const index = await indexPromise;
    if (!(name in index)) {
      throw new Error(`API endpoint with name "${name}" not found.`);
    }
    const url = index[name];
    return this.absolutify(url);
  },

  /**
   * Verify content signature, by serializing the specified `object` as
   * canonical JSON, and using the Normandy signer verifier to check that
   * it matches the signature specified in `signaturePayload`.
   *
   * If the the signature is not valid, an error is thrown. Otherwise this
   * function returns undefined.
   *
   * @param {object|String} data The object (or string) to be checked
   * @param {object} signaturePayload The signature information
   * @param {String} signaturePayload.x5u The certificate chain URL
   * @param {String} signaturePayload.signature base64 signature bytes
   * @param {String} type The object type (eg. `"recipe"`, `"action"`)
   * @returns {Promise<undefined>} If the signature is valid, this function returns without error
   * @throws {NormandyApi.InvalidSignatureError} if signature is invalid.
   */
  async verifyObjectSignature(data, signaturePayload, type) {
    const { signature, x5u } = signaturePayload;
    const certChainResponse = await this.get(this.absolutify(x5u));
    const certChain = await certChainResponse.text();
    const builtSignature = `p384ecdsa=${signature}`;

    const serialized =
      typeof data == "string" ? data : lazy.CanonicalJSON.stringify(data);

    const verifier = Cc[
      "@mozilla.org/security/contentsignatureverifier;1"
    ].createInstance(Ci.nsIContentSignatureVerifier);

    let valid;
    try {
      valid = await verifier.asyncVerifyContentSignature(
        serialized,
        builtSignature,
        certChain,
        "normandy.content-signature.mozilla.org",
        getChainRootIdentifier()
      );
    } catch (err) {
      throw new NormandyApi.InvalidSignatureError(
        `${type} signature validation failed: ${err}`
      );
    }

    if (!valid) {
      throw new NormandyApi.InvalidSignatureError(
        `${type} signature is not valid`
      );
    }
  },

  /**
   * Fetch metadata about this client determined by the server.
   * @return {object} Metadata specified by the server
   */
  async classifyClient() {
    const classifyClientUrl = await this.getApiUrl("classify-client");
    const response = await this.get(classifyClientUrl);
    const clientData = await response.json();
    clientData.request_time = new Date(clientData.request_time);
    return clientData;
  },

  /**
   * Fetch details for an extension from the server.
   * @param extensionId {integer} The ID of the extension to look up
   * @resolves {Object}
   */
  async fetchExtensionDetails(extensionId) {
    const baseUrl = await this.getApiUrl("extension-list");
    const extensionDetailsUrl = `${baseUrl}${extensionId}/`;
    const response = await this.get(extensionDetailsUrl);
    return response.json();
  },
};
