/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Import these directly, since we're going to be using them immediately to construct SharedRemoteSettingsService
import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";
import { Region } from "resource://gre/modules/Region.sys.mjs";
import {
  RemoteSettingsConfig2,
  RemoteSettingsContext,
  RemoteSettingsServer,
  RemoteSettingsService,
} from "moz-src:///toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustRemoteSettings.sys.mjs";
import { Utils } from "resource://services-settings/Utils.sys.mjs";

/**
 * Rust RemoteSettingsService singleton
 *
 * This component manages the app-wide Rust RemoteSetingsService that's
 * shared by various other Rust components.
 *
 * This is only intended to be passed to Rust code. If you want a
 * general-purpose Remote settings client, use the JS one:
 *
 * - https://firefox-source-docs.mozilla.org/services/settings/index.html
 * - https://searchfox.org/mozilla-central/source/services/settings/remote-settings.sys.mjs
 */
class _SharedRemoteSettingsService {
  #config;
  #rustService;

  constructor() {
    const storageDir = PathUtils.join(
      Services.dirsvc.get("ProfLD", Ci.nsIFile).path,
      "remote-settings"
    );

    this.#config = new RemoteSettingsConfig2({
      server: this.#makeServer(Utils.SERVER_URL),
      bucketName: Utils.actualBucketName("main"),
      appContext: new RemoteSettingsContext({
        formFactor: "desktop",
        appId: Services.appinfo.ID || "",
        channel: AppConstants.IS_ESR ? "esr" : AppConstants.MOZ_UPDATE_CHANNEL,
        appVersion: Services.appinfo.version,
        locale: Services.locale.appLocaleAsBCP47,
        os: AppConstants.platform,
        osVersion: Services.sysinfo.get("version"),
        country: Region.home ?? undefined,
      }),
    });

    Services.obs.addObserver(this, Region.REGION_TOPIC);
    Services.obs.addObserver(this, "intl:app-locales-changed");

    this.#rustService = RemoteSettingsService.init(storageDir, this.#config);
  }

  /**
   * @returns {string}
   *   The country of the service's app context.
   */
  get country() {
    return this.#config.appContext.country;
  }

  /**
   * @returns {string}
   *   The locale of the service's app context.
   */
  get locale() {
    return this.#config.appContext.locale;
  }

  /**
   * @returns {RemoteSettingsServer}
   *   The service's server.
   */
  get server() {
    return this.#config.server;
  }

  /**
   * Update the Remote Settings server
   *
   * @param {object} opts object with the following fields:
   * - `url`: server URL (defaults to the production URL)
   * - `bucketName`: bucket name (defaults to "main")
   */
  updateServer(opts = {}) {
    this.#config.server = this.#makeServer(opts.url ?? Utils.SERVER_URL);
    this.#config.bucketName = opts.bucketName ?? Utils.actualBucketName("main");
    this.#updateConfig();
  }

  /**
   * Update the Remote settings config
   *
   * Note: this currently schedules an async call to avoid the deadlock from
   * https://bugzilla.mozilla.org/show_bug.cgi?id=2012955.
   */
  #updateConfig() {
    this.#rustService.updateConfig(this.#config);
  }

  /**
   * Get a reference to the Rust RemoteSettingsService object
   */
  rustService() {
    return this.#rustService;
  }

  /**
   * Sync server data for all active clients
   */
  async sync() {
    // TODO (1966163): Hook this up to a timer.  There's currently no mechanism that calls this.
    await this.#rustService.sync();
  }

  observe(subj, topic) {
    switch (topic) {
      case Region.REGION_TOPIC: {
        const newCountry = subj.data;
        if (newCountry != this.#config.appContext.country) {
          this.#config.appContext.country = newCountry;
          this.#updateConfig();
        }
        break;
      }
      case "intl:app-locales-changed": {
        const newLocale = Services.locale.appLocaleAsBCP47;
        if (newLocale != this.#config.appContext.locale) {
          this.#config.appContext.locale = newLocale;
          this.#updateConfig();
        }
        break;
      }
    }
  }

  #makeServer(url) {
    // This is annoyingly complex but set `config.server` to a falsey value
    // while tests are running and the URL is `Utils.SERVER_URL`. This will
    // cause the Rust component to fall back to the production server, but it
    // will avoid "cannot-be-a-base" errors. Since remote connections are not
    // allowed during testing, consumers will need to avoid using the RS
    // service. Ideally we would both handle the cannot-be-a-base errors and
    // avoid pinging the production server for them somehow.
    //
    // Details:
    //
    // * During normal operation, `Utils.SERVER_URL` is the production URL, but
    //   during tests, it's a dummy data URI, `data:,#remote-settings-dummy/v1`,
    //   which is a "cannot-be-a-base" URL.
    //
    // * `RemoteSettingsService::new` falls back to the production URL when
    //   `config.server.url` is a cannot-be-a-base URL. So passing in the dummy
    //   data URI is actually fine for `new`.
    //
    // * In contrast, `RemoteSettingsService::update_config` returns the error
    //   when it parses a cannot-be-a-base `config.server.url`.
    return !Utils.shouldSkipRemoteActivityDueToTests || url != Utils.SERVER_URL
      ? new RemoteSettingsServer.Custom({ url })
      : null;
  }
}

export const SharedRemoteSettingsService = new _SharedRemoteSettingsService();
