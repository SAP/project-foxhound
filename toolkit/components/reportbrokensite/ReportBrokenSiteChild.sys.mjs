/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const SCREENSHOT_FORMAT = { format: "jpeg", quality: 75 };

function RunScriptInFrame(win, script) {
  const contentPrincipal = win.document.nodePrincipal;
  const sandbox = Cu.Sandbox([contentPrincipal], {
    sandboxName: "Report Broken Site webcompat.com helper",
    sandboxPrototype: win,
    sameZoneAs: win,
    originAttributes: contentPrincipal.originAttributes,
  });
  return Cu.evalInSandbox(script, sandbox, null, "sandbox eval code", 1);
}

class ConsoleLogHelper {
  static PREVIEW_MAX_ITEMS = 10;
  static LOG_LEVELS = ["debug", "info", "warn", "error"];

  #windowId = undefined;

  constructor(windowId) {
    this.#windowId = windowId;
  }

  getLoggedMessages(alsoIncludePrivate = true) {
    return this.getConsoleAPIMessages().concat(
      this.getScriptErrors(alsoIncludePrivate)
    );
  }

  getConsoleAPIMessages() {
    const ConsoleAPIStorage = Cc[
      "@mozilla.org/consoleAPI-storage;1"
    ].getService(Ci.nsIConsoleAPIStorage);
    let messages = ConsoleAPIStorage.getEvents(this.#windowId);
    return messages.map(evt => {
      const { columnNumber, filename, level, lineNumber, timeStamp } = evt;

      const args = [];
      for (const arg of evt.arguments) {
        args.push(this.#getArgs(arg));
      }

      const message = {
        level,
        log: args,
        uri: filename,
        pos: `${lineNumber}:${columnNumber}`,
      };

      return { timeStamp, message };
    });
  }

  getScriptErrors(alsoIncludePrivate) {
    const messages = Services.console.getMessageArray();
    return messages
      .filter(message => {
        if (message instanceof Ci.nsIScriptError) {
          if (!alsoIncludePrivate && message.isFromPrivateWindow) {
            return false;
          }
          if (this.#windowId && this.#windowId !== message.innerWindowID) {
            return false;
          }
          return true;
        }

        // If this is not an nsIScriptError and we need to do window-based
        // filtering we skip this message.
        return false;
      })
      .map(error => {
        const {
          timeStamp,
          errorMessage,
          sourceName,
          lineNumber,
          columnNumber,
          logLevel,
        } = error;
        const message = {
          level: ConsoleLogHelper.LOG_LEVELS[logLevel],
          log: [errorMessage],
          uri: sourceName,
          pos: `${lineNumber}:${columnNumber}`,
        };
        return { timeStamp, message };
      });
  }

  #getPreview(value) {
    switch (typeof value) {
      case "symbol":
        return value.toString();

      case "function":
        return "function ()";

      case "object":
        if (value === null) {
          return null;
        }
        if (Array.isArray(value)) {
          return `(${value.length})[...]`;
        }
        return "{...}";

      case "undefined":
        return "undefined";

      default:
        try {
          structuredClone(value);
        } catch (_) {
          return `${value}` || "?";
        }
        return value;
    }
  }

  #getArrayPreview(arr) {
    const preview = [];
    let count = 0;
    for (const value of arr) {
      if (++count > ConsoleLogHelper.PREVIEW_MAX_ITEMS) {
        break;
      }
      preview.push(this.#getPreview(value));
    }

    return preview;
  }

  #getObjectPreview(obj) {
    const preview = {};
    let count = 0;
    for (const key of Object.keys(obj)) {
      if (++count > ConsoleLogHelper.PREVIEW_MAX_ITEMS) {
        break;
      }
      preview[key] = this.#getPreview(obj[key]);
    }

    return preview;
  }

  #getArgs(value) {
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        return this.#getArrayPreview(value);
      }
      return this.#getObjectPreview(value);
    }

    return this.#getPreview(value);
  }
}

const FrameworkDetector = {
  hasFastClickPageScript(window) {
    if (window.FastClick) {
      return true;
    }

    for (const property in window) {
      try {
        const proto = window[property].prototype;
        if (proto && proto.needsClick) {
          return true;
        }
      } catch (_) {}
    }

    return false;
  },

  hasMobifyPageScript(window) {
    return !!window.Mobify?.Tag;
  },

  hasMarfeelPageScript(window) {
    return !!window.marfeel;
  },

  checkWindow(window) {
    try {
      const script = `
        (function() {
          function ${FrameworkDetector.hasFastClickPageScript};
          function ${FrameworkDetector.hasMobifyPageScript};
          function ${FrameworkDetector.hasMarfeelPageScript};
          const win = window.wrappedJSObject || window;
          return {
            fastclick: hasFastClickPageScript(win),
            mobify: hasMobifyPageScript(win),
            marfeel: hasMarfeelPageScript(win),
          }
        })();
      `;
      return RunScriptInFrame(window, script);
    } catch (e) {
      console.error(
        "GetWebcompatInfoFromParentProcess: Error detecting JS frameworks",
        e
      );
      return {
        fastclick: false,
        mobify: false,
        marfeel: false,
      };
    }
  },
};

