"use strict";

const { TelemetryEnvironment } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryEnvironment.sys.mjs"
);
const { FirefoxLabs } = ChromeUtils.importESModule(
  "resource://nimbus/FirefoxLabs.sys.mjs"
);

const ROLLOUTS_ENABLED_PREF = "nimbus.rollouts.enabled";
const STUDIES_ENABLED_PREF = "app.shield.optoutstudies.enabled";
const UPLOAD_ENABLED_PREF = "datareporting.healthreport.uploadEnabled";

add_setup(function test_setup() {
  Services.fog.initializeFOG();
});

function setupTest({ ...args } = {}) {
  return NimbusTestUtils.setupTest({ ...args, clearTelemetry: true });
}

/**
 * Normal unenrollment for experiments:
 * - set .active to false
 * - set experiment inactive in telemetry
 * - send unrollment event
 */
add_task(async function test_set_inactive() {
  const { manager, cleanup } = await setupTest();

  await manager.enroll(NimbusTestUtils.factories.recipe("foo"), "test");
  manager.unenroll("foo");

  Assert.equal(
    manager.store.get("foo").active,
    false,
    "should set .active to false"
  );

  await cleanup();
});

async function doOptOutTest({
  rolloutsEnabled = true,
  studiesEnabled = true,
} = {}) {
  Services.prefs.setBoolPref(ROLLOUTS_ENABLED_PREF, true);
  Services.prefs.setBoolPref(STUDIES_ENABLED_PREF, true);

  const recipes = {
    experiment: NimbusTestUtils.factories.recipe.withFeatureConfig(
      "experiment",
      { featureId: "no-feature-firefox-desktop" }
    ),
    rollout: NimbusTestUtils.factories.recipe.withFeatureConfig(
      "rollout",
      { featureId: "no-feature-firefox-desktop" },
      { isRollout: true }
    ),
    optin: NimbusTestUtils.factories.recipe.withFeatureConfig(
      "optin",
      { featureId: "no-feature-firefox-desktop" },
      {
        isRollout: true,
        isFirefoxLabsOptIn: true,
        firefoxLabsTitle: "title",
        firefoxLabsDescription: "description",
        firefoxLabsDescriptionLinks: null,
        firefoxLabsGroup: "group",
        requiresRestart: false,
      }
    ),
  };

  const { manager, cleanup } = await setupTest({
    experiments: Object.values(recipes),
  });

  const labs = await FirefoxLabs.create();
  await labs.enroll(recipes.optin.slug, "control");

  // Check that there aren't any Glean normandy unenrollNimbusExperiment events yet
  Assert.equal(
    Glean.normandy.unenrollNimbusExperiment.testGetValue("events"),
    undefined,
    "no Glean normandy unenrollNimbusExperiment events before unenrollment"
  );

  // Check that there aren't any Glean unenrollment events yet
  Assert.equal(
    Glean.nimbusEvents.unenrollment.testGetValue("events"),
    undefined,
    "no Glean unenrollment events before unenrollment"
  );

  Services.prefs.setBoolPref(ROLLOUTS_ENABLED_PREF, rolloutsEnabled);
  Services.prefs.setBoolPref(STUDIES_ENABLED_PREF, studiesEnabled);

  await NimbusTestUtils.assert.enrollmentExists(recipes.experiment.slug, {
    active: studiesEnabled,
  });
  Assert.equal(
    manager.store.get(recipes.experiment.slug).active,
    studiesEnabled
  );

  await NimbusTestUtils.assert.enrollmentExists(recipes.rollout.slug, {
    active: rolloutsEnabled,
  });
  Assert.equal(manager.store.get(recipes.rollout.slug).active, rolloutsEnabled);

  await NimbusTestUtils.assert.enrollmentExists(recipes.optin.slug, {
    active: true,
  });
  Assert.ok(manager.store.get(recipes.optin.slug).active);

  const normandyEvents =
    Glean.normandy.unenrollNimbusExperiment
      .testGetValue("events")
      ?.map(ev => ev.extra) ?? [];
  const nimbusEvents =
    Glean.nimbusEvents.unenrollment
      .testGetValue("events")
      ?.map(ev => ev.extra) ?? [];

  const unenrolledSlugs = [];
  if (!rolloutsEnabled) {
    unenrolledSlugs.push(recipes.rollout.slug);
  }
  if (!studiesEnabled) {
    unenrolledSlugs.push(recipes.experiment.slug);
  }

  Assert.deepEqual(
    normandyEvents,
    unenrolledSlugs.map(slug => ({
      value: slug,
      branch: "control",
      reason: recipes[slug].isRollout ? "rollouts-opt-out" : "studies-opt-out",
    })),
    "Expected normandy unenroll events"
  );

  Assert.deepEqual(
    nimbusEvents,
    unenrolledSlugs.map(slug => ({
      experiment: slug,
      branch: "control",
      reason: recipes[slug].isRollout ? "rollouts-opt-out" : "studies-opt-out",
    })),
    "Expected nimbus unenroll events"
  );

  if (rolloutsEnabled) {
    manager.unenroll(recipes.rollout.slug, { reason: "test" });
  }
  if (studiesEnabled) {
    manager.unenroll(recipes.experiment.slug, { reason: "test" });
  }

  labs.unenroll(recipes.optin.slug);
  await cleanup();

  Services.prefs.clearUserPref(ROLLOUTS_ENABLED_PREF);
  Services.prefs.clearUserPref(STUDIES_ENABLED_PREF);
}

