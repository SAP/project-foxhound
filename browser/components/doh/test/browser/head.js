"use strict";

ChromeUtils.defineModuleGetter(
  this,
  "ASRouter",
  "resource://activity-stream/lib/ASRouter.jsm"
);

ChromeUtils.defineModuleGetter(
  this,
  "DoHController",
  "resource:///modules/DoHController.jsm"
);

ChromeUtils.defineModuleGetter(
  this,
  "Preferences",
  "resource://gre/modules/Preferences.jsm"
);

XPCOMUtils.defineLazyServiceGetter(
  this,
  "gDNSService",
  "@mozilla.org/network/dns-service;1",
  "nsIDNSService"
);

XPCOMUtils.defineLazyServiceGetter(
  this,
  "gDNSOverride",
  "@mozilla.org/network/native-dns-override;1",
  "nsINativeDNSResolverOverride"
);

const { CommonUtils } = ChromeUtils.import(
  "resource://services-common/utils.js"
);

const EXAMPLE_URL = "https://example.com/";

const prefs = {
  ENABLED_PREF: "doh-rollout.enabled",
  ROLLOUT_TRR_MODE_PREF: "doh-rollout.mode",
  NETWORK_TRR_MODE_PREF: "network.trr.mode",
  BREADCRUMB_PREF: "doh-rollout.self-enabled",
  DOORHANGER_USER_DECISION_PREF: "doh-rollout.doorhanger-decision",
  DISABLED_PREF: "doh-rollout.disable-heuristics",
  SKIP_HEURISTICS_PREF: "doh-rollout.skipHeuristicsCheck",
  CLEAR_ON_SHUTDOWN_PREF: "doh-rollout.clearModeOnShutdown",
  FIRST_RUN_PREF: "doh-rollout.doneFirstRun",
  BALROG_MIGRATION_PREF: "doh-rollout.balrog-migration-done",
  PREVIOUS_TRR_MODE_PREF: "doh-rollout.previous.trr.mode",
  TRR_SELECT_ENABLED_PREF: "doh-rollout.trr-selection.enabled",
  TRR_SELECT_URI_PREF: "doh-rollout.uri",
  TRR_SELECT_COMMIT_PREF: "doh-rollout.trr-selection.commit-result",
  TRR_SELECT_DRY_RUN_RESULT_PREF: "doh-rollout.trr-selection.dry-run-result",
  PROVIDER_STEERING_PREF: "doh-rollout.provider-steering.enabled",
  PROVIDER_STEERING_LIST_PREF: "doh-rollout.provider-steering.provider-list",
};

const CFR_PREF = "browser.newtabpage.activity-stream.asrouter.providers.cfr";
const CFR_JSON = {
  id: "cfr",
  enabled: true,
  type: "local",
  localProvider: "CFRMessageProvider",
  categories: ["cfrAddons", "cfrFeatures"],
};

