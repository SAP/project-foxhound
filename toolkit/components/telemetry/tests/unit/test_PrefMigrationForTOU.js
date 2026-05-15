/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AppConstants: "resource://gre/modules/AppConstants.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
  TelemetryUtils: "resource://gre/modules/TelemetryUtils.sys.mjs",
});
const { Policy, TelemetryReportingPolicy } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryReportingPolicy.sys.mjs"
);
const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);

NimbusTestUtils.init(this);

const TOU_ACCEPTED_VERSION_PREF = "termsofuse.acceptedVersion";
const TOU_ACCEPTED_DATE_PREF = "termsofuse.acceptedDate";
const TOU_BYPASS_NOTIFICATION_PREF = "termsofuse.bypassNotification";
const TOU_MINIMUM_VERSION_PREF = "termsofuse.minimumVersion";
const TOU_CURRENT_VERSION_PREF = "termsofuse.currentVersion";
const TOU_ROLLOUT_ENROLLED_PREF =
  "browser.preonboarding.enrolledInOnTrainRollout";
const TOU_ROLLOUT_POPULATION_PREF =
  "browser.preonboarding.onTrainRolloutPopulation";
const TOU_PREF_MIGRATION_CHECK = "browser.termsofuse.prefMigrationCheck";
const TOU_PREONBOARDING_ENABLED_PREF = "browser.preonboarding.enabled";
const RELEASE_DATES = TelemetryReportingPolicy.fullOnTrainReleaseDates;
const GENERIC_TOU_TIMESTAMP = 1745000000000;
const ORIGINAL_CHANNEL = TelemetryUtils.getUpdateChannel();
const DEFAULT_BRANCH = Services.prefs.getDefaultBranch("");
const MIGRATED_TOU_VERSION = 4;

const skipIfNotBrowser = () => ({
  skip_if: () => AppConstants.MOZ_BUILD_APP != "browser",
});

add_setup(() => {
  // In head.js, we force TOU pre-onboarding off in xpcshell so Telemetry isn't
  // gated on Browser UI. Revert for these tests.
  const TOS_ENABLED_PREF = "browser.preonboarding.enabled";
  Services.prefs.clearUserPref(TOS_ENABLED_PREF);
});

function setupLegacyAndRolloutPrefs({
  acceptedVersion,
  notifiedTime,
  minVersion,
  currentVersion,
  enrolledInRollout,
  rolloutPopulation,
}) {
  Services.prefs.setIntPref(
    TelemetryUtils.Preferences.AcceptedPolicyVersion,
    acceptedVersion
  );
  Services.prefs.setStringPref(
    TelemetryUtils.Preferences.AcceptedPolicyDate,
    notifiedTime.toString()
  );
  Services.prefs.setIntPref(
    TelemetryUtils.Preferences.MinimumPolicyVersion,
    minVersion
  );
  Services.prefs.setIntPref(
    TelemetryUtils.Preferences.CurrentPolicyVersion,
    currentVersion
  );
  if (enrolledInRollout) {
    Services.prefs.setBoolPref(TOU_ROLLOUT_ENROLLED_PREF, enrolledInRollout);
  }
  if (rolloutPopulation) {
    Services.prefs.setIntPref(TOU_ROLLOUT_POPULATION_PREF, rolloutPopulation);
  }
}

