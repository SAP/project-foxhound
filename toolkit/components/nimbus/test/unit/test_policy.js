/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

const { EnterprisePolicyTesting } = ChromeUtils.importESModule(
  "resource://testing-common/EnterprisePolicyTesting.sys.mjs"
);

const RECIPES = [
  NimbusTestUtils.factories.recipe.withFeatureConfig("experiment", {
    featureId: "no-feature-firefox-desktop",
  }),
  NimbusTestUtils.factories.recipe.withFeatureConfig(
    "rollout",
    { featureId: "no-feature-firefox-desktop" },
    { isRollout: true }
  ),
  NimbusTestUtils.factories.recipe.withFeatureConfig(
    "optin",
    { featureId: "no-feature-firefox-desktop" },
    {
      isRollout: true,
      isFirefoxLabsOptIn: true,
      firefoxLabsTitle: "title",
      firefoxLabsDescription: "description",
      firefoxLabsGroup: "group",
      requiresRestart: false,
    }
  ),
];

add_setup(function setup() {
  // Instantiate the enterprise policy service.
  void Cc["@mozilla.org/enterprisepolicies;1"].getService(Ci.nsIObserver);
});

async function doTest({
  policies,
  labsEnabled,
  rolloutsEnabled,
  studiesEnabled,
  existingEnrollments = [],
  expectedEnrollments,
  expectedOptIns,
}) {
  info("Enabling policy");
  await EnterprisePolicyTesting.setupPolicyEngineWithJson({ policies });

  info("Is policy engine active?");
  Assert.equal(
    Services.policies.status,
    Ci.nsIEnterprisePolicies.ACTIVE,
    "Policy engine is active"
  );

  const { cleanup, loader } = await NimbusTestUtils.setupTest({
    init: false,
    storePath: await NimbusTestUtils.createStoreWith(store => {
      for (const slug of existingEnrollments) {
        NimbusTestUtils.addEnrollmentForRecipe(
          RECIPES.find(e => e.slug === slug),
          { store }
        );
      }
    }),
    experiments: RECIPES,
    migrationState: NimbusTestUtils.migrationState.UNMIGRATED,
  });

  sinon.spy(loader, "updateRecipes");
  sinon.spy(loader, "setTimer");

  await ExperimentAPI.init();

  Assert.equal(
    ExperimentAPI.labsEnabled,
    labsEnabled,
    "FirefoxLabs is enabled"
  );
  Assert.equal(
    ExperimentAPI.rolloutsEnabled,
    rolloutsEnabled,
    "Rollouts are enabled"
  );
  Assert.equal(
    ExperimentAPI.studiesEnabled,
    studiesEnabled,
    "Studies are enabled"
  );

  Assert.equal(
    loader._enabled,
    labsEnabled || rolloutsEnabled || studiesEnabled,
    "RemoteSettingsExperimentLoader initialized"
  );

  Assert.equal(
    loader.setTimer.called,
    labsEnabled || rolloutsEnabled || studiesEnabled,
    "RemoteSettingsExperimentLoader polling for recipes"
  );

  Assert.equal(
    loader.updateRecipes.called,
    labsEnabled || rolloutsEnabled || studiesEnabled,
    "RemoteSettingsExperimentLoader polling for recipes"
  );

  Assert.deepEqual(
    ExperimentAPI.manager.store
      .getAll()
      .filter(e => e.active)
      .map(e => e.slug)
      .sort(),
    expectedEnrollments.sort(),
    "Should have expected enrollments"
  );

  Assert.deepEqual(
    ExperimentAPI.manager.optInRecipes.map(e => e.slug).sort(),
    expectedOptIns,
    "Should have expected available opt-ins"
  );

  await NimbusTestUtils.cleanupManager(expectedEnrollments);
  await cleanup();
}

add_task(async function testDisableStudiesPolicy() {
  await doTest({
    policies: { DisableFirefoxStudies: true },
    labsEnabled: true,
    rolloutsEnabled: true,
    studiesEnabled: false,
    expectedEnrollments: ["rollout"],
    expectedOptIns: ["optin"],
  });
});

add_task(async function testDisableLabsPolicy() {
  await doTest({
    policies: { UserMessaging: { FirefoxLabs: false } },
    labsEnabled: false,
    rolloutsEnabled: true,
    studiesEnabled: true,
    expectedEnrollments: ["experiment", "rollout"],
    expectedOptIns: [],
  });
});

add_task(async function testNimbusDisabled() {
  await doTest({
    policies: {
      DisableRemoteImprovements: true,
      DisableFirefoxStudies: true,
      UserMessaging: { FirefoxLabs: false },
    },
    labsEnabled: false,
    rolloutsEnabled: false,
    studiesEnabled: false,
    expectedEnrollments: [],
    expectedOptIns: [],
  });
});

add_task(async function testDisableLabsPolicyCausesUnenrollments() {
  await doTest({
    policies: { UserMessaging: { FirefoxLabs: false } },
    labsEnabled: false,
    rolloutsEnabled: true,
    studiesEnabled: true,
    expectedEnrollments: ["experiment", "rollout"],
    existingEnrollments: ["optin"],
    expectedOptIns: [],
  });
});

add_task(async function testDisableRolloutPolicyCausesUnenrollments() {
  await doTest({
    policies: { DisableRemoteImprovements: true },
    labsEnabled: true,
    rolloutsEnabled: false,
    studiesEnabled: true,
    expectedEnrollments: ["experiment"],
    existingEnrollments: ["rollout"],
    expectedOptIns: ["optin"],
  });
});
