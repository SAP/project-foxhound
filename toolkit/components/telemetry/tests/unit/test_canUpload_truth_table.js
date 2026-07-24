/* This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AppConstants: "resource://gre/modules/AppConstants.sys.mjs",
  NimbusFeatures: "resource://nimbus/ExperimentAPI.sys.mjs",
  TestUtils: "resource://testing-common/TestUtils.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
  AddonTestUtils: "resource://testing-common/AddonTestUtils.sys.mjs",
});

const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);
const { TelemetryUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryUtils.sys.mjs"
);

const { Policy, TelemetryReportingPolicy } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryReportingPolicy.sys.mjs"
);

const PREONBOARDING_ENABLED_PREF = "browser.preonboarding.enabled";
const TOU_ACCEPTED_VERSION_PREF = "termsofuse.acceptedVersion";
const TOU_ACCEPTED_DATE_PREF = "termsofuse.acceptedDate";
const TOU_MINIMUM_VERSION_PREF = "termsofuse.minimumVersion";
const TOU_CURRENT_VERSION_PREF = "termsofuse.currentVersion";
const TOU_BYPASS_NOTIFICATION_PREF = "termsofuse.bypassNotification";
const TOU_PREF_MIGRATION_CHECK = "browser.termsofuse.prefMigrationCheck";

const CURRENT_VERSION = 900;
const MINIMUM_VERSION = 899;
NimbusTestUtils.init(this);

add_setup(async function common_setup() {
  // Initialize the addon test harness before startup.
  // Use `globalThis` as 'this' can be undefined on Linux.
  AddonTestUtils.init(globalThis);
  // Ensure we have a real profile before we start the Addon Manager.
  do_get_profile();
  // Avoid cert flakiness in tests.
  AddonTestUtils.overrideCertDB();
  // Ensure AddonManager is initialized before anything tries to observe it.
  AddonTestUtils.createAppInfo(
    "xpcshell@tests.mozilla.org",
    "XPCShell",
    "1.0",
    "1.0"
  );
  await AddonTestUtils.promiseStartupManager();

  Services.prefs.setBoolPref(
    TelemetryUtils.Preferences.BypassNotification,
    false
  );
  Services.prefs.setBoolPref(TOU_BYPASS_NOTIFICATION_PREF, false);

  TelemetryReportingPolicy.setup();

  const { cleanup } = await NimbusTestUtils.setupTest();
  registerCleanupFunction(cleanup);

  registerCleanupFunction(async () => {
    for (const pref of [
      PREONBOARDING_ENABLED_PREF,
      TOU_BYPASS_NOTIFICATION_PREF,
      TOU_ACCEPTED_DATE_PREF,
      TOU_ACCEPTED_VERSION_PREF,
      TOU_MINIMUM_VERSION_PREF,
      TOU_CURRENT_VERSION_PREF,
      TOU_PREF_MIGRATION_CHECK,
      TelemetryUtils.Preferences.BypassNotification,
      TelemetryUtils.Preferences.AcceptedPolicyVersion,
      TelemetryUtils.Preferences.AcceptedPolicyDate,
      TelemetryUtils.Preferences.DataSubmissionEnabled,
    ]) {
      Services.prefs.clearUserPref(pref);
    }
    TelemetryReportingPolicy.testNotificationInProgress(false);
    TelemetryReportingPolicy.reset();
    await AddonTestUtils.promiseShutdownManager();
    sinon.restore();
  });
});

async function enrollPreonboarding({
  enabled = true,
  currentVersion,
  minimumVersion,
}) {
  Services.prefs.setIntPref(TOU_CURRENT_VERSION_PREF, currentVersion);
  Services.prefs.setIntPref(TOU_MINIMUM_VERSION_PREF, minimumVersion);

  return NimbusTestUtils.enrollWithFeatureConfig(
    {
      featureId: NimbusFeatures.preonboarding.featureId,
      value: {
        enabled,
        currentVersion,
        minimumVersion,
        screens: [{ id: "test" }],
      },
    },
    { isRollout: false }
  );
}

function setDataSubmissionEnabled(on) {
  Services.prefs.setBoolPref(
    TelemetryUtils.Preferences.DataSubmissionEnabled,
    !!on
  );
}

/**
 * Mutators are per-row helpers that set up state for either the Terms of Use
 * (“A”) path or the legacy data reporting notification (“B”) path.
 *
 * Constraints:
 * - Each mutator only touches the specific prefs or policy flags named in the
 *   function and no unrelated global state.
 * - The test clears all related prefs before each row, ensuring a clean
 *   baseline. Each mutator must therefore set every value it needs so rows are
 *   independent and can run in any order without hidden dependencies.
 *
 * Usage:
 * - ROWS.A and ROWS.B contain arrays of mutator names. The test runner calls
 *   each in sequence to produce the preconditions for that row.
 */