async function checkPrefsAndTelemetryValuesAfterSuccessfulMigration(
  expectedAcceptedDate
) {
  // We started the default version as 4 to distinguish it from version numbers
  // used in the original TOU experiments and rollouts. So, we can expect the
  // TOU accepted, minimum, and current version to be the default (4) after
  // migration.
  const expectedTOUVersion =
    TelemetryReportingPolicy.DEFAULT_TERMS_OF_USE_POLICY_VERSION;

  Assert.equal(
    Services.prefs.getStringPref(TOU_ACCEPTED_DATE_PREF),
    expectedAcceptedDate.toString(),
    "TOU acceptedDate matches expected"
  );
  Assert.equal(
    Services.prefs.getIntPref(TOU_ACCEPTED_VERSION_PREF),
    expectedTOUVersion,
    "TOU acceptedVersion matches expected"
  );
  Assert.equal(
    Services.prefs.getIntPref(TOU_MINIMUM_VERSION_PREF),
    expectedTOUVersion,
    "TOU minimumVersion matches expected"
  );
  Assert.equal(
    Services.prefs.getIntPref(TOU_CURRENT_VERSION_PREF),
    expectedTOUVersion,
    "TOU currentVersion matches expected"
  );
  Assert.ok(
    Services.prefs.getBoolPref(TOU_PREF_MIGRATION_CHECK, false),
    "migration check pref should be true after migration"
  );
  Assert.equal(
    Services.prefs.getIntPref(
      TelemetryUtils.Preferences.AcceptedPolicyVersion,
      0
    ),
    0,
    "Legacy datareporting.acceptedVersion cleared"
  );
  Assert.equal(
    Services.prefs.getStringPref(
      TelemetryUtils.Preferences.AcceptedPolicyDate,
      "0"
    ),
    "0",
    "Legacy datareporting.acceptedDate cleared"
  );
  Assert.ok(
    !Services.prefs.prefHasUserValue(
      TelemetryUtils.Preferences.CurrentPolicyVersion
    ),
    "Legacy current policy version should be cleared"
  );
  Assert.ok(
    !Services.prefs.prefHasUserValue(
      TelemetryUtils.Preferences.MinimumPolicyVersion
    ),
    "Legacy minimum policy version should be cleared"
  );

  Assert.equal(
    Services.prefs.getBoolPref(TOU_PREF_MIGRATION_CHECK, false),
    true,
    "Pref migration complete pref set to true"
  );

  const metricVersion = await Glean.termsofuse.version.testGetValue();
  Assert.equal(
    metricVersion,
    MIGRATED_TOU_VERSION,
    `Glean.termsofuse.version is ${metricVersion} and matches expected ${MIGRATED_TOU_VERSION}`
  );

  const rawMetricDate = await Glean.termsofuse.date.testGetValue();
  // Compare only seconds
  const metricSec = getDateInSeconds(rawMetricDate);
  const expectedSec = getDateInSeconds(expectedAcceptedDate);
  Assert.equal(
    metricSec,
    expectedSec,
    `Glean.termsofuse.date (in seconds) is ${metricSec} and matches expected ${expectedSec}`
  );
}

async function resetState() {
  const legacyDataReportingPrefs = [
    TelemetryUtils.Preferences.AcceptedPolicyVersion,
    TelemetryUtils.Preferences.AcceptedPolicyDate,
    TelemetryUtils.Preferences.MinimumPolicyVersion,
    TelemetryUtils.Preferences.CurrentPolicyVersion,
    TelemetryUtils.Preferences.BypassNotification,
  ];

  const TOUPrefs = [
    TOU_ACCEPTED_VERSION_PREF,
    TOU_ACCEPTED_DATE_PREF,
    TOU_BYPASS_NOTIFICATION_PREF,
    TOU_MINIMUM_VERSION_PREF,
    TOU_CURRENT_VERSION_PREF,
    TOU_PREF_MIGRATION_CHECK,
  ];

  const rolloutPrefs = [TOU_ROLLOUT_ENROLLED_PREF, TOU_ROLLOUT_POPULATION_PREF];

  const prefsToClear = legacyDataReportingPrefs.concat(TOUPrefs, rolloutPrefs);

  prefsToClear.forEach(pref => Services.prefs.clearUserPref(pref));

  Assert.ok(
    true,
    `app.update.channel before being cleared - ${Services.prefs.getDefaultBranch("").getStringPref("app.update.channel")}`
  );

  // undo channel override
  maybeUnlockAppUpdateChannelPref();
  DEFAULT_BRANCH.setStringPref("app.update.channel", ORIGINAL_CHANNEL);
  Assert.equal(
    TelemetryUtils.getUpdateChannel(),
    ORIGINAL_CHANNEL,
    `update channel is reverted to original after being cleared ${TelemetryUtils.getUpdateChannel()} ${ORIGINAL_CHANNEL}`
  );
}

async function runMigrationFlow() {
  TelemetryReportingPolicy.reset();
  await Policy.fakeSessionRestoreNotification();
}

add_setup(async function test_setup() {
  // No bypass by default
  Services.prefs.setBoolPref(
    TelemetryUtils.Preferences.BypassNotification,
    false
  );
  Services.prefs.setBoolPref(TOU_BYPASS_NOTIFICATION_PREF, false);
  do_get_profile();
  Services.fog.initializeFOG();
  TelemetryReportingPolicy.setup();
});

registerCleanupFunction(() => {
  Services.prefs.clearUserPref(TelemetryUtils.Preferences.BypassNotification);
  Services.prefs.clearUserPref(TOU_BYPASS_NOTIFICATION_PREF);
  Services.prefs.clearUserPref(TOU_PREONBOARDING_ENABLED_PREF);
});

