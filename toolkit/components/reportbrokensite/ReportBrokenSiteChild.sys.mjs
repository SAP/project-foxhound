/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

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
      console.error("GetWebcompatInfo: Error detecting JS frameworks", e);
      return {
        fastclick: false,
        mobify: false,
        marfeel: false,
      };
    }
  },
};

export class ReportBrokenSiteChild extends JSWindowActorChild {
  async #getWebCompatInfo(docShell) {
    const win = docShell.domWindow;

    const frameworks = FrameworkDetector.checkWindow(win);
    const { languages, userAgent } = win.navigator;

    const info = {
      frameworks,
      languages,
      url: win.location.href,
      userAgent,
    };

    try {
      info.consoleLog = await this.#getConsoleLogs(docShell);
    } catch (e) {
      console.error("GetWebcompatInfo: Error getting console log", e);
    }

    return info;
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
      const blockList = tabInfo?.antitracking?.blockList;

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

      if (tabInfo) {
        const { antitracking, frameworks } = tabInfo;
        const { consoleLog, screenshot, url } = webcompatInfo.tabInfo ?? {};

        // If the user enters a URL unrelated to the current tab,
        // don't bother sending a screenshot or logs/etc
        let sendRecordedPageSpecificDetails = false;
        if (url) {
          const givenUri = URL.parse(reportUrl);
          const recordedUri = URL.parse(url.value);
          if (givenUri && recordedUri) {
            sendRecordedPageSpecificDetails =
              givenUri.origin == recordedUri.origin &&
              givenUri.pathname == recordedUri.pathname;
          }
        }

        if (sendRecordedPageSpecificDetails) {
          payload.screenshot = screenshot.value;

          details.consoleLog = consoleLog.value;
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

          for (const [framework, active] of Object.entries(frameworks)) {
            if (!active) {
              continue;
            }
            details[framework] = true;
            extra_labels.push(`type-${framework}`);
          }

          extra_labels.sort();
        }
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
      case "GetWebCompatInfo": {
        return this.#getWebCompatInfo(docShell);
      }
    }
    return null;
  }
}