add_task(async function testUnenrollStudiesOptOut() {
  await doOptOutTest({ studiesEnabled: false });
});

add_task(async function testUnenrollRolloutOptOut() {
  await doOptOutTest({ rolloutsEnabled: false });
});

add_task(async function testUnenrollAllOptOut() {
  await doOptOutTest({ rolloutsEnabled: false, studiesEnabled: false });
});

add_task(async function test_unenroll_uploadPref() {
  const { manager, cleanup } = await setupTest();
  const recipe = NimbusTestUtils.factories.recipe("foo");

  await manager.store.init();
  await manager.onStartup();
  await NimbusTestUtils.enroll(recipe, { manager });

  Assert.equal(
    manager.store.get(recipe.slug).active,
    true,
    "Should set .active to true"
  );

  Services.prefs.setBoolPref(UPLOAD_ENABLED_PREF, false);

  await NimbusTestUtils.assert.enrollmentExists(recipe.slug, { active: false });

  Assert.equal(
    manager.store.get(recipe.slug).active,
    false,
    "Should set .active to false"
  );

  await cleanup();
  Services.prefs.clearUserPref(UPLOAD_ENABLED_PREF);
});

add_task(async function test_setExperimentInactive_called() {
  const { sandbox, manager, cleanup } = await setupTest();
  sandbox.spy(TelemetryEnvironment, "setExperimentInactive");

  const experiment = NimbusTestUtils.factories.recipe("foo");

  await manager.enroll(experiment, "test");

  // Test Glean experiment API interaction
  Assert.notEqual(
    undefined,
    Services.fog.testGetExperimentData(experiment.slug),
    "experiment should be active before unenroll"
  );

  manager.unenroll("foo");

  Assert.ok(
    TelemetryEnvironment.setExperimentInactive.calledWith("foo"),
    "should call TelemetryEnvironment.setExperimentInactive with slug"
  );

  // Test Glean experiment API interaction
  Assert.equal(
    undefined,
    Services.fog.testGetExperimentData(experiment.slug),
    "experiment should be inactive after unenroll"
  );

  await cleanup();
});

add_task(async function test_send_unenroll_event() {
  const { manager, cleanup } = await setupTest();
  const experiment = NimbusTestUtils.factories.recipe.withFeatureConfig("foo", {
    featureId: "testFeature",
  });

  await manager.enroll(experiment, "test");

  // Check that there aren't any Glean normandy unenrollNimbusExperiment events yet
  Assert.equal(
    Glean.normandy.unenrollNimbusExperiment.testGetValue("events"),
    undefined,
    "no Glean normandy unenrollNimbusExperiment events before unenrollment"
  );

  // Check that there aren't any Glean unenrollment events yet
  Assert.equal(
    Glean.nimbusEvents.unenrollment.testGetValue("events"),
    undefined,
    "no Glean unenrollment events before unenrollment"
  );

  manager.unenroll("foo", { reason: "some-reason" });

  // We expect only one event and that that one event matches the expected enrolled experiment
  Assert.deepEqual(
    Glean.normandy.unenrollNimbusExperiment
      .testGetValue("events")
      .map(ev => ev.extra),
    [
      {
        value: experiment.slug,
        branch: experiment.branches[0].slug,
        reason: "some-reason",
      },
    ]
  );

  // We expect only one event and that that one event matches the expected enrolled experiment
  Assert.deepEqual(
    Glean.nimbusEvents.unenrollment.testGetValue("events").map(ev => ev.extra),
    [
      {
        experiment: experiment.slug,
        branch: experiment.branches[0].slug,
        reason: "some-reason",
      },
    ]
  );

  await cleanup();
});