add_task(
  skipIfNotBrowser(),
  async function test_tou_pref_migration_for_user_who_accepted_in_nimbus_experiment() {
    const timestamp = GENERIC_TOU_TIMESTAMP;

    setupLegacyAndRolloutPrefs({
      acceptedVersion: 3,
      notifiedTime: timestamp,
      minVersion: 3,
      currentVersion: 3,
    });

    await runMigrationFlow();
    await checkPrefsAndTelemetryValuesAfterSuccessfulMigration(timestamp);

    Assert.equal(
      Services.prefs.getIntPref(TOU_ACCEPTED_VERSION_PREF),
      TelemetryReportingPolicy.DEFAULT_TERMS_OF_USE_POLICY_VERSION,
      "Nimbus experiment - migrated TOU version"
    );
    Assert.equal(
      Services.prefs.getStringPref(TOU_ACCEPTED_DATE_PREF),
      timestamp.toString(),
      "Nimbus experiment - migrated TOU date"
    );

    await resetState();
  }
);

add_task(
  skipIfNotBrowser(),
  async function test_tou_pref_migration_for_user_who_accepted_during_partial_rollout_per_channel() {
    const channels = ["nightly", "beta", "release"];
    for (let channel of channels) {
      const timestamp = parseInt(RELEASE_DATES[channel], 10) + 1;

      setupLegacyAndRolloutPrefs({
        acceptedVersion: 3,
        notifiedTime: timestamp,
        minVersion: 1,
        currentVersion: 2,
        enrolledInRollout: true,
      });

      maybeUnlockAppUpdateChannelPref();
      DEFAULT_BRANCH.setStringPref("app.update.channel", channel);
      Assert.equal(
        TelemetryUtils.getUpdateChannel(),
        channel,
        `getUpdateChannel should reflect override to ${channel}`
      );

      await runMigrationFlow();
      await checkPrefsAndTelemetryValuesAfterSuccessfulMigration(timestamp);

      Assert.equal(
        Services.prefs.getIntPref(TOU_ACCEPTED_VERSION_PREF),
        TelemetryReportingPolicy.DEFAULT_TERMS_OF_USE_POLICY_VERSION,
        `${channel} partial on-train rollout - migrated TOU version`
      );
      Assert.equal(
        Services.prefs.getStringPref(TOU_ACCEPTED_DATE_PREF),
        timestamp.toString(),
        `${channel} partial on-train rollout - migrated TOU date`
      );

      await resetState();
    }
  }
);

add_task(
  skipIfNotBrowser(),
  async function test_tou_pref_migration_for_user_who_accepted_during_full_rollout_nightly() {
    if (AppConstants.platform === "linux") {
      info(
        "Skipping full rollout TOU migration test on Linux. TOU flow was disabled by default for this OS during the full rollout."
      );
      return;
    }
    const timestamp = parseInt(RELEASE_DATES.nightly, 10) + 1;

    setupLegacyAndRolloutPrefs({
      acceptedVersion: 2,
      notifiedTime: timestamp,
      minVersion: 1,
      currentVersion: 2,
      enrolledInRollout: true,
    });

    maybeUnlockAppUpdateChannelPref();
    DEFAULT_BRANCH.setStringPref("app.update.channel", "nightly");

    Assert.equal(
      TelemetryUtils.getUpdateChannel(),
      "nightly",
      "getUpdateChannel should reflect our override"
    );

    await runMigrationFlow();
    await checkPrefsAndTelemetryValuesAfterSuccessfulMigration(timestamp);

    Assert.equal(
      Services.prefs.getIntPref(TOU_ACCEPTED_VERSION_PREF),
      TelemetryReportingPolicy.DEFAULT_TERMS_OF_USE_POLICY_VERSION,
      "Nightly full rollout - migrated TOU version"
    );
    Assert.equal(
      Services.prefs.getStringPref(TOU_ACCEPTED_DATE_PREF),
      timestamp.toString(),
      "Nightly full rollout - migrated TOU date"
    );

    await resetState();
  }
);

