/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  NewTabUtils: "resource://gre/modules/NewTabUtils.sys.mjs",
  PersistentCache: "resource://newtab/lib/PersistentCache.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  Region: "resource://gre/modules/Region.sys.mjs",
  RemoteSettings: "resource://services-settings/remote-settings.sys.mjs",
  Utils: "resource://services-settings/Utils.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "log", () => {
  const { Logger } = ChromeUtils.importESModule(
    "resource://messaging-system/lib/Logger.sys.mjs"
  );
  return new Logger("FrecencyBoostProvider");
});

const CACHE_KEY = "frecency_boost_cache";
const RS_FALLBACK_BASE_URL =
  "https://firefox-settings-attachments.cdn.mozilla.net/";
const SPONSORED_TILE_PARTNER_FREC_BOOST = "frec-boost";
const DEFAULT_SOV_NUM_ITEMS = 200;

export class FrecencyBoostProvider {
  constructor(frecentCache) {
    this.cache = new lazy.PersistentCache(CACHE_KEY, true);
    this.frecentCache = frecentCache;
    this._links = null;
    this._frecencyBoostedSponsors = new Map();
    this._frecencyBoostRS = null;
    this._onSync = this.onSync.bind(this);
  }

  init() {
    if (!this._frecencyBoostRS) {
      this._frecencyBoostRS = lazy.RemoteSettings(
        "newtab-frecency-boosted-sponsors"
      );
      this._frecencyBoostRS.on("sync", this._onSync);
    }
  }

  uninit() {
    if (this._frecencyBoostRS) {
      this._frecencyBoostRS.off("sync", this._onSync);
      this._frecencyBoostRS = null;
    }
  }

  async onSync() {
    this._frecencyBoostedSponsors = new Map();
    await this._importFrecencyBoostedSponsors();
  }

  /**
   * Import all sponsors from Remote Settings and save their favicons.
   * This is called lazily when frecency boosted spocs are first requested.
   * We fetch all favicons regardless of whether the user has visited these sites.
   */
  async _importFrecencyBoostedSponsors() {
    const records = await this._frecencyBoostRS?.get();
    if (!records) {
      return;
    }

    const userRegion = lazy.Region.home || "";
    const regionRecords = records.filter(
      record => record.region === userRegion
    );

    await Promise.all(
      regionRecords.map(record =>
        this._importFrecencyBoostedSponsor(record).catch(error => {
          lazy.log.warn(
            `Failed to import sponsor ${record.title || "unknown"}`,
            error
          );
        })
      )
    );
  }

  /**
   * Import a single sponsor record and fetch its favicon as data URI.
   *
   * @param {object} record - Remote Settings record with title, domain, redirect_url, and attachment
   */
  async _importFrecencyBoostedSponsor(record) {
    const { title, domain, redirect_url, attachment } = record;
    const faviconDataURI = await this._fetchSponsorFaviconAsDataURI(attachment);
    const hostname = lazy.NewTabUtils.shortURL({ url: domain });

    const sponsorData = {
      title,
      domain,
      hostname,
      redirectURL: redirect_url,
      faviconDataURI,
    };

    this._frecencyBoostedSponsors.set(hostname, sponsorData);
  }

