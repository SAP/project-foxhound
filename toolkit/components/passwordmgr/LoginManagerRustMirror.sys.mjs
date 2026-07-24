/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  LoginHelper: "resource://gre/modules/LoginHelper.sys.mjs",
});

const rustMirrorTelemetryVersion = "4";

// checks validity of an origin
function checkOrigin(origin) {
  try {
    new URL(origin);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validate an origin string.
 *
 * Returns:
 * [
 *   "ErrorName" or null,
 *   fixedOrigin or null,
 * ]
 *
 * Possible ErrorName values include:
 * - FalsyOrigin
 * - SurroundingWhitespace
 * - SingleDot
 * - ProtocolNameOnly
 * - ProtocolFragmentOnly
 * - ProtocolOnly
 * - MissingProtocol
 * - ProtocolTypo
 * - MissingProtocol
 * - UnknownError
 */
function validateOrigin(origin) {
  // valid origin
  if (checkOrigin(origin)) {
    return [null, null];
  }

  // falsy origin
  if (!origin) {
    return ["FalsyOrigin", null];
  }

  // surrounding white-space
  {
    const fixedOrigin = origin.trim();
    if (checkOrigin(fixedOrigin)) {
      return ["SurroundingWhitespace", fixedOrigin];
    }
  }

  const lower = origin.toLowerCase();

  // some protocol-only urls we won't try to fix
  const wontfix = {
    ".": "SingleDot",

    http: "ProtocolNameOnly",
    "http:": "ProtocolFragmentOnly",
    "http://": "ProtocolOnly",

    https: "ProtocolNameOnly",
    "https:": "ProtocolFragmentOnly",
    "https://": "ProtocolOnly",

    file: "ProtocolNameOnly",
    "file:": "ProtocolFragmentOnly",
    "file://": "ProtocolOnly",
  };
  if (lower in wontfix) {
    return [wontfix[lower], null];
  }

  // leading "//"
  if (origin.startsWith("//")) {
    const fixedOrigin = "https:" + origin;
    if (checkOrigin(fixedOrigin)) {
      return ["MissingProtocol", fixedOrigin];
    }
  }

  // protocol typos
  const brokenPrefixes = [
    "http//",
    "https//",
    "htp//",
    "htttp//",
    "hptts//",
    "htpps//",
    "http:/",
    "https:/",
  ];
  for (const prefix of brokenPrefixes) {
    if (lower.startsWith(prefix)) {
      const fixedOrigin = "https://" + origin.slice(prefix.length);
      if (checkOrigin(fixedOrigin)) {
        return ["ProtocolTypo", fixedOrigin];
      }
    }
  }

  // no protocol
  if (!lower.match(/^[a-z]{2,20}\:\/\//)) {
    const fixedOrigin = "https://" + origin;
    if (checkOrigin(fixedOrigin)) {
      return ["MissingProtocol", fixedOrigin];
    }
  }

  // the rest is unknown
  return ["UnknownError", null];
}

/* Check if an url has punicode encoded hostname */
function isPunycodeOrigin(origin) {
  try {
    return origin && new URL(origin).hostname.startsWith("xn--");
  } catch (_) {
    return false;
  }
}

/* Check if a string contains line breaks */
function containsLineBreaks(str) {
  return str.includes("\n") || str.includes("\r");
}

/* Check if a string contains Nul string */
function containsNul(str) {
  return str.includes("\0");
}

/* Normalize different errors */
function normalizeRustStorageErrorMessage(error) {
  const message = error?.message || String(error);

  return message
    .replace(/^reason: /, "")
    .replace(/^Invalid login: /, "")
    .replace(/\{[0-9a-fA-F-]{36}\}/, "{UUID}");
}

//Normalize a Unix timestamp (ms) to the first day of its month at 00:00 UTC
function roundToMonthUTC(timestampMs) {
  if (!timestampMs) {
    return null;
  }

  const d = new Date(timestampMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0);
}

function isFtpOrigin(origin) {
  if (!origin || typeof origin !== "string") {
    return false;
  }

  return origin.toLowerCase().includes("ftp");
}

function recordMirrorFailure(runId, operation, error, login = null) {
  // lookup poisoned status
  const poisoned = Services.prefs.getBoolPref(
    "signon.rustMirror.poisoned",
    false
  );

  const data = {
    metric_version: rustMirrorTelemetryVersion,
    run_id: runId,
    operation,
    poisoned,

    error_message: normalizeRustStorageErrorMessage(error),

    is_deleted: false,

    origin_error: null,
    origin_fixable: false,
    form_action_origin_error: null,
    form_action_origin_fixable: false,

    has_punycode_origin: false,
    has_punycode_form_action_origin: false,

    has_ftp_origin: false,

    has_empty_password: false,
    has_username_line_break: false,
    has_username_nul: false,

    time_created: null,
    time_last_used: null,
  };

  if (login) {
    data.is_deleted = login.deleted;

    const [originError, fixableOriginError] = validateOrigin(login.origin);
    data.origin_error = originError;
    data.origin_fixable = !!fixableOriginError;
    const [formActionOriginError, fixableFormActionOriginError] =
      validateOrigin(login.formActionOrigin);
    data.form_action_origin_error = formActionOriginError;
    data.form_action_origin_fixable = !!fixableFormActionOriginError;

    data.has_punycode_origin = isPunycodeOrigin(login.origin);
    data.has_punycode_form_action_origin = isPunycodeOrigin(
      login.formActionOrigin
    );

    data.has_ftp_origin = isFtpOrigin(login.origin);

    data.has_empty_password = !login.password;
    data.has_username_line_break = containsLineBreaks(login.username);
    data.has_username_nul = containsNul(login.username);

    data.time_created = roundToMonthUTC(login.timeCreated);
    data.time_last_used = roundToMonthUTC(login.timeLastUsed);
  }

  Glean.pwmgr.rustWriteFailure.record(data);

  // set poisoned status on error
  if (!poisoned) {
    Services.prefs.setBoolPref("signon.rustMirror.poisoned", true);
  }
}

function recordMirrorStatus(runId, operation, status) {
  Glean.pwmgr.rustMirrorStatus.record({
    metric_version: rustMirrorTelemetryVersion,
    run_id: runId,
    operation,
    status,
  });
}

function recordMigrationStatus(
  runId,
  duration,
  numberOfLoginsToMigrate,
  numberOfLoginsMigrated
) {
  const had_errors = numberOfLoginsMigrated < numberOfLoginsToMigrate;

  Glean.pwmgr.rustMigrationStatus.record({
    metric_version: rustMirrorTelemetryVersion,
    run_id: runId,
    duration_ms: duration,
    number_of_logins_to_migrate: numberOfLoginsToMigrate,
    number_of_logins_migrated: numberOfLoginsMigrated,
    had_errors,
  });
}

export class LoginManagerRustMirror {
  #logger = null;
  #jsonStorage = null;
  #rustStorage = null;
  #isEnabled = false;
  #migrationInProgress = false;
  #observer = null;

  constructor(jsonStorage, rustStorage) {
    this.#logger = lazy.LoginHelper.createLogger("LoginManagerRustMirror");
    this.#jsonStorage = jsonStorage;
    this.#rustStorage = rustStorage;

    Services.prefs.addObserver("signon.rustMirror.enabled", () =>
      this.#maybeEnable(this)
    );

    this.#logger.log("Rust Mirror is ready.");

    this.#maybeEnable();
  }

  #removeJsonStoreObserver() {
    if (this.#observer) {
      Services.obs.removeObserver(
        this.#observer,
        "passwordmgr-storage-changed"
      );
      this.#observer = null;
    }
  }

  #addJsonStoreObserver() {
    if (!this.#observer) {
      this.#observer = (subject, _, eventName) =>
        this.#onJsonStorageChanged(eventName, subject);
      Services.obs.addObserver(this.#observer, "passwordmgr-storage-changed");
    }
  }

  #maybeEnable() {
    const enabled =
      Services.prefs.getBoolPref("signon.rustMirror.enabled", true) &&
      !lazy.LoginHelper.isPrimaryPasswordSet();

    return enabled ? this.enable() : this.disable();
  }

  async enable() {
    if (this.#isEnabled) {
      return;
    }

    this.#removeJsonStoreObserver();
    this.#isEnabled = true;

    try {
      await this.#maybeRunMigration();
      this.#addJsonStoreObserver();
      this.#logger.log("Rust Mirror is enabled.");
    } catch (e) {
      this.#logger.error("Login migration failed", e);
    }
  }

  disable() {
    if (!this.#isEnabled) {
      return;
    }

    this.#removeJsonStoreObserver();

    this.#isEnabled = false;
    this.#logger.log("Rust Mirror is disabled.");

    // Since we'll miss updates we'll need to migrate again once disabled
    Services.prefs.setBoolPref("signon.rustMirror.migrationNeeded", true);
  }

  async #onJsonStorageChanged(eventName, subject) {
    this.#logger.log(`received change event ${eventName}...`);

    // eg in case a primary password has been set after enabling
    if (!this.#isEnabled || lazy.LoginHelper.isPrimaryPasswordSet()) {
      this.#logger.log("Mirror is not active. Change will not be mirrored.");
      return;
    }

    if (this.#migrationInProgress) {
      this.#logger.log(`Migration in progress, skipping event ${eventName}`);
      return;
    }

    const runId = Services.uuid.generateUUID();
    let loginToModify;
    let newLoginData;
    let status = "success";

    switch (eventName) {
      case "addLogin":
        this.#logger.log(`adding login ${subject.guid}...`);
        try {
          await this.#rustStorage.addLoginsAsync([subject]);
          this.#logger.log(`added login ${subject.guid}.`);
        } catch (e) {
          status = "failure";
          recordMirrorFailure(runId, "add", e, subject);
          this.#logger.error("mirror-error:", e);
        }
        recordMirrorStatus(runId, "add", status);
        break;

      case "modifyLogin":
        loginToModify = subject.queryElementAt(0, Ci.nsILoginInfo);
        newLoginData = subject.queryElementAt(1, Ci.nsILoginInfo);
        this.#logger.log(`modifying login ${loginToModify.guid}...`);
        try {
          await this.#rustStorage.modifyLoginAsync(loginToModify, newLoginData);
          this.#logger.log(`modified login ${loginToModify.guid}.`);
        } catch (e) {
          status = "failure";
          recordMirrorFailure(runId, "modify", e, newLoginData);
          this.#logger.error("error: modifyLogin:", e);
        }
        recordMirrorStatus(runId, "modify", status);
        break;

      case "removeLogin":
        this.#logger.log(`removing login ${subject.guid}...`);
        try {
          await this.#rustStorage.removeLoginAsync(subject);
          this.#logger.log(`removed login ${subject.guid}.`);
        } catch (e) {
          status = "failure";
          recordMirrorFailure(runId, "remove", e, subject);
          this.#logger.error("error: removeLogin:", e);
        }
        recordMirrorStatus(runId, "remove", status);
        break;

      case "removeAllLogins":
        this.#logger.log("removing all logins...");
        try {
          await this.#rustStorage.removeAllLoginsAsync();
          this.#logger.log("removed all logins.");
        } catch (e) {
          status = "failure";
          this.#logger.error("error: removeAllLogins:", e);
          recordMirrorFailure(runId, "remove-all", e);
        }
        recordMirrorStatus(runId, "remove-all", status);
        break;

      // re-migrate on importLogins event
      case "importLogins":
        this.#logger.log("re-migrating logins after import...");
        await this.#migrate();
        break;

      default:
        this.#logger.error(`error: received unhandled event "${eventName}"`);
        break;
    }

    Services.obs.notifyObservers(
      null,
      `rust-mirror.event.${eventName}.finished`
    );
  }

  async #maybeRunMigration() {
    if (!this.#isEnabled || lazy.LoginHelper.isPrimaryPasswordSet()) {
      this.#logger.log("Mirror is not active. Migration will not run.");
      return;
    }

    const migrationNeeded = Services.prefs.getBoolPref(
      "signon.rustMirror.migrationNeeded",
      false
    );

    // eg in case a primary password has been set after enabling
    if (!migrationNeeded) {
      this.#logger.log("No migration needed.");
      return;
    }

    this.#logger.log("Migration is needed");

    await this.#migrate();
  }

  async #migrate() {
    if (this.#migrationInProgress) {
      this.#logger.log("Migration already in progress.");
      return;
    }

    this.#logger.log("Starting migration...");

    // We ignore events during migration run. Once we switch the
    // stores over, we will run an initial migration again to ensure
    // consistancy.
    this.#migrationInProgress = true;

    const t0 = Date.now();
    const runId = Services.uuid.generateUUID();
    let numberOfLoginsToMigrate = 0;
    let numberOfLoginsMigrated = 0;

    try {
      this.#rustStorage.removeAllLogins();
      this.#logger.log("Cleared existing Rust logins.");

      Services.prefs.setBoolPref("signon.rustMirror.poisoned", false);

      // get all logins; exclude deletion stubs
      const logins = await this.#jsonStorage.getAllLogins(false);
      numberOfLoginsToMigrate = logins.length;

      const results = await this.#rustStorage.addLoginsAsync(logins, true);
      for (const [i, { error }] of results.entries()) {
        if (error) {
          this.#logger.error("error during migration:", error.message);
          recordMirrorFailure(runId, "migration", error, logins[i]);
        } else {
          numberOfLoginsMigrated += 1;
        }
      }

      this.#logger.log(
        `Successfully migrated ${numberOfLoginsMigrated}/${numberOfLoginsToMigrate} logins.`
      );

      // Migration complete, don't run again
      Services.prefs.setBoolPref("signon.rustMirror.migrationNeeded", false);

      this.#logger.log("Migration complete.");
    } catch (e) {
      Services.prefs.setBoolPref("signon.rustMirror.poisoned", true);
      this.#logger.error("migration error:", e);
    } finally {
      const duration = Date.now() - t0;
      recordMigrationStatus(
        runId,
        duration,
        numberOfLoginsToMigrate,
        numberOfLoginsMigrated
      );
      this.#migrationInProgress = false;

      // Notify about the finished migration. This is used in tests.
      Services.obs.notifyObservers(null, "rust-mirror.migration.finished");
    }
  }
}
