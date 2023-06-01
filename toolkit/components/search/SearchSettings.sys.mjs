/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  DeferredTask: "resource://gre/modules/DeferredTask.sys.mjs",
  SearchUtils: "resource://gre/modules/SearchUtils.sys.mjs",
});

XPCOMUtils.defineLazyModuleGetters(lazy, {
  ObjectUtils: "resource://gre/modules/ObjectUtils.jsm",
});

XPCOMUtils.defineLazyGetter(lazy, "logConsole", () => {
  return console.createInstance({
    prefix: "SearchSettings",
    maxLogLevel: lazy.SearchUtils.loggingEnabled ? "Debug" : "Warn",
  });
});

const SETTINGS_FILENAME = "search.json.mozlz4";

/**
 * This class manages the saves search settings.
 *
 * Global settings can be saved and obtained from this class via the
 * `*Attribute` methods.
 */
export class SearchSettings {
  constructor(searchService) {
    this.#searchService = searchService;
  }

  QueryInterface = ChromeUtils.generateQI([Ci.nsIObserver]);

  // Delay for batching invalidation of the JSON settings (ms)
  static SETTINGS_INVALIDATION_DELAY = 1000;

  /**
   * A reference to the pending DeferredTask, if there is one.
   */
  _batchTask = null;

  /**
   * A reference to the search service so that we can save the engines list.
   */
  #searchService = null;

  /*
   * The user's settings file read from disk so we can persist metadata for
   * engines that are default or hidden, the user's locale and region, hashes
   * for the loadPath, and hashes for default and private default engines.
   * This is the JSON we read from disk and save to disk when there's an update
   * to the settings.
   *
   * Structure of settings:
   * Object { version: <number>,
   *          engines: [...],
   *          metaData: {...},
   *        }
   *
   * Settings metaData is the active metadata for setting and getting attributes.
   * When a new metadata attribute is set, we save it to #settings.metaData and
   * write #settings to disk.
   *
   * #settings.metaData attributes:
   * @property {string} current
   *    The current user-set default engine. The associated hash is called
   *    'hash'.
   * @property {string} private
   *    The current user-set private engine. The associated hash is called
   *    'privateHash'.
   *    The current and prviate objects have associated hash fields to validate
   *    the value is set by the application.
   * @property {string} appDefaultEngine
   * @property {string} channel
   *    Configuration is restricted to the specified channel. ESR is an example
   *    of a channel.
   * @property {string} distroID
   *    Specifies which distribution the default engine is included in.
   * @property {string} experiment
   *    Specifies if the application is running on an experiment.
   * @property {string} locale
   * @property {string} region
   * @property {boolean} useSavedOrder
   *    True if the user's order information stored in settings is used.
   *
   */
  #settings = null;

  /**
   * @type {object} A deep copy of #settings.
   *   #cachedSettings is updated when we read the settings from disk and when
   *   we write settings to disk. #cachedSettings is compared with #settings
   *   before we do a write to disk. If there's no change to the settings
   *   attributes, then we don't write the settings to disk.
   */
  #cachedSettings = {};

  addObservers() {
    Services.obs.addObserver(this, lazy.SearchUtils.TOPIC_ENGINE_MODIFIED);
    Services.obs.addObserver(this, lazy.SearchUtils.TOPIC_SEARCH_SERVICE);
  }

  /**
   * Cleans up, removing observers.
   */
  removeObservers() {
    Services.obs.removeObserver(this, lazy.SearchUtils.TOPIC_ENGINE_MODIFIED);
    Services.obs.removeObserver(this, lazy.SearchUtils.TOPIC_SEARCH_SERVICE);
  }