const Mutators = {
  // A cases - TOU does NOT qualify to show
  A_touDisabled() {
    Services.prefs.setBoolPref(PREONBOARDING_ENABLED_PREF, false);
  },
  A_touBypass() {
    Services.prefs.setBoolPref(TOU_BYPASS_NOTIFICATION_PREF, true);
  },
  A_touBypassFalse() {
    Services.prefs.setBoolPref(TOU_BYPASS_NOTIFICATION_PREF, false);
  },
  A_touAccepted() {
    Services.prefs.setStringPref(TOU_ACCEPTED_DATE_PREF, String(Date.now()));
    const current = Services.prefs.getIntPref(
      TOU_CURRENT_VERSION_PREF,
      CURRENT_VERSION
    );
    Services.prefs.setIntPref(TOU_ACCEPTED_VERSION_PREF, current);
  },
  A_touNotAccepted() {
    Services.prefs.clearUserPref(TOU_ACCEPTED_DATE_PREF);
    Services.prefs.clearUserPref(TOU_ACCEPTED_VERSION_PREF);
  },
  A_touAcceptedOld() {
    // Choose a date that is guaranteed to be rejected by setting one year
    // before minimum.
    const old = new Date(
      `${Policy.OLDEST_ALLOWED_TOU_ACCEPTANCE_YEAR - 1}-01-01T00:00:00Z`
    ).getTime(); // older than allowed
    Services.prefs.setStringPref(TOU_ACCEPTED_DATE_PREF, String(old));
    const current = Services.prefs.getIntPref(
      TOU_CURRENT_VERSION_PREF,
      CURRENT_VERSION
    );
    Services.prefs.setIntPref(TOU_ACCEPTED_VERSION_PREF, current);
  },
  A_touAcceptedBelowMin() {
    const min = Services.prefs.getIntPref(
      TOU_MINIMUM_VERSION_PREF,
      MINIMUM_VERSION
    );
    Services.prefs.setStringPref(TOU_ACCEPTED_DATE_PREF, String(Date.now()));
    Services.prefs.setIntPref(TOU_ACCEPTED_VERSION_PREF, Math.max(0, min - 1));
  },

  // B cases - legacy flow does NOT qualify to show
  B_legacyBypass() {
    Services.prefs.setBoolPref(
      TelemetryUtils.Preferences.BypassNotification,
      true
    );
  },
  B_legacyBypassFalse() {
    Services.prefs.setBoolPref(
      TelemetryUtils.Preferences.BypassNotification,
      false
    );
  },
  B_legacyNotified() {
    const min = TelemetryReportingPolicy.minimumPolicyVersion;
    Services.prefs.setIntPref(
      TelemetryUtils.Preferences.AcceptedPolicyVersion,
      min
    );
    Services.prefs.setStringPref(
      TelemetryUtils.Preferences.AcceptedPolicyDate,
      String(Date.now())
    );
  },
  B_legacyNotifiedFalse() {
    Services.prefs.clearUserPref(
      TelemetryUtils.Preferences.AcceptedPolicyVersion
    );
    Services.prefs.clearUserPref(TelemetryUtils.Preferences.AcceptedPolicyDate);
  },
  // Users cannot upload if a notification is in progress
  inProgressSetTrue() {
    TelemetryReportingPolicy.testNotificationInProgress(true);
  },
  inProgressSetFalse() {
    TelemetryReportingPolicy.testNotificationInProgress(false);
  },
};

