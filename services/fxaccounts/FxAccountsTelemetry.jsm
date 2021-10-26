/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// FxA Telemetry support. For hysterical raisins, the actual implementation
// is inside "sync". We should move the core implementation somewhere that's
// sanely shared (eg, services-common?), but let's wait and see where we end up
// first...

const { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);

XPCOMUtils.defineLazyModuleGetters(this, {
  // We use this observers module because we leverage its support for richer
  // "subject" data.
  Observers: "resource://services-common/observers.js",
  Services: "resource://gre/modules/Services.jsm",
  CommonUtils: "resource://services-common/utils.js",
  CryptoUtils: "resource://services-crypto/utils.js",
  FxAccountsConfig: "resource://gre/modules/FxAccountsConfig.jsm",
  jwcrypto: "resource://services-crypto/jwcrypto.jsm",
});

const { PREF_ACCOUNT_ROOT, log } = ChromeUtils.import(
  "resource://gre/modules/FxAccountsCommon.js"
);

const PREF_SANITIZED_UID = PREF_ACCOUNT_ROOT + "telemetry.sanitized_uid";
XPCOMUtils.defineLazyPreferenceGetter(
  this,
  "pref_sanitizedUid",
  PREF_SANITIZED_UID,
  ""
);

class FxAccountsTelemetry {
  constructor(fxai) {
    this._fxai = fxai;
    Services.telemetry.setEventRecordingEnabled("fxa", true);
    this._promiseEnsureEcosystemAnonId = null;
  }

  // Records an event *in the Fxa/Sync ping*.
  recordEvent(object, method, value, extra = undefined) {
    // We need to ensure the telemetry module is loaded.
    ChromeUtils.import("resource://services-sync/telemetry.js");
    // Now it will be listening for the notifications...
    Observers.notify("fxa:telemetry:event", { object, method, value, extra });
  }

  generateUUID() {
    return Cc["@mozilla.org/uuid-generator;1"]
      .getService(Ci.nsIUUIDGenerator)
      .generateUUID()
      .toString()
      .slice(1, -1);
  }

  // A flow ID can be anything that's "probably" unique, so for now use a UUID.
  generateFlowID() {
    return this.generateUUID();
  }

  // Account Ecosystem Telemetry identifies the user by a secret id called their "ecosystemUserId".
  // To maintain user privacy this value must never be shared with Mozilla servers in plaintext
  // (although there may be some client-side-only features that use it in future).
  //
  // Instead, AET-related telemetry pings can identify the user by their "ecosystemAnonId",
  // an encrypted bundle that can communicate the "ecosystemUserId" through to the telemetry
  // backend without allowing it to be snooped on in transit.
  //
  // Thanks to the way this encryption works, it's possible for each signed-in client to have the same
  // userid but a *different* value for ecosystemAnonId. This may offer some incremental privacy benefits
  // for the un-processed data, and we can rely on the values all decrypting back to the same ecosystemUserId
  // value during processing.
  //
  // Thus, the code below will try to generate its own unique ecosystemAnonId value if possible, but
  // will fall back to using a shared value provided by the FxA server if not.

  // Get the user's ecosystemAnonId, or null if it's not available.
  //
  // This method is asynchronous because it may need to load data from storage, but it will not
  // block on network access and will return null rather than throwing an error on failure. This is
  // designed to simplify usage from telemetry-sending code, which may want to avoid making expensive
  // network requests.
  //
  // If you want to ensure that a value is present then use `ensureEcosystemAnonId()` instead.
  async getEcosystemAnonId() {
    return this._fxai.withCurrentAccountState(async state => {
      // If we know the ecosystemUserId, we generate and store our own unique ecosystemAnonId value.
      // Otherwise, we may be able to use a shared value from the user's profile data.
      let {
        ecosystemAnonId,
        ecosystemUserId,
      } = await state.getUserAccountData([
        "ecosystemAnonId",
        "ecosystemUserId",
      ]);
      // N.B. We should never have `ecosystemAnonId` without `ecosystemUserId`.
      if (!ecosystemUserId) {
        try {
          // N.B. `getProfile()` may kick off a silent background update but won't await network requests.
          const profile = await this._fxai.profile.getProfile();
          if (profile && profile.hasOwnProperty("ecosystemAnonId")) {
            ecosystemAnonId = profile.ecosystemAnonId;
          }
        } catch (err) {
          log.error("Getting ecosystemAnonId from profile failed", err);
        }
      }
      // If we don't have ecosystemAnonId, call `ensureEcosystemAnonId()` to fetch or generate it in
      // the background, so the calling code doesn't have to do this for itself.
      // (ie, so that the next call to `getEcosystemAnonId() will return it)
      if (!ecosystemAnonId) {
        // N.B. deliberately not awaiting the promise here.
        this.ensureEcosystemAnonId().catch(err => {
          log.error(
            "Failed ensuring we have an anon-id in the background ",
            err
          );
        });
      }
      return ecosystemAnonId || null;
    });
  }

