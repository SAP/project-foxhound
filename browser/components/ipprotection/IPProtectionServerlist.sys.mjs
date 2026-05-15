/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This file contains functions that work on top of the RemoteSettings
 * Bucket for the IP Protection server list.
 */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPPStartupCache:
    "moz-src:///browser/components/ipprotection/IPPStartupCache.sys.mjs",
  IPProtectionService:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
  IPProtectionStates:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
  RemoteSettings: "resource://services-settings/remote-settings.sys.mjs",
});

/**
 *
 */
export class IProtocol {
  name = "";
  static construct(data) {
    switch (data.name) {
      case "masque":
        return new MasqueProtocol(data);
      case "connect":
        return new ConnectProtocol(data);
      default:
        throw new Error("Unknown protocol: " + data.name);
    }
  }
}

/**
 *
 */
export class MasqueProtocol extends IProtocol {
  name = "masque";
  host = "";
  port = 0;
  templateString = "";
  constructor(data) {
    super();
    this.host = data.host || "";
    this.port = data.port || 0;
    this.templateString = data.templateString || "";
  }
}

/**
 *
 */
export class ConnectProtocol extends IProtocol {
  name = "connect";
  host = "";
  port = 0;
  scheme = "https";
  constructor(data) {
    super();
    this.host = data.host || "";
    this.port = data.port || 0;
    this.scheme = data.scheme || "https";
  }
}

/**
 * Class representing a server.
 */
export class Server {
  /**
   * Port of the server
   *
   * @type {number}
   */
  port = 443;
  /**
   * Hostname of the server
   *
   * @type {string}
   */
  hostname = "";
  /**
   * If true the server is quarantined
   * and should not be used
   *
   * @type {boolean}
   */
  quarantined = false;

  /**
   * List of supported protocols
   *
   * @type {Array<MasqueProtocol|ConnectProtocol>}
   */
  protocols = [];

  constructor(data) {
    this.port = data.port || 443;
    this.hostname = data.hostname || "";
    this.quarantined = !!data.quarantined;
    this.protocols = (data.protocols || []).map(p => IProtocol.construct(p));

    // Default to connect if no protocols are specified
    if (this.protocols.length === 0) {
      this.protocols = [
        new ConnectProtocol({
          name: "connect",
          host: this.hostname,
          port: this.port,
        }),
      ];
    }
  }
}

/**
 * Class representing a city.
 */
class City {
  /**
   * Fallback name for the city if not available
   *
   * @type {string}
   */
  name = "";
  /**
   * A stable identifier for the city
   * (Usually a Wikidata ID)
   *
   * @type {string}
   */
  code = "";
  /**
   * List of servers in this city
   *
   * @type {Server[]}
   */
  servers = [];

  constructor(data) {
    this.name = data.name || "";
    this.code = data.code || "";
    this.servers = (data.servers || []).map(s => new Server(s));
  }
}

/**
 * Class representing a country.
 */
class Country {
  /**
   * Fallback name for the country if not available
   *
   * @type {string}
   */
  name;
  /**
   * A stable identifier for the country
   * Usually a ISO 3166-1 alpha-2 code
   *
   * @type {string}
   */
  code;

  /**
   * List of cities in this country
   *
   * @type {City[]}
   */
  cities;

  constructor(data) {
    this.name = data.name || "";
    this.code = data.code || "";
    this.cities = (data.cities || []).map(c => new City(c));
  }
}

/**
 * Base Class for the Serverlist
 */
export class IPProtectionServerlistBase {
  __list = null;

  init() {}

  async initOnStartupCompleted() {}

  uninit() {}

  /**
   * Tries to refresh the list from the underlining source.
   *
   * @param {*} _forceUpdate - if true, forces a refresh even if the list is already populated.
   */
  maybeFetchList(_forceUpdate = false) {
    throw new Error("Not implemented");
  }

  /**
   * Selects a default location - for alpha this is only the US.
   *
   * @returns {{Country, City}} - The best country/city to use.
   */
  getDefaultLocation() {
    /** @type {Country} */
    const usa = this.__list.find(country => country.code === "US");
    if (!usa) {
      return null;
    }

    const city = usa.cities.find(c => c.servers.length);
    if (!city) {
      return null;
    }
    return {
      city,
      country: usa,
    };
  }