add_task(async function test_undefined_reason() {
  const { manager, cleanup } = await setupTest();
  const experiment = NimbusTestUtils.factories.recipe("foo");

  await manager.enroll(experiment, "test");

  manager.unenroll("foo");

  // We expect only one event and that that one event reason matches the expected reason
  Assert.deepEqual(
    Glean.normandy.unenrollNimbusExperiment
      .testGetValue("events")
      .map(ev => ev.extra.reason),
    ["unknown"]
  );

  // We expect only one event and that that one event reason matches the expected reason
  Assert.deepEqual(
    Glean.nimbusEvents.unenrollment
      .testGetValue("events")
      .map(ev => ev.extra.reason),
    ["unknown"]
  );

  await cleanup();
});

/**
 * Normal unenrollment for rollouts:
 * - remove stored enrollment and synced data (prefs)
 * - set rollout inactive in telemetry
 * - send unrollment event
 */

add_task(async function test_remove_rollouts() {
  Services.fog.applyServerKnobsConfig(
    JSON.stringify({
      metrics_enabled: {
        "nimbus_events.enrollment_status": true,
      },
    })
  );

  const { sandbox, manager, cleanup } = await setupTest();
  sandbox.spy(manager.store, "deactivateEnrollment");
  const rollout = NimbusTestUtils.factories.rollout("foo");

  await manager.enroll(
    NimbusTestUtils.factories.recipe("foo", { isRollout: true }),
    "test"
  );

  manager.unenroll("foo", { reason: "some-reason" });

  Assert.ok(
    manager.store.deactivateEnrollment.calledOnceWithExactly(
      rollout.slug,
      "some-reason"
    ),
    "Called with expected parameters"
  );

  await cleanup();
});

add_task(async function test_unenroll_individualOptOut_statusTelemetry() {
  Services.fog.applyServerKnobsConfig(
    JSON.stringify({
      metrics_enabled: {
        "nimbus_events.enrollment_status": true,
      },
    })
  );

  const { manager, cleanup } = await setupTest();

  await manager.enroll(
    NimbusTestUtils.factories.recipe.withFeatureConfig("foo", {
      featureId: "testFeature",
    }),
    "test"
  );

  manager.unenroll("foo", { reason: "individual-opt-out" });

  Assert.deepEqual(
    Glean.nimbusEvents.enrollmentStatus
      .testGetValue("nimbus-targeting-context")
      ?.map(ev => ev.extra),
    [
      {
        status: "Enrolled",
        reason: "Qualified",
        slug: "foo",
        branch: "control",
      },
      {
        branch: "control",
        reason: "OptOut",
        status: "Disqualified",
        slug: "foo",
      },
    ]
  );

  await cleanup();
});

add_task(async function testUnenrollBogusReason() {
  Services.fog.applyServerKnobsConfig(
    JSON.stringify({
      metrics_enabled: {
        "nimbus_events.enrollment_status": true,
      },
    })
  );

  const { manager, cleanup } = await setupTest();

  await manager.enroll(
    NimbusTestUtils.factories.recipe("bogus", {
      branches: [NimbusTestUtils.factories.recipe.branches[0]],
    }),
    "test"
  );

  Assert.ok(manager.store.get("bogus").active, "Enrollment active");

  manager.unenroll("bogus", "bogus");

  Assert.deepEqual(
    Glean.nimbusEvents.enrollmentStatus
      .testGetValue("nimbus-targeting-context")
      ?.map(ev => ev.extra),
    [
      {
        branch: "control",
        status: "Enrolled",
        reason: "Qualified",
        slug: "bogus",
      },
      {
        status: "Disqualified",
        slug: "bogus",
        reason: "Error",
        error_string: "unknown",
        branch: "control",
      },
    ]
  );

  Assert.deepEqual(
    Glean.nimbusEvents.unenrollment.testGetValue("events")?.map(ev => ev.extra),
    [
      {
        experiment: "bogus",
        branch: "control",
        reason: "unknown",
      },
    ]
  );

  Assert.deepEqual(
    Glean.normandy.unenrollNimbusExperiment
      .testGetValue("events")
      ?.map(ev => ev.extra),
    [
      {
        value: "bogus",
        branch: "control",
        reason: "unknown",
      },
    ]
  );

  await cleanup();
});
