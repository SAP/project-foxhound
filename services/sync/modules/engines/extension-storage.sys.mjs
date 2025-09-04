/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const STORAGE_VERSION = 1; // This needs to be kept in-sync with the rust storage version

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import {
  BridgedEngine,
  LogAdapter,
} from "resource://services-sync/bridged_engine.sys.mjs";
import { SyncEngine, Tracker } from "resource://services-sync/engines.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  MULTI_DEVICE_THRESHOLD: "resource://services-sync/constants.sys.mjs",
  SCORE_INCREMENT_MEDIUM: "resource://services-sync/constants.sys.mjs",
  Svc: "resource://services-sync/util.sys.mjs",
  extensionStorageSync: "resource://gre/modules/ExtensionStorageSync.sys.mjs",
  storageSyncService:
    "resource://gre/modules/ExtensionStorageComponents.sys.mjs",

  extensionStorageSyncKinto:
    "resource://gre/modules/ExtensionStorageSyncKinto.sys.mjs",
});

const PREF_FORCE_ENABLE = "engine.extension-storage.force";

// A helper to indicate whether extension-storage is enabled - it's based on
// the "addons" pref. The same logic is shared between both engine impls.
function getEngineEnabled() {
  // By default, we sync extension storage if we sync addons. This
  // lets us simplify the UX since users probably don't consider
  // "extension preferences" a separate category of syncing.
  // However, we also respect engine.extension-storage.force, which
  // can be set to true or false, if a power user wants to customize
  // the behavior despite the lack of UI.
  if (
    lazy.Svc.PrefBranch.getPrefType(PREF_FORCE_ENABLE) !=
    Ci.nsIPrefBranch.PREF_INVALID
  ) {
    return lazy.Svc.PrefBranch.getBoolPref(PREF_FORCE_ENABLE);
  }
  return lazy.Svc.PrefBranch.getBoolPref("engine.addons", false);
}

function setEngineEnabled(enabled) {
  // This will be called by the engine manager when declined on another device.
  // Things will go a bit pear-shaped if the engine manager tries to end up
  // with 'addons' and 'extension-storage' in different states - however, this
  // *can* happen given we support the `engine.extension-storage.force`
  // preference. So if that pref exists, we set it to this value. If that pref
  // doesn't exist, we just ignore it and hope that the 'addons' engine is also
  // going to be set to the same state.
  if (
    lazy.Svc.PrefBranch.getPrefType(PREF_FORCE_ENABLE) !=
    Ci.nsIPrefBranch.PREF_INVALID
  ) {
    lazy.Svc.PrefBranch.setBoolPref(PREF_FORCE_ENABLE, enabled);
  }
}

// A "bridged engine" to our webext-storage component.
export function ExtensionStorageEngineBridge(service) {
  BridgedEngine.call(this, "Extension-Storage", service);

  let app_services_logger = Cc["@mozilla.org/appservices/logger;1"].getService(
    Ci.mozIAppServicesLogger
  );
  let logger_target = "app-services:webext_storage:sync";
  app_services_logger.register(logger_target, new LogAdapter(this._log));
}

ExtensionStorageEngineBridge.prototype = {
  syncPriority: 10,

  // Used to override the engine name in telemetry, so that we can distinguish .
  overrideTelemetryName: "rust-webext-storage",

  async initialize() {
    await SyncEngine.prototype.initialize.call(this);
    this._rustStore = await lazy.storageSyncService.getStorageAreaInstance();
    this._bridge = await this._rustStore.bridgedEngine();

    // Uniffi currently only supports async methods, so we'll need to hardcode
    // these values for now (which is fine for now as these hardly ever change)
    this._bridge.storageVersion = STORAGE_VERSION;
    this._bridge.allowSkippedRecord = true;
    this._bridge.getSyncId = async () => {
      let syncID = await this._bridge.syncId();
      return syncID;
    };

    this._log.info("Got a bridged engine!");
    this._tracker.modified = true;
  },

  async _notifyPendingChanges() {
    try {
      let changeSets = await this._rustStore.getSyncedChanges();

      changeSets.forEach(changeSet => {
        try {
          lazy.extensionStorageSync.notifyListeners(
            changeSet.extId,
            JSON.parse(changeSet.changes)
          );
        } catch (ex) {
          this._log.warn(
            `Error notifying change listeners for ${changeSet.extId}`,
            ex
          );
        }
      });
    } catch (ex) {
      this._log.warn("Error fetching pending synced changes", ex);
    }
  },

  async _processIncoming() {
    await super._processIncoming();
    try {
      await this._notifyPendingChanges();
    } catch (ex) {
      // Failing to notify `storage.onChanged` observers is bad, but shouldn't
      // interrupt syncing.
      this._log.warn("Error notifying about synced changes", ex);
    }
  },

  get enabled() {
    return getEngineEnabled();
  },
  set enabled(enabled) {
    setEngineEnabled(enabled);
  },
};
Object.setPrototypeOf(
  ExtensionStorageEngineBridge.prototype,
  BridgedEngine.prototype
);