  /**
   * Given a city, it selects an available server.
   *
   * @param {City?} city
   * @returns {Server|null}
   */
  selectServer(city) {
    if (!city) {
      return null;
    }

    const servers = city.servers.filter(server => !server.quarantined);
    if (servers.length === 1) {
      return servers[0];
    }

    if (servers.length > 1) {
      return servers[Math.floor(Math.random() * servers.length)];
    }

    return null;
  }

  get hasList() {
    return this.__list.length !== 0;
  }

  static dataToList(list) {
    if (!Array.isArray(list)) {
      return [];
    }
    return list.map(c => new Country(c));
  }
}

/**
 * Class representing the IP Protection Serverlist
 * fetched from Remote Settings.
 */
export class RemoteSettingsServerlist extends IPProtectionServerlistBase {
  #bucket = null;
  #runningPromise = null;

  constructor() {
    super();
    this.handleEvent = this.#handleEvent.bind(this);
    this.__list = IPProtectionServerlistBase.dataToList(
      lazy.IPPStartupCache.locationList
    );
  }
  init() {
    lazy.IPProtectionService.addEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );
  }

  async initOnStartupCompleted() {
    this.bucket.on("sync", async () => {
      await this.maybeFetchList(true);
    });
  }

  uninit() {
    lazy.IPProtectionService.removeEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );
  }

  #handleEvent(_event) {
    if (lazy.IPProtectionService.state === lazy.IPProtectionStates.READY) {
      this.maybeFetchList();
    }
  }

  maybeFetchList(forceUpdate = false) {
    if (this.__list.length !== 0 && !forceUpdate) {
      return Promise.resolve();
    }

    if (this.#runningPromise) {
      return this.#runningPromise;
    }

    const fetchList = async () => {
      this.__list = IPProtectionServerlistBase.dataToList(
        await this.bucket.get()
      );

      lazy.IPPStartupCache.storeLocationList(this.__list);
    };

    this.#runningPromise = fetchList().finally(
      () => (this.#runningPromise = null)
    );

    return this.#runningPromise;
  }

  get bucket() {
    if (!this.#bucket) {
      this.#bucket = lazy.RemoteSettings("vpn-serverlist");
    }
    return this.#bucket;
  }
}
/**
 * Class representing the IP Protection Serverlist
 * from about:config preferences.
 */
export class PrefServerList extends IPProtectionServerlistBase {
  #observer = null;

  constructor() {
    super();
    this.#observer = this.onPrefChange.bind(this);
    this.maybeFetchList();
  }

  onPrefChange() {
    this.maybeFetchList();
  }

  async initOnStartupCompleted() {
    Services.prefs.addObserver(
      IPProtectionServerlist.PREF_NAME,
      this.#observer
    );
  }

  uninit() {
    Services.prefs.removeObserver(
      IPProtectionServerlist.PREF_NAME,
      this.#observer
    );
  }
  maybeFetchList(_forceUpdate = false) {
    this.__list = IPProtectionServerlistBase.dataToList(
      PrefServerList.prefValue
    );
    return Promise.resolve();
  }

  static get PREF_NAME() {
    return "browser.ipProtection.override.serverlist";
  }
  /**
   * Returns true if the preference has a valid value.
   */
  static get hasPrefValue() {
    return (
      Services.prefs.getPrefType(this.PREF_NAME) ===
        Services.prefs.PREF_STRING &&
      !!Services.prefs.getStringPref(this.PREF_NAME).length
    );
  }
  static get prefValue() {
    try {
      const value = Services.prefs.getStringPref(this.PREF_NAME);
      return JSON.parse(value);
    } catch (e) {
      console.error(`IPProtection: Error parsing serverlist pref value: ${e}`);
      return null;
    }
  }
}
/**
 *
 * @returns {IPProtectionServerlistBase} - The appropriate serverlist implementation.
 */
export function IPProtectionServerlistFactory() {
  return PrefServerList.hasPrefValue
    ? new PrefServerList()
    : new RemoteSettingsServerlist();
}

// Only check once which implementation to use.
const IPProtectionServerlist = IPProtectionServerlistFactory();

export { IPProtectionServerlist };