  /**
   * Reads the settings file.
   *
   * @param {string} origin
   *   If this parameter is "test", then the settings will not be written. As
   *   some tests manipulate the settings directly, we allow turning off writing to
   *   avoid writing stale settings data.
   * @returns {object}
   *   Returns the settings file data.
   */
  async get(origin = "") {
    let json;
    await this._ensurePendingWritesCompleted(origin);
    try {
      let settingsFilePath = PathUtils.join(
        PathUtils.profileDir,
        SETTINGS_FILENAME
      );
      json = await IOUtils.readJSON(settingsFilePath, { decompress: true });
      if (!json.engines || !json.engines.length) {
        throw new Error("no engine in the file");
      }
    } catch (ex) {
      lazy.logConsole.warn("get: No settings file exists, new profile?", ex);
      json = {};
    }

    this.#settings = json;
    this.#cachedSettings = structuredClone(json);

    if (!this.#settings.metaData) {
      this.#settings.metaData = {};
    }

    // Versions of gecko older than 82 stored the order flag as a preference.
    // This was changed in version 6 of the settings file.
    if (
      this.#settings.version < 6 ||
      !("useSavedOrder" in this.#settings.metaData)
    ) {
      const prefName = lazy.SearchUtils.BROWSER_SEARCH_PREF + "useDBForOrder";
      let useSavedOrder = Services.prefs.getBoolPref(prefName, false);

      this.setMetaDataAttribute("useSavedOrder", useSavedOrder);

      // Clear the old pref so it isn't lying around.
      Services.prefs.clearUserPref(prefName);
    }

    // Added in Firefox 110.
    if (this.#settings.version < 8 && Array.isArray(this.#settings.engines)) {
      this.#migrateTelemetryLoadPaths();
    }

    return structuredClone(json);
  }

  /**
   * Queues writing the settings until after SETTINGS_INVALIDATION_DELAY. If there
   * is a currently queued task then it will be restarted.
   */
  _delayedWrite() {
    if (this._batchTask) {
      this._batchTask.disarm();
    } else {
      let task = async () => {
        if (
          !this.#searchService.isInitialized ||
          this.#searchService._reloadingEngines
        ) {
          // Re-arm the task as we don't want to save potentially incomplete
          // information during the middle of (re-)initializing.
          this._batchTask.arm();
          return;
        }
        lazy.logConsole.debug("batchTask: Invalidating engine settings");
        await this._write();
      };
      this._batchTask = new lazy.DeferredTask(
        task,
        SearchSettings.SETTINGS_INVALIDATION_DELAY
      );
    }
    this._batchTask.arm();
  }

  /**
   * Ensures any pending writes of the settings are completed.
   *
   * @param {string} origin
   *   If this parameter is "test", then the settings will not be written. As
   *   some tests manipulate the settings directly, we allow turning off writing to
   *   avoid writing stale settings data.
   */
  async _ensurePendingWritesCompleted(origin = "") {
    // Before we read the settings file, first make sure all pending tasks are clear.
    if (!this._batchTask) {
      return;
    }
    lazy.logConsole.debug("finalizing batch task");
    let task = this._batchTask;
    this._batchTask = null;
    // Tests manipulate the settings directly, so let's not double-write with
    // stale settings data here.
    if (origin == "test") {
      task.disarm();
    } else {
      await task.finalize();
    }
  }

  /**
   * Writes the settings to disk (no delay).
   */
  async _write() {
    if (this._batchTask) {
      this._batchTask.disarm();
    }

    let settings = {};

    // Allows us to force a settings refresh should the settings format change.
    settings.version = lazy.SearchUtils.SETTINGS_VERSION;
    settings.engines = [...this.#searchService._engines.values()].map(engine =>
      JSON.parse(JSON.stringify(engine))
    );
    settings.metaData = this.#settings.metaData;

    // Persist metadata for AppProvided engines even if they aren't currently
    // active, this means if they become active again their settings
    // will be restored.
    if (this.#settings?.engines) {
      for (let engine of this.#settings.engines) {
        let included = settings.engines.some(e => e._name == engine._name);
        if (engine._isAppProvided && !included) {
          settings.engines.push(engine);
        }
      }
    }

    // Update the local copy.
    this.#settings = settings;

    try {
      if (!settings.engines.length) {
        throw new Error("cannot write without any engine.");
      }

      if (this.isCurrentAndCachedSettingsEqual()) {
        lazy.logConsole.debug(
          "_write: Settings unchanged. Did not write to disk."
        );
        Services.obs.notifyObservers(
          null,
          lazy.SearchUtils.TOPIC_SEARCH_SERVICE,
          "write-prevented-when-settings-unchanged"
        );
        Services.obs.notifyObservers(
          null,
          lazy.SearchUtils.TOPIC_SEARCH_SERVICE,
          "write-settings-to-disk-complete"
        );

        return;
      }

      // At this point, the settings and cached settings are different. We
      // write settings to disk and update #cachedSettings.
      this.#cachedSettings = structuredClone(this.#settings);

      lazy.logConsole.debug("_write: Writing to settings file.");
      let path = PathUtils.join(PathUtils.profileDir, SETTINGS_FILENAME);
      await IOUtils.writeJSON(path, settings, {
        compress: true,
        tmpPath: path + ".tmp",
      });
      lazy.logConsole.debug("_write: settings file written to disk.");
      Services.obs.notifyObservers(
        null,
        lazy.SearchUtils.TOPIC_SEARCH_SERVICE,
        "write-settings-to-disk-complete"
      );
    } catch (ex) {
      lazy.logConsole.error("_write: Could not write to settings file:", ex);
    }
  }

  /**
   * Sets an attribute without verification.
   *
   * @param {string} name
   *   The name of the attribute to set.
   * @param {*} val
   *   The value to set.
   */
  setMetaDataAttribute(name, val) {
    this.#settings.metaData[name] = val;
    this._delayedWrite();
  }

  /**
   * Sets a verified attribute. This will save an additional hash
   * value, that can be verified when reading back.
   *
   * @param {string} name
   *   The name of the attribute to set.
   * @param {*} val
   *   The value to set.
   */
  setVerifiedMetaDataAttribute(name, val) {
    this.#settings.metaData[name] = val;
    this.#settings.metaData[
      this.getHashName(name)
    ] = lazy.SearchUtils.getVerificationHash(val);
    this._delayedWrite();
  }