  // Get the user's ecosystemAnonId, fetching it from the server if necessary.
  //
  // This asynchronous method resolves with the "ecosystemAnonId" value on success, and rejects
  // with an error if no user is signed in or if the value could not be obtained from the
  // FxA server.
  //
  // If a call to this is already in-flight, the promise from that original
  // call is returned.
  async ensureEcosystemAnonId() {
    if (!this._promiseEnsureEcosystemAnonId) {
      this._promiseEnsureEcosystemAnonId = this._ensureEcosystemAnonId().finally(
        () => {
          this._promiseEnsureEcosystemAnonId = null;
        }
      );
    }
    return this._promiseEnsureEcosystemAnonId;
  }

  async _ensureEcosystemAnonId() {
    return this._fxai.withCurrentAccountState(async state => {
      // If we know the ecosystemUserId, we generate and store our own unique ecosystemAnonId value.
      // Otherwise, we need to work with a shared value stored in the user's profile.
      let {
        ecosystemAnonId,
        ecosystemUserId,
      } = await state.getUserAccountData([
        "ecosystemAnonId",
        "ecosystemUserId",
      ]);
      if (ecosystemUserId) {
        if (!ecosystemAnonId) {
          ecosystemAnonId = await this._generateAnonIdFromUserId(
            ecosystemUserId
          );
          await state.updateUserAccountData({ ecosystemAnonId });
        }
      } else {
        ecosystemAnonId = await this._ensureEcosystemAnonIdInProfile();
      }
      return ecosystemAnonId;
    });
  }

  // Ensure that we have an ecosystemAnonId obtained from account profile data.
  //
  // This is a bootstrapping mechanism for clients that are already connected to
  // the user's account, to obtain ecosystemAnonId from shared profile data rather
  // than from derived key material.
  //
  async _ensureEcosystemAnonIdInProfile(generatePlaceholder = true) {
    // Fetching a fresh profile should never *change* the ID, but it might
    // fetch the first value we see, and saving a network request matters for
    // telemetry, so:
    // * first time around we are fine with a slightly stale profile - if it
    //   has an ID, it's a stable ID we can be sure is good.
    // * But if we didn't have one, so generated a new one, but then raced
    //   with another client to update it, we *must* fetch a new profile, even
    //   if our current version is fresh.
    let options = generatePlaceholder
      ? { staleOk: true }
      : { forceFresh: true };
    const profile = await this._fxai.profile.ensureProfile(options);
    if (profile && profile.hasOwnProperty("ecosystemAnonId")) {
      return profile.ecosystemAnonId;
    }
    if (!generatePlaceholder) {
      throw new Error("Profile data does not contain an 'ecosystemAnonId'");
    }
    // If the server doesn't have ecosystemAnonId yet then we can fill it in
    // with a randomly-generated placeholder.
    const ecosystemUserId = CommonUtils.bufferToHex(
      CryptoUtils.generateRandomBytes(32)
    );
    const ecosystemAnonId = await this._generateAnonIdFromUserId(
      ecosystemUserId
    );
    // Persist the encrypted value to the server so other clients can find it.
    try {
      await this._fxai.profile.client.setEcosystemAnonId(ecosystemAnonId);
    } catch (err) {
      if (err && err.code && err.code === 412) {
        // Another client raced us to upload the placeholder, fetch it.
        return this._ensureEcosystemAnonIdInProfile(false);
      }
      throw err;
    }
    return ecosystemAnonId;
  }

  // Generate an ecosystemAnonId value from the given ecosystemUserId.
  //
  // To do so, we must fetch the AET public keys from the server, and encrypt
  // ecosystemUserId into a JWE using one of those keys.
  //
  async _generateAnonIdFromUserId(ecosystemUserId) {
    const serverConfig = await FxAccountsConfig.fetchConfigDocument();
    const ecosystemKeys = serverConfig.ecosystem_anon_id_keys;
    if (!ecosystemKeys || !ecosystemKeys.length) {
      throw new Error("Unable to fetch ecosystem_anon_id_keys from FxA server");
    }
    const randomKey = Math.floor(
      Math.random() * Math.floor(ecosystemKeys.length)
    );
    return jwcrypto.generateJWE(
      ecosystemKeys[randomKey],
      new TextEncoder().encode(ecosystemUserId)
    );
  }

