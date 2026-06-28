/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Troubleshoot } from "resource://gre/modules/Troubleshoot.sys.mjs";

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

export class ReportBrokenSiteParent extends JSWindowActorParent {
  async getBrokenSiteReport(options = {}) {
    const { antitracking, browser, devicePixelRatio, screenshot, childData } =
      await this.getWebCompatInfo(options);

    let favicon;
    try {
      favicon = this.browsingContext.topFrameElement?.mIconURL;
    } catch (err) {
      console.error("Report Broken Site: failed to get favicon", err);
    }

    const reportData = {
      antitracking: {
        blockList: {
          value: antitracking.blockList,
          glean: "tabInfo.antitracking",
        },
        blockedOrigins: {
          isTabSpecific: true,
          value: antitracking.blockedOrigins,
          glean: "tabInfo.antitracking",
        },
        isPrivateBrowsing: {
          isTabSpecific: true,
          value: antitracking.isPrivateBrowsing,
          glean: "tabInfo.antitracking",
        },
        hasMixedActiveContentBlocked: {
          isTabSpecific: true,
          value: antitracking.hasMixedActiveContentBlocked,
          glean: "tabInfo.antitracking",
        },
        hasMixedDisplayContentBlocked: {
          isTabSpecific: true,
          value: antitracking.hasMixedDisplayContentBlocked,
          glean: "tabInfo.antitracking",
        },
        hasTrackingContentBlocked: {
          isTabSpecific: true,
          value: antitracking.hasTrackingContentBlocked,
          glean: "tabInfo.antitracking",
        },
        btpHasPurgedSite: {
          isTabSpecific: true,
          value: antitracking.btpHasPurgedSite,
          glean: "tabInfo.antitracking",
        },
        etpCategory: {
          value: antitracking.etpCategory,
          glean: "tabInfo.antitracking",
        },
      },
      graphics: {
        devicePixelRatio: {
          value: devicePixelRatio,
          glean: "browserInfo.graphics",
        },
        devices: {
          json: true,
          value: browser.graphics.devices,
          glean: "browserInfo.graphics",
        },
        drivers: {
          json: true,
          value: browser.graphics.drivers,
          glean: "browserInfo.graphics",
        },
        features: {
          json: true,
          value: browser.graphics.features,
          glean: "browserInfo.graphics",
        },
        hasTouchScreen: {
          value: browser.graphics.hasTouchScreen,
          glean: "browserInfo.graphics",
        },
        monitors: {
          json: true,
          value: browser.graphics.monitors,
          glean: "browserInfo.graphics",
        },
      },
      browserInfo: {
        addons: {
          value: browser.addons,
          glean: "browserInfo",
        },
        experiments: {
          value: browser.experiments,
          glean: "browserInfo",
        },
      },
      app: {
        applicationName: {
          value: browser.app.applicationName,
          // Gleans sends this for us in the base ping
        },
        buildId: {
          value: browser.app.buildId,
          // Gleans sends this for us in the base ping
        },
        defaultLocales: {
          value: browser.locales,
          glean: "browserInfo.app",
        },
        defaultUseragentString: {
          value: browser.app.defaultUserAgent,
          glean: "browserInfo.app",
        },
        fissionEnabled: {
          value: browser.platform.fissionEnabled,
          glean: "browserInfo.app",
        },
        platform: {
          do_not_preview: true,
          value: browser.platform.name,
          // Gleans sends this for us in the base ping
        },
        updateChannel: {
          value: browser.app.updateChannel,
          // Gleans sends this for us in the base ping
        },
        version: {
          value: browser.app.version,
          // Gleans sends this for us in the base ping
        },
      },
      system: {
        isTablet: {
          value: browser.platform.isTablet ?? false,
          glean: "browserInfo.system",
        },
        memory: {
          value: browser.platform.memoryMB,
          glean: "browserInfo.system",
        },
        osArchitecture: {
          value: browser.platform.osArchitecture,
          // Gleans sends this for us in the base ping
        },
        osName: {
          value: browser.platform.osName,
          // Gleans sends this for us in the base ping
        },
        osVersion: {
          value: browser.platform.osVersion,
          // Gleans sends this for us in the base ping
        },
      },
      prefs: {},
    };

    for (const [label, pref] of Object.entries({
      cookieBehavior: "network.cookie.cookieBehavior",
      forcedAcceleratedLayers: "layers.acceleration.force-enabled",
      globalPrivacyControlEnabled: "privacy.globalprivacycontrol.enabled",
      installtriggerEnabled: "extensions.InstallTrigger.enabled",
      opaqueResponseBlocking: "browser.opaqueResponseBlocking",
      resistFingerprintingEnabled: "privacy.resistFingerprinting",
      softwareWebrender: "gfx.webrender.software",
      thirdPartyCookieBlockingEnabled:
        "network.cookie.cookieBehavior.optInPartitioning",
      thirdPartyCookieBlockingEnabledInPbm:
        "network.cookie.cookieBehavior.optInPartitioning.pbmode",
    })) {
      const value = browser.prefs[pref];
      if (value !== undefined) {
        reportData.prefs[label] = {
          value,
          glean: "browserInfo.prefs",
        };
      }
    }

    if (childData) {
      const { consoleLog, frameworks, languages, userAgent, url } = childData;
      reportData.tabInfo = {
        isTabSpecific: true,
        consoleLog: {
          value: consoleLog,
          do_not_preview: true,
          // Only sent to webcompat.com with send more info, not with Glean.
        },
        favicon: {
          value: favicon,
          do_not_preview: true,
          // Only to be displayed to the user on the UI, not to be sent to Glean.
        },
        languages: {
          value: languages,
          glean: "tabInfo",
        },
        screenshot: {
          isTabSpecific: true,
          value: screenshot,
          do_not_preview: true,
          // Binary data not sent by Glean
        },
        url: {
          value: url,
          do_not_preview: true,
          // Duplicate value used only for sanity-checking.
        },
        useragentString: {
          value: userAgent,
          glean: "tabInfo",
        },
      };

      reportData.frameworks = {
        isTabSpecific: true,
        fastclick: {
          value: frameworks.fastclick,
          glean: "tabInfo.frameworks",
        },
        marfeel: {
          value: frameworks.marfeel,
          glean: "tabInfo.frameworks",
        },
        mobify: {
          value: frameworks.mobify,
          glean: "tabInfo.frameworks",
        },
      };
    }

    if (browser.security) {
      const actuallySet = {};
      for (const name of ["antispyware", "antivirus", "firewall"]) {
        if (browser.security[name]?.length) {
          actuallySet[name] = {
            value: browser.security[name],
            glean: "browserInfo.security",
          };
        }
      }
      if (Object.keys(actuallySet).length) {
        reportData.security = actuallySet;
      }
    }

    return reportData;
  }

