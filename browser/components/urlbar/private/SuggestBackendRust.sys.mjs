/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { BaseFeature } from "resource:///modules/urlbar/private/BaseFeature.sys.mjs";
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  AsyncShutdown: "resource://gre/modules/AsyncShutdown.sys.mjs",
  InterruptKind: "resource://gre/modules/RustSuggest.sys.mjs",
  QuickSuggest: "resource:///modules/QuickSuggest.sys.mjs",
  RemoteSettingsServer: "resource://gre/modules/RustSuggest.sys.mjs",
  SuggestIngestionConstraints: "resource://gre/modules/RustSuggest.sys.mjs",
  SuggestStoreBuilder: "resource://gre/modules/RustSuggest.sys.mjs",
  Suggestion: "resource://gre/modules/RustSuggest.sys.mjs",
  SuggestionProvider: "resource://gre/modules/RustSuggest.sys.mjs",
  SuggestionQuery: "resource://gre/modules/RustSuggest.sys.mjs",
  TaskQueue: "resource:///modules/UrlbarUtils.sys.mjs",
  UrlbarPrefs: "resource:///modules/UrlbarPrefs.sys.mjs",
  Utils: "resource://services-settings/Utils.sys.mjs",
});

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "timerManager",
  "@mozilla.org/updates/timer-manager;1",
  "nsIUpdateTimerManager"
);

const SUGGEST_DATA_STORE_BASENAME = "suggest.sqlite";

const SPONSORED_SUGGESTION_TYPES = new Set(["Amp", "Fakespot", "Yelp"]);

// This ID is used to register our ingest timer with nsIUpdateTimerManager.
const INGEST_TIMER_ID = "suggest-ingest";
const INGEST_TIMER_LAST_UPDATE_PREF = `app.update.lastUpdateTime.${INGEST_TIMER_ID}`;

// Maps from `suggestion.constructor` to the corresponding name of the
// suggestion type. See `getSuggestionType()` for details.
const gSuggestionTypesByCtor = new WeakMap();

/**
 * The Suggest Rust backend. Not used when the remote settings JS backend is
 * enabled.
 *
 * This class returns suggestions served by the Rust component. These are the
 * primary related architectural pieces (see bug 1851256 for details):
 *
 * (1) The `suggest` Rust component, which lives in the application-services
 *     repo [1] and is periodically vendored into mozilla-central [2] and then
 *     built into the Firefox binary.
 * (2) `suggest.udl`, which is part of the Rust component's source files and
 *     defines the interface exposed to foreign-function callers like JS [3, 4].
 * (3) `RustSuggest.sys.mjs` [5], which contains the JS bindings generated from
 *     `suggest.udl` by UniFFI. The classes defined in `RustSuggest.sys.mjs` are
 *     what we consume here in this file. If you have a question about the JS
 *     interface to the Rust component, try checking `RustSuggest.sys.mjs`, but
 *     as you get accustomed to UniFFI JS conventions you may find it simpler to
 *     refer directly to `suggest.udl`.
 * (4) `config.toml` [6], which defines which functions in the JS bindings are
 *     sync and which are async. Functions default to the "worker" thread, which
 *     means they are async. Some functions are "main", which means they are
 *     sync. Async functions return promises. This information is reflected in
 *     `RustSuggest.sys.mjs` of course: If a function is "worker", its JS
 *     binding will return a promise, and if it's "main" it won't.
 *
 * [1] https://github.com/mozilla/application-services/tree/main/components/suggest
 * [2] https://searchfox.org/mozilla-central/source/third_party/rust/suggest
 * [3] https://github.com/mozilla/application-services/blob/main/components/suggest/src/suggest.udl
 * [4] https://searchfox.org/mozilla-central/source/third_party/rust/suggest/src/suggest.udl
 * [5] https://searchfox.org/mozilla-central/source/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustSuggest.sys.mjs
 * [6] https://searchfox.org/mozilla-central/source/toolkit/components/uniffi-bindgen-gecko-js/config.toml
 */