add_task(
  skipIfNotBrowser(),
  async function test_tou_pref_migration_for_user_who_accepted_during_full_rollout_beta() {
    if (AppConstants.platform === "linux") {
      info(
        "Skipping full rollout TOU migration test on Linux. TOU flow was disabled by default for this OS during the full rollout."
      );
      return;
    }
    const timestamp = parseInt(RELEASE_DATES.beta, 10) + 1;

    setupLegacyAndRolloutPrefs({
      acceptedVersion: 2,
      notifiedTime: timestamp,
      minVersion: 1,
      currentVersion: 2,
      enrolledInRollout: true,
    });

    maybeUnlockAppUpdateChannelPref();
    DEFAULT_BRANCH.setStringPref("app.update.channel", "beta");

    Assert.equal(
      TelemetryUtils.getUpdateChannel(),
      "beta",
      "getUpdateChannel should reflect our override"
    );

    await runMigrationFlow();
    await checkPrefsAndTelemetryValuesAfterSuccessfulMigration(timestamp);

    Assert.equal(
      Services.prefs.getIntPref(TOU_ACCEPTED_VERSION_PREF),
      TelemetryReportingPolicy.DEFAULT_TERMS_OF_USE_POLICY_VERSION,
      "Beta full rollout - migrated TOU version"
    );
    Assert.equal(
      Services.prefs.getStringPref(TOU_ACCEPTED_DATE_PREF),
      timestamp.toString(),
      "Beta full rollout - migrated TOU date"
    );

    await resetState();
  }
);

add_task(
  skipIfNotBrowser(),
  async function test_tou_pref_migration_for_user_who_accepted_during_full_rollout_release() {
    if (AppConstants.platform === "linux") {
      info(
        "Skipping full rollout TOU migration test on Linux. TOU flow was disabled by default for this OS during the full rollout."
      );
      return;
    }
    const timestamp = parseInt(RELEASE_DATES.release, 10) + 1;

    setupLegacyAndRolloutPrefs({
      acceptedVersion: 2,
      notifiedTime: timestamp,
      minVersion: 1,
      currentVersion: 2,
      enrolledInRollout: true,
    });

    maybeUnlockAppUpdateChannelPref();
    DEFAULT_BRANCH.setStringPref("app.update.channel", "release");

    Assert.equal(
      TelemetryUtils.getUpdateChannel(),
      "release",
      "getUpdateChannel should reflect our override"
    );

    await runMigrationFlow();
    await checkPrefsAndTelemetryValuesAfterSuccessfulMigration(timestamp);

    Assert.equal(
      Services.prefs.getIntPref(TOU_ACCEPTED_VERSION_PREF),
      TelemetryReportingPolicy.DEFAULT_TERMS_OF_USE_POLICY_VERSION,
      "Release full rollout - migrated TOU version"
    );
    Assert.equal(
      Services.prefs.getStringPref(TOU_ACCEPTED_DATE_PREF),
      timestamp.toString(),
      "Release full rollout - migrated TOU date"
    );

    await resetState();
  }
);

add_task(
  skipIfNotBrowser(),
  async function skip_both_tou_and_legacy_datareporting_flows_if_both_bypass_prefs_are_set() {
    Services.prefs.setBoolPref(TOU_BYPASS_NOTIFICATION_PREF, true);
    Services.prefs.setBoolPref(
      TelemetryUtils.Preferences.BypassNotification,
      true
    );

    Assert.ok(
      !TelemetryReportingPolicy.testShouldNotify(),
      "Legacy flow and TOU flow skipped when both bypass prefs are set"
    );

    await resetState();
  }
);

add_task(
  skipIfNotBrowser(),
  async function test_no_migration_for_users_who_accepted_during_full_on_train_rollout_when_preonboarding_disabled() {
    const timestamp = parseInt(RELEASE_DATES.nightly, 10) + 1;
    setupLegacyAndRolloutPrefs({
      acceptedVersion: 2,
      notifiedTime: timestamp,
      minVersion: 1,
      currentVersion: 2,
      enrolledInRollout: true,
    });

    maybeUnlockAppUpdateChannelPref();
    DEFAULT_BRANCH.setStringPref("app.update.channel", "nightly");

    Services.prefs.setBoolPref(TOU_PREONBOARDING_ENABLED_PREF, false);

    await runMigrationFlow();
    Assert.equal(
      Services.prefs.getStringPref(TOU_ACCEPTED_DATE_PREF, "0"),
      "0",
      "When preonboarding disabled, acceptedDate stays unset"
    );
    Assert.equal(
      Services.prefs.getIntPref(TOU_ACCEPTED_VERSION_PREF, 0),
      0,
      "When preonboarding disabled, acceptedVersion stays unset"
    );

    await resetState();
    Services.prefs.clearUserPref(TOU_PREONBOARDING_ENABLED_PREF);
  }
);

