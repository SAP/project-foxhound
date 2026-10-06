/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewUtils } from "resource://gre/modules/GeckoViewUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  EventDispatcher: "resource://gre/modules/Messaging.sys.mjs",
  IPPAndroidAuthProvider:
    "moz-src:///toolkit/components/ipprotection/fxa/IPPAndroidAuthProvider.sys.mjs",
  IPPGpiAuthProvider:
    "moz-src:///toolkit/components/ipprotection/gpi/IPPGpiAuthProvider.sys.mjs",
  IPPProxyManager:
    "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs",
  IPProtectionActivator:
    "moz-src:///toolkit/components/ipprotection/IPProtectionActivator.sys.mjs",
  IPProtectionService:
    "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs",
});

const { debug, warn } = GeckoViewUtils.initLogging("GeckoViewIPProtection");

const AUTH_PROVIDER_PREF = "toolkit.ipProtection.android.authProvider";

let initialized = false;

export const GeckoViewIPProtection = {
  // Events dispatched by components in toolkit/components/ipprotection.
  handleEvent(event) {
    let detail;
    switch (event.type) {
      case "IPPProxyManager:StateChanged": {
        const state = lazy.IPPProxyManager.state;
        detail = {
          state,
          errorType:
            state === "error" ? (lazy.IPPProxyManager.errorType ?? null) : null,
        };
        break;
      }
      case "IPPProxyManager:UsageChanged": {
        const { usage } = event.detail;
        detail = {
          remaining: Number(usage.remaining),
          max: Number(usage.max),
          resetTime: usage.reset?.toString() ?? null,
        };
        break;
      }
      default:
        detail = event.detail;
    }
    lazy.EventDispatcher.instance.sendRequest(
      `GeckoView:IPProtection:${event.type}`,
      detail
    );
  },

  // Events dispatched from IPProtectionController.java via EventDispatcher.
  onEvent(aEvent, aData, aCallback) {
    debug`onEvent ${aEvent}`;

    switch (aEvent) {
      case "GeckoView:IPProtection:Init": {
        if (!initialized) {
          initialized = true;
          lazy.IPPProxyManager.addEventListener(
            "IPPProxyManager:StateChanged",
            GeckoViewIPProtection
          );
          lazy.IPPProxyManager.addEventListener(
            "IPPProxyManager:UsageChanged",
            GeckoViewIPProtection
          );
          lazy.IPProtectionService.addEventListener(
            "IPProtectionService:StateChanged",
            GeckoViewIPProtection
          );
          let providerName = Services.prefs.getCharPref(AUTH_PROVIDER_PREF, "");
          if (!providerName) {
            providerName = aData?.isSignedIn ? "fxa" : "gpi";
            Services.prefs.setCharPref(AUTH_PROVIDER_PREF, providerName);
          }
          if (providerName === "fxa") {
            lazy.IPProtectionActivator.setAuthProvider(
              lazy.IPPAndroidAuthProvider
            );
            lazy.IPProtectionActivator.addHelpers(
              lazy.IPPAndroidAuthProvider.helpers
            );
          } else {
            lazy.IPProtectionActivator.setAuthProvider(lazy.IPPGpiAuthProvider);
            lazy.IPProtectionActivator.addHelpers(
              lazy.IPPGpiAuthProvider.helpers
            );
          }
          lazy.IPProtectionActivator.init();
        }
        aCallback.onSuccess();
        break;
      }
      case "GeckoView:IPProtection:Uninit": {
        if (initialized) {
          initialized = false;
          lazy.IPPProxyManager.removeEventListener(
            "IPPProxyManager:StateChanged",
            GeckoViewIPProtection
          );
          lazy.IPPProxyManager.removeEventListener(
            "IPPProxyManager:UsageChanged",
            GeckoViewIPProtection
          );
          lazy.IPProtectionService.removeEventListener(
            "IPProtectionService:StateChanged",
            GeckoViewIPProtection
          );
          lazy.IPProtectionActivator.uninit();
          lazy.IPProtectionActivator.removeHelpers();
        }
        aCallback.onSuccess();
        break;
      }
      case "GeckoView:IPProtection:IPProtectionService:GetState": {
        aCallback.onSuccess({ state: lazy.IPProtectionService.state });
        break;
      }
      case "GeckoView:IPProtection:IPPProxyManager:GetState": {
        const state = lazy.IPPProxyManager.state;
        aCallback.onSuccess({
          state,
          errorType:
            state === "error" ? (lazy.IPPProxyManager.errorType ?? null) : null,
        });
        break;
      }
      case "GeckoView:IPProtection:Activate": {
        lazy.IPPProxyManager.start()
          .then(({ started, error } = {}) => {
            if (started) {
              aCallback.onSuccess();
            } else {
              aCallback.onError(error ?? "generic-error");
            }
          })
          .catch(err => {
            aCallback.onError(
              typeof err === "string" ? err : (err?.message ?? "generic-error")
            );
          });
        break;
      }
      case "GeckoView:IPProtection:Enroll": {
        lazy.IPProtectionService.authProvider
          .enroll()
          .then(({ isEnrolledAndEntitled, error } = {}) => {
            aCallback.onSuccess({
              isEnrolledAndEntitled: !!isEnrolledAndEntitled,
              error: error ?? null,
            });
          })
          .catch(err => {
            aCallback.onError(
              typeof err === "string" ? err : (err?.message ?? "generic-error")
            );
          });
        break;
      }
      case "GeckoView:IPProtection:Deactivate": {
        lazy.IPPProxyManager.stop()
          .then(() => {
            aCallback.onSuccess();
          })
          .catch(err => {
            aCallback.onError(
              typeof err === "string" ? err : (err?.message ?? "generic-error")
            );
          });
        break;
      }
    }
  },
};
