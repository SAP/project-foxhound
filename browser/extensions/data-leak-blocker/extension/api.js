/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* global ExtensionCommon, ExtensionAPI, Glean, Services, XPCOMUtils, ExtensionUtils */

/* eslint-disable no-console */

var { ExtensionParent } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionParent.sys.mjs"
);

const { ChannelWrapper } = Cu.getGlobalForObject(ExtensionParent);

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  DeferredTask: "resource://gre/modules/DeferredTask.sys.mjs",
  RemoteSettings: "resource://services-settings/remote-settings.sys.mjs",
});

const DATA_LEAK_BLOCKER_RS_COLLECTION = "addons-data-leak-blocker-domains";

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "TEST_DOMAINS",
  "extensions.data-leak-blocker@mozilla.com.testDomains",
  "",
  null,
  value => {
    try {
      return new Set(
        value
          .split(",")
          // Trim whitespaces.
          .map(v => v.trim())
          // Omit any empty entries.
          .filter(el => el)
      );
    } catch {
      // Return an empty set if parsing the value fails.
      return new Set();
    }
  }
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "TESTING",
  "extensions.data-leak-blocker@mozilla.com.testing",
  false
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "GLEAN_SUBMIT_TASK_TIMEOUT",
  "extensions.data-leak-blocker@mozilla.com.gleanSubmitTaskTimeout",
  5000
);