export class ReportBrokenSiteChild extends JSWindowActorChild {
  async #getBrokenSiteReport(docShell) {
    let consoleLog = [];
    try {
      consoleLog = await this.#getConsoleLogs(docShell);
    } catch (_) {}

    const { frameworks, languages, userAgent, url } =
      this.#getInfoFromChild(docShell);

    const { antitracking, browser, devicePixelRatio, screenshot } =
      await this.sendQuery(
        "GetWebcompatInfoFromParentProcess",
        SCREENSHOT_FORMAT
      );

    const reportData = {
      tabInfo: {
        consoleLog: {
          value: consoleLog,
          do_not_preview: true,
          // Only sent to webcompat.com with send more info, not with Glean.
        },
        languages: {
          value: languages,
          glean: "tabInfo",
        },
        screenshot: {
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
      antitracking: {
        blockList: {
          value: antitracking.blockList,
          glean: "tabInfo.antitracking",
        },
        blockedOrigins: {
          value: antitracking.blockedOrigins,
          glean: "tabInfo.antitracking",
        },
        isPrivateBrowsing: {
          value: antitracking.isPrivateBrowsing,
          glean: "tabInfo.antitracking",
        },
        hasMixedActiveContentBlocked: {
          value: antitracking.hasMixedActiveContentBlocked,
          glean: "tabInfo.antitracking",
        },
        hasMixedDisplayContentBlocked: {
          value: antitracking.hasMixedDisplayContentBlocked,
          glean: "tabInfo.antitracking",
        },
        hasTrackingContentBlocked: {
          value: antitracking.hasTrackingContentBlocked,
          glean: "tabInfo.antitracking",
        },
        btpHasPurgedSite: {
          value: antitracking.btpHasPurgedSite,
          glean: "tabInfo.antitracking",
        },
        etpCategory: {
          value: antitracking.etpCategory,
          glean: "tabInfo.antitracking",
        },
      },
      frameworks: {
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

  #getInfoFromChild(docShell) {
    const win = docShell.domWindow;

    const frameworks = FrameworkDetector.checkWindow(win);
    const { languages, userAgent } = win.navigator;

    return {
      frameworks,
      languages,
      url: win.location.href,
      userAgent,
    };
  }

  #getWebCompatInfo(docShell) {
    return Promise.all([
      this.#getConsoleLogs(docShell),
      this.sendQuery("GetWebcompatInfoFromParentProcess", SCREENSHOT_FORMAT),
    ])
      .then(([consoleLog, infoFromParent]) => {
        const { frameworks, languages, userAgent, url } =
          this.#getInfoFromChild(docShell);

        const { antitracking, browser, devicePixelRatio, screenshot } =
          infoFromParent;

        return {
          antitracking,
          browser,
          consoleLog,
          devicePixelRatio,
          frameworks,
          languages,
          screenshot,
          url,
          userAgent,
        };
      })
      .catch(err => {
        // Log more output if the actor wasn't just being destroyed.
        if (err.name !== "AbortError") {
          // eslint-disable-next-line no-console
          console.trace("#getWebCompatInfo error", err);
        }
        throw err;
      });
  }

  async #getConsoleLogs() {
    return this.#getLoggedMessages()
      .flat()
      .sort((a, b) => a.timeStamp - b.timeStamp)
      .map(m => m.message);
  }

  #getLoggedMessages(alsoIncludePrivate = false) {
    const windowId = this.contentWindow.windowGlobalChild.innerWindowId;
    const helper = new ConsoleLogHelper(windowId, alsoIncludePrivate);
    return helper.getLoggedMessages();
  }

