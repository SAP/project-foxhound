/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  AttributionCode:
    "moz-src:///browser/components/attribution/AttributionCode.sys.mjs",
  ClientEnvironmentBase:
    "resource://gre/modules/components-utils/ClientEnvironment.sys.mjs",
  ClientID: "resource://gre/modules/ClientID.sys.mjs",
  TelemetrySession: "resource://gre/modules/TelemetrySession.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "telemetryClientId", () =>
  lazy.ClientID.getClientID()
);
ChromeUtils.defineLazyGetter(lazy, "impressionId", () => {
  const PREF_IMPRESSION_ID = "browser.newtabpage.activity-stream.impressionId";
  let impressionId = Services.prefs.getCharPref(PREF_IMPRESSION_ID, "");
  if (!impressionId) {
    impressionId = String(Services.uuid.generateUUID());
    Services.prefs.setCharPref(PREF_IMPRESSION_ID, impressionId);
  }
  return impressionId;
});
ChromeUtils.defineLazyGetter(
  lazy,
  "browserSessionId",
  () => lazy.TelemetrySession.getMetadata("").sessionId
);

ChromeUtils.defineLazyGetter(lazy, "log", () => {
  const { Logger } = ChromeUtils.importESModule(
    "resource://messaging-system/lib/Logger.sys.mjs"
  );
  return new Logger("AboutWelcomeTelemetry");
});

export class AboutWelcomeTelemetry {
  constructor() {
    XPCOMUtils.defineLazyPreferenceGetter(
      this,
      "telemetryEnabled",
      "browser.newtabpage.activity-stream.telemetry",
      false
    );
  }

  /**
   * Attach browser attribution data to a ping payload.
   *
   * It intentionally queries the *cached* attribution data other than calling
   * `getAttrDataAsync()` in order to minimize the overhead here.
   * For the same reason, we are not querying the attribution data from
   * `TelemetryEnvironment.currentEnvironment.settings`.
   *
   * In practice, it's very likely that the attribution data is already read
   * and cached at some point by `AboutWelcomeParent`, so it should be able to
   * read the cached results for the most if not all of the pings.
   */
  _maybeAttachAttribution(ping) {
    const attribution = lazy.AttributionCode.getCachedAttributionData();
    if (attribution && Object.keys(attribution).length) {
      ping.attribution = attribution;
    }
    return ping;
  }

  async _createPing(event) {
    let ping = {
      ...event,
      addon_version: Services.appinfo.appBuildID,
      locale: Services.locale.appLocaleAsBCP47,
      client_id: await lazy.telemetryClientId,
      browser_session_id: lazy.browserSessionId,
    };

    return this._maybeAttachAttribution(ping);
  }

  /**
   * Augment the provided event with some metadata and then send it
   * to the messaging-system's onboarding endpoint.
   *
   * Is sometimes used by non-onboarding events.
   *
   * @param event - an object almost certainly from an onboarding flow (though
   *                there is a case where spotlight may use this, too)
   *                containing a nested structure of data for reporting as
   *                telemetry, as documented in
   * https://firefox-source-docs.mozilla.org/browser/extensions/newtab/docs/v2-system-addon/data_events.html
   *                Does not have all of its data yet (`_createPing` will
   *                augment with ids and attribution if available).
   */
  async sendTelemetry(event) {
    if (!this.telemetryEnabled) {
      return;
    }

    const ping = await this._createPing(event);
    this.parseAndSubmitPing(ping);
  }

  parseAndSubmitPing(ping) {
    let pingKey = "messagingSystem";
    if (ping.event_context) {
      if (typeof ping.event_context === "string") {
        try {
          ping.event_context = JSON.parse(ping.event_context);
        } catch (e) {
          // The Empty JSON strings and non-objects often provided by the existing
          // telemetry we need to send failing to parse do not fit in the spirit
          // of what this error is meant to capture. Instead, we want to capture
          // when what we got should have been an object, but failed to parse.

          // Try to determine if this error should be recorded on
          // messaging-system or microsurvey. This type of error *should* never
          // happen on microsurvey, since write_in_microsurvey is always passed
          // in an object event_context, but because the data is potentially
          // sensitive, we should fail safe.
          const eventContextStr = ping.event_context;
          if (eventContextStr.length) {
            if (eventContextStr.includes("write_in_microsurvey")) {
              pingKey = "microsurvey";
              ping.write_in_microsurvey = true;
            }
            if (eventContextStr.includes("{")) {
              Glean[pingKey].eventContextParseError.add(1);
            }
          }
        }
      }
      if (typeof ping.event_context === "object") {
        pingKey = "microsurvey";
        ping.write_in_microsurvey =
          ping.event_context.writeInMicrosurvey ?? false;
        delete ping.event_context.writeInMicrosurvey;
      }
    }
    if (ping.write_in_microsurvey) {
      ping.impression_id = lazy.impressionId;
      // Remove potentially identifying information
      delete ping.client_id;
      delete ping.browser_session_id;
    }

    try {
      this.submitGleanPingForPing(ping);
    } catch (e) {
      // Though Glean APIs are forbidden to throw, it may be possible that a
      // mismatch between the shape of `ping` and the defined metrics is not
      // adequately handled.

      // If the message is a write-in microsurvey, we record failures on the
      // restricted microsurvey ping. This isn't ideal, since it's a counter,
      // but if we recorded it on the unrestricted messaging-system ping, it
      // would be possible to line up the submission timestamps between the
      // unrestricted failure ping and the restricted write-in response ping to
      // link the two (and thus deanonymize the write-in response).
      Glean[pingKey].gleanPingForPingFailures.add(1);
    }
  }

