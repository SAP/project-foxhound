/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Manages change password links for saved logins using data from
 * RemoteSettings.
 *
 * The 'change-password-urls' RemoteSettings collection maps domains to HTTPS
 * password change URLs. This module determines which saved logins match
 * those domains and returns a mapping of login GUIDs to their corresponding
 * password change URLs.
 *
 * Domain matching is based on eTLD+1 comparison and does not guarantee that
 * the returned password change URL is specific to the exact subdomain of the login.
 */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  LoginHelper: "resource://gre/modules/LoginHelper.sys.mjs",
  RemoteSettings: "resource://services-settings/remote-settings.sys.mjs",
  RemoteSettingsClient:
    "resource://services-settings/RemoteSettingsClient.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "log", () => {
  return lazy.LoginHelper.createLogger("ChangePasswordURLs");
});

export const ChangePasswordURLs = {
  REMOTE_SETTINGS_COLLECTION: "change-password-urls",

  /**
   * Fetch and normalize the domain to password change URL mapping
   * from RemoteSettings.
   *
   * @returns {Map<string, string>} A Map of domain to HTTPS password change URL.
   */
  async _getDomainToChangePasswordURLMap() {
    let records;

    try {
      records = await lazy
        .RemoteSettings(this.REMOTE_SETTINGS_COLLECTION)
        .get();
    } catch (ex) {
      if (ex instanceof lazy.RemoteSettingsClient.UnknownCollectionError) {
        lazy.log.warn(
          "Could not get Remote Settings collection.",
          this.REMOTE_SETTINGS_COLLECTION
        );
        return new Map();
      }
      throw ex;
    }

    const domainMap = new Map();

    for (const record of records) {
      if (!record.host || !record.url) {
        continue;
      }

      if (!this._isValidHTTPSURL(record.url)) {
        continue;
      }

      domainMap.set(record.host, record.url);
    }

    return domainMap;
  },

  /**
   * Return a Map of login GUIDs to password change URLs. Logins with invalid
   * origins or without a matching domain are skipped.
   *
   * @param {nsILoginInfo[]} logins Saved logins to match against known domains.
   * @returns {Map<string, string>} A Map from login GUID to password change URL.
   */
  async getChangePasswordURLsByLoginGUID(logins) {
    const changePasswordURLsByLoginGUID = new Map();
    const domainMap = await this._getDomainToChangePasswordURLMap();

    for (const login of logins) {
      let loginHost;

      try {
        loginHost = Services.io.newURI(login.origin).host;
      } catch {
        continue;
      }

      for (const [domain, url] of domainMap) {
        if (Services.eTLD.hasRootDomain(loginHost, domain)) {
          changePasswordURLsByLoginGUID.set(login.guid, url);
          break;
        }
      }
    }

    return changePasswordURLsByLoginGUID;
  },

  _isValidHTTPSURL(url) {
    try {
      let uri = Services.io.newURI(url);
      return uri.scheme === "https";
    } catch {
      return false;
    }
  },
};