this.dataAbuseDetection = class extends ExtensionAPI {
  deferredPingSubmitTask = null;
  domainsSet = null;
  fogMetricsInitialized = false;
  requestObserverRegistered = false;
  rsClient = null;
  rsSyncListener = null;

  get IsShuttingDown() {
    return (
      !this.extension ||
      this.extension.hasShutdown ||
      Services.startup.shuttingDown
    );
  }

  onStartup() {
    this.deferredPingSubmitTask = new lazy.DeferredTask(
      () => this.submitPing(),
      lazy.GLEAN_SUBMIT_TASK_TIMEOUT
    );

    ExtensionParent.browserStartupPromise
      .then(() => {
        if (this.IsShuttingDown) {
          console.log(
            "Data Leak Blocker initialization cancelled on detected extension or app shutdown"
          );
          return Promise.resolve();
        }
        this.registerFOGMetricsAndPings();
        this.rsClient = lazy.RemoteSettings(DATA_LEAK_BLOCKER_RS_COLLECTION);
        // Process existing RS entries.
        return this.onRemoteSettingsSync();
      })
      .then(() => {
        if (this.IsShuttingDown) {
          console.log(
            "Data Leak Blocker initialization cancelled on detected extension or app shutdown"
          );
          return;
        }
        Services.obs.addObserver(this, "http-on-modify-request");
        this.requestObserverRegistered = true;
        this.rsSyncListener = this.onRemoteSettingsSync.bind(this);
        this.rsClient.on("sync", this.rsSyncListener);
        // Submit any events that may be collected for this custom ping
        // in a previous session if it wasn't already sent.
        this.deferredPingSubmitTask.arm();
      });
  }

  onShutdown(isAppShutdown) {
    if (isAppShutdown) {
      return;
    }

    if (this.requestObserverRegistered) {
      Services.obs.removeObserver(this, "http-on-modify-request");
    }

    if (this.rsSyncListener) {
      this.rsClient?.off("sync", this.rsSyncListener);
      this.rsSyncListener = null;
    }
    this.rsClient = null;

    if (this.deferredPingSubmitTask) {
      this.deferredPingSubmitTask.finalize();
      this.deferredPingSubmitTask = null;
    }
  }

  async onRemoteSettingsSync() {
    const entries = await this.rsClient
      .get({ syncIfEmpty: false })
      .catch(err => {
        console.error(
          `Failure to process ${DATA_LEAK_BLOCKER_RS_COLLECTION} RemoteSettings`,
          err
        );
        return [];
      });
    const domains = new Set();
    for (const entry of entries) {
      if (!Array.isArray(entry.domains)) {
        if (lazy.TESTING) {
          console.debug(
            "Ignoring invalid RemoteSettings entry ('domains' property invalid or missing)",
            entry
          );
        }
        continue;
      }
      for (const domain of entry.domains) {
        if (!domain) {
          if (lazy.TESTING) {
            console.debug(
              `Ignoring unxpected empty domain in ${DATA_LEAK_BLOCKER_RS_COLLECTION} record`,
              entry
            );
          }
          continue;
        }
        domains.add(domain);
      }
    }
    this.domainsSet = domains;
    if (lazy.TESTING) {
      this.domainsSet = domains.union(lazy.TEST_DOMAINS);
      console.debug(
        "Data Leak Blocker DomainsSet updated",
        Array.from(this.domainsSet)
      );
    }
  }

  registerFOGMetricsAndPings() {
    // Register the custom ping to Glean (if not already registered).
    //
    // NOTE: this should be kept in sync with the ping as defined in the
    // pings.yaml.
    if (!("dataLeakBlocker" in GleanPings)) {
      const ping = {
        name: "data-leak-blocker",
        includeClientId: true,
        sendIfEmpty: false,
        preciseTimestamp: false,
        includeInfoSections: true,
        enabled: true,
        schedulesPings: [],
        reasonCodes: [],
        followsCollectionEnabled: true,
        uploaderCapabilities: [],
      };
      Services.fog.registerRuntimePing(
        ping.name,
        ping.includeClientId,
        ping.sendIfEmpty,
        ping.preciseTimestamp,
        ping.includeInfoSections,
        ping.enabled,
        ping.schedulesPings,
        ping.reasonCodes,
        ping.followsCollectionEnabled,
        ping.uploaderCapabilities
      );
    }

    // Register the custom metric to Glean (if not already registered).
    //
    // NOTE: this should be kept in sync with the metric as defined in the
    // metrics.yaml.
    if (!Glean.dataLeakBlocker?.reportV1) {
      const metric = {
        category: "data_leak_blocker",
        name: "report_v1",
        type: "event",
        lifetime: "ping",
        pings: ["data-leak-blocker"],
        disabled: false,
        extraArgs: {
          allowed_extra_keys: [
            "addon_id",
            "blocked",
            "content_policy_type",
            "is_addon_triggering",
            "is_addon_loading",
            "is_content_script",
            "method",
          ],
        },
      };
      Services.fog.registerRuntimeMetric(
        metric.type,
        metric.category,
        metric.name,
        metric.pings,
        `"${metric.lifetime}"`,
        metric.disabled,
        JSON.stringify(metric.extraArgs)
      );
    }
    this.fogMetricsInitialized = true;
  }

  submitPing() {
    // NOTE: optional chaining is used here because on artifacts builds the runtime-registered
    // glean ping defined by the registerFOGMetricsAndPings method would be unregistered
    // as a side-effect of the jogfile for the artifacts build metrics being loaded
    // (See Bug 1983674).
    GleanPings.dataLeakBlocker?.submit();
  }

  observe(subject, _topic, _data) {
    try {
      if (!this.domainsSet || !Glean.dataLeakBlocker?.reportV1) {
        return;
      }
      this.processHttpOnModifyRequest(
        subject.QueryInterface(Ci.nsIHttpChannel)
      );
    } catch (err) {
      if (lazy.TESTING) {
        console.error(
          "Unexpected error on processing http-on-modify-request notification",
          err
        );
      }
    }
  }

  processHttpOnModifyRequest(channel) {
    // Ignore internal favicon request triggered by FaviconLoader.sys.mjs.
    if (
      channel.loadInfo.internalContentPolicyType ===
      Ci.nsIContentPolicy.TYPE_INTERNAL_IMAGE_FAVICON
    ) {
      return;
    }

    const { URI } = channel;

    if (!URI.schemeIs("http") && !URI.schemeIs("https")) {
      return;
    }

    const { triggeringPrincipal, loadingPrincipal, externalContentPolicyType } =
      channel.loadInfo;

    // Ignore requests that are not attributed to add-ons.
    if (
      !triggeringPrincipal.isAddonOrExpandedAddonPrincipal &&
      !loadingPrincipal?.isAddonOrExpandedAddonPrincipal
    ) {
      return;
    }

    if (!this.domainsSet.has(URI.host)) {
      return;
    }

    // numeric nsContentPolicyType enum value.
    let content_policy_type = externalContentPolicyType;
    let is_addon_loading = false;
    let is_addon_triggering = false;
    let is_content_script = false;
    let method = channel.requestMethod;
    let addonPolicy;
    if (triggeringPrincipal.isAddonOrExpandedAddonPrincipal) {
      is_addon_triggering = true;
      is_content_script = !!triggeringPrincipal.contentScriptAddonPolicy;
      addonPolicy =
        triggeringPrincipal.addonPolicy ??
        triggeringPrincipal.contentScriptAddonPolicy;
    } else if (loadingPrincipal?.isAddonOrExpandedAddonPrincipal) {
      // Look for an addon id on the loadingPrincipal as a fallback
      // (if it is defined, e.g. it is not defined for request triggered
      // when a user loads an url in a new tab).
      is_addon_loading = true;
      is_content_script = !!loadingPrincipal.contentScriptAddonPolicy;
      addonPolicy =
        loadingPrincipal.addonPolicy ??
        loadingPrincipal.contentScriptAddonPolicy;
    } else {
      // Bail out if we can't determine an addon id for the request.
      return;
    }

    if (lazy.TESTING) {
      console.debug("Detected request to suspicious domain", channel.name);
    }

    const channelWrapper = ChannelWrapper.get(channel);
    channelWrapper.cancel(
      Cr.NS_ERROR_ABORT,
      Ci.nsILoadInfo.BLOCKING_REASON_EXTENSION_WEBREQUEST
    );
    let properties = channel.QueryInterface(Ci.nsIWritablePropertyBag);
    properties.setProperty("cancelledByExtension", this.extension.id);

    const addon_id = addonPolicy?.id ?? "no-addon-id";

    // NOTE: optional chaining is used here because on artifacts builds the runtime-registered
    // glean ping defined by the registerFOGMetricsAndPings method would be unregistered
    // as a side-effect of the jogfile for the artifacts build metrics being loaded
    // (See Bug 1983674).
    Glean.dataLeakBlocker?.reportV1.record({
      addon_id,
      is_addon_triggering,
      is_addon_loading,
      is_content_script,
      method,
      content_policy_type,
      blocked: true,
    });

    this.deferredPingSubmitTask.arm();

    if (lazy.TESTING) {
      console.debug("Suspicious request details", {
        name: channel.name,
        addon_id,
        is_addon_triggering,
        is_addon_loading,
        is_content_script,
        method,
        content_policy_type,
        blocked: true,
      });
    }
  }
};