  /**
   * Gets an attribute without verification.
   *
   * @param {string} name
   *   The name of the attribute to get.
   * @returns {*}
   *   The value of the attribute, or undefined if not known.
   */
  getMetaDataAttribute(name) {
    return this.#settings.metaData[name] ?? undefined;
  }

  /**
   * Gets a copy of the settings metadata.
   *
   * @returns {*}
   *   A copy of the settings metadata object.
   *
   */
  getSettingsMetaData() {
    return { ...this.#settings.metaData };
  }

  /**
   * Gets a verified attribute.
   *
   * @param {string} name
   *   The name of the attribute to get.
   * @returns {*}
   *   The value of the attribute, or undefined if not known or an empty strings
   *   if it does not match the verification hash.
   */
  getVerifiedMetaDataAttribute(name) {
    let val = this.getMetaDataAttribute(name);
    if (
      val &&
      this.getMetaDataAttribute(this.getHashName(name)) !=
        lazy.SearchUtils.getVerificationHash(val)
    ) {
      lazy.logConsole.warn("getVerifiedGlobalAttr, invalid hash for", name);
      return undefined;
    }
    return val;
  }

  /**
   * Sets an attribute in #settings.engines._metaData
   *
   * @param {string} engineName
   *   The name of the engine.
   * @param {string} property
   *   The name of the attribute to set.
   * @param {*} value
   *   The value to set.
   */
  setEngineMetaDataAttribute(engineName, property, value) {
    let engines = [...this.#searchService._engines.values()];
    let engine = engines.find(engine => engine._name == engineName);
    if (engine) {
      engine._metaData[property] = value;
      this._delayedWrite();
    }
  }

  /**
   * Gets an attribute from #settings.engines._metaData
   *
   * @param {string} engineName
   *   The name of the engine.
   * @param {string} property
   *   The name of the attribute to get.
   * @returns {*}
   *   The value of the attribute, or undefined if not known.
   */
  getEngineMetaDataAttribute(engineName, property) {
    let engine = this.#settings.engines.find(
      engine => engine._name == engineName
    );
    return engine._metaData[property] ?? undefined;
  }

  /**
   * Returns the name for the hash for a particular attribute. This is
   * necessary because the default engine ID property is named `current`
   * with its hash as `hash`. All other hashes are in the `<name>Hash` format.
   *
   * @param {string} name
   *   The name of the attribute to get the hash name for.
   * @returns {string}
   *   The hash name to use.
   */
  getHashName(name) {
    // The "current" check remains here because we need to retrieve the
    // "current" hash name for the migration of engine ids. After the migration,
    // the "current" property is no longer used because we now store
    // "defaultEngineId" instead.
    if (name == "current") {
      return "hash";
    }
    return name + "Hash";
  }

  /**
   * Handles shutdown; writing the settings if necessary.
   *
   * @param {object} state
   *   The shutdownState object that is used to help analyzing the shutdown
   *   state in case of a crash or shutdown timeout.
   */
  async shutdown(state) {
    if (!this._batchTask) {
      return;
    }
    state.step = "Finalizing batched task";
    try {
      await this._batchTask.finalize();
      state.step = "Batched task finalized";
    } catch (ex) {
      state.step = "Batched task failed to finalize";

      state.latestError.message = "" + ex;
      if (ex && typeof ex == "object") {
        state.latestError.stack = ex.stack || undefined;
      }
    }
  }

  // nsIObserver
  observe(engine, topic, verb) {
    switch (topic) {
      case lazy.SearchUtils.TOPIC_ENGINE_MODIFIED:
        switch (verb) {
          case lazy.SearchUtils.MODIFIED_TYPE.ADDED:
          case lazy.SearchUtils.MODIFIED_TYPE.CHANGED:
          case lazy.SearchUtils.MODIFIED_TYPE.REMOVED:
            this._delayedWrite();
            break;
        }
        break;
      case lazy.SearchUtils.TOPIC_SEARCH_SERVICE:
        switch (verb) {
          case "init-complete":
          case "engines-reloaded":
            this._delayedWrite();
            break;
        }
        break;
    }
  }

  /**
   * Compares the #settings and #cachedSettings objects.
   *
   * @returns {boolean}
   *   True if the objects have the same property and values.
   */
  isCurrentAndCachedSettingsEqual() {
    return lazy.ObjectUtils.deepEqual(this.#settings, this.#cachedSettings);
  }

  /**
   * This function writes to settings versions 6 and below. It does two
   * updates:
   *   1) Store engine ids.
   *   2) Store "defaultEngineId" and "privateDefaultEngineId" to replace
   *      "current" and "private" because we are no longer referencing the
   *      "current" and "private" attributes with engine names as their values.
   *
   * @param {object} clonedSettings
   *   The SearchService holds a deep copy of the settings file object. This
   *   clonedSettings is passed in as an argument from SearchService.
   */
  migrateEngineIds(clonedSettings) {
    if (clonedSettings.version <= 6) {
      lazy.logConsole.debug("migrateEngineIds: start");

      for (let engineSettings of clonedSettings.engines) {
        let engine = this.#getEngineByName(engineSettings._name);

        if (engine) {
          // Store the engine id
          engineSettings.id = engine.id;
        }
      }

      let currentDefaultEngine = this.#getEngineByName(
        clonedSettings.metaData.current
      );
      let privateDefaultEngine = this.#getEngineByName(
        clonedSettings.metaData.private
      );

      // As per SearchService._getEngineDefault, we relax the verification hash
      // check for application provided engines to reduce the annoyance for
      // users who backup/sync their profile in custom ways.
      if (
        currentDefaultEngine &&
        (currentDefaultEngine.isAppProvided ||
          lazy.SearchUtils.getVerificationHash(
            clonedSettings.metaData.current
          ) == clonedSettings.metaData[this.getHashName("current")])
      ) {
        // Store the defaultEngineId
        this.setVerifiedMetaDataAttribute(
          "defaultEngineId",
          currentDefaultEngine.id
        );
      } else {
        this.setVerifiedMetaDataAttribute("defaultEngineId", "");
      }

      if (
        privateDefaultEngine &&
        (privateDefaultEngine.isAppProvided ||
          lazy.SearchUtils.getVerificationHash(
            clonedSettings.metaData.private
          ) == clonedSettings.metaData[this.getHashName("private")])
      ) {
        // Store the privateDefaultEngineId
        this.setVerifiedMetaDataAttribute(
          "privateDefaultEngineId",
          privateDefaultEngine.id
        );
      } else {
        this.setVerifiedMetaDataAttribute("privateDefaultEngineId", "");
      }

      lazy.logConsole.debug("migrateEngineIds: done");
    }
  }

  /**
   * Migrates telemetry load paths for versions of settings prior to v8.
   */
  #migrateTelemetryLoadPaths() {
    for (let engine of this.#settings.engines) {
      if (!engine._loadPath) {
        continue;
      }
      if (engine._loadPath.includes("set-via-policy")) {
        engine._loadPath = "[policy]";
      } else if (engine._loadPath.includes("set-via-user")) {
        engine._loadPath = "[user]";
      } else if (engine._loadPath.startsWith("[other]addEngineWithDetails:")) {
        engine._loadPath = engine._loadPath.replace(
          "[other]addEngineWithDetails:",
          "[addon]"
        );
      }
    }
  }

  /**
   * Returns the engine associated with the name without SearchService
   * initialization checks.
   *
   * @param {string} engineName
   *   The name of the engine.
   * @returns {SearchEngine}
   *   The associated engine if found, null otherwise.
   */
  #getEngineByName(engineName) {
    for (let engine of this.#searchService._engines.values()) {
      if (engine.name == engineName) {
        return engine;
      }
    }

    return null;
  }
}