add_task(
  skipIfNotBrowser(),
  async function test_experiment_acceptance_ignores_preonboarding_disabled() {
    // Experiment and partial rollout users (where accepted version is 3) should
    // still migrate even if TOU flow disabled
    const timestamp = GENERIC_TOU_TIMESTAMP;
    setupLegacyAndRolloutPrefs({
      acceptedVersion: 3,
      notifiedTime: timestamp,
      minVersion: 3,
      currentVersion: 3,
      enrolledInRollout: true,
    });

    Services.prefs.setBoolPref(TOU_PREONBOARDING_ENABLED_PREF, false);

    await runMigrationFlow();
    await checkPrefsAndTelemetryValuesAfterSuccessfulMigration(timestamp);

    await resetState();
    Services.prefs.clearUserPref(TOU_PREONBOARDING_ENABLED_PREF);
  }
);

add_task(
  skipIfNotBrowser(),
  async function test_tou_bypass_pref_migrates_from_legacy_datareporting() {
    Services.prefs.clearUserPref(TelemetryUtils.Preferences.BypassNotification);
    Services.prefs.clearUserPref(TOU_BYPASS_NOTIFICATION_PREF);

    Services.prefs.setBoolPref(
      TelemetryUtils.Preferences.BypassNotification,
      true
    );

    Services.prefs.setBoolPref(TOU_BYPASS_NOTIFICATION_PREF, false);

    // Simulate that user accepted as part of an on-train rollout
    setupLegacyAndRolloutPrefs({
      acceptedVersion: 3,
      notifiedTime: GENERIC_TOU_TIMESTAMP,
      minVersion: 3,
      currentVersion: 3,
      enrolledInRollout: true,
      rolloutPopulation: 1000,
    });

    Assert.equal(
      Services.prefs.getBoolPref(TOU_BYPASS_NOTIFICATION_PREF, false),
      false,
      "termsofuse.bypassNotification is false before migration check"
    );

    await runMigrationFlow();

    Assert.ok(
      Services.prefs.getBoolPref(TOU_BYPASS_NOTIFICATION_PREF, false),
      "termsofuse.bypassNotification should be updated to true when legacy bypassNotification is true"
    );

    await checkPrefsAndTelemetryValuesAfterSuccessfulMigration(
      GENERIC_TOU_TIMESTAMP
    );

    await resetState();
  }
);

add_task(
  skipIfNotBrowser(),
  async function test_tou_bypass_not_set_when_legacy_false() {
    Services.prefs.clearUserPref(TelemetryUtils.Preferences.BypassNotification);
    Services.prefs.clearUserPref(TOU_BYPASS_NOTIFICATION_PREF);

    Services.prefs.setBoolPref(
      TelemetryUtils.Preferences.BypassNotification,
      false
    );

    Services.prefs.setBoolPref(TOU_BYPASS_NOTIFICATION_PREF, false);

    // Simulate that user accepted as part of an on-train rollout
    setupLegacyAndRolloutPrefs({
      acceptedVersion: 3,
      notifiedTime: GENERIC_TOU_TIMESTAMP,
      minVersion: 3,
      currentVersion: 3,
      enrolledInRollout: true,
      rolloutPopulation: 1000,
    });

    Services.prefs.setBoolPref(TOU_BYPASS_NOTIFICATION_PREF, false);

    Assert.equal(
      Services.prefs.getBoolPref(TOU_BYPASS_NOTIFICATION_PREF, false),
      false,
      "termsofuse.bypassNotification is false before migration check"
    );

    await runMigrationFlow();

    Assert.equal(
      Services.prefs.getBoolPref(TOU_BYPASS_NOTIFICATION_PREF, false),
      false,
      "termsofuse.bypassNotification must stay false when legacy bypassNotification is false"
    );

    await resetState();
  }
);

