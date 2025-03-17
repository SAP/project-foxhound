"use strict";

const { ExperimentAPI, _ExperimentFeature: ExperimentFeature } =
  ChromeUtils.importESModule("resource://nimbus/ExperimentAPI.sys.mjs");

const { JsonSchema } = ChromeUtils.importESModule(
  "resource://gre/modules/JsonSchema.sys.mjs"
);

ChromeUtils.defineLazyGetter(this, "fetchSchema", () => {
  return fetch("resource://nimbus/schemas/NimbusEnrollment.schema.json", {
    credentials: "omit",
  }).then(rsp => rsp.json());
});

const NON_MATCHING_ROLLOUT = Object.freeze(
  ExperimentFakes.rollout("non-matching-rollout", {
    branch: {
      slug: "slug",
      features: [
        {
          featureId: "aboutwelcome",
          value: { enabled: false },
        },
      ],
    },
  })
);
const MATCHING_ROLLOUT = Object.freeze(
  ExperimentFakes.rollout("matching-rollout", {
    branch: {
      slug: "slug",
      features: [
        {
          featureId: "aboutwelcome",
          value: { enabled: false },
        },
      ],
    },
  })
);

const AW_FAKE_MANIFEST = {
  description: "Different manifest with a special test variable",
  isEarlyStartup: true,
  variables: {
    remoteValue: {
      type: "boolean",
      description: "Test value",
    },
    mochitest: {
      type: "boolean",
    },
    enabled: {
      type: "boolean",
    },
  },
};

async function setupForExperimentFeature() {
  const sandbox = sinon.createSandbox();
  const manager = ExperimentFakes.manager();

  await manager.onStartup();

  sandbox.stub(ExperimentAPI, "_store").get(() => manager.store);

  return { sandbox, manager };
}

add_task(async function validSchema() {
  const validator = new JsonSchema.Validator(await fetchSchema, {
    shortCircuit: false,
  });

  {
    const result = validator.validate(NON_MATCHING_ROLLOUT);
    Assert.ok(result.valid, JSON.stringify(result.errors, undefined, 2));
  }
  {
    const result = validator.validate(MATCHING_ROLLOUT);
    Assert.ok(result.valid, JSON.stringify(result.errors, undefined, 2));
  }
});

add_task(async function readyCallAfterStore_with_remote_value() {
  let { sandbox, manager } = await setupForExperimentFeature();
  let feature = new ExperimentFeature("aboutwelcome");

  Assert.ok(feature.getVariable("enabled"), "Feature is true by default");

  await manager.store.addEnrollment(MATCHING_ROLLOUT);

  Assert.ok(!feature.getVariable("enabled"), "Loads value from store");

  manager.unenroll(MATCHING_ROLLOUT.slug, "test-cleanup");

  sandbox.restore();
  await assertEmptyStore(manager.store);
});

add_task(async function has_sync_value_before_ready() {
  let { manager } = await setupForExperimentFeature();
  let feature = new ExperimentFeature("aboutwelcome", AW_FAKE_MANIFEST);

  Assert.equal(
    feature.getVariable("remoteValue"),
    undefined,
    "Feature is true by default"
  );

  Services.prefs.setStringPref(
    "nimbus.syncdefaultsstore.aboutwelcome",
    JSON.stringify({
      ...MATCHING_ROLLOUT,
      branch: { feature: MATCHING_ROLLOUT.branch.features[0] },
    })
  );

  Services.prefs.setBoolPref(
    "nimbus.syncdefaultsstore.aboutwelcome.remoteValue",
    true
  );

  Assert.equal(feature.getVariable("remoteValue"), true, "Sync load from pref");

  Services.prefs.clearUserPref("nimbus.syncdefaultsstore.aboutwelcome");
  Services.prefs.clearUserPref(
    "nimbus.syncdefaultsstore.aboutwelcome.remoteValue"
  );
  await assertEmptyStore(manager.store);
});

add_task(async function update_remote_defaults_onUpdate() {
  let { sandbox, manager } = await setupForExperimentFeature();
  let feature = new ExperimentFeature("aboutwelcome");
  let stub = sandbox.stub();

  feature.onUpdate(stub);

  await manager.store.addEnrollment(MATCHING_ROLLOUT);

  Assert.ok(stub.called, "update event called");
  Assert.equal(stub.callCount, 1, "Called once for remote configs");
  Assert.equal(stub.firstCall.args[1], "rollout-updated", "Correct reason");

  manager.unenroll(MATCHING_ROLLOUT.slug, "test-cleanup");

  sandbox.restore();
  await assertEmptyStore(manager.store);
});

