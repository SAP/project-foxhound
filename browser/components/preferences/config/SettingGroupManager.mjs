/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @import {SettingGroupConfig} from "chrome://browser/content/preferences/widgets/setting-group.mjs" */

export const SettingGroupManager = {
  /** @type {Map<string, SettingGroupConfig>} */
  _data: new Map(),

  /**
   * @param {string} id
   */
  get(id) {
    if (!this._data.has(id)) {
      throw new Error(`Setting group "${id}" not found`);
    }
    return this._data.get(id);
  },

  /**
   * @param {string} id
   * @param {SettingGroupConfig} config
   */
  registerGroup(id, config) {
    if (this._data.has(id)) {
      throw new Error(`Setting group "${id}" already registered`);
    }
    this._data.set(id, config);
  },

  /**
   * @param {Record<string, SettingGroupConfig>} groupConfigs
   */
  registerGroups(groupConfigs) {
    for (let id in groupConfigs) {
      this.registerGroup(id, groupConfigs[id]);
    }
  },
};