add_task(
  skipIfNotBrowser(),
  async function test_no_migration_for_users_who_accepted_legacy_flow() {
    const timestamp = GENERIC_TOU_TIMESTAMP;

    // User accepted via legacy flow
    setupLegacyAndRolloutPrefs({
      acceptedVersion: 2,
      notifiedTime: timestamp,
      minVersion: 2,
      currentVersion: 2,
    });

    await runMigrationFlow();

    Assert.equal(
      Services.prefs.getStringPref(TOU_ACCEPTED_DATE_PREF, "0"),
      "0",
      "If user accepted legacy datareporting flow, TOU accepted date should remain unset"
    );
    Assert.equal(
      Services.prefs.getIntPref(TOU_ACCEPTED_VERSION_PREF, 0),
      0,
      "If user accepted legacy datareporting flow, accepted version should remain unset"
    );

    Assert.ok(
      Services.prefs.getBoolPref(TOU_PREF_MIGRATION_CHECK, false),
      "If user accepted legacy datareporting flow, migration check pref should be true"
    );

    Assert.ok(
      !TelemetryReportingPolicy.userHasAcceptedTOU(),
      "If user accepted legacy datareporting flow, hasUserAcceptedCurrentTOU should be false"
    );

    await resetState();
  }
);

add_task(
  skipIfNotBrowser(),
  async function test_no_migration_when_TOU_modal_seen_but_not_accepted() {
    let showStub = sinon.stub(Policy, "showModal").resolves(false);

    maybeUnlockAppUpdateChannelPref();
    DEFAULT_BRANCH.setStringPref("app.update.channel", "release");

    // User saw TOU modal during an experiment or on-train rollout, but has not
    // accepted
    setupLegacyAndRolloutPrefs({
      acceptedVersion: 0,
      notifiedTime: 0,
      minVersion: 3,
      currentVersion: 3,
    });

    await runMigrationFlow();
    await Policy.delayedSetup();

    Assert.equal(
      Services.prefs.getStringPref(TOU_ACCEPTED_DATE_PREF, "0"),
      "0",
      "If user saw TOU, but didn't accept, TOU accepted date should remain unset"
    );

    Assert.equal(
      Services.prefs.getIntPref(TOU_ACCEPTED_VERSION_PREF, 0),
      0,
      "If user saw TOU, but didn't accept, TOU accepted version should remain unset"
    );

    Assert.ok(
      Services.prefs.getBoolPref(TOU_PREF_MIGRATION_CHECK, false),
      "If user saw TOU, but didn't accept, migration check pref should be true"
    );

    showStub.restore();
    await resetState();
  }
);

add_task(
  skipIfNotBrowser(),
  async function test_will_not_notify_via_legacy_flow_after_TOU_accepted_via_migration() {
    const timestamp = GENERIC_TOU_TIMESTAMP;

    // Before migration, legacy flow would show
    Assert.ok(
      TelemetryReportingPolicy.testShouldNotify(),
      "Legacy data reporting flow would show before migration"
    );

    // Simulate that user accepted as part of an on-train rollout
    setupLegacyAndRolloutPrefs({
      acceptedVersion: 3,
      notifiedTime: timestamp,
      minVersion: 3,
      currentVersion: 3,
      enrolledInRollout: true,
      rolloutPopulation: 1000,
    });

    await runMigrationFlow();

    Assert.ok(
      TelemetryReportingPolicy.userHasAcceptedTOU(),
      "TOU prefs migrated from legacy rollout"
    );

    Assert.ok(
      !TelemetryReportingPolicy.testShouldNotify(),
      "Legacy data reporting flow should not show once TOU is accepted via migration"
    );

    await resetState();
  }
);

add_task(
  skipIfNotBrowser(),
  async function test_tou_pref_migration_runs_on_subsequent_startup_after_initial_noop() {
    const timestamp = GENERIC_TOU_TIMESTAMP;
    // User accepted via legacy flow
    setupLegacyAndRolloutPrefs({
      acceptedVersion: 2,
      notifiedTime: timestamp,
      minVersion: 2,
      currentVersion: 2,
    });

    await runMigrationFlow();

    Assert.ok(
      !Services.prefs.prefHasUserValue(TOU_ACCEPTED_DATE_PREF),
      "Initial migration should not set TOU accepted date"
    );
    Assert.ok(
      !Services.prefs.prefHasUserValue(TOU_ACCEPTED_VERSION_PREF),
      "Initial migration should not set TOU accepted version"
    );

    const updatedTimestamp = timestamp + 1;
    // Simulate TOU experiment acceptance after initial pref migration check
    Services.prefs.setIntPref(
      TelemetryUtils.Preferences.AcceptedPolicyVersion,
      3
    );
    Services.prefs.setStringPref(
      TelemetryUtils.Preferences.AcceptedPolicyDate,
      updatedTimestamp.toString()
    );

    await runMigrationFlow();
    await checkPrefsAndTelemetryValuesAfterSuccessfulMigration(
      updatedTimestamp
    );

    await resetState();
    sinon.restore();
  }
);