/**
 * Truth table
 *
 * Fields:
 * - name: string description for logging
 * - submissionEnabled: boolean mapped to
 *   TelemetryUtils.Preferences.DataSubmissionEnabled
 * - A: array<string> of “A_” mutators (TOU path), formatted as strings for easy
 *   logging
 * - B: array<string> of “B_” mutators (legacy path), formatted as strings for
 *   easy logging
 * - inProgress: "tou" | "legacy" | null If set, we force
 *     TelemetryReportingPolicy.testNotificationInProgress(true) to model a
 *     notification (Terms of User or Legacy) currently showing.
 * - preNimbusEvaluate: If true, call canUpload() once before Nimbus variables
 *   are populated, then again after we simulate startup, triggering
 *   _delayedStartup. We expect both results to match. This ensures that even if
 *   canUpload() is called before the Nimbus Variables are evaluated as part of
 *   the _delayedStartup process, we evaluate them on the fly so that their
 *   value is consistent.
 * - expect: boolean expected final result of canUpload()
 * - expectMigration: if true, we assert that the legacy to TOU pref migration
 *   ran
 */
const ROWS = [
  {
    name: "Data submission disable -> false",
    submissionEnabled: false,
    A: ["A_touNotAccepted", "A_touBypassFalse"],
    B: ["B_legacyBypassFalse", "B_legacyNotifiedFalse"],
    inProgress: null,
    expect: false,
  },
  {
    name: "TOU bypass and Legacy bypass -> true",
    submissionEnabled: true,
    A: ["A_touBypass", "A_touNotAccepted"],
    B: ["B_legacyBypass", "B_legacyNotifiedFalse"],
    inProgress: null,
    expect: true,
  },
  {
    name: "TOU accepted and Legacy notified -> true",
    submissionEnabled: true,
    A: ["A_touAccepted", "A_touBypassFalse"],
    B: ["B_legacyNotified", "B_legacyBypassFalse"],
    inProgress: null,
    expect: true,
  },
  {
    name: "TOU bypass only -> false",
    submissionEnabled: true,
    A: ["A_touBypass", "A_touNotAccepted"],
    B: ["B_legacyBypassFalse", "B_legacyNotifiedFalse"],
    inProgress: null,
    expect: false,
  },
  {
    name: "Legacy bypass only -> true",
    submissionEnabled: true,
    A: ["A_touNotAccepted", "A_touBypassFalse"],
    B: ["B_legacyBypass", "B_legacyNotifiedFalse"],
    inProgress: null,
    expect: true,
    // Pref migration will result in legacy bypass value being mirrored in TOU
    // bypass value
    expectMigration: true,
  },
  {
    name: "Legacy notified -> true",
    submissionEnabled: true,
    A: ["A_touNotAccepted", "A_touBypassFalse"],
    B: ["B_legacyNotified", "B_legacyBypassFalse"],
    inProgress: null,
    expect: true,
  },
  {
    name: "TOU notification in progress -> false",
    submissionEnabled: true,
    A: ["A_touBypassFalse", "A_touNotAccepted"],
    B: ["B_legacyBypassFalse", "B_legacyNotifiedFalse"],
    inProgress: "tou",
    expect: false,
  },
  {
    name: "Legacy notification in progress -> false",
    submissionEnabled: true,
    A: ["A_touNotAccepted", "A_touBypassFalse"],
    B: ["B_legacyBypassFalse", "B_legacyNotifiedFalse"],
    inProgress: "legacy",
    expect: false,
  },
  {
    name: "TOU accepted with invalid date, not notified of legacy flow -> false",
    submissionEnabled: true,
    A: ["A_touAcceptedOld", "A_touBypassFalse"],
    B: ["B_legacyBypassFalse", "B_legacyNotifiedFalse"],
    inProgress: null,
    expect: false,
  },
  {
    name: "TOU accepted below minimum version, not notified of legacy flow -> false",
    submissionEnabled: true,
    A: ["A_touAcceptedBelowMin", "A_touBypassFalse"],
    B: ["B_legacyBypassFalse", "B_legacyNotifiedFalse"],
    inProgress: null,
    expect: false,
  },
  {
    name: "TOU accepted with invalid date, Legacy bypass -> false",
    submissionEnabled: true,
    A: ["A_touAcceptedOld", "A_touBypassFalse"],
    B: ["B_legacyBypass", "B_legacyNotifiedFalse"],
    inProgress: null,
    expect: false,
  },
  {
    name: "TOU accepted below minimum version, Legacy bypass -> false",
    submissionEnabled: true,
    A: ["A_touAcceptedBelowMin", "A_touBypassFalse"],
    B: ["B_legacyBypass", "B_legacyNotifiedFalse"],
    inProgress: null,
    expect: false,
  },
  {
    name: "Nimbus value for preonboarding enabled settles to the same value regardless of when called -> true",
    submissionEnabled: true,
    preNimbusEvaluate: true,
    A: ["A_touDisabled", "A_touBypassFalse", "A_touNotAccepted"],
    B: ["B_legacyBypass", "B_legacyNotifiedFalse"],
    inProgress: null,
    expect: true,
    // Pref migration will result in legacy bypass value being mirrored in TOU
    // bypass value
    expectMigration: true,
  },
];