  /**
   * Fetch favicon from Remote Settings attachment and return as data URI.
   *
   * @param {object} attachment - Remote Settings attachment object
   * @returns {Promise<string|null>} Favicon data URI, or null on error
   */
  async _fetchSponsorFaviconAsDataURI(attachment) {
    let baseAttachmentURL = RS_FALLBACK_BASE_URL;
    try {
      baseAttachmentURL = await lazy.Utils.baseAttachmentsURL();
    } catch (error) {
      lazy.log.warn(
        `Error fetching remote settings base url from CDN. Falling back to ${RS_FALLBACK_BASE_URL}`,
        error
      );
    }

    const faviconURL = baseAttachmentURL + attachment.location;
    const response = await fetch(faviconURL);

    const blob = await response.blob();
    const dataURI = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", reject);
      reader.readAsDataURL(blob);
    });

    return dataURI;
  }

  /**
   * Build frecency-boosted spocs from a list of sponsor domains by checking Places history.
   * Checks if domains exist in history, and returns all matches sorted by frecency.
   *
   * @param {Integer} numItems - Number of frecency items to check against.
   * @returns {Array} Array of sponsored tile objects sorted by frecency, or empty array
   */
  async buildFrecencyBoostedSpocs(numItems) {
    if (!this._frecencyBoostedSponsors.size) {
      return [];
    }

    // 30 days ago, 5 visits. The threshold avoids one non-typed visit from
    // immediately being included in recent history to mimic the original
    // threshold which aimed to prevent first-run visits from being included in
    // Top Sites.
    const topsiteFrecency = lazy.PlacesUtils.history.pageFrecencyThreshold(
      30,
      5,
      false
    );

    // Get all frecent sites from history.
    const frecent = await this.frecentCache.request({
      numItems,
      topsiteFrecency,
    });

    const candidates = [];
    frecent.forEach(site => {
      const normalizedSiteUrl = lazy.NewTabUtils.shortURL(site);
      const candidate = this._frecencyBoostedSponsors.get(normalizedSiteUrl);

      if (
        candidate &&
        !lazy.NewTabUtils.blockedLinks.isBlocked({ url: candidate.domain })
      ) {
        candidates.push({
          hostname: candidate.hostname,
          url: candidate.redirectURL,
          label: candidate.title,
          partner: SPONSORED_TILE_PARTNER_FREC_BOOST,
          type: "frecency-boost",
          frecency: site.frecency,
          show_sponsored_label: true,
          favicon: candidate.faviconDataURI,
          faviconSize: 96,
        });
      }
    });

    candidates.sort((a, b) => b.frecency - a.frecency);
    return candidates;
  }

  async update(numItems = DEFAULT_SOV_NUM_ITEMS) {
    if (!this._frecencyBoostedSponsors.size) {
      await this._importFrecencyBoostedSponsors();
    }

    // Find all matches from the sponsor domains, sorted by frecency
    this._links = await this.buildFrecencyBoostedSpocs(numItems);
    await this.cache.set("links", this._links);
  }

  async fetch(numItems) {
    if (!this._links) {
      this._links = await this.cache.get("links");

      // If we still have no links we are likely in first startup.
      // In that case, we can fire off a background update.
      if (!this._links) {
        void this.update(numItems);
      }
    }

    const links = this._links || [];

    // Apply blocking at read time so it’s always current.
    return links.filter(
      link => !lazy.NewTabUtils.blockedLinks.isBlocked({ url: link.url })
    );
  }

  async retrieveRandomFrecencyTile() {
    if (!this._frecencyBoostedSponsors.size) {
      await this._importFrecencyBoostedSponsors();
    }

    const storedTile = await this.cache.get("randomFrecencyTile");
    if (storedTile) {
      const tile = JSON.parse(storedTile);
      if (
        this._frecencyBoostedSponsors.has(tile.hostname) &&
        !lazy.NewTabUtils.blockedLinks.isBlocked({ url: tile.url })
      ) {
        return tile;
      }
      await this.cache.set("randomFrecencyTile", null);
    }

    const candidates = Array.from(
      this._frecencyBoostedSponsors.values()
    ).filter(s => !lazy.NewTabUtils.blockedLinks.isBlocked({ url: s.domain }));

    if (!candidates.length) {
      return null;
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    const tile = {
      hostname: selected.hostname,
      url: selected.redirectURL,
      label: selected.title,
      partner: SPONSORED_TILE_PARTNER_FREC_BOOST,
      type: "frecency-boost-random",
      show_sponsored_label: true,
      favicon: selected.faviconDataURI,
      faviconSize: 96,
    };
    await this.cache.set("randomFrecencyTile", JSON.stringify(tile));
    return tile;
  }

  async clearRandomFrecencyTile() {
    await this.cache.set("randomFrecencyTile", null);
  }
}