  /**
   * Tries to infer appropriate Glean metrics on the "messaging-system" ping,
   * sets them, and submits a "messaging-system" ping. This is mostly used to
   * send "messaging-system" telemetry via Glean.messagingSystem, but it can
   * also send "microsurvey" pings via Glean.microsurvey, when the event
   * includes an "event_input_value" (which happens if the message uses the
   * "textarea" content tile). Telemetry from such messages must be kept on a
   * separate ping with a different data policy.
   *
   * Does not check if telemetry is enabled.
   * (Though Glean will check the global prefs).
   *
   * Note: This is a very unusual use of Glean that is specific to the use-
   *       cases of Messaging System. Please do not copy this pattern.
   */
  submitGleanPingForPing(ping) {
    lazy.log.debug(`Submitting Glean ping for ${JSON.stringify(ping)}`);
    // event.event_context is an object, but it may have been stringified.
    let { event_context } = ping;
    const writeInMicrosurvey = !!ping.write_in_microsurvey;
    // This is the ping we record metrics in. Since write-in microsurveys can
    // contain sensitive data, they have their own restricted ping.
    const pingKey = writeInMicrosurvey ? "microsurvey" : "messagingSystem";
    delete ping.write_in_microsurvey;

    if (event_context && typeof event_context === "object") {
      event_context = { ...event_context };
    }

    // We echo certain properties from event_context into their own metrics to
    // aid analysis. Most of these are recorded in microsurvey when the message
    // includes `write_in_microsurvey: true`.
    if (event_context?.reason) {
      Glean[pingKey].eventReason.set(event_context.reason);
    }
    if (event_context?.page) {
      Glean[pingKey].eventPage.set(event_context.page);
    }
    if (event_context?.source) {
      Glean[pingKey].eventSource.set(event_context.source);
    }
    if (event_context?.screen_family) {
      Glean[pingKey].eventScreenFamily.set(event_context.screen_family);
    }
    // Do not record this metric in messagingSystem, only microsurvey
    if (event_context?.value && writeInMicrosurvey) {
      Glean.microsurvey.eventInputValue.set(event_context.value);
    }
    // Delete the value in event_context, because it should only be recorded in
    // the dedicated metric above, in the microsurvey ping.
    delete event_context?.value;
    // Screen_index was being coerced into a boolean value
    // which resulted in 0 (first screen index) being ignored.
    if (Number.isInteger(event_context?.screen_index)) {
      Glean[pingKey].eventScreenIndex.set(event_context.screen_index);
    }
    if (event_context?.screen_id) {
      Glean[pingKey].eventScreenId.set(event_context.screen_id);
    }
    if (event_context?.screen_initials) {
      Glean[pingKey].eventScreenInitials.set(event_context.screen_initials);
    }

    // The event_context is also provided as-is as stringified JSON.
    if (event_context) {
      let stringifiedEC =
        typeof event_context === "string"
          ? event_context
          : JSON.stringify(event_context);
      Glean[pingKey].eventContext.set(stringifiedEC);
    }

    if ("attribution" in ping) {
      for (const [key, value] of Object.entries(ping.attribution)) {
        const camelKey = this._snakeToCamelCase(key);
        const attributionKey = `${pingKey}Attribution`;
        try {
          Glean[attributionKey][camelKey].set(value);
        } catch (e) {
          // We here acknowledge that we don't know the full breadth of data
          // being collected. Ideally AttributionCode will later centralize
          // definition and reporting of attribution data and we can be rid of
          // this fail-safe for collecting the names of unknown keys.
          Glean[attributionKey].unknownKeys[camelKey].add(1);
        }
      }
    }

    // List of keys handled above.
    const handledKeys = ["event_context", "attribution"];

    for (const [key, value] of Object.entries(ping)) {
      if (handledKeys.includes(key)) {
        continue;
      }
      const camelKey = this._snakeToCamelCase(key);
      try {
        // We here acknowledge that even known keys might have non-scalar
        // values. We're pretty sure we handled them all with handledKeys,
        // but we might not have.
        // Ideally this can later be removed after running for a version or two
        // with no values seen in messaging_system.invalid_nested_data
        if (typeof value === "object") {
          Glean[pingKey].invalidNestedData[camelKey].add(1);
        } else {
          Glean[pingKey][camelKey].set(value);
        }
      } catch (e) {
        // We here acknowledge that we don't know the full breadth of data being
        // collected. Ideally we will later gain that confidence and can remove
        // this fail-safe for collecting the names of unknown keys.
        Glean[pingKey].unknownKeys[camelKey].add(1);
        // TODO(bug 1600008): For testing, also record the overall count.
        Glean[pingKey].unknownKeyCount.add(1);
      }
    }

    // The microsurvey ping has some special handling, because it uses OHTTP to
    // anonymize user data. This causes it to be sent without certain metadata
    // that we actually need. So we must reconstruct that metadata as metrics.
    if (writeInMicrosurvey) {
      let { os, version, channel } = lazy.ClientEnvironmentBase;
      Glean.microsurvey.os.set(Services.appinfo.OS);
      Glean.microsurvey.osVersion.set(os.version);
      if (os.isWindows) {
        Glean.microsurvey.windowsBuildNumber.set(os.windowsBuildNumber);
      }
      Glean.microsurvey.appDisplayVersion.set(version);
      Glean.microsurvey.appChannel.set(channel);
    }

    // With all the metrics set, now it's time to submit this ping.
    GleanPings[pingKey].submit();
  }

  _snakeToCamelCase(s) {
    return s.toString().replace(/_([a-z])/gi, (_str, group) => {
      return group.toUpperCase();
    });
  }
}