/**
 * Tests TelemetryReportingPolicy.canUpload() using a declarative truth table.
 *
 * Each row defines the relevant prefs and policy state (TOU, legacy,
 * in-progress) to verify that canUpload() returns the expected result across
 * combinations.
 */
add_task(async function test_canUpload_truth_table() {
  const unenroll = await enrollPreonboarding({
    enabled: true,
    currentVersion: CURRENT_VERSION,
    minimumVersion: MINIMUM_VERSION,
  });
  registerCleanupFunction(unenroll);

  for (const row of ROWS) {
    info(`ROW: ${row.name}`);
    TelemetryReportingPolicy.reset();
    sinon.restore();
    const modalStub = sinon.stub(Policy, "showModal").returns(true);

    for (const pref of [
      PREONBOARDING_ENABLED_PREF,
      TOU_BYPASS_NOTIFICATION_PREF,
      TOU_ACCEPTED_DATE_PREF,
      TOU_ACCEPTED_VERSION_PREF,
      TOU_PREF_MIGRATION_CHECK,
      TelemetryUtils.Preferences.BypassNotification,
      TelemetryUtils.Preferences.AcceptedPolicyVersion,
      TelemetryUtils.Preferences.AcceptedPolicyDate,
      TelemetryUtils.Preferences.DataSubmissionEnabled,
    ]) {
      Services.prefs.clearUserPref(pref);
    }
    // Normalize browser.preonboarding.enabled across platforms (currently set
    // to "false" by default on Linux).
    Services.prefs.setBoolPref(PREONBOARDING_ENABLED_PREF, true);

    Mutators.inProgressSetFalse();

    setDataSubmissionEnabled(!!row.submissionEnabled);

    // Some callers may evaluate canUpload() before Nimbus variables are
    // initialized. The `preNimbusEvaluate` flag triggers an early call to
    // canUpload() before fakeSessionRestoreNotification(), then checks
    // afterward that the result "converges" once Nimbus state is finalized.
    // This ensures early evaluations don't leave inconsistent or stale policy
    // state.
    if (row.preNimbusEvaluate) {
      const pre = TelemetryReportingPolicy.canUpload();
      info(`Before Nimbus initialization, canUpload() = ${pre}`);
    }

    // Apply conditions
    for (const m of row.A) {
      Mutators[m]();
    }
    for (const m of row.B) {
      Mutators[m]();
    }

    await Policy.fakeSessionRestoreNotification();

    if (row.expectMigration) {
      Assert.ok(
        Services.prefs.getBoolPref(TOU_PREF_MIGRATION_CHECK, false),
        "TOU pref migration ran"
      );
    }

    // Force “in progress” if requested
    if (row.inProgress) {
      Mutators.inProgressSetTrue();
    } else {
      Mutators.inProgressSetFalse();
    }

    const got = TelemetryReportingPolicy.canUpload();
    Assert.equal(
      got,
      row.expect,
      `canUpload() matches expectation for: ${row.name}`
    );

    //  This checks to ensure that that even if canUpload() is called before the
    //  Nimbus Variables are evaluated as part of the _delayedStartup process,
    //  we evaluate them on the fly so that their value is consistent.
    if (row.preNimbusEvaluate) {
      const after = TelemetryReportingPolicy.canUpload();
      Assert.equal(
        after,
        row.expect,
        `After Nimbus initialization, canUpload() converged for: ${row.name}`
      );
    }

    // Per-row teardown
    modalStub.restore();
    Mutators.inProgressSetFalse();
  }
});
