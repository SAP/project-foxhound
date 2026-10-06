/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This component serves as integration between the platform and AddonManager.
 * It is responsible for initializing and shutting down the AddonManager as well
 * as passing new installs from webpages to the AddonManager.
 */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "separatePrivilegedMozillaWebContentProcess",
  "browser.tabs.remote.separatePrivilegedMozillaWebContentProcess",
  false
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "extensionsWebAPITesting",
  "extensions.webapi.testing",
  false
);

const MSG_PROMISE_REQUEST = "WebAPIPromiseRequest";
const MSG_PROMISE_RESULT = "WebAPIPromiseResult";
const MSG_INSTALL_EVENT = "WebAPIInstallEvent";
const MSG_INSTALL_CLEANUP = "WebAPICleanup";
const MSG_ADDON_EVENT_REQ = "WebAPIAddonEventRequest";
const MSG_ADDON_EVENT = "WebAPIAddonEvent";

var AddonManager, AddonManagerPrivate;

export function amManager() {
  ({ AddonManager, AddonManagerPrivate } = ChromeUtils.importESModule(
    "resource://gre/modules/AddonManager.sys.mjs"
  ));

  Services.mm.addMessageListener(MSG_PROMISE_REQUEST, this);
  Services.mm.addMessageListener(MSG_INSTALL_CLEANUP, this);
  Services.mm.addMessageListener(MSG_ADDON_EVENT_REQ, this);

  Services.obs.addObserver(this, "message-manager-close");
  Services.obs.addObserver(this, "message-manager-disconnect");

  AddonManager.webAPI.setEventHandler(this.sendEvent);

  // Needed so receiveMessage can be called directly by JS callers
  this.wrappedJSObject = this;
}

amManager.prototype = {
  observe(aSubject, aTopic) {
    switch (aTopic) {
      case "addons-startup":
        AddonManagerPrivate.startup();
        break;

      case "message-manager-close":
      case "message-manager-disconnect":
        this.childClosed(aSubject);
        break;
    }
  },

  notify() {
    AddonManagerPrivate.backgroundUpdateTimerHandler();
  },

  // Maps message manager instances for content processes to the associated
  // AddonListener instances.
  addonListeners: new Map(),

  _addAddonListener(target) {
    if (!this.addonListeners.has(target)) {
      let handler = (event, id) => {
        target.sendAsyncMessage(MSG_ADDON_EVENT, { event, id });
      };
      let listener = {
        onEnabling: addon => handler("onEnabling", addon.id),
        onEnabled: addon => handler("onEnabled", addon.id),
        onDisabling: addon => handler("onDisabling", addon.id),
        onDisabled: addon => handler("onDisabled", addon.id),
        onInstalling: addon => handler("onInstalling", addon.id),
        onInstalled: addon => handler("onInstalled", addon.id),
        onUninstalling: addon => handler("onUninstalling", addon.id),
        onUninstalled: addon => handler("onUninstalled", addon.id),
        onOperationCancelled: addon =>
          handler("onOperationCancelled", addon.id),
      };
      this.addonListeners.set(target, listener);
      AddonManager.addAddonListener(listener);
    }
  },

  _removeAddonListener(target) {
    if (this.addonListeners.has(target)) {
      AddonManager.removeAddonListener(this.addonListeners.get(target));
      this.addonListeners.delete(target);
    }
  },

  receiveMessage(aMessage) {
    let payload = aMessage.data;

    switch (aMessage.name) {
      case MSG_PROMISE_REQUEST: {
        if (
          !lazy.extensionsWebAPITesting &&
          lazy.separatePrivilegedMozillaWebContentProcess &&
          aMessage.target &&
          aMessage.target.remoteType != null &&
          aMessage.target.remoteType !== "privilegedmozilla"
        ) {
          return undefined;
        }

        let mm = aMessage.target.messageManager;
        let resolve = value => {
          mm.sendAsyncMessage(MSG_PROMISE_RESULT, {
            callbackID: payload.callbackID,
            resolve: value,
          });
        };
        let reject = value => {
          mm.sendAsyncMessage(MSG_PROMISE_RESULT, {
            callbackID: payload.callbackID,
            reject: value,
          });
        };

        let API = AddonManager.webAPI;
        if (payload.type in API) {
          API[payload.type](aMessage.target, ...payload.args).then(
            resolve,
            reject
          );
        } else {
          reject("Unknown Add-on API request.");
        }
        break;
      }

      case MSG_INSTALL_CLEANUP: {
        if (
          !lazy.extensionsWebAPITesting &&
          lazy.separatePrivilegedMozillaWebContentProcess &&
          aMessage.target &&
          aMessage.target.remoteType != null &&
          aMessage.target.remoteType !== "privilegedmozilla"
        ) {
          return undefined;
        }

        AddonManager.webAPI.clearInstalls(payload.ids);
        break;
      }

      case MSG_ADDON_EVENT_REQ: {
        if (
          !lazy.extensionsWebAPITesting &&
          lazy.separatePrivilegedMozillaWebContentProcess &&
          aMessage.target &&
          aMessage.target.remoteType != null &&
          aMessage.target.remoteType !== "privilegedmozilla"
        ) {
          return undefined;
        }

        let target = aMessage.target.messageManager;
        if (payload.enabled) {
          this._addAddonListener(target);
        } else {
          this._removeAddonListener(target);
        }
      }
    }
    return undefined;
  },

  childClosed(target) {
    AddonManager.webAPI.clearInstallsFrom(target);
    this._removeAddonListener(target);
  },

  sendEvent(mm, data) {
    mm.sendAsyncMessage(MSG_INSTALL_EVENT, data);
  },

  classID: Components.ID("{4399533d-08d1-458c-a87a-235f74451cfa}"),
  QueryInterface: ChromeUtils.generateQI(["nsITimerCallback", "nsIObserver"]),
};

const BLOCKLIST_SYS_MJS = "resource://gre/modules/Blocklist.sys.mjs";
ChromeUtils.defineESModuleGetters(lazy, { Blocklist: BLOCKLIST_SYS_MJS });

export function BlocklistService() {
  this.wrappedJSObject = this;
}

BlocklistService.prototype = {
  STATE_NOT_BLOCKED: Ci.nsIBlocklistService.STATE_NOT_BLOCKED,
  STATE_SOFTBLOCKED: Ci.nsIBlocklistService.STATE_SOFTBLOCKED,
  STATE_BLOCKED: Ci.nsIBlocklistService.STATE_BLOCKED,

  get isLoaded() {
    return Cu.isESModuleLoaded(BLOCKLIST_SYS_MJS) && lazy.Blocklist.isLoaded;
  },

  observe(...args) {
    return lazy.Blocklist.observe(...args);
  },

  notify() {
    lazy.Blocklist.notify();
  },

  classID: Components.ID("{66354bc9-7ed1-4692-ae1d-8da97d6b205e}"),
  QueryInterface: ChromeUtils.generateQI([
    "nsIObserver",
    "nsIBlocklistService",
    "nsITimerCallback",
  ]),
};

// This service is configured as a daily timer from extensions.manifest and
// it is responsible for sending the `addons` Glean Ping on a daily schedule.
export class amGleanDaily {
  static classID = Components.ID("{867d65a0-9784-4496-9a2e-f168f960f7c7}");
  static contractID = "@mozilla.org/addons/glean-daily-ping;1";
  QueryInterface = ChromeUtils.generateQI([Ci.nsITimerCallback]);

  notify() {
    // Submit the addons Glean ping with reason "daily" when
    // the timer is notify the amGleanDaily nsITimerCallback.
    GleanPings.addons.submit("daily");
  }
}
