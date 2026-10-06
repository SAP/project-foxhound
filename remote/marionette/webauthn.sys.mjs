/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "webauthnService",
  "@mozilla.org/webauthn/service;1",
  Ci.nsIWebAuthnService
);

/** @namespace */
export const webauthn = {};

/**
 * Enum of supported protocol types.
 *
 * @readonly
 * @enum {ProtocolType}
 */
webauthn.ProtocolType = {
  ctap1_u2f: "ctap1/u2f",
  ctap2: "ctap2",
  ctap2_1: "ctap2_1",
};

/**
 * Enum of supported transport types.
 *
 * @readonly
 * @enum {TransportType}
 */
webauthn.TransportType = {
  ble: "ble",
  hybrid: "hybrid",
  internal: "internal",
  nfc: "nfc",
  smart_card: "smart-card",
  usb: "usb",
};

/**
 * Add a credential to a virtual authenticator.
 *
 * @param {string} authenticatorId
 *     The ID of the virtual authenticator to add the credential to.
 * @param {object} credentials
 *     The credential to add.
 * @param {string} credentials.credentialId
 *     A probabilistically-unique byte sequence identifying a public key
 *     credential source and its authentication assertions, encoded using
 *     Base64url Encoding.
 * @param {boolean} credentials.isResidentCredential
 *     If true, a client-side discoverable credential is created. If false,
 *     a server-side credential is created instead.
 * @param {string} credentials.rpId
 *     The Relying Party ID the credential is scoped to.
 * @param {string} credentials.privateKey
 *     An asymmetric key package containing a single private key per RFC5958,
 *     encoded using Base64url Encoding.
 * @param {string} [credentials.userHandle]
 *     The userHandle associated with the credential, encoded using Base64url
 *     Encoding.
 * @param {number} credentials.signCount
 *     The initial value for a signature counter associated with the public
 *     key credential source.
 */
webauthn.addCredential = function (authenticatorId, credentials) {
  const {
    credentialId,
    isResidentCredential,
    rpId,
    privateKey,
    userHandle,
    signCount,
  } = credentials;

  lazy.webauthnService.addCredential(
    authenticatorId,
    credentialId,
    isResidentCredential,
    rpId,
    privateKey,
    userHandle,
    signCount
  );
};

/**
 * Add a virtual authenticator.
 *
 * @param {object} config
 * @param {ProtocolType} config.protocol
 *     The protocol this authenticator speaks.
 * @param {TransportType} config.transport
 *     The transport this authenticator uses.
 * @param {boolean=} config.hasResidentKey
 *     Whether the authenticator supports client-side discoverable credentials.
 *     Defaults to false.
 * @param {boolean=} config.hasUserVerification
 *     Whether the authenticator supports user verification. Defaults to false.
 * @param {boolean=} config.isUserConsenting
 *     Whether the authenticator will simulate user consent for all operations.
 *     Defaults to false.
 * @param {boolean=} config.isUserVerified
 *     Whether the authenticator simulates always passing user verification.
 *     Defaults to false.
 *
 * @returns {string}
 *     The ID of the added virtual authenticator.
 */
webauthn.addVirtualAuthenticator = function (config) {
  const {
    protocol,
    transport,
    hasResidentKey = false,
    hasUserVerification = false,
    isUserConsenting = true,
    isUserVerified = false,
  } = config;

  return lazy.webauthnService.addVirtualAuthenticator(
    protocol,
    transport,
    hasResidentKey,
    hasUserVerification,
    isUserConsenting,
    isUserVerified
  );
};

/**
 * Get credentials stored in a virtual authenticator.
 *
 * @param {string} authenticatorId
 *     The ID of the virtual authenticator to retrieve credentials from.
 *
 * @returns {object}
 *     The credentials stored on the virtual authenticator.
 */
webauthn.getCredentials = function (authenticatorId) {
  return lazy.webauthnService.getCredentials(authenticatorId);
};

/**
 * Remove a credential from a virtual authenticator.
 *
 * @param {string} authenticatorId
 *     The ID of the virtual authenticator to remove the credential from.
 * @param {string} credentialId
 *     The ID of the credential to remove.
 */
webauthn.removeCredential = function (authenticatorId, credentialId) {
  lazy.webauthnService.removeCredential(authenticatorId, credentialId);
};

/**
 * Remove all credentials from a virtual authenticator.
 *
 * @param {string} authenticatorId
 *     The ID of the virtual authenticator to remove all credentials from.
 */
webauthn.removeAllCredentials = function (authenticatorId) {
  lazy.webauthnService.removeAllCredentials(authenticatorId);
};

/**
 * Remove a virtual authenticator.
 *
 * @param {string} authenticatorId
 *     The ID of the virtual authenticator to remove.
 */
webauthn.removeVirtualAuthenticator = function (authenticatorId) {
  lazy.webauthnService.removeVirtualAuthenticator(authenticatorId);
};

/**
 * Set the user verified flag on a virtual authenticator.
 *
 * @param {string} authenticatorId
 *     The ID of the virtual authenticator to update.
 * @param {boolean} isUserVerified
 *     The value to set the "isUserVerified" bit to on the authenticator.
 *
 * @see https://www.w3.org/TR/webauthn-3/#sctn-automation-set-user-verified
 */
webauthn.setUserVerified = function (authenticatorId, isUserVerified) {
  lazy.webauthnService.setUserVerified(authenticatorId, isUserVerified);
};
