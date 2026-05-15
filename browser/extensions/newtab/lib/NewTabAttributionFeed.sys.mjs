/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

import { actionTypes as at } from "resource://newtab/common/Actions.mjs";

ChromeUtils.defineESModuleGetters(lazy, {
  newTabAttributionService:
    "resource://newtab/lib/NewTabAttributionService.sys.mjs",
  NewTabActorRegistry: "resource://newtab/lib/NewTabActorRegistry.sys.mjs",
});

const PREF_SYSTEM_ATTRIBUTION = "discoverystream.attribution.enabled";
const PREF_UNIFIED_ADS_SPOCS_ENABLED = "unifiedAds.spocs.enabled";
const PREF_UNIFIED_ADS_TILES_ENABLED = "unifiedAds.tiles.enabled";
// topsites
const PREF_FEED_TOPSITES = "feeds.topsites";
const PREF_SYSTEM_TOPSITES = "feeds.system.topsites";
const PREF_SHOW_SPONSORED_TOPSITES = "showSponsoredTopSites";
// spocs
const PREF_FEED_SECTION_TOPSTORIES = "feeds.section.topstories";
const PREF_SYSTEM_TOPSTORIES = "feeds.system.topstories";
const PREF_SHOW_SPONSORED = "showSponsored";
const PREF_SYSTEM_SHOW_SPONSORED = "system.showSponsored";

/**
 * - Writes clicks and impressions to NewTabAttributionService.
 * - Cleared when user history is cleared.
 */
export class NewTabAttributionFeed {
  constructor() {
    this.loaded = false;
  }

  isEnabled() {
    const { values } = this.store.getState().Prefs;
    const systemPref = values[PREF_SYSTEM_ATTRIBUTION];
    const experimentVariable = values.trainhopConfig?.attribution?.enabled;

    // Check all shortcuts prefs
    const tilesEnabled =
      values[PREF_FEED_TOPSITES] && values[PREF_SYSTEM_TOPSITES];

    // Check all sponsored shortcuts prefs
    const sponsoredTilesEnabled =
      values[PREF_SHOW_SPONSORED_TOPSITES] &&
      values[PREF_UNIFIED_ADS_TILES_ENABLED];

    // Check all stories prefs
    const storiesEnabled =
      values[PREF_FEED_SECTION_TOPSTORIES] && values[PREF_SYSTEM_TOPSTORIES];

    // Check all sponsored stories prefs
    const sponsoredStoriesEnabled =
      values[PREF_UNIFIED_ADS_SPOCS_ENABLED] &&
      values[PREF_SYSTEM_SHOW_SPONSORED] &&
      values[PREF_SHOW_SPONSORED];

    // Confirm at least one ads section (tiles, spocs) are enabled to allow attribution
    return (
      (systemPref || experimentVariable) &&
      ((tilesEnabled && sponsoredTilesEnabled) ||
        (storiesEnabled && sponsoredStoriesEnabled))
    );
  }

  async init() {
    this.loaded = true;
    lazy.NewTabActorRegistry.registerAttributionActor();
  }

  uninit() {
    this.loaded = false;
    lazy.NewTabActorRegistry.unregisterAttributionActor();
  }

  async onPlacesHistoryCleared() {
    await lazy.newTabAttributionService.onAttributionReset();
  }

  async onPrefChangedAction(action) {
    switch (action.data.name) {
      case PREF_SYSTEM_ATTRIBUTION:
      case "trainhopConfig":
      case PREF_UNIFIED_ADS_SPOCS_ENABLED:
      case PREF_UNIFIED_ADS_TILES_ENABLED:
      case PREF_FEED_TOPSITES:
      case PREF_SYSTEM_TOPSITES:
      case PREF_SHOW_SPONSORED_TOPSITES:
      case PREF_FEED_SECTION_TOPSTORIES:
      case PREF_SYSTEM_TOPSTORIES:
      case PREF_SHOW_SPONSORED:
      case PREF_SYSTEM_SHOW_SPONSORED: {
        const enabled = this.isEnabled();

        if (enabled && !this.loaded) {
          await this.init();
        } else if (!enabled && this.loaded) {
          await this.onPlacesHistoryCleared();
          this.uninit();
        }
        break;
      }
    }
  }

  async onAction(action) {
    switch (action.type) {
      case at.INIT:
        if (this.isEnabled() && !this.loaded) {
          await this.init();
        }
        break;
      case at.UNINIT:
        this.uninit();
        break;
      case at.PLACES_HISTORY_CLEARED:
        await this.onPlacesHistoryCleared();
        break;
      case at.TOP_SITES_SPONSORED_IMPRESSION_STATS:
        if (this.loaded && this.isEnabled()) {
          const item = action?.data || {};
          if (item.attribution) {
            if (item.type === "impression") {
              await lazy.newTabAttributionService.onAttributionEvent(
                "view",
                item.attribution
              );
            } else if (item.type === "click") {
              await lazy.newTabAttributionService.onAttributionEvent(
                "click",
                item.attribution
              );
            }
          }
        }
        break;
      case at.DISCOVERY_STREAM_IMPRESSION_STATS:
        if (this.loaded && this.isEnabled()) {
          const item = action?.data?.tiles?.[0] || {};
          if (item.attribution) {
            await lazy.newTabAttributionService.onAttributionEvent(
              "view",
              item.attribution
            );
          }
        }
        break;
      case at.DISCOVERY_STREAM_USER_EVENT:
        if (this.loaded && this.isEnabled()) {
          const item = action?.data?.value || {};
          if (item.attribution) {
            await lazy.newTabAttributionService.onAttributionEvent(
              "click",
              item.attribution
            );
          }
        }
        break;
      case at.PREF_CHANGED:
        await this.onPrefChangedAction(action);
        break;
    }
  }
}
