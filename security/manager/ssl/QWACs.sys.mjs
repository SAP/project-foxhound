/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

XPCOMUtils.defineLazyServiceGetters(lazy, {
  CertDB: ["@mozilla.org/security/x509certdb;1", Ci.nsIX509CertDB],
});

function arrayToString(a) {
  let s = "";
  for (let b of a) {
    s += String.fromCharCode(b);
  }
  return s;
}

function stringToArrayBuffer(str) {
  let bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}

/**
 * A qualified website authentication certificate, or QWAC, is a special type
 * of certificate issued according to the European Union eIDAS regulation. It
 * is essentially an EV certificate (EU's version). The primary document
 * describing its implementation and use is ETSI TS 119 411-5.
 */
export var QWACs = {
  fromBase64URLEncoding(base64URLEncoded) {
    return atob(base64URLEncoded.replaceAll("-", "+").replaceAll("_", "/"));
  },

  toBase64URLEncoding(str) {
    return btoa(str)
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
  },

  // Validates and returns the decoded parameters of a TLS certificate binding
  // header as specified by ETSI TS 119 411-5 V2.1.1 Annex B, ETSI TS 119 182-1
  // V1.2.1, and RFC 7515.
  // If the header contains invalid values or otherwise fails to validate,
  // returns false.
  // This should probably not be called directly outside of tests -
  // verifyTLSCertificateBinding is the main entrypoint of this implementation.
  validateTLSCertificateBindingHeader(header) {
    // ETSI TS 119 411-5 V2.1.1 Annex B specifies the TLS Certificate Binding
    // Profile and states that "Only header parameters specified in this
    // profile may be present in the header of the generated JAdES signature."
    const allowedHeaderKeys = new Set([
      "alg",
      "kid",
      "cty",
      "x5t#S256",
      "x5c",
      "iat",
      "exp",
      "sigD",
    ]);
    let headerKeys = new Set(Object.keys(header));
    if (!headerKeys.isSubsetOf(allowedHeaderKeys)) {
      console.error("header contains invalid parameter");
      return false;
    }

    // ETSI TS 119 182-1 V1.2.1 Section 5.1.2 specifies that "alg" shall be as
    // described in RFC 7515 Section 4.1.1, which references RFC 7518. None of
    // these specifications require support for a particular signature
    // algorithm, but RFC 7518 recommends supporting "RS256" (RSASSA-PKCS1-v1_5
    // with SHA-256) and "ES256" (ECDSA with P-256 and SHA-256), so those are
    // supported. Additionally, "PS256" (RSASSA-PSS with SHA-256) is supported
    // for compatibility and as better alternative to RSASSA-PKCS1-v1_5.
    // The specification says "alg" can't conflict with signing certificate
    // key. This is enforced when the signature is verified.
    if (!("alg" in header)) {
      console.error("header missing 'alg' field");
      return false;
    }
    let algorithm;
    switch (header.alg) {
      case "RS256":
        algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
        break;
      case "PS256":
        algorithm = { name: "RSA-PSS", saltLength: 32, hash: "SHA-256" };
        break;
      case "ES256":
        algorithm = { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" };
        break;
      default:
        console.error("unsupported alg:", header.alg);
        return false;
    }

    // RFC 7515 defines "kid" as an optional hint. It is unnecessary.

    // ETSI TS 119 411-5 V2.1.1 Annex B says that "cty" will have the value
    // "TLS-Certificate-Binding-v1". However, ETSI TS 119 182-1 V1.2.1 Section
    // 5.1.3 states that "The cty header parameter should not be present if the
    // sigD header parameter, specified in clause 5.2.8 of the present
    // document, is present within the JAdES signature."
    // ETSI TS 119 411-5 V2.1.1 Annex B also requires sigD to be present, so
    // either this is a mistake, or ETSI TS 119 411-5 Annex B deliberately
    // disregards ETSI TS 119 182-1.
    // Chrome's implementation requires "cty", so for compatibility, this
    // matches that behavior.
    if (!("cty" in header)) {
      console.error("header missing field 'cty'");
      return false;
    }
    if (header.cty != "TLS-Certificate-Binding-v1") {
      console.error("invalid value for cty:", header.cty);
      return false;
    }

    // RFC 7515 defines "x5t#S256" as "base64url-encoded SHA-256 thumbprint
    // (a.k.a. digest) of the DER encoding of the X.509 certificate [RFC5280]
    // corresponding to the key used to digitally sign the JWS".
    // It is optional. If present, it must match the digest of the 0th element
    // of "x5c" (this is checked after processing x5c, below).
    let x5tS256;
    if ("x5t#S256" in header) {
      x5tS256 = header["x5t#S256"];
    }

    // RFC 7515:
    //   The "x5c" (X.509 certificate chain) Header Parameter contains the
    //   X.509 public key certificate or certificate chain [RFC5280]
    //   corresponding to the key used to digitally sign the JWS.  The
    //   certificate or certificate chain is represented as a JSON array of
    //   certificate value strings.  Each string in the array is a
    //   base64-encoded (Section 4 of [RFC4648] -- not base64url-encoded) DER
    //   [ITU.X690.2008] PKIX certificate value.
    if (!("x5c" in header)) {
      console.error("header missing field 'x5c'");
      return false;
    }
    let certificates = [];
    for (let base64 of header.x5c) {
      try {
        certificates.push(lazy.CertDB.constructX509FromBase64(base64));
      } catch (e) {
        console.error("couldn't decode certificate");
        return false;
      }
    }
    // ETSI TS 119 411-5 V2.1.1 Annex B states that "x5c" consists of the full
    // certificate chain, including the trust anchor. However, only the signing
    // certificate and any intermediates relevant to path-building are strictly
    // necessary.
    if (certificates.length < 1) {
      console.error("header must specify certificate chain");
      return false;
    }
    if (x5tS256) {
      // signingCertificateHashHex will be of the form "AA:BB:..."
      let signingCertificateHashHex = certificates[0].sha256Fingerprint;
      let signingCertificateHashBytes = signingCertificateHashHex
        .split(":")
        .map(hexStr => parseInt(hexStr, 16));
      if (
        x5tS256 !=
        QWACs.toBase64URLEncoding(arrayToString(signingCertificateHashBytes))
      ) {
        console.error("x5t#S256 does not match signing certificate");
        return false;
      }
    }

    // ETSI TS 119 411-5 V2.1.1 Annex B's definition of "iat" reads "This field
    // contains the claimed signing time. The value shall be encoded as
    // specified in IETF RFC 7519 [9]." However, in RFC 7519, "iat" is a claim
    // that can be made by a JWT, not used as a header field in a JWS. In any
    // case, ETSI TS 119 411-5 offers no guidance on how this header affects
    // validation. Consequently, as it is optional, it is ignored.

    // Similarly, the definition of "exp" reads "This field contains the expiry
    // date of the binding. The maximum effective expiry time is whichever is
    // soonest of this field, the longest-lived TLS certificate identified in
    // the sigD member payload (below), or the notAfter time of the signing
    // certificate. The value shall be encoded as specified in IETF RFC 7519
    // [9]," again referencing a JWT claim and not a JWS header.
    // We interpret this to be an optional mechanism to expire bindings earlier
    // than the earliest "notAfter" value amongst the certificates specified in
    // "x5c".
    // RFC 7519 says this will be a NumericDate, which is a "JSON numeric value
    // representing the number of seconds from 1970-01-01T00:00:00Z UTC".
    if ("exp" in header) {
      let expirationSeconds = parseInt(header.exp);
      if (isNaN(expirationSeconds)) {
        console.error("invalid expiration time");
        return false;
      }
      let expiration = new Date(expirationSeconds * 1000);
      if (expiration < new Date()) {
        console.error("header has expired");
        return false;
      }
    }

    // "sigD" lists the TLS server certificates being bound, and must be
    // present.
    if (!("sigD" in header)) {
      console.error("header missing field 'sigD'");
      return false;
    }
    let sigD = header.sigD;
    const allowedSigDKeys = new Set(["mId", "pars", "hashM", "hashV"]);
    let sigDKeys = new Set(Object.keys(sigD));
    if (!sigDKeys.isSubsetOf(allowedSigDKeys)) {
      console.error("sigD contains invalid parameter");
      return false;
    }
    // ETSI TS 119 411-5 V2.1.1 Annex B requires that "sigD.mId" be
    // "http://uri.etsi.org/19182/ObjectIdByURIHash".
    if (!("mId" in sigD)) {
      console.error("header missing field 'sigD.mId'");
      return false;
    }
    if (sigD.mId != "http://uri.etsi.org/19182/ObjectIdByURIHash") {
      console.error("invalid value for sigD.mId:", sigD.mId);
      return false;
    }

    // ETSI TS 119 411-5 V2.1.1 Annex B defines "sigD.pars" as "A comma-separated
    // list of TLS certificate file names." The only thing to validate here is
    // that pars has as many elements as "hashV", later.
    if (!("pars" in sigD)) {
      console.error("header missing field 'sigD.pars'");
      return false;
    }
    let pars = sigD.pars;

    // ETSI TS 119 411-5 V2.1.1 Annex B defines "sigD.hashM" as 'The string
    // identifying one of the approved hashing algorithms identified by ETSI TS
    // 119 312 [8] for JAdES. This hashing algorithm is used to calculate the
    // hashes described in the "hashV" member below.' It further requires that
    // "SHA-256, SHA-384, and SHA-512 are supported, and it is assumed that
    // strings identifying them are S256, S384, and S512 respectively".
    if (!("hashM" in sigD)) {
      console.error("header missing field 'sigD.hashM'");
      return false;
    }
    let hashAlg;
    switch (sigD.hashM) {
      case "S256":
        hashAlg = "SHA-256";
        break;
      case "S384":
        hashAlg = "SHA-384";
        break;
      case "S512":
        hashAlg = "SHA-512";
        break;
      default:
        console.error("unsupported hashM:", sigD.hashM);
        return false;
    }

    // ETSI TS 119 411-5 V2.1.1 Annex B defines "sigD.hashV" as 'A
    // comma-separated list of TLS certificate file hashes. Each hash is
    // produced by taking the corresponding X.509 certificate, computing its
    // base64url encoding, and calculating its hash using the algorithm
    // identified in the "hashM" member above.'
    // This array must be the same length as the "sigD.pars" array.
    if (!("hashV" in sigD)) {
      console.error("header missing field 'sigD.hashV'");
      return false;
    }
    let hashes = sigD.hashV;
    if (hashes.length != pars.length) {
      console.error("header sigD.pars/hashV mismatch");
      return false;
    }
    for (let hash of hashes) {
      if (typeof hash != "string") {
        console.error("invalid hash:", hash);
        return false;
      }
    }

    return { algorithm, certificates, hashAlg, hashes };
  },

  // Given a TLS certificate binding, a TLS server certificate, and a hostname,
  // this function validates the binding, extracts its parameters, verifies
  // that the binding signing certificate is a 2-QWAC certificate valid for the
  // given hostname that chains to a QWAC trust anchor, verifies the signature
  // on the binding, and finally verifies that the binding covers the server
  // certificate.
  // Returns the QWAC upon success, and null otherwise.
  async verifyTLSCertificateBinding(
    tlsCertificateBinding,
    serverCertificate,
    hostname
  ) {
    // tlsCertificateBinding is a JAdES signature, which is a JWS. Because ETSI
    // TS 119 411-5 V2.1.1 Annex B requires sigD be present, and because ETSI
    // TS 119 182-1 V1.2.1 states "The sigD header parameter shall not appear
    // in JAdES signatures whose JWS Payload is attached",
    // tlsCertificateBinding must have a detached payload.
    // In other words, tlsCertificateBinding is a consists of:
    // "<base64url-encoded header>..<base64url-encoded signature>"
    let parts = tlsCertificateBinding.split(".");
    if (parts.length != 3) {
      console.error("invalid TLS certificate binding");
      return null;
    }
    if (parts[1] != "") {
      console.error("TLS certificate binding must have empty payload");
      return null;
    }
    let header;
    try {
      header = JSON.parse(QWACs.fromBase64URLEncoding(parts[0]));
    } catch (e) {
      console.error("header is not base64(JSON)");
      return null;
    }
    let params = QWACs.validateTLSCertificateBindingHeader(header);
    if (!params) {
      return null;
    }

    // The 0th certificate signed the binding. It must be a 2-QWAC that is
    // valid for the given hostname (ETSI TS 119 411-5 V2.1.1 Section 6.2.2
    // Step 4).
    let signingCertificate = params.certificates[0];
    let chain = params.certificates.slice(1);
    if (
      !(await lazy.CertDB.asyncVerifyQWAC(
        Ci.nsIX509CertDB.TwoQWAC,
        signingCertificate,
        hostname,
        chain
      ))
    ) {
      console.error("signing certificate not 2-QWAC");
      return null;
    }

    let spki = signingCertificate.subjectPublicKeyInfo;
    let signingKey;
    try {
      signingKey = await crypto.subtle.importKey(
        "spki",
        new Uint8Array(spki),
        params.algorithm,
        true,
        ["verify"]
      );
    } catch (e) {
      console.error("invalid signing key (algorithm mismatch?)");
      return null;
    }

    let signature;
    try {
      signature = QWACs.fromBase64URLEncoding(parts[2]);
    } catch (e) {
      console.error("signature is not base64");
      return null;
    }

    // Validate the signature (Step 5).
    let signatureValid;
    try {
      signatureValid = await crypto.subtle.verify(
        params.algorithm,
        signingKey,
        stringToArrayBuffer(signature),
        stringToArrayBuffer(parts[0] + ".")
      );
    } catch (e) {
      console.error("failed to verify signature");
      return null;
    }
    if (!signatureValid) {
      console.error("invalid signature");
      return null;
    }

    // The binding must list the server certificate's hash (Step 6).
    let serverCertificateHash = await crypto.subtle.digest(
      params.hashAlg,
      stringToArrayBuffer(
        QWACs.toBase64URLEncoding(arrayToString(serverCertificate.getRawDER()))
      )
    );
    if (
      !params.hashes.includes(
        QWACs.toBase64URLEncoding(
          arrayToString(new Uint8Array(serverCertificateHash))
        )
      )
    ) {
      console.error("TLS binding does not cover server certificate");
      return null;
    }
    return signingCertificate;
  },

  /**
   * Asynchronously determines the QWAC status of a document.
   *
   * @param secInfo {nsITransportSecurityInfo}
   *   The security information for the connection of the document.
   * @param uri {nsIURI}
   *   The URI of the document.
   * @param browsingContext {BrowsingContext}
   *   The browsing context of the load of the document.
   * @returns {Promise}
   *   A promise that will resolve to an nsIX509Cert representing the QWAC in
   *   use, if any, and null otherwise.
   */
  async determineQWACStatus(secInfo, uri, browsingContext) {
    if (
      !Services.prefs.getBoolPref("security.qwacs.enabled") ||
      !secInfo ||
      !secInfo.serverCert
    ) {
      return null;
    }

    // For some URIs, getting `host` will throw. ETSI TS 119 411-5 V2.1.1 only
    // mentions domain names, so the assumed intention in such cases is to
    // determine that the document is not using a QWAC.
    let hostname;
    try {
      hostname = uri.host;
    } catch {
      return null;
    }

    let windowGlobal = browsingContext.currentWindowGlobal;
    let actor = windowGlobal.getActor("TLSCertificateBinding");
    let tlsCertificateBinding = null;
    try {
      tlsCertificateBinding = await actor.sendQuery(
        "TLSCertificateBinding::Get"
      );
    } catch {
      // If the page is closed before the query resolves, the actor will be
      // destroyed, which causes a JS exception. We can safely ignore it,
      // because the page is going away.
      return null;
    }
    if (tlsCertificateBinding) {
      let twoQwac = await QWACs.verifyTLSCertificateBinding(
        tlsCertificateBinding,
        secInfo.serverCert,
        hostname
      );
      if (twoQwac) {
        return twoQwac;
      }
    }

    let is1qwac = await lazy.CertDB.asyncVerifyQWAC(
      Ci.nsIX509CertDB.OneQWAC,
      secInfo.serverCert,
      hostname,
      secInfo.handshakeCertificates.concat(secInfo.succeededCertChain)
    );
    if (is1qwac) {
      return secInfo.serverCert;
    }

    return null;
  },
};