  #formatReportDataForWebcompatCom({
    reason,
    description,
    reportUrl,
    reporterConfig,
    webcompatInfo,
  }) {
    const extra_labels = reporterConfig?.extra_labels || [];

    const message = Object.assign({}, reporterConfig, {
      url: reportUrl,
      category: reason,
      description,
      details: {},
      extra_labels,
    });

    const payload = {
      message,
    };

    if (webcompatInfo) {
      // Copy the full report data into additionalData, reformatting it nicely.
      const additionalData = {};
      for (const category of Object.values(webcompatInfo)) {
        for (const [name, { do_not_preview, glean, value }] of Object.entries(
          category
        )) {
          if (do_not_preview) {
            continue;
          }
          let target = additionalData;
          for (const step of (glean ?? "browserInfo.app").split(".")) {
            target[step] ??= {};
            target = target[step];
          }
          target[name] = value;
        }
      }

      const { browserInfo, tabInfo } = additionalData;
      const { app, graphics } = browserInfo;
      const { antitracking, frameworks } = tabInfo;
      const { blockList } = antitracking;

      const consoleLog = webcompatInfo.tabInfo.consoleLog.value;
      const screenshot = webcompatInfo.tabInfo.screenshot.value;
      const url = webcompatInfo.tabInfo.url.value;

      message.blockList = blockList;
      const details = Object.assign(message.details, {
        additionalData,
        blockList,
        channel: app.updateChannel,
        defaultUserAgent: app.defaultUseragentString,
        "gfx.webrender.software": webcompatInfo.prefs.softwareWebrender.value,
        hasTouchScreen: graphics.hasTouchScreen,
      });

      // We only care about this pref on Linux right now on webcompat.com.
      if (webcompatInfo.app.platform.value === "linux") {
        details["layers.acceleration.force-enabled"] =
          webcompatInfo.prefs.forcedAcceleratedLayers.value;
      } else {
        delete details.additionalData.browserInfo.prefs.forcedAcceleratedLayers;
      }

      // If the user enters a URL unrelated to the current tab,
      // don't bother sending a screenshot or logs/etc
      let sendRecordedPageSpecificDetails = false;
      const givenUri = URL.parse(reportUrl);
      const recordedUri = URL.parse(url);
      if (givenUri && recordedUri) {
        sendRecordedPageSpecificDetails =
          givenUri.origin == recordedUri.origin &&
          givenUri.pathname == recordedUri.pathname;
      }

      if (sendRecordedPageSpecificDetails) {
        payload.screenshot = screenshot;

        details.consoleLog = consoleLog;
        details.frameworks = frameworks;
        details["mixed active content blocked"] =
          antitracking.hasMixedActiveContentBlocked;
        details["mixed passive content blocked"] =
          antitracking.hasMixedDisplayContentBlocked;
        details["tracking content blocked"] =
          antitracking.hasTrackingContentBlocked
            ? `true (${blockList})`
            : "false";
        details["btp has purged site"] = antitracking.btpHasPurgedSite;

        if (antitracking.hasTrackingContentBlocked) {
          extra_labels.push(`type-tracking-protection-${blockList}`);
        }

        for (const [framework, active] of Object.entries(tabInfo.frameworks)) {
          if (!active) {
            continue;
          }
          details[framework] = true;
          extra_labels.push(`type-${framework}`);
        }

        extra_labels.sort();
      }
    }

    return payload;
  }

  #stripNonASCIIChars(str) {
    // eslint-disable-next-line no-control-regex
    return str.replace(/[^\x00-\x7F]/g, "");
  }

  async receiveMessage(msg) {
    const { docShell } = this;
    switch (msg.name) {
      case "SendDataToWebcompatCom": {
        const win = docShell.domWindow;
        const expectedEndpoint = msg.data.endpointUrl;
        if (win.location.href == expectedEndpoint) {
          // Ensure that the tab has fully loaded and is waiting for messages
          const onLoad = () => {
            const payload = this.#formatReportDataForWebcompatCom(msg.data);
            const json = this.#stripNonASCIIChars(JSON.stringify(payload));
            const expectedOrigin = JSON.stringify(
              new URL(expectedEndpoint).origin
            );
            // webcompat.com checks that the message comes from its own origin
            const script = `
            const wrtReady = window.wrappedJSObject?.wrtReady;
            if (wrtReady) {
              console.info("Report Broken Site is waiting");
            }
            Promise.resolve(wrtReady).then(() => {
              console.debug(${json});
              postMessage(${json}, ${expectedOrigin})
            });`;
            RunScriptInFrame(win, script);
          };
          if (win.document.readyState == "complete") {
            onLoad();
          } else {
            win.addEventListener("load", onLoad, { once: true });
          }
        }
        return null;
      }
      case "GetBrokenSiteReport": {
        return this.#getBrokenSiteReport(docShell);
      }
      case "GetWebCompatInfo": {
        return this.#getWebCompatInfo(docShell);
      }
      case "GetConsoleLog": {
        return this.#getLoggedMessages();
      }
    }
    return null;
  }
}