export class SuggestBackendRust extends BaseFeature {
  constructor(...args) {
    super(...args);
    this.#ingestQueue = new lazy.TaskQueue();
    this.#setRemoteSettingsConfig({
      serverUrl: lazy.Utils.SERVER_URL,
      bucketName: lazy.Utils.actualBucketName("main"),
    });
  }

  /**
   * @returns {object}
   *   The global Suggest config from the Rust component as returned from
   *   `SuggestStore.fetchGlobalConfig()`.
   */
  get config() {
    return this.#config || {};
  }

  /**
   * @returns {Promise}
   *   Resolved when all pending ingests are done.
   */
  get ingestPromise() {
    return this.#ingestQueue.emptyPromise;
  }

  get shouldEnable() {
    return lazy.UrlbarPrefs.get("quickSuggestRustEnabled");
  }

  enable(enabled) {
    if (enabled) {
      this.#init();
    } else {
      this.#uninit();
    }
  }

  async query(searchString) {
    if (!this.#store) {
      return [];
    }

    this.logger.debug("Handling query: " + JSON.stringify(searchString));

    // Build the list of enabled Rust providers to query.
    let providers = this.#rustProviders.reduce(
      (memo, { type, feature, provider }) => {
        if (feature.isEnabled && feature.isRustSuggestionTypeEnabled(type)) {
          this.logger.debug(
            `Adding provider to query: '${type}' (${provider})`
          );
          memo.push(provider);
        }
        return memo;
      },
      []
    );

    let suggestions = await this.#store.query(
      new lazy.SuggestionQuery({ keyword: searchString, providers })
    );

    for (let suggestion of suggestions) {
      let type = getSuggestionType(suggestion);
      if (!type) {
        continue;
      }

      suggestion.source = "rust";
      suggestion.provider = type;
      suggestion.is_sponsored = SPONSORED_SUGGESTION_TYPES.has(type);
      if (Array.isArray(suggestion.icon)) {
        suggestion.icon_blob = new Blob([new Uint8Array(suggestion.icon)], {
          type: suggestion.iconMimetype ?? "",
        });

        delete suggestion.icon;
        delete suggestion.iconMimetype;
      }
    }

    this.logger.debug(
      "Got suggestions: " + JSON.stringify(suggestions, null, 2)
    );

    return suggestions;
  }

  cancelQuery() {
    this.#store?.interrupt(lazy.InterruptKind.READ);
  }

  /**
   * Returns suggestion-type-specific configuration data set by the Rust
   * backend.
   *
   * @param {string} type
   *   A Rust suggestion type name as defined in `suggest.udl`, e.g., "Amp",
   *   "Wikipedia", "Mdn", etc. See also `BaseFeature.rustSuggestionTypes`.
   * @returns {object} config
   *   The config data for the type.
   */
  getConfigForSuggestionType(type) {
    return this.#configsBySuggestionType.get(type);
  }

  /**
   * Ingests the given suggestion type.
   *
   * @param {string} type
   *   A Rust suggestion type name as defined in `suggest.udl`, e.g., "Amp",
   *   "Wikipedia", "Mdn", etc. See also `BaseFeature.rustSuggestionTypes`.
   */
  ingestSuggestionType(type) {
    this.#ingestQueue.queueIdleCallback(async () => {
      if (!this.#store) {
        return;
      }

      let provider = this.#providerFromSuggestionType(type);
      if (!provider) {
        return;
      }

      let timerId;
      this.logger.debug("Starting ingest: " + type);
      try {
        timerId = Glean.urlbar.quickSuggestIngestTime.start();
        await this.#store.ingest(
          new lazy.SuggestIngestionConstraints({
            providers: [provider],
          })
        );
        Glean.urlbar.quickSuggestIngestTime.stopAndAccumulate(timerId);
      } catch (error) {
        // Ingest can throw a `SuggestApiError` subclass called `Other` with a
        // `reason` message, which is very helpful for diagnosing problems with
        // remote settings data in tests in particular.
        this.logger.error(
          `Ingest error for ${type}: ` + (error.reason ?? error)
        );
        Glean.urlbar.quickSuggestIngestTime.cancel(timerId);
      }
      this.logger.debug("Finished ingest: " + type);

      if (!this.#store) {
        return;
      }

      // Fetch the provider config.
      this.logger.debug("Fetching provider config: " + type);
      let config = await this.#store.fetchProviderConfig(provider);
      this.logger.debug(
        `Got provider config for ${type}: ` + JSON.stringify(config)
      );
      this.#configsBySuggestionType.set(type, config);
      this.logger.debug("Finished fetching provider config: " + type);
    });
  }

  /**
   * nsITimerCallback
   */
  notify() {
    this.logger.info("Ingest timer fired");
    this.#ingestAll();
  }

  get #storeDataPath() {
    return PathUtils.join(
      Services.dirsvc.get("ProfD", Ci.nsIFile).path,
      SUGGEST_DATA_STORE_BASENAME
    );
  }

  /**
   * @returns {Array}
   *   Each item in this array contains metadata related to a Rust suggestion
   *   type, the `BaseFeature` that manages the type, and the corresponding
   *   suggestion provider as defined by Rust. Items look like this:
   *   `{ type, feature, provider }`
   *
   *   {string} type
   *     The Rust suggestion type name (the same type of string values that are
   *     defined in `BaseFeature.rustSuggestionTypes`).
   *   {BaseFeature} feature
   *     The feature that manages the suggestion type.
   *   {number} provider
   *     An integer value defined on the `SuggestionProvider` object in
   *     `RustSuggest.sys.mjs` that identifies the suggestion provider to
   *     Rust.
   */
  get #rustProviders() {
    let items = [];
    for (let [type, feature] of lazy.QuickSuggest
      .featuresByRustSuggestionType) {
      let provider = this.#providerFromSuggestionType(type);
      if (provider) {
        items.push({ type, feature, provider });
      }
    }
    return items;
  }

  #init() {
    // Initialize the store.
    this.logger.info(
      `Initializing SuggestStore with data path ${this.#storeDataPath}`
    );
    let builder = lazy.SuggestStoreBuilder.init()
      .dataPath(this.#storeDataPath)
      .loadExtension(AppConstants.SQLITE_LIBRARY_FILENAME, "sqlite3_fts5_init")
      .remoteSettingsServer(this.#remoteSettingsServer)
      .remoteSettingsBucketName(this.#remoteSettingsBucketName);
    try {
      this.#store = builder.build();
    } catch (error) {
      this.logger.error("Error initializing SuggestStore:");
      this.logger.error(error);
      return;
    }

    // Log the last ingest time for debugging.
    let lastIngestSecs = Services.prefs.getIntPref(
      INGEST_TIMER_LAST_UPDATE_PREF,
      0
    );
    if (lastIngestSecs) {
      this.logger.debug(
        `Last ingest time: ${lastIngestSecs}s (${
          Math.round(Date.now() / 1000) - lastIngestSecs
        }s ago)`
      );
    } else {
      this.logger.debug("Last ingest time: none");
    }

    // Interrupt any ongoing ingests (WRITE) and queries (READ) on shutdown.
    // Note that `interrupt()` runs on the main thread and is not async; see
    // toolkit/components/uniffi-bindgen-gecko-js/config.toml
    this.#shutdownBlocker = () =>
      this.#store?.interrupt(lazy.InterruptKind.READ_WRITE);
    lazy.AsyncShutdown.profileBeforeChange.addBlocker(
      "QuickSuggest: Interrupt the Rust component",
      this.#shutdownBlocker
    );

    // Register the ingest timer.
    lazy.timerManager.registerTimer(
      INGEST_TIMER_ID,
      this,
      lazy.UrlbarPrefs.get("quicksuggest.rustIngestIntervalSeconds"),
      true // skipFirst
    );

    // Do an initial ingest for all enabled suggestion types. When a type
    // becomes enabled after this point, its `BaseFeature` will update and call
    // `ingestSuggestionType()` for it, which will be its initial ingest.
    this.#ingestAll();
  }

  #uninit() {
    this.#store = null;
    this.#configsBySuggestionType.clear();
    lazy.timerManager.unregisterTimer(INGEST_TIMER_ID);

    lazy.AsyncShutdown.profileBeforeChange.removeBlocker(this.#shutdownBlocker);
    this.#shutdownBlocker = null;
  }

  #ingestAll() {
    // Ingest all enabled suggestion types.
    for (let { feature, type } of this.#rustProviders) {
      if (feature.isEnabled && feature.isRustSuggestionTypeEnabled(type)) {
        this.ingestSuggestionType(type);
      }
    }

    // Fetch the global config.
    this.#ingestQueue.queueIdleCallback(async () => {
      if (!this.#store) {
        return;
      }
      this.logger.debug("Fetching global config");
      this.#config = await this.#store.fetchGlobalConfig();
      this.logger.debug("Got global config: " + JSON.stringify(this.#config));
    });
  }

  /**
   * Given a Rust suggestion type, gets the integer value defined on the
   * `SuggestionProvider` object in `RustSuggest.sys.mjs` that identifies the
   * corresponding provider to Rust.
   *
   * @param {string} type
   *   A Rust suggestion type name as defined in `suggest.udl`, e.g., "Amp",
   *   "Wikipedia", "Mdn", etc. See also `BaseFeature.rustSuggestionTypes`.
   * @returns {number}
   *   An integer value defined on the `SuggestionProvider` object.
   */
  #providerFromSuggestionType(type) {
    let key = type.toUpperCase();
    if (!lazy.SuggestionProvider.hasOwnProperty(key)) {
      this.logger.error(`SuggestionProvider["${key}"] is not defined!`);
      return null;
    }
    return lazy.SuggestionProvider[key];
  }

  #setRemoteSettingsConfig({ serverUrl, bucketName }) {
    this.#remoteSettingsServer = new lazy.RemoteSettingsServer.Custom(
      serverUrl
    );
    this.#remoteSettingsBucketName = bucketName;
  }

  get _test_store() {
    return this.#store;
  }

  async _test_setRemoteSettingsConfig({ serverUrl, bucketName }) {
    this.#setRemoteSettingsConfig({ serverUrl, bucketName });
    if (this.isEnabled) {
      // Recreate the store and re-ingest.
      Services.prefs.clearUserPref(INGEST_TIMER_LAST_UPDATE_PREF);
      this.#uninit();
      this.#init();
      await this.ingestPromise;
    }
  }

  async _test_ingest() {
    this.#ingestAll();
    await this.ingestPromise;
  }

  // The `SuggestStore` instance.
  #store;

  // Global Suggest config as returned from `SuggestStore.fetchGlobalConfig()`.
  #config = {};

  // Maps from suggestion type to provider config as returned from
  // `SuggestStore.fetchProviderConfig()`.
  #configsBySuggestionType = new Map();

  #ingestQueue;
  #shutdownBlocker;
  #remoteSettingsServer;
  #remoteSettingsBucketName;
}

