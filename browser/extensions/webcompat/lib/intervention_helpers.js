/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* globals browser, debugLog, UAHelpers */

const GOOGLE_TLDS = [
  "com",
  "ac",
  "ad",
  "ae",
  "com.af",
  "com.ag",
  "com.ai",
  "al",
  "am",
  "co.ao",
  "com.ar",
  "as",
  "at",
  "com.au",
  "az",
  "ba",
  "com.bd",
  "be",
  "bf",
  "bg",
  "com.bh",
  "bi",
  "bj",
  "com.bn",
  "com.bo",
  "com.br",
  "bs",
  "bt",
  "co.bw",
  "by",
  "com.bz",
  "ca",
  "com.kh",
  "cc",
  "cd",
  "cf",
  "cat",
  "cg",
  "ch",
  "ci",
  "co.ck",
  "cl",
  "cm",
  "cn",
  "com.co",
  "co.cr",
  "com.cu",
  "cv",
  "com.cy",
  "cz",
  "de",
  "dj",
  "dk",
  "dm",
  "com.do",
  "dz",
  "com.ec",
  "ee",
  "com.eg",
  "es",
  "com.et",
  "fi",
  "com.fj",
  "fm",
  "fr",
  "ga",
  "ge",
  "gf",
  "gg",
  "com.gh",
  "com.gi",
  "gl",
  "gm",
  "gp",
  "gr",
  "com.gt",
  "gy",
  "com.hk",
  "hn",
  "hr",
  "ht",
  "hu",
  "co.id",
  "iq",
  "ie",
  "co.il",
  "im",
  "co.in",
  "io",
  "is",
  "it",
  "je",
  "com.jm",
  "jo",
  "co.jp",
  "co.ke",
  "ki",
  "kg",
  "co.kr",
  "com.kw",
  "kz",
  "la",
  "com.lb",
  "com.lc",
  "li",
  "lk",
  "co.ls",
  "lt",
  "lu",
  "lv",
  "com.ly",
  "co.ma",
  "md",
  "me",
  "mg",
  "mk",
  "ml",
  "com.mm",
  "mn",
  "ms",
  "com.mt",
  "mu",
  "mv",
  "mw",
  "com.mx",
  "com.my",
  "co.mz",
  "com.na",
  "ne",
  "com.nf",
  "com.ng",
  "com.ni",
  "nl",
  "no",
  "com.np",
  "nr",
  "nu",
  "co.nz",
  "com.om",
  "com.pk",
  "com.pa",
  "com.pe",
  "com.ph",
  "pl",
  "com.pg",
  "pn",
  "com.pr",
  "ps",
  "pt",
  "com.py",
  "com.qa",
  "ro",
  "rs",
  "ru",
  "rw",
  "com.sa",
  "com.sb",
  "sc",
  "se",
  "com.sg",
  "sh",
  "si",
  "sk",
  "com.sl",
  "sn",
  "sm",
  "so",
  "st",
  "sr",
  "com.sv",
  "td",
  "tg",
  "co.th",
  "com.tj",
  "tk",
  "tl",
  "tm",
  "to",
  "tn",
  "com.tr",
  "tt",
  "com.tw",
  "co.tz",
  "com.ua",
  "co.ug",
  "co.uk",
  "com",
  "com.uy",
  "co.uz",
  "com.vc",
  "co.ve",
  "vg",
  "co.vi",
  "com.vn",
  "vu",
  "ws",
  "co.za",
  "co.zm",
  "co.zw",
];

