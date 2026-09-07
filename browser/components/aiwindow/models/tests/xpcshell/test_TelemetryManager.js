/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

do_get_profile(); // ChatStore touches PathUtils.profileDir at module load

const { TelemetryScheduler } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/TelemetryManager.sys.mjs"
);
const { TelemetryEngine } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/TelemetryUtils.sys.mjs"
);
const { ChatStore } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
);
const { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

// Mirrors the (non-exported) constant in TelemetryManager.sys.mjs.
const LAST_RUN_PREF = "browser.smartwindow.lastLLMTelemetryRunTime";

registerCleanupFunction(() => {
  Services.prefs.clearUserPref(LAST_RUN_PREF);
});

add_task(async function test_scheduler_skips_run_when_last_run_is_recent() {
  // Non-zero pref disables the first-run immediate execution path: the
  // scheduler only starts the interval and should not fetch conversations.
  Services.prefs.setIntPref(LAST_RUN_PREF, Math.floor(Date.now() / 1000));
  const sb = sinon.createSandbox();
  const fetchStub = sb
    .stub(ChatStore, "getConversationsForTelemetry")
    .resolves([]);

  const scheduler = TelemetryScheduler.maybeInit();
  try {
    // Give the async #init a chance to run.
    await new Promise(r => Services.tm.dispatchToMainThread(r));
    Assert.ok(
      fetchStub.notCalled,
      "should not fetch conversations when pref indicates a recent run"
    );
  } finally {
    scheduler.destroy();
    sb.restore();
  }
});

add_task(async function test_scheduler_first_run_processes_conversation() {
  Services.fog.testResetFOG();
  Services.prefs.setIntPref(LAST_RUN_PREF, 0); // forces first-run path
  const sb = sinon.createSandbox();
  const conv = { id: "c1", currentTurnIndex: () => 7 };

  sb.stub(ChatStore, "getConversationsForTelemetry").resolves([
    {
      convId: "c1",
      modelId: "model",
      telemetryJobs: { wasSuccessful: 5 },
      telemetryProbs: { wasSuccessful: 0.5 },
      uniformSamplingProbability: 0.1,
    },
  ]);
  sb.stub(ChatStore, "findConversationById").resolves(conv);
  const markSpy = sb.stub(ChatStore, "markLLMTelemetryProcessed").resolves();
  const runStub = sb
    .stub(TelemetryEngine.prototype, "runTelemetryByName")
    .resolves([
      {
        telemetry_name: "wasSuccessful",
        result: { wasSuccessful: "yes" },
        telemetry_version: 1,
      },
    ]);

  const scheduler = TelemetryScheduler.maybeInit();
  try {
    await TestUtils.waitForCondition(
      () => markSpy.called,
      "scheduler marked the conversation as processed"
    );

    Assert.deepEqual(
      runStub.firstCall.args[0],
      ["wasSuccessful"],
      "runTelemetryByName receives the telemetry-job names from the record"
    );
    Assert.equal(
      markSpy.firstCall.args[0],
      "c1",
      "markLLMTelemetryProcessed receives the conversation id"
    );
    Assert.equal(
      markSpy.firstCall.args[2],
      7,
      "markLLMTelemetryProcessed receives the current turn index"
    );
  } finally {
    scheduler.destroy();
    sb.restore();
  }
});

add_task(async function test_destroy_stops_midloop_processing() {
  Services.fog.testResetFOG();
  Services.prefs.setIntPref(LAST_RUN_PREF, 0);
  const sb = sinon.createSandbox();
  const convIds = ["c1", "c2", "c3", "c4", "c5"];

  sb.stub(ChatStore, "getConversationsForTelemetry").resolves(
    convIds.map(id => ({
      convId: id,
      modelId: "m",
      telemetryJobs: {},
      telemetryProbs: {},
    }))
  );
  let scheduler;
  const findStub = sb
    .stub(ChatStore, "findConversationById")
    .callsFake(async id => {
      if (id === "c2") {
        scheduler.destroy();
      }
      return { id, currentTurnIndex: () => 0 };
    });
  sb.stub(ChatStore, "markLLMTelemetryProcessed").resolves();
  sb.stub(TelemetryEngine.prototype, "runTelemetryByName").resolves([]);

  scheduler = TelemetryScheduler.maybeInit();
  try {
    await TestUtils.waitForCondition(
      () => findStub.callCount >= 2,
      "loop advanced past the destroy point"
    );
    // Wait briefly to confirm no further iterations run.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(r => setTimeout(r, 100));
    Assert.lessOrEqual(
      findStub.callCount,
      2,
      "destroy() prevents iterations beyond c2 (no c3-c5 lookups)"
    );
  } finally {
    try {
      scheduler.destroy();
    } catch (e) {}
    sb.restore();
  }
});