async function setup() {
  SpecialPowers.pushPrefEnv({
    set: [["security.notification_enable_delay", 0]],
  });
  let oldCanRecord = Services.telemetry.canRecordExtended;
  Services.telemetry.canRecordExtended = true;
  Services.telemetry.clearEvents();

  // Enable the CFR.
  Preferences.set(CFR_PREF, JSON.stringify(CFR_JSON));

  // Enable trr selection for tests. This is off by default so it can be
  // controlled via Normandy.
  Preferences.set(prefs.TRR_SELECT_ENABLED_PREF, true);

  // Enable committing the TRR selection. This pref ships false by default so
  // it can be controlled e.g. via Normandy, but for testing let's set enable.
  Preferences.set(prefs.TRR_SELECT_COMMIT_PREF, true);

  // Enable provider steering. This pref ships false by default so it can be
  // controlled e.g. via Normandy, but for testing let's enable.
  Preferences.set(prefs.PROVIDER_STEERING_PREF, true);

  // Clear mode on shutdown by default.
  Preferences.set(prefs.CLEAR_ON_SHUTDOWN_PREF, true);

  // Set up heuristics, all passing by default.

  // Google safesearch overrides
  gDNSOverride.addIPOverride("www.google.com.", "1.1.1.1");
  gDNSOverride.addIPOverride("google.com.", "1.1.1.1");
  gDNSOverride.addIPOverride("forcesafesearch.google.com.", "1.1.1.2");

  // YouTube safesearch overrides
  gDNSOverride.addIPOverride("www.youtube.com.", "2.1.1.1");
  gDNSOverride.addIPOverride("m.youtube.com.", "2.1.1.1");
  gDNSOverride.addIPOverride("youtubei.googleapis.com.", "2.1.1.1");
  gDNSOverride.addIPOverride("youtube.googleapis.com.", "2.1.1.1");
  gDNSOverride.addIPOverride("www.youtube-nocookie.com.", "2.1.1.1");
  gDNSOverride.addIPOverride("restrict.youtube.com.", "2.1.1.2");
  gDNSOverride.addIPOverride("restrictmoderate.youtube.com.", "2.1.1.2");

  // Zscaler override
  gDNSOverride.addIPOverride("sitereview.zscaler.com.", "3.1.1.1");

  // Global canary
  gDNSOverride.addIPOverride("use-application-dns.net.", "4.1.1.1");

  registerCleanupFunction(async () => {
    Services.telemetry.canRecordExtended = oldCanRecord;
    Services.telemetry.clearEvents();
    gDNSOverride.clearOverrides();
    if (ASRouter.state.messageBlockList.includes("DOH_ROLLOUT_CONFIRMATION")) {
      await ASRouter.unblockMessageById("DOH_ROLLOUT_CONFIRMATION");
    }
    // The CFR pref is set to an empty array in user.js for testing profiles,
    // so "reset" it back to that value.
    Preferences.set(CFR_PREF, "[]");
    await DoHController._uninit();
    Services.telemetry.clearEvents();
    Preferences.reset(Object.values(prefs));
    await DoHController.init();
  });
}

async function checkTRRSelectionTelemetry() {
  let events;
  await BrowserTestUtils.waitForCondition(() => {
    events = Services.telemetry.snapshotEvents(
      Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS
    ).parent;
    return events && events.length;
  });
  events = events.filter(
    e =>
      e[1] == "security.doh.trrPerformance" &&
      e[2] == "trrselect" &&
      e[3] == "dryrunresult"
  );
  is(events.length, 1, "Found the expected trrselect event.");
  is(
    events[0][4],
    "https://dummytrr.com/query",
    "The event records the expected decision"
  );
}

function ensureNoTRRSelectionTelemetry() {
  let events = Services.telemetry.snapshotEvents(
    Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS
  ).parent;
  if (!events) {
    ok(true, "Found no trrselect events.");
    return;
  }
  events = events.filter(
    e =>
      e[1] == "security.doh.trrPerformance" &&
      e[2] == "trrselect" &&
      e[3] == "dryrunresult"
  );
  is(events.length, 0, "Found no trrselect events.");
}

async function checkHeuristicsTelemetry(
  decision,
  evaluateReason,
  steeredProvider = ""
) {
  let events;
  await BrowserTestUtils.waitForCondition(() => {
    events = Services.telemetry.snapshotEvents(
      Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS
    ).parent;
    return events && events.length;
  });
  events = events.filter(
    e => e[1] == "doh" && e[2] == "evaluate_v2" && e[3] == "heuristics"
  );
  is(events.length, 1, "Found the expected heuristics event.");
  is(events[0][4], decision, "The event records the expected decision");
  if (evaluateReason) {
    is(events[0][5].evaluateReason, evaluateReason, "Got the expected reason.");
  }
  is(events[0][5].steeredProvider, steeredProvider, "Got expected provider.");

  // After checking the event, clear all telemetry. Since we check for a single
  // event above, this ensures all heuristics events are intentional and tested.
  // TODO: Test events other than heuristics. Those tests would also work the
  // same way, so as to test one event at a time, and this clearEvents() call
  // will continue to exist as-is.
  Services.telemetry.clearEvents();
}

