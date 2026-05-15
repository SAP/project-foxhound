/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global ExtensionAPI, ExtensionCommon, Cr */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  ExtensionParent: "resource://gre/modules/ExtensionParent.sys.mjs",
  IPPExceptionsManager:
    "moz-src:///browser/components/ipprotection/IPPExceptionsManager.sys.mjs",
  IPPProxyManager:
    "moz-src:///browser/components/ipprotection/IPPProxyManager.sys.mjs",
  IPPProxyStates:
    "moz-src:///browser/components/ipprotection/IPPProxyManager.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "tabTracker", () => {
  return lazy.ExtensionParent.apiManager.global.tabTracker;
});

const PREF_DYNAMIC_TAB_BREAKAGES =
  "extensions.ippactivator.dynamicTabBreakages";
const PREF_DYNAMIC_WEBREQUEST_BREAKAGES =
  "extensions.ippactivator.dynamicWebRequestBreakages";
const PREF_NOTIFIED_DOMAINS = "extensions.ippactivator.notifiedDomains";

this.ippActivator = class extends ExtensionAPI {
  onStartup() {}

  onShutdown(_isAppShutdown) {}

  getAPI(context) {
    return {
      ippActivator: {
        onIPPActivated: new ExtensionCommon.EventManager({
          context,
          name: "ippActivator.onIPPActivated",
          register: fire => {
            const topics = ["IPPProxyManager:StateChanged"];
            const observer = _event => {
              fire.async();
            };

            topics.forEach(topic =>
              lazy.IPPProxyManager.addEventListener(topic, observer)
            );

            return () => {
              topics.forEach(topic =>
                lazy.IPPProxyManager.removeEventListener(topic, observer)
              );
            };
          },
        }).api(),
        isTesting() {
          return Services.prefs.getBoolPref(
            "extensions.ippactivator.testMode",
            false
          );
        },
        hideMessage(tabId) {
          try {
            const tab = tabId
              ? lazy.tabTracker.getTab(tabId)
              : lazy.tabTracker.activeTab;
            const browser = tab?.linkedBrowser;
            const win = browser?.ownerGlobal;
            if (!browser || !win || !win.gBrowser) {
              return;
            }

            const nbox = win.gBrowser.getNotificationBox(browser);
            const id = "ipp-activator-notification";
            const existing = nbox.getNotificationWithValue?.(id);
            if (existing) {
              nbox.removeNotification(existing);
            }
          } catch (e) {
            console.warn("Unable to hide the message", e);
          }
        },
        isIPPActive() {
          return lazy.IPPProxyManager.state === lazy.IPPProxyStates.ACTIVE;
        },
        getDynamicTabBreakages() {
          try {
            const json = Services.prefs.getStringPref(
              PREF_DYNAMIC_TAB_BREAKAGES,
              "[]"
            );
            const arr = JSON.parse(json);
            return Array.isArray(arr) ? arr : [];
          } catch (_) {
            return [];
          }
        },
        getDynamicWebRequestBreakages() {
          try {
            const json = Services.prefs.getStringPref(
              PREF_DYNAMIC_WEBREQUEST_BREAKAGES,
              "[]"
            );
            const arr = JSON.parse(json);
            return Array.isArray(arr) ? arr : [];
          } catch (_) {
            return [];
          }
        },
        getNotifiedDomains() {
          try {
            const json = Services.prefs.getStringPref(
              PREF_NOTIFIED_DOMAINS,
              "[]"
            );
            const arr = JSON.parse(json);
            return Array.isArray(arr) ? arr : [];
          } catch (_) {
            return [];
          }
        },
        addNotifiedDomain(domain) {
          const d = String(domain || "");
          if (!d) {
            return;
          }
          let arr = [];
          try {
            const json = Services.prefs.getStringPref(
              PREF_NOTIFIED_DOMAINS,
              "[]"
            );
            arr = JSON.parse(json);
            if (!Array.isArray(arr)) {
              arr = [];
            }
          } catch (_) {
            arr = [];
          }
          if (!arr.includes(d)) {
            arr.push(d);
            Services.prefs.setStringPref(
              PREF_NOTIFIED_DOMAINS,
              JSON.stringify(arr)
            );
          }
        },
        getBaseDomainFromURL(url) {
          try {
            const host = Services.io.newURI(url).host;
            if (!host) {
              return { baseDomain: "", host: "" };
            }
            let baseDomain = "";
            try {
              baseDomain = Services.eTLD.getBaseDomainFromHost(host);
            } catch (e) {
              if (e.result === Cr.NS_ERROR_INSUFFICIENT_DOMAIN_LEVELS) {
                baseDomain = host;
              } else {
                baseDomain = "";
              }
            }
            return { baseDomain, host };
          } catch (_) {
            return { baseDomain: "", host: "" };
          }
        },
        hasExclusion(url) {
          if (
            !Services.prefs.getBoolPref(
              "browser.ipProtection.features.siteExceptions",
              false
            )
          ) {
            return false;
          }

          try {
            const uri = Services.io.newURI(url);
            const principal =
              Services.scriptSecurityManager.createContentPrincipal(uri, {});
            return lazy.IPPExceptionsManager.hasExclusion(principal);
          } catch (e) {
            return false;
          }
        },
        async showMessage(message, tabId) {
          try {
            // Choose the target tab (by id if provided, else active tab)
            const tab = tabId
              ? lazy.tabTracker.getTab(tabId)
              : lazy.tabTracker.activeTab;
            const browser = tab?.linkedBrowser;
            const win = browser?.ownerGlobal;
            if (!browser || !win || !win.gBrowser) {
              return Promise.resolve(false);
            }

            const nbox = win.gBrowser.getNotificationBox(browser);
            const id = "ipp-activator-notification";

            const existing = nbox.getNotificationWithValue?.(id);
            if (existing) {
              nbox.removeNotification(existing);
            }

            // Promise that resolves when the notification is dismissed
            let resolveDismiss;
            const dismissedPromise = new Promise(resolve => {
              resolveDismiss = resolve;
            });

            // Create the notification; set persistence when available
            nbox
              .appendNotification(
                id,
                {
                  label: { "l10n-id": message.l10nId },
                  priority: nbox.PRIORITY_WARNING_HIGH,
                  eventCallback: param => {
                    resolveDismiss(param === "dismissed");
                  },
                },
                []
              )
              .then(notification => {
                // Persist the notification until the user removes so it
                // doesn't get removed on redirects.
                notification.persistence = -1;
              });

            return dismissedPromise;
          } catch (e) {
            console.warn("Unable to show the message", e);
            return Promise.resolve(false);
          }
        },
        onDynamicTabBreakagesUpdated: new ExtensionCommon.EventManager({
          context,
          name: "ippActivator.onDynamicTabBreakagesUpdated",
          register: fire => {
            const observer = {
              observe(subject, topic, data) {
                if (
                  topic === "nsPref:changed" &&
                  data === PREF_DYNAMIC_TAB_BREAKAGES
                ) {
                  fire.async();
                }
              },
            };
            Services.prefs.addObserver(PREF_DYNAMIC_TAB_BREAKAGES, observer);
            return () =>
              Services.prefs.removeObserver(
                PREF_DYNAMIC_TAB_BREAKAGES,
                observer
              );
          },
        }).api(),
        onDynamicWebRequestBreakagesUpdated: new ExtensionCommon.EventManager({
          context,
          name: "ippActivator.onDynamicWebRequestBreakagesUpdated",
          register: fire => {
            const observer = {
              observe(subject, topic, data) {
                if (
                  topic === "nsPref:changed" &&
                  data === PREF_DYNAMIC_WEBREQUEST_BREAKAGES
                ) {
                  fire.async();
                }
              },
            };
            Services.prefs.addObserver(
              PREF_DYNAMIC_WEBREQUEST_BREAKAGES,
              observer
            );
            return () =>
              Services.prefs.removeObserver(
                PREF_DYNAMIC_WEBREQUEST_BREAKAGES,
                observer
              );
          },
        }).api(),
        onIPPExceptionsChanged: new ExtensionCommon.EventManager({
          context,
          name: "ippActivator.onIPPExceptionsChanged",
          register: fire => {
            const observer = {
              observe(subject, topic, data) {
                if (topic !== "perm-changed") {
                  return;
                }

                if (data === "cleared") {
                  fire.async();
                  return;
                }

                let permission;
                try {
                  permission = subject.QueryInterface(Ci.nsIPermission);
                } catch (e) {
                  return;
                }

                if (permission.type !== "ipp-vpn") {
                  return;
                }

                fire.async();
              },
            };

            Services.obs.addObserver(observer, "perm-changed");
            return () => Services.obs.removeObserver(observer, "perm-changed");
          },
        }).api(),
      },
    };
  }
};