/**
 * Returns the type of a suggestion.
 *
 * @param {Suggestion} suggestion
 *   A suggestion object, an instance of one of the `Suggestion` subclasses.
 * @returns {string}
 *   The suggestion's type, e.g., "Amp", "Wikipedia", etc.
 */
function getSuggestionType(suggestion) {
  // Suggestion objects served by the Rust component don't have any inherent
  // type information other than the classes they are instances of. There's no
  // `type` property, for example. There's a base `Suggestion` class and many
  // `Suggestion` subclasses, one per type of suggestion. Each suggestion object
  // is an instance of one of these subclasses. We derive a suggestion's type
  // from the subclass it's an instance of.
  //
  // Unfortunately the subclasses are all anonymous, which means
  // `suggestion.constructor.name` is always an empty string. (This is due to
  // how UniFFI generates JS bindings.) Instead, the subclasses are defined as
  // properties on the base `Suggestion` class. For example,
  // `Suggestion.Wikipedia` is the (anonymous) Wikipedia suggestion class. To
  // find a suggestion's subclass, we loop through the keys on `Suggestion`
  // until we find the value the suggestion is an instance of. To avoid doing
  // this every time, we cache the mapping from suggestion constructor to key
  // the first time we encounter a new suggestion subclass.
  let type = gSuggestionTypesByCtor.get(suggestion.constructor);
  if (!type) {
    type = Object.keys(lazy.Suggestion).find(
      key => suggestion instanceof lazy.Suggestion[key]
    );
    if (type) {
      gSuggestionTypesByCtor.set(suggestion.constructor, type);
    } else {
      console.error(
        "Unexpected error: Suggestion class not found on `Suggestion`. " +
          "Did the Rust component or its JS bindings change? " +
          "The suggestion is: " +
          JSON.stringify(suggestion)
      );
    }
  }
  return type;
}
