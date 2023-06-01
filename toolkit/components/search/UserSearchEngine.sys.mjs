/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint no-shadow: error, mozilla/no-aArgs: error */

import { SearchEngine } from "resource://gre/modules/SearchEngine.sys.mjs";

/**
 * UserSearchEngine represents a search engine defined by a user.
 */
export class UserSearchEngine extends SearchEngine {
  /**
   * Creates a UserSearchEngine.
   *
   * @param {object} options
   *   The options for this search engine.
   * @param {object} [options.details]
   *   General information about the search engine.
   * @param {string} [options.details.name]
   *   The search engine name.
   * @param {string} [options.details.url]
   *   The search url for the engine.
   * @param {string} [options.details.keyword]
   *   The keyword for the engine.
   * @param {object} [options.json]
   *   An object that represents the saved JSON settings for the engine.
   */
  constructor(options = {}) {
    super({
      loadPath: "[user]",
    });

    if (options.details) {
      this._initWithDetails({
        name: options.details.name,
        search_url: encodeURI(options.details.url),
        keyword: options.details.alias,
      });
    } else {
      this._initWithJSON(options.json);
    }
  }

  /**
   * Returns the appropriate identifier to use for telemetry.
   *
   * @returns {string}
   */
  get telemetryId() {
    return `other-${this.name}`;
  }
}