var InterventionHelpers = {
  skip_if_functions: {
    getWeekInfo_defined: () => {
      return !!Intl?.Locale?.prototype?.getWeekInfo;
    },
    InstallTrigger_defined: () => {
      return "InstallTrigger" in window;
    },
    InstallTrigger_undefined: () => {
      return !("InstallTrigger" in window);
    },
    text_event_supported: () => {
      return !!window.TextEvent;
    },
  },

  ua_change_functions: {
    add_Chrome: (ua, config) => {
      return UAHelpers.addChrome(ua, config.version);
    },
    add_Firefox_as_Gecko: (ua, config) => {
      return UAHelpers.addGecko(ua, config.version);
    },
    add_Samsung_for_Samsung_devices: ua => {
      return UAHelpers.addSamsungForSamsungDevices(ua);
    },
    add_Version_segment: ua => {
      return `${ua} Version/0`;
    },
    cap_Version_to_99: ua => {
      return UAHelpers.capVersionTo99(ua);
    },
    change_Firefox_to_FireFox: ua => {
      return UAHelpers.changeFirefoxToFireFox(ua);
    },
    change_Gecko_to_like_Gecko: ua => {
      return ua.replace("Gecko", "like Gecko");
    },
    change_OS_to_MacOSX: (ua, config) => {
      return UAHelpers.getMacOSXUA(ua, config.arch, config.version);
    },
    change_OS_to_Windows: ua => {
      return UAHelpers.windows(ua);
    },
    Chrome: (ua, config) => {
      config.ua = ua;
      config.noFxQuantum = true;
      return UAHelpers.getDeviceAppropriateChromeUA(config);
    },
    Chrome_with_FxQuantum: (ua, config) => {
      config.ua = ua;
      return UAHelpers.getDeviceAppropriateChromeUA(config);
    },
    desktop_not_mobile: () => {
      return UAHelpers.desktopUA();
    },
    mimic_Android_Hotspot2_device: ua => {
      return UAHelpers.androidHotspot2Device(ua);
    },
    replace_colon_in_rv_with_space: ua => {
      return ua.replace("rv:", "rv ");
    },
    reduce_firefox_version_by_one: ua => {
      const [head, fx, tail] = ua.split(/(firefox\/)/i);
      if (!fx || !tail) {
        return ua;
      }
      const major = parseInt(tail);
      if (!major) {
        return ua;
      }
      return `${head}${fx}${major - 1}${tail.slice(major.toString().length)}`;
    },
    add_Safari: (ua, config) => {
      config.withFirefox = true;
      return UAHelpers.safari(config);
    },
    Safari: (ua, config) => {
      return UAHelpers.safari(config);
    },
    Safari_with_FxQuantum: (ua, config) => {
      config.withFxQuantum = true;
      return UAHelpers.safari(config);
    },
  },

  valid_platforms: [
    "all",
    "android",
    "desktop",
    "fenix",
    "linux",
    "mac",
    "windows",
  ],
  valid_channels: ["beta", "esr", "nightly", "stable"],

  shouldSkip(
    intervention,
    firefoxVersion,
    firefoxChannel,
    customFunctionNames
  ) {
    const {
      bug,
      max_version,
      min_version,
      not_channels,
      only_channels,
      skip_if,
      ua_string,
    } = intervention;
    if (firefoxChannel) {
      if (only_channels && !only_channels.includes(firefoxChannel)) {
        return `not for Firefox ${firefoxChannel}`;
      }
      if (not_channels?.includes(firefoxChannel)) {
        return `not for Firefox ${firefoxChannel}`;
      }
    }
    if (min_version && firefoxVersion < min_version) {
      return `only for Firefox ${min_version} or newer`;
    }
    if (max_version) {
      // Make sure to handle the case where only the major version matters,
      // for instance if we want 138 and the version number is 138.1.
      if (String(max_version).includes(".")) {
        if (firefoxVersion > max_version) {
          return `only for Firefox ${max_version} or older`;
        }
      } else if (Math.floor(firefoxVersion) > max_version) {
        return `only for Firefox ${max_version} or older`;
      }
    }
    if (ua_string) {
      for (let ua of Array.isArray(ua_string) ? ua_string : [ua_string]) {
        if (!InterventionHelpers.ua_change_functions[ua.change ?? ua]) {
          return `unknown UA string helper ${ua.change ?? ua} (webcompat addon may be too old)`;
        }
      }
    }
    if (skip_if) {
      try {
        if (
          !this.skip_if_functions[skip_if] ||
          this.skip_if_functions[skip_if]?.()
        ) {
          return `skipped because ${skip_if}`;
        }
      } catch (e) {
        console.trace(
          `Error while checking skip-if condition ${skip_if} for bug ${bug}:`,
          e
        );
        return `error while checking if ${skip_if}`;
      }
    }

    // special case: allow platforms=[] to indicate "disabled by default",
    // meaning we intend for it to be available on every platform.
    if (
      !InterventionHelpers.isDisabledByDefault(intervention) &&
      !InterventionHelpers.checkPlatformMatches(intervention)
    ) {
      return "unneeded on this platform";
    }

    const missingFn = InterventionHelpers.isMissingCustomFunctions(
      intervention,
      customFunctionNames
    );
    if (missingFn) {
      return `needed function ${missingFn} unavailable (webcompat addon may be too old)`;
    }

    return undefined;
  },

  nonCustomInterventionKeys: Object.freeze(
    new Set([
      "content_scripts",
      "enabled",
      "max_version",
      "min_version",
      "not_platforms",
      "platforms",
      "not_channels",
      "only_channels",
      "pref_check",
      "skip_if",
      "ua_string",
    ])
  ),

  isMissingCustomFunctions(intervention, customFunctionNames) {
    for (let key of Object.keys(intervention)) {
      if (
        !InterventionHelpers.nonCustomInterventionKeys.has(key) &&
        !customFunctionNames.has(key)
      ) {
        return key;
      }
    }
    return undefined;
  },

  getOS() {
    return (
      browser.aboutConfigPrefs.getPref("platform_override") ??
      browser.appConstants.getPlatform()
    );
  },

  getPlatformMatches() {
    if (!InterventionHelpers._platformMatches) {
      const os = this.getOS();
      InterventionHelpers._platformMatches = [
        "all",
        os,
        os == "android" ? "android" : "desktop",
      ];
      if (os == "android") {
        const packageName = browser.appConstants.getAndroidPackageName();
        if (packageName.includes("fenix") || packageName.includes("firefox")) {
          InterventionHelpers._platformMatches.push("fenix");
        }
      }
    }
    return InterventionHelpers._platformMatches;
  },

  checkPlatformMatches(intervention) {
    let desired = intervention.platforms;
    let undesired = intervention.not_platforms;
    if (!desired && !undesired) {
      return true;
    }

    const actual = InterventionHelpers.getPlatformMatches();
    if (undesired) {
      if (!Array.isArray(undesired)) {
        undesired = [undesired];
      }
      if (
        undesired.includes("all") ||
        actual.filter(x => undesired.includes(x)).length
      ) {
        return false;
      }
    }

    if (!desired) {
      return true;
    }
    if (!Array.isArray(desired)) {
      desired = [desired];
    }
    return (
      desired.includes("all") ||
      !!actual.filter(x => desired.includes(x)).length
    );
  },

  isDisabledByDefault(intervention) {
    return (
      intervention.platforms &&
      !intervention.platforms.length &&
      !intervention.not_platforms
    );
  },

  applyUAChanges(ua, changes) {
    if (!Array.isArray(changes)) {
      changes = [changes];
    }
    for (let config of changes) {
      if (typeof config === "string") {
        config = { change: config };
      }
      let finalChanges = config.change;
      if (!Array.isArray(finalChanges)) {
        finalChanges = [finalChanges];
      }
      for (const change of finalChanges) {
        try {
          ua = InterventionHelpers.ua_change_functions[change](ua, config);
        } catch (e) {
          console.trace(
            `Error while calling UA change function ${change} for bug ${config.bug}:`,
            e
          );
          return ua;
        }
      }
    }
    return ua;
  },

  /**
   * Useful helper to generate a list of domains with a fixed base domain and
   * multiple country-TLDs or other cases with various TLDs.
   *
   * Example:
   *   matchPatternsForTLDs("*://mozilla.", "/*", ["com", "org"])
   *     => ["*://mozilla.com/*", "*://mozilla.org/*"]
   */
  matchPatternsForTLDs(base, suffix, tlds) {
    return tlds.map(tld => base + tld + suffix);
  },

  /**
   * A modified version of matchPatternsForTLDs that always returns the match
   * list for all known Google country TLDs.
   */
  matchPatternsForGoogle(base, suffix = "/*") {
    return InterventionHelpers.matchPatternsForTLDs(base, suffix, GOOGLE_TLDS);
  },

  async registerContentScripts(scriptsToReg, typeStr) {
    // Try to avoid re-registering scripts already registered
    // (e.g. if the webcompat background page is restarted
    // after an extension process crash, after having registered
    // the content scripts already once), but do not prevent
    // to try registering them again if the getRegisteredContentScripts
    // method returns an unexpected rejection.

    const ids = scriptsToReg.map(s => s.id);
    if (!ids.length) {
      return;
    }
    try {
      const alreadyRegged = await browser.scripting.getRegisteredContentScripts(
        { ids }
      );
      const alreadyReggedIds = alreadyRegged.map(script => script.id);
      const stillNeeded = scriptsToReg.filter(
        ({ id }) => !alreadyReggedIds.includes(id)
      );
      await browser.scripting.registerContentScripts(stillNeeded);
      debugLog(
        `Registered still-not-active ${typeStr} content scripts`,
        stillNeeded
      );
    } catch (e) {
      for (const script of scriptsToReg) {
        try {
          await browser.scripting.registerContentScripts(scriptsToReg);
        } catch (e2) {
          console.error(
            `Error while registering ${typeStr} content script`,
            script,
            e2
          );
        }
      }
      debugLog(
        `Registered ${typeStr} content scripts after error registering just non-active ones`,
        scriptsToReg,
        e
      );
    }
  },

  async ensureOnlyTheseContentScripts(contentScriptsToRegister, type) {
    if (type != "webcompat intervention" && type != "SmartBlock shim") {
      throw new Error(
        '`type` must be "webcompat intervention" or "SmartBlock shim"'
      );
    }

    // Check which content scripts are already registered persistently.
    // (we may need to disable ones we no longer need, and also register
    // any new ones which are not persisted yet).
    const desiredContentScriptIds = new Set(
      contentScriptsToRegister.map(s => s.id)
    );
    const activeContentScripts =
      await browser.scripting.getRegisteredContentScripts();

    const interventionContentScripts = activeContentScripts.filter(s =>
      s.id.includes(type)
    );

    const oldContentScriptsToUnregister = interventionContentScripts.filter(
      ({ id }) => !desiredContentScriptIds.has(id)
    );

    if (oldContentScriptsToUnregister.length) {
      debugLog(
        `Unregistering no-longer-needed ${type} content scripts`,
        oldContentScriptsToUnregister
      );
      try {
        await browser.scripting.unregisterContentScripts({
          ids: oldContentScriptsToUnregister.map(s => s.id),
        });
      } catch (_) {
        for (const script of oldContentScriptsToUnregister) {
          try {
            await browser.scripting.unregisterContentScripts({
              ids: [script.id],
            });
          } catch (e) {
            console.error("Error unregistering content script", script, e);
          }
        }
      }
    }

    const interventionContentScriptIds = new Set(
      interventionContentScripts.map(s => s.id)
    );
    const newContentScriptsToRegister = contentScriptsToRegister.filter(
      ({ id }) => !interventionContentScriptIds.has(id)
    );
    if (newContentScriptsToRegister.length) {
      debugLog(
        `Registering new ${type} content scripts`,
        newContentScriptsToRegister
      );
      try {
        await browser.scripting.registerContentScripts(
          newContentScriptsToRegister
        );
      } catch (_) {
        for (const script of newContentScriptsToRegister) {
          try {
            await browser.scripting.registerContentScripts([script]);
          } catch (e) {
            console.error("Error registering content script", script, e);
          }
        }
      }
    }

    const alreadyRegisteredContentScripts = contentScriptsToRegister.filter(
      ({ id }) => interventionContentScriptIds.has(id)
    );
    if (alreadyRegisteredContentScripts.length) {
      debugLog(
        `Already have registered ${type} content scripts`,
        alreadyRegisteredContentScripts
      );
    }

    return {
      alreadyRegisteredContentScripts,
      newContentScriptsToRegister,
      oldContentScriptsToUnregister,
    };
  },
};