function ensureNoHeuristicsTelemetry() {
  let events = Services.telemetry.snapshotEvents(
    Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS
  ).parent;
  if (!events) {
    ok(true, "Found no heuristics events.");
    return;
  }
  events = events.filter(
    e => e[1] == "doh" && e[2] == "evaluate_v2" && e[3] == "heuristics"
  );
  is(events.length, 0, "Found no heuristics events.");
}

async function waitForStateTelemetry(expectedStates) {
  let events;
  await BrowserTestUtils.waitForCondition(() => {
    events = Services.telemetry.snapshotEvents(
      Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS
    ).parent;
    return events;
  });
  events = events.filter(e => e[1] == "doh" && e[2] == "state");
  is(events.length, expectedStates.length, "Found the expected state events.");
  for (let state of expectedStates) {
    let event = events.find(e => e[3] == state);
    is(event[3], state, `${state} state found`);
  }
  Services.telemetry.clearEvents();
}

async function restartDoHController() {
  let oldMode = Preferences.get(prefs.ROLLOUT_TRR_MODE_PREF);
  await DoHController._uninit();
  let newMode = Preferences.get(prefs.ROLLOUT_TRR_MODE_PREF);
  let expectClear = Preferences.get(prefs.CLEAR_ON_SHUTDOWN_PREF);
  is(
    newMode,
    expectClear ? undefined : oldMode,
    `Mode was ${expectClear ? "cleared" : "persisted"} on shutdown.`
  );
  await DoHController.init();
}

// setPassing/FailingHeuristics are used generically to test that DoH is enabled
// or disabled correctly. We use the zscaler canary arbitrarily here, individual
// heuristics are tested separately.
function setPassingHeuristics() {
  gDNSOverride.clearHostOverride("sitereview.zscaler.com.");
  gDNSOverride.addIPOverride("sitereview.zscaler.com.", "3.1.1.1");
}

function setFailingHeuristics() {
  gDNSOverride.clearHostOverride("sitereview.zscaler.com.");
  gDNSOverride.addIPOverride("sitereview.zscaler.com.", "213.152.228.242");
}

async function waitForDoorhanger() {
  const popupID = "contextual-feature-recommendation";
  const bucketID = "DOH_ROLLOUT_CONFIRMATION";
  let panel;
  await BrowserTestUtils.waitForEvent(document, "popupshown", true, event => {
    panel = event.originalTarget;
    let popupNotification = event.originalTarget.firstChild;
    return (
      popupNotification &&
      popupNotification.notification &&
      popupNotification.notification.id == popupID &&
      popupNotification.getAttribute("data-notification-bucket") == bucketID
    );
  });
  return panel;
}

function simulateNetworkChange() {
  // The networkStatus API does not actually propagate the link status we supply
  // here, but rather sends the link status from the NetworkLinkService.
  // This means there's no point sending a down and then an up - the extension
  // will just receive "up" twice.
  // TODO: Implement a mock NetworkLinkService and use it to also simulate
  // network down events.
  Services.obs.notifyObservers(null, "network:link-status-changed", "up");
}

async function ensureTRRMode(mode) {
  await BrowserTestUtils.waitForCondition(() => {
    return Preferences.get(prefs.ROLLOUT_TRR_MODE_PREF) === mode;
  });
  is(Preferences.get(prefs.ROLLOUT_TRR_MODE_PREF), mode, `TRR mode is ${mode}`);
}

async function ensureNoTRRModeChange(mode) {
  try {
    // Try and wait for the TRR pref to change... waitForCondition should throw
    // after trying for a while.
    await BrowserTestUtils.waitForCondition(() => {
      return Preferences.get(prefs.ROLLOUT_TRR_MODE_PREF) !== mode;
    });
    // If we reach this, the waitForCondition didn't throw. Fail!
    ok(false, "TRR mode changed when it shouldn't have!");
  } catch (e) {
    // Assert for clarity.
    is(
      Preferences.get(prefs.ROLLOUT_TRR_MODE_PREF),
      mode,
      "No change in TRR mode"
    );
  }
}