  // Prior to Account Ecosystem Telemetry, FxA- and Sync-related metrics were submitted in
  // a special-purpose "sync ping". This ping identified the user by a version of their FxA
  // uid that was HMAC-ed with a server-side secret key, but this approach provides weaker
  // privacy than "ecosystemAnonId" above. New metrics should prefer to use AET rather than
  // the sync ping.

  // Secret back-channel by which tokenserver client code can set the hashed UID.
  // This value conceptually belongs to FxA, but we currently get it from tokenserver,
  // so there's some light hackery to put it in the right place.
  _setHashedUID(hashedUID) {
    if (!hashedUID) {
      Services.prefs.clearUserPref(PREF_SANITIZED_UID);
    } else {
      Services.prefs.setStringPref(PREF_SANITIZED_UID, hashedUID);
    }
  }

  getSanitizedUID() {
    // Sadly, we can only currently obtain this value if the user has enabled sync.
    return pref_sanitizedUid || null;
  }

  // Sanitize the ID of a device into something suitable for including in the
  // ping. Returns null if no transformation is possible.
  sanitizeDeviceId(deviceId) {
    const uid = this.getSanitizedUID();
    if (!uid) {
      // Sadly, we can only currently get this if the user has enabled sync.
      return null;
    }
    // Combine the raw device id with the sanitized uid to create a stable
    // unique identifier that can't be mapped back to the user's FxA
    // identity without knowing the metrics HMAC key.
    // The result is 64 bytes long, which in retrospect is probably excessive,
    // but it's already shipping...
    return CryptoUtils.sha256(deviceId + uid);
  }

  // Record the connection of FxA or one of its services.
  // Note that you must call this before performing the actual connection
  // or we may record incorrect data - for example, we will not be able to
  // determine whether FxA itself was connected before this call.
  //
  // Currently sends an event in the main telemetry event ping rather than the
  // FxA/Sync ping (although this might change in the future)
  //
  // @param services - An array of service names which should be recorded. FxA
  //  itself is not counted as a "service" - ie, an empty array should be passed
  //  if the account is connected without anything else .
  //
  // @param how - How the connection was done.
  async recordConnection(services, how = null) {
    try {
      let extra = {};
      // Record that fxa was connected if it isn't currently - it will be soon.
      if (!(await this._fxai.getUserAccountData())) {
        extra.fxa = "true";
      }
      // Events.yaml only declares "sync" as a valid service.
      if (services.includes("sync")) {
        extra.sync = "true";
      }
      Services.telemetry.recordEvent("fxa", "connect", "account", how, extra);
    } catch (ex) {
      log.error("Failed to record connection telemetry", ex);
      console.error("Failed to record connection telemetry", ex);
    }
  }

  // Record the disconnection of FxA or one of its services.
  // Note that you must call this before performing the actual disconnection
  // or we may record incomplete data - for example, if this is called after
  // disconnection, we've almost certainly lost the ability to record what
  // services were enabled prior to disconnection.
  //
  // Currently sends an event in the main telemetry event ping rather than the
  // FxA/Sync ping (although this might change in the future)
  //
  // @param service - the service being disconnected. If null, the account
  // itself is being disconnected, so all connected services are too.
  //
  // @param how - how the disconnection was done.
  async recordDisconnection(service = null, how = null) {
    try {
      let extra = {};
      if (!service) {
        extra.fxa = "true";
        // We need a way to enumerate all services - but for now we just hard-code
        // all possibilities here.
        if (Services.prefs.prefHasUserValue("services.sync.username")) {
          extra.sync = "true";
        }
      } else if (service == "sync") {
        extra[service] = "true";
      } else {
        // Events.yaml only declares "sync" as a valid service.
        log.warn(
          `recordDisconnection has invalid value for service: ${service}`
        );
      }
      Services.telemetry.recordEvent(
        "fxa",
        "disconnect",
        "account",
        how,
        extra
      );
    } catch (ex) {
      log.error("Failed to record disconnection telemetry", ex);
      console.error("Failed to record disconnection telemetry", ex);
    }
  }
}

var EXPORTED_SYMBOLS = ["FxAccountsTelemetry"];