  async getWebCompatInfo(options = {}) {
    const { browsingContext } = this;

    const zoom = browsingContext.fullZoom;
    const scale = browsingContext.topChromeWindow?.devicePixelRatio || 1;
    const devicePixelRatio = scale * zoom;

    let childData;
    try {
      childData = await this.sendQuery("GetWebCompatInfo");
    } catch (err) {
      console.error("Report Broken Site: failed to get child data", err);
    }

    const info = {
      antitracking: this.#getAntitrackingInfo(browsingContext),
      browser: await this.#getBrowserInfo(),
      childData,
      devicePixelRatio,
    };

    try {
      info.screenshot = await this.#getScreenshot(
        browsingContext,
        options.screenshotFormat || "jpeg",
        options.screenshotQuality || 75
      );
    } catch (err) {
      console.error("Report Broken Site: failed to get a screenshot", err);
    }

    return info;
  }

  #getAntitrackingBlockList() {
    // If content-track-digest256 is in the tracking table,
    // the user has enabled the strict list.
    const trackingTable = Services.prefs.getCharPref(
      "urlclassifier.trackingTable"
    );
    return trackingTable.includes("content") ? "strict" : "basic";
  }

  #getETPCategory() {
    // Note that the pref will be set to "custom" if the user disables ETP on
    // mobile.
    const etpState = Services.prefs.getStringPref(
      "browser.contentblocking.category",
      "standard"
    );
    return etpState;
  }

  #isBlockingTracker(state) {
    return (
      state & Ci.nsIWebProgressListener.STATE_REPLACED_FINGERPRINTING_CONTENT ||
      state & Ci.nsIWebProgressListener.STATE_REPLACED_TRACKING_CONTENT ||
      state & Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT ||
      state & Ci.nsIWebProgressListener.STATE_BLOCKED_FINGERPRINTING_CONTENT ||
      state & Ci.nsIWebProgressListener.STATE_BLOCKED_CRYPTOMINING_CONTENT ||
      state & Ci.nsIWebProgressListener.STATE_BLOCKED_SOCIALTRACKING_CONTENT ||
      state & Ci.nsIWebProgressListener.STATE_BLOCKED_EMAILTRACKING_CONTENT
    );
  }

  #getBlockedOrigins(currentWindowGlobal) {
    const blockedOrigins = [];
    const log = JSON.parse(currentWindowGlobal.contentBlockingLog);
    for (let [origin, actions] of Object.entries(log)) {
      if (actions.some(([state]) => this.#isBlockingTracker(state))) {
        blockedOrigins.push(origin);
      }
    }
    return blockedOrigins;
  }

  #getAntitrackingInfo(browsingContext) {
    // Ask BounceTrackingProtection whether it has recently purged state for the
    // site in the current top level context.
    let btpHasPurgedSite = false;
    let { currentWindowGlobal } = browsingContext;
    if (
      Services.prefs.getIntPref("privacy.bounceTrackingProtection.mode") !=
      Ci.nsIBounceTrackingProtection.MODE_DISABLED
    ) {
      let bounceTrackingProtection = Cc[
        "@mozilla.org/bounce-tracking-protection;1"
      ].getService(Ci.nsIBounceTrackingProtection);

      if (currentWindowGlobal) {
        let { documentPrincipal } = currentWindowGlobal;
        let { baseDomain } = documentPrincipal;
        btpHasPurgedSite =
          bounceTrackingProtection.hasRecentlyPurgedSite(baseDomain);
      }
    }

    const blockList = this.#getAntitrackingBlockList();
    const blockedOrigins = this.#getBlockedOrigins(currentWindowGlobal);
    return {
      blockList,
      blockedOrigins,
      isPrivateBrowsing: browsingContext.usePrivateBrowsing,
      hasTrackingContentBlocked: !!(
        currentWindowGlobal.contentBlockingEvents &
        Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT
      ),
      hasMixedActiveContentBlocked: !!(
        browsingContext.secureBrowserUI.state &
        Ci.nsIWebProgressListener.STATE_BLOCKED_MIXED_ACTIVE_CONTENT
      ),
      hasMixedDisplayContentBlocked: !!(
        browsingContext.secureBrowserUI.state &
        Ci.nsIWebProgressListener.STATE_BLOCKED_MIXED_DISPLAY_CONTENT
      ),
      btpHasPurgedSite,
      etpCategory: this.#getETPCategory(),
    };
  }

  #parseGfxInfo(info) {
    const get = name => {
      try {
        return info[name];
      } catch (e) {}
      return undefined;
    };

    const clean = rawObj => {
      const obj = JSON.parse(JSON.stringify(rawObj));
      if (!Object.keys(obj).length) {
        return undefined;
      }
      return obj;
    };

    const cleanDevice = (vendorID, deviceID, subsysID) => {
      return clean({ vendorID, deviceID, subsysID });
    };

    const d1 = cleanDevice(
      get("adapterVendorID"),
      get("adapterDeviceID"),
      get("adapterSubsysID")
    );
    const d2 = cleanDevice(
      get("adapterVendorID2"),
      get("adapterDeviceID2"),
      get("adapterSubsysID2")
    );
    const devices = (get("isGPU2Active") ? [d2, d1] : [d1, d2]).filter(
      v => v !== undefined
    );

    return clean({
      directWriteEnabled: get("directWriteEnabled"),
      directWriteVersion: get("directWriteVersion"),
      hasTouchScreen: info.ApzTouchInput == 1,
      clearTypeParameters: get("clearTypeParameters"),
      targetFrameRate: get("targetFrameRate"),
      devices,
    });
  }

  #parseCodecSupportInfo(codecSupportInfo) {
    if (!codecSupportInfo) {
      return undefined;
    }

    const codecs = {};
    for (const item of codecSupportInfo.split("\n")) {
      const [codec, ...types] = item.split(" ");
      if (!codecs[codec]) {
        codecs[codec] = {
          hardwareDecode: false,
          softwareDecode: false,
          hardwareEncode: false,
          softwareEncode: false,
        };
      }
      codecs[codec].softwareDecode ||= types.includes("SWDEC");
      codecs[codec].hardwareDecode ||= types.includes("HWDEC");
      codecs[codec].softwareEncode ||= types.includes("SWENC");
      codecs[codec].hardwareEncode ||= types.includes("HWENC");
    }
    return codecs;
  }

  #parseFeatureLog(featureLog = {}) {
    const { features } = featureLog;
    if (!features) {
      return undefined;
    }

    const parsedFeatures = {};
    for (let { name, log, status } of features) {
      for (const item of log.reverse()) {
        if (!item.failureId || item.status != status) {
          continue;
        }
        status = `${status} (${item.message || item.failureId})`;
      }
      parsedFeatures[name] = status;
    }
    return parsedFeatures;
  }

  #getGraphicsInfo(troubleshoot) {
    const { graphics, media } = troubleshoot;
    const { featureLog } = graphics;
    const data = this.#parseGfxInfo(graphics);
    data.drivers = [
      {
        renderer: graphics.webgl1Renderer,
        version: graphics.webgl1Version,
      },
      {
        renderer: graphics.webgl2Renderer,
        version: graphics.webgl2Version,
      },
    ].filter(({ version }) => version && version != "-");

    data.codecSupport = this.#parseCodecSupportInfo(media.codecSupportInfo);
    data.features = this.#parseFeatureLog(featureLog);

    const gfxInfo = Cc["@mozilla.org/gfx/info;1"].getService(Ci.nsIGfxInfo);
    data.monitors = gfxInfo.getMonitors();

    return data;
  }

  #getAppInfo(troubleshootingInfo) {
    const { application } = troubleshootingInfo;
    return {
      applicationName: application.name,
      buildId: application.buildID,
      defaultUserAgent: application.userAgent,
      updateChannel: application.updateChannel,
      version: application.version,
    };
  }

  #getSysinfoProperty(propertyName, defaultValue) {
    try {
      return Services.sysinfo.getProperty(propertyName);
    } catch (e) {}
    return defaultValue;
  }

  #getPrefs() {
    const prefs = {};
    for (const name of [
      "layers.acceleration.force-enabled",
      "gfx.webrender.software",
      "browser.opaqueResponseBlocking",
      "extensions.InstallTrigger.enabled",
      "privacy.resistFingerprinting",
      "privacy.globalprivacycontrol.enabled",
      "network.cookie.cookieBehavior.optInPartitioning",
      "network.cookie.cookieBehavior.optInPartitioning.pbmode",
    ]) {
      prefs[name] = Services.prefs.getBoolPref(name, undefined);
    }
    const cookieBehavior = "network.cookie.cookieBehavior";
    prefs[cookieBehavior] = Services.prefs.getIntPref(cookieBehavior, -1);
    return prefs;
  }

  async #getPlatformInfo(troubleshootingInfo) {
    const { application } = troubleshootingInfo;
    const { memorySizeBytes, fissionAutoStart } = application;

    let memoryMB = memorySizeBytes;
    if (memoryMB) {
      memoryMB = Math.round(memoryMB / 1024 / 1024);
    }

    const info = {
      fissionEnabled: fissionAutoStart,
      memoryMB,
      osArchitecture: this.#getSysinfoProperty("arch", null),
      osName: this.#getSysinfoProperty("name", null),
      osVersion: this.#getSysinfoProperty("version", null),
      name: AppConstants.platform,
    };
    if (info.os === "android") {
      info.device = this.#getSysinfoProperty("device", null);
      info.isTablet = this.#getSysinfoProperty("tablet", false);
    }
    if (
      info.osName == "Windows_NT" &&
      (await Services.sysinfo.processInfo).isWindowsSMode
    ) {
      info.osVersion += " S";
    }
    return info;
  }

  #getSecurityInfo(troubleshootingInfo) {
    const result = {};
    for (const [k, v] of Object.entries(troubleshootingInfo.securitySoftware)) {
      result[k.replace("registered", "").toLowerCase()] = v
        ? v.split(";")
        : null;
    }

    // Right now, security data is only available for Windows builds, and
    // we might as well not return anything at all if no data is available.
    if (!Object.values(result).filter(e => e).length) {
      return undefined;
    }

    return result;
  }

  static AUTOMATION_ADDON_IDS = [
    "mochikit@mozilla.org",
    "special-powers@mozilla.org",
  ];

  static WANTED_ADDON_LOCATIONS = ["app-profile", "app-temporary"];

  #getActiveAddons(troubleshootingInfo) {
    const { addons } = troubleshootingInfo;
    if (!addons) {
      return [];
    }
    // We only care about enabled addons (not themes) the user
    // installed, not ones bundled with Firefox.
    const toReport = addons.filter(
      ({ id, isActive, type, locationName }) =>
        (!Cu.isInAutomation ||
          !ReportBrokenSiteParent.AUTOMATION_ADDON_IDS.includes(id)) &&
        isActive &&
        type === "extension" &&
        ReportBrokenSiteParent.WANTED_ADDON_LOCATIONS.includes(locationName)
    );
    return toReport.map(({ id, name, version, locationName }) => {
      return {
        id,
        name,
        temporary: locationName === "app-temporary",
        version,
      };
    });
  }

  #getActiveExperiments(troubleshootingInfo) {
    if (!troubleshootingInfo?.normandy) {
      return [];
    }
    const {
      normandy: { nimbusExperiments, nimbusRollouts },
    } = troubleshootingInfo;
    return [
      nimbusExperiments.map(({ slug, branch }) => {
        return { slug, branch: branch.slug, kind: "nimbusExperiment" };
      }),
      nimbusRollouts.map(({ slug, branch }) => {
        return { slug, branch: branch.slug, kind: "nimbusRollout" };
      }),
    ]
      .flat()
      .sort((a, b) => a.slug.localeCompare(b.slug));
  }

  async #getBrowserInfo() {
    const troubleshootingInfo = await Troubleshoot.snapshot();
    return {
      addons: this.#getActiveAddons(troubleshootingInfo),
      app: this.#getAppInfo(troubleshootingInfo),
      experiments: this.#getActiveExperiments(troubleshootingInfo),
      graphics: this.#getGraphicsInfo(troubleshootingInfo),
      locales: troubleshootingInfo.intl.localeService.available,
      prefs: this.#getPrefs(),
      platform: await this.#getPlatformInfo(troubleshootingInfo),
      security: this.#getSecurityInfo(troubleshootingInfo),
    };
  }

  async #getScreenshot(browsingContext, format, quality) {
    const zoom = browsingContext.fullZoom;
    const scale = browsingContext.topChromeWindow?.devicePixelRatio || 1;
    const wgp = browsingContext.currentWindowGlobal;

    const image = await wgp.drawSnapshot(
      undefined, // rect
      scale * zoom,
      "white",
      undefined // resetScrollPosition
    );

    const canvas = new OffscreenCanvas(image.width, image.height);

    const ctx = canvas.getContext("bitmaprenderer", { alpha: false });
    ctx.transferFromImageBitmap(image);

    const blob = await canvas.convertToBlob({
      type: `image/${format}`,
      quality: quality / 100,
    });

    const dataURL = await new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    return dataURL;
  }
}