/**
 *****************************************************************************
 *
 * Deprecated support for Kinto
 *
 *****************************************************************************
 */

/**
 * The Engine that manages syncing for the web extension "storage"
 * API, and in particular ext.storage.sync.
 *
 * ext.storage.sync is implemented using Kinto, so it has mechanisms
 * for syncing that we do not need to integrate in the Firefox Sync
 * framework, so this is something of a stub.
 */
export function ExtensionStorageEngineKinto(service) {
  SyncEngine.call(this, "Extension-Storage", service);
  XPCOMUtils.defineLazyPreferenceGetter(
    this,
    "_skipPercentageChance",
    "services.sync.extension-storage.skipPercentageChance",
    0
  );
}

ExtensionStorageEngineKinto.prototype = {
  _trackerObj: ExtensionStorageTracker,
  // we don't need these since we implement our own sync logic
  _storeObj: undefined,
  _recordObj: undefined,

  syncPriority: 10,
  allowSkippedRecord: false,

  async _sync() {
    return lazy.extensionStorageSyncKinto.syncAll();
  },

  get enabled() {
    return getEngineEnabled();
  },
  // We only need the enabled setter for the edge-case where info/collections
  // has `extension-storage` - which could happen if the pref to flip the new
  // engine on was once set but no longer is.
  set enabled(enabled) {
    setEngineEnabled(enabled);
  },

  _wipeClient() {
    return lazy.extensionStorageSyncKinto.clearAll();
  },

  shouldSkipSync(syncReason) {
    if (syncReason == "user" || syncReason == "startup") {
      this._log.info(
        `Not skipping extension storage sync: reason == ${syncReason}`
      );
      // Always sync if a user clicks the button, or if we're starting up.
      return false;
    }
    // Ensure this wouldn't cause a resync...
    if (this._tracker.score >= lazy.MULTI_DEVICE_THRESHOLD) {
      this._log.info(
        "Not skipping extension storage sync: Would trigger resync anyway"
      );
      return false;
    }

    let probability = this._skipPercentageChance / 100.0;
    // Math.random() returns a value in the interval [0, 1), so `>` is correct:
    // if `probability` is 1 skip every time, and if it's 0, never skip.
    let shouldSkip = probability > Math.random();

    this._log.info(
      `Skipping extension-storage sync with a chance of ${probability}: ${shouldSkip}`
    );
    return shouldSkip;
  },
};
Object.setPrototypeOf(
  ExtensionStorageEngineKinto.prototype,
  SyncEngine.prototype
);

function ExtensionStorageTracker(name, engine) {
  Tracker.call(this, name, engine);
  this._ignoreAll = false;
}
ExtensionStorageTracker.prototype = {
  get ignoreAll() {
    return this._ignoreAll;
  },

  set ignoreAll(value) {
    this._ignoreAll = value;
  },

  onStart() {
    lazy.Svc.Obs.add("ext.storage.sync-changed", this.asyncObserver);
  },

  onStop() {
    lazy.Svc.Obs.remove("ext.storage.sync-changed", this.asyncObserver);
  },

  async observe(subject, topic) {
    if (this.ignoreAll) {
      return;
    }

    if (topic !== "ext.storage.sync-changed") {
      return;
    }

    // Single adds, removes and changes are not so important on their
    // own, so let's just increment score a bit.
    this.score += lazy.SCORE_INCREMENT_MEDIUM;
  },
};
Object.setPrototypeOf(ExtensionStorageTracker.prototype, Tracker.prototype);