add_task(async function test_features_over_feature() {
  let { sandbox, manager } = await setupForExperimentFeature();
  let feature = new ExperimentFeature("aboutwelcome");
  const rollout_features_and_feature = Object.freeze(
    ExperimentFakes.rollout("matching-rollout", {
      branch: {
        slug: "slug",
        feature: {
          featureId: "aboutwelcome",
          value: { enabled: false },
        },
        features: [
          {
            featureId: "aboutwelcome",
            value: { enabled: true },
          },
        ],
      },
    })
  );
  const rollout_just_feature = Object.freeze(
    ExperimentFakes.rollout("matching-rollout", {
      branch: {
        slug: "slug",
        feature: {
          featureId: "aboutwelcome",
          value: { enabled: false },
        },
      },
    })
  );

  await manager.store.addEnrollment(rollout_features_and_feature);
  Assert.ok(
    feature.getVariable("enabled"),
    "Should read from the features property over feature"
  );

  manager.store._deleteForTests("aboutwelcome");
  manager.store._deleteForTests("matching-rollout");

  await manager.store.addEnrollment(rollout_just_feature);
  Assert.ok(
    !feature.getVariable("enabled"),
    "Should read from the feature property when features doesn't exist"
  );

  manager.store._deleteForTests("aboutwelcome");
  manager.store._deleteForTests("matching-rollout");

  await assertEmptyStore(manager.store);

  sandbox.restore();
});

add_task(async function update_remote_defaults_readyPromise() {
  let { sandbox, manager } = await setupForExperimentFeature();
  let feature = new ExperimentFeature("aboutwelcome");
  let stub = sandbox.stub();

  feature.onUpdate(stub);

  await manager.store.addEnrollment(MATCHING_ROLLOUT);

  Assert.ok(stub.calledOnce, "Update called after enrollment processed.");
  Assert.ok(
    stub.calledWith("featureUpdate:aboutwelcome", "rollout-updated"),
    "Update called after enrollment processed."
  );

  manager.unenroll(MATCHING_ROLLOUT.slug, "test-cleanup");
  await assertEmptyStore(manager.store);
  sandbox.restore();
});

add_task(async function update_remote_defaults_enabled() {
  let { sandbox, manager } = await setupForExperimentFeature();
  let feature = new ExperimentFeature("aboutwelcome");

  Assert.equal(
    feature.getVariable("enabled"),
    true,
    "Feature is enabled by manifest.variables.enabled"
  );

  await manager.store.addEnrollment(NON_MATCHING_ROLLOUT);

  Assert.ok(
    !feature.getVariable("enabled"),
    "Feature is disabled by remote configuration"
  );

  manager.unenroll(NON_MATCHING_ROLLOUT.slug, "test-cleanup");
  await assertEmptyStore(manager.store);
  sandbox.restore();
});

// If the branch data returned from the store is not modified
// this test should not throw
add_task(async function test_getVariable_no_mutation() {
  let { sandbox, manager } = await setupForExperimentFeature();
  sandbox.stub(manager.store, "getExperimentForFeature").returns(
    Cu.cloneInto(
      {
        branch: {
          features: [{ featureId: "aboutwelcome", value: { mochitest: true } }],
        },
      },
      {},
      { deepFreeze: true }
    )
  );
  let feature = new ExperimentFeature("aboutwelcome", AW_FAKE_MANIFEST);

  Assert.ok(feature.getVariable("mochitest"), "Got back the expected feature");

  await assertEmptyStore(manager.store);
  sandbox.restore();
});

add_task(async function remote_isEarlyStartup_config() {
  let { manager } = await setupForExperimentFeature();
  let rollout = ExperimentFakes.rollout("password-autocomplete", {
    branch: {
      slug: "remote-config-isEarlyStartup",
      features: [
        {
          featureId: "password-autocomplete",
          enabled: true,
          value: { remote: true },
          isEarlyStartup: true,
        },
      ],
    },
  });

  await manager.onStartup();
  await manager.store.addEnrollment(rollout);

  Assert.ok(
    Services.prefs.prefHasUserValue(
      "nimbus.syncdefaultsstore.password-autocomplete"
    ),
    "Configuration is marked early startup"
  );

  Services.prefs.clearUserPref(
    "nimbus.syncdefaultsstore.password-autocomplete"
  );

  manager.unenroll(rollout.slug, "test-cleanup");
  await assertEmptyStore(manager.store);
});
