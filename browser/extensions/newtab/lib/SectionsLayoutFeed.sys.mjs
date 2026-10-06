/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  actionTypes as at,
  actionCreators as ac,
} from "resource://newtab/common/Actions.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  RemoteSettings: "resource://services-settings/remote-settings.sys.mjs",
});

const SECTION_LAYOUTS_REMOTE_SETTINGS_COLLECTION = "newtab-section-layouts";

const PREF_CLIENT_LAYOUT_ENABLED =
  "discoverystream.sections.clientLayout.enabled";

const PREF_TOPSTORIES_ENABLED = "feeds.section.topstories";

const DEFAULT_SECTION_LAYOUT = [
  {
    name: "6-small-medium-1-ad",
    responsiveLayouts: [
      {
        columnCount: 4,
        tiles: [
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 4,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 5,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 3,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 2,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 3,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 4,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 5,
            hasAd: false,
            hasExcerpt: true,
          },
        ],
      },
      {
        columnCount: 2,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 4,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 5,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 1,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 4,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 5,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
    ],
  },
  {
    name: "4-large-small-medium-1-ad",
    responsiveLayouts: [
      {
        columnCount: 4,
        tiles: [
          {
            size: "large",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 3,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 2,
        tiles: [
          {
            size: "large",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 1,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
    ],
  },
  {
    name: "4-medium-small-1-ad",
    responsiveLayouts: [
      {
        columnCount: 4,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 2,
            hasAd: false,
            hasExcerpt: true,
          },
          { size: "medium", position: 3, hasAd: true, hasExcerpt: true },
        ],
      },
      {
        columnCount: 3,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 2,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 1,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
    ],
  },
];

export const SectionsLayoutManager = {
  DEFAULT_SECTION_LAYOUT,
};

function isValidLayout(record) {
  if (!record.name || !Array.isArray(record.responsiveLayouts)) {
    return false;
  }
  const columnCounts = new Set(
    record.responsiveLayouts.map(layout => layout.columnCount)
  );
  return [1, 2, 3, 4].every(n => columnCounts.has(n));
}

export class SectionsLayoutFeed {
  constructor() {
    this._rsClient = null;
    this._onSync = this._onSync.bind(this);
  }

  RemoteSettings(...args) {
    return lazy.RemoteSettings(...args);
  }

  async init(isStartup = false) {
    const prefs = this.store.getState().Prefs.values;
    const useClientLayout =
      prefs[PREF_TOPSTORIES_ENABLED] &&
      (prefs.trainhopConfig?.clientLayout?.enabled ||
        prefs[PREF_CLIENT_LAYOUT_ENABLED]);

    if (useClientLayout) {
      if (!this._rsClient) {
        this._rsClient = this.RemoteSettings(
          SECTION_LAYOUTS_REMOTE_SETTINGS_COLLECTION
        );
        this._rsClient.on("sync", this._onSync);
      }
      await this._fetchLayouts(isStartup);
    }
  }

  uninit() {
    if (this._rsClient) {
      this._rsClient.off("sync", this._onSync);
      this._rsClient = null;
    }
  }

  async _onSync() {
    await this._fetchLayouts(false);
  }

  async _fetchLayouts(isStartup) {
    const records = await this._rsClient.get();
    if (!records?.length) {
      return;
    }

    const configs = {};
    for (const record of records) {
      if (isValidLayout(record)) {
        configs[record.name] = record;
      }
    }

    if (!Object.keys(configs).length) {
      return;
    }

    this.store.dispatch(
      ac.BroadcastToContent({
        type: at.SECTIONS_LAYOUT_UPDATE,
        data: { configs },
        meta: { isStartup },
      })
    );
  }

  async onAction(action) {
    switch (action.type) {
      case at.INIT:
        await this.init(true);
        break;
      case at.UNINIT:
        this.uninit();
        break;
      case at.PREF_CHANGED:
        if (
          action.data.name === PREF_CLIENT_LAYOUT_ENABLED ||
          action.data.name === PREF_TOPSTORIES_ENABLED ||
          (action.data.name === "trainhopConfig" &&
            action.data.value?.clientLayout)
        ) {
          await this.init(false);
        }
        break;
    }
  }
}
