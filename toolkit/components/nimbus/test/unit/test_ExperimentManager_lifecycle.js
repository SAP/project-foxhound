"use strict";

const { Sampling } = ChromeUtils.importESModule(
  "resource://gre/modules/components-utils/Sampling.sys.mjs"
);

const { MatchStatus } = ChromeUtils.importESModule(
  "resource://nimbus/lib/RemoteSettingsExperimentLoader.sys.mjs"
);

const { NimbusTelemetry } = ChromeUtils.importESModule(
  "resource://nimbus/lib/Telemetry.sys.mjs"
);
const { UnenrollmentCause } = ChromeUtils.importESModule(
  "resource://nimbus/lib/ExperimentManager.sys.mjs"
);

const { ProfilesDatastoreService } = ChromeUtils.importESModule(
  "moz-src:///toolkit/profile/ProfilesDatastoreService.sys.mjs"
);

const { RemoteSettingsExperimentLoader } = ChromeUtils.importESModule(
  "resource://nimbus/lib/RemoteSettingsExperimentLoader.sys.mjs"
);

/**
 * onStartup()
 * - should set call setExperimentActive for each active experiment
 */
add_task(async function test_onStartup_setExperimentActive_called() {
  const { sandbox, manager, cleanup } = await NimbusTestUtils.setupTest({
    init: false,
    storePath: await NimbusTestUtils.createStoreWith(store => {
      NimbusTestUtils.addEnrollmentForRecipe(
        NimbusTestUtils.factories.recipe("foo"),
        { store, branchSlug: "control", extra: { source: "test" } }
      );
      NimbusTestUtils.addEnrollmentForRecipe(
        NimbusTestUtils.factories.recipe("bar", { isRollout: true }),
        { store, extra: { source: "test" } }
      );
      NimbusTestUtils.addEnrollmentForRecipe(
        NimbusTestUtils.factories.recipe("baz"),
        {
          store,
          branchSlug: "control",
          extra: { active: false, source: "test" },
        }
      );
      NimbusTestUtils.addEnrollmentForRecipe(
        NimbusTestUtils.factories.recipe("qux", { isRollout: true }),
        { store, extra: { active: false, source: "test" } }
      );
    }),
    migrationState: NimbusTestUtils.migrationState.LATEST,
  });

  sandbox.stub(NimbusTelemetry, "setExperimentActive");

  await ExperimentAPI.init();

  Assert.ok(
    NimbusTelemetry.setExperimentActive.calledWith(sinon.match({ slug: "foo" }))
  );
  Assert.ok(
    NimbusTelemetry.setExperimentActive.calledWith(sinon.match({ slug: "bar" }))
  );
  Assert.ok(
    !NimbusTelemetry.setExperimentActive.calledWith(
      sinon.match({ slug: "baz" })
    )
  );
  Assert.ok(
    !NimbusTelemetry.setExperimentActive.calledWith(
      sinon.match({ slug: "qux" })
    )
  );

  manager.unenroll("foo");
  manager.unenroll("bar");

  await cleanup();
});

add_task(async function test_startup_unenroll() {
  Services.prefs.setBoolPref("app.shield.optoutstudies.enabled", false);

  const { sandbox, manager, cleanup } = await NimbusTestUtils.setupTest({
    init: false,
    storePath: await NimbusTestUtils.createStoreWith(store => {
      NimbusTestUtils.addEnrollmentForRecipe(
        NimbusTestUtils.factories.recipe("startup_unenroll"),
        { store, branchSlug: "control" }
      );
    }),
    migrationState: NimbusTestUtils.migrationState.LATEST,
  });

  sandbox.spy(manager, "_unenroll");

  await ExperimentAPI.init();

  Assert.ok(
    manager._unenroll.calledOnceWith(
      sinon.match({ slug: "startup_unenroll" }),
      {
        reason: "studies-opt-out",
      }
    ),
    "Called unenroll for expected recipe"
  );

  Services.prefs.clearUserPref("app.shield.optoutstudies.enabled");

  await cleanup();
});

add_task(async function test_onRecipe_enroll() {
  const { sandbox, manager, cleanup } = await NimbusTestUtils.setupTest();

  sandbox.stub(manager, "isInBucketAllocation").resolves(true);
  sandbox.stub(Sampling, "bucketSample").resolves(true);
  sandbox.spy(manager, "enroll");
  sandbox.spy(manager, "updateEnrollment");

  const recipe = NimbusTestUtils.factories.recipe("foo");

  Assert.deepEqual(
    manager.store.getAllActiveExperiments(),
    [],
    "There should be no active experiments"
  );

  await manager.onRecipe(recipe, "test", {
    ok: true,
    status: MatchStatus.TARGETING_AND_BUCKETING,
  });

  Assert.equal(
    manager.enroll.calledWith(recipe),
    true,
    "should call .enroll() the first time a recipe is seen"
  );
  Assert.equal(
    manager.store.has("foo"),
    true,
    "should add recipe to the store"
  );

  manager.unenroll(recipe.slug);

  await cleanup();
});

add_task(async function test_onRecipe_update() {
  const { sandbox, manager, cleanup } = await NimbusTestUtils.setupTest();

  sandbox.spy(manager, "enroll");
  sandbox.spy(manager, "updateEnrollment");

  const recipe = NimbusTestUtils.factories.recipe("foo");

  await manager.store.init();
  await manager.onStartup();
  await manager.enroll(recipe, "test");
  await manager.onRecipe(recipe, "test", {
    ok: true,
    status: MatchStatus.TARGETING_AND_BUCKETING,
  });

  Assert.equal(
    manager.updateEnrollment.calledWith(
      sinon.match({ slug: recipe.slug }),
      recipe,
      "test",
      {
        ok: true,
        status: MatchStatus.TARGETING_AND_BUCKETING,
      }
    ),
    true,
    "should call .updateEnrollment() if the recipe has already been enrolled"
  );

  manager.unenroll(recipe.slug);

  await cleanup();
});

add_task(async function test_onRecipe_rollout_update() {
  const { sandbox, manager, cleanup } = await NimbusTestUtils.setupTest();

  sandbox.spy(manager, "enroll");
  sandbox.spy(manager, "_unenroll");
  sandbox.spy(manager, "updateEnrollment");

  const recipe = NimbusTestUtils.factories.recipe("foo", { isRollout: true });

  await manager.enroll(recipe, "test");
  await manager.onRecipe(recipe, "test", {
    ok: true,
    status: MatchStatus.TARGETING_AND_BUCKETING,
  });

  Assert.ok(
    manager.updateEnrollment.calledOnceWith(
      sinon.match({ slug: recipe.slug }),
      recipe,
      "test",
      { ok: true, status: MatchStatus.TARGETING_AND_BUCKETING }
    ),
    "should call .updateEnrollment() if the recipe has already been enrolled"
  );
  Assert.ok(
    manager.updateEnrollment.alwaysReturned(Promise.resolve(true)),
    "updateEnrollment will confirm the enrolled branch still exists in the recipe and exit"
  );
  Assert.ok(
    manager._unenroll.notCalled,
    "Should not call if the branches did not change"
  );

  manager.updateEnrollment.resetHistory();

  const updatedRecipe = NimbusTestUtils.factories.recipe(recipe.slug, {
    isRollout: true,
    branches: [
      {
        ...recipe.branches[0],
        slug: "control-v2",
      },
    ],
  });
  await manager.onRecipe(updatedRecipe, "test", {
    ok: true,
    status: MatchStatus.TARGETING_AND_BUCKETING,
  });

  Assert.ok(
    manager.updateEnrollment.calledOnceWith(
      sinon.match({ slug: recipe.slug }),
      updatedRecipe,
      "test",
      { ok: true, status: MatchStatus.TARGETING_AND_BUCKETING }
    ),
    "should call .updateEnrollment() if the recipe has already been enrolled"
  );
  Assert.ok(
    manager._unenroll.calledOnceWith(sinon.match({ slug: recipe.slug }), {
      reason: "branch-removed",
    }),
    "updateEnrollment will unenroll because the branch slug changed"
  );

  await cleanup();
});

add_task(async function test_onRecipe_isFirefoxLabsOptin_recipe() {
  const { sandbox, manager, cleanup } = await NimbusTestUtils.setupTest();

  sandbox.stub(manager, "enroll");

  const optInRecipe = NimbusTestUtils.factories.recipe("opt-in", {
    isFirefoxLabsOptIn: true,
    isRollout: true,
  });
  const recipe = NimbusTestUtils.factories.recipe("recipe");

  await manager.onRecipe(optInRecipe, "test", {
    ok: true,
    status: MatchStatus.TARGETING_AND_BUCKETING,
  });
  await manager.onRecipe(recipe, "test", {
    ok: true,
    status: MatchStatus.TARGETING_AND_BUCKETING,
  });

  Assert.equal(manager.optIns.length, 1, "should only have one opt-in recipe");
  Assert.deepEqual(
    manager.optIns[0],
    { recipe: optInRecipe, source: "test" },
    "should add the recipe to OptInRecipes list if recipe is firefox labs opt-in"
  );
  Assert.equal(
    manager.enroll.calledOnceWith(recipe, "test"),
    true,
    "should try to enroll the fxLabsOptOutRecipe since it is a targetting match"
  );

  await cleanup();
});

add_task(async function test_context_paramters() {
  const { manager, cleanup } = await NimbusTestUtils.setupTest();

  const experiment = NimbusTestUtils.factories.recipe("experiment");
  const rollout = NimbusTestUtils.factories.recipe("rollout", {
    isRollout: true,
  });

  let targetingCtx = manager.createTargetingContext();

  Assert.deepEqual(await targetingCtx.activeExperiments, []);
  Assert.deepEqual(await targetingCtx.activeRollouts, []);
  Assert.deepEqual(await targetingCtx.previousExperiments, []);
  Assert.deepEqual(await targetingCtx.previousRollouts, []);
  Assert.deepEqual(await targetingCtx.enrollments, []);

  await manager.enroll(experiment, "test");
  await manager.enroll(rollout, "test");

  targetingCtx = manager.createTargetingContext();
  Assert.deepEqual(await targetingCtx.activeExperiments, ["experiment"]);
  Assert.deepEqual(await targetingCtx.activeRollouts, ["rollout"]);
  Assert.deepEqual(await targetingCtx.previousExperiments, []);
  Assert.deepEqual(await targetingCtx.previousRollouts, []);
  Assert.deepEqual([...(await targetingCtx.enrollments)].sort(), [
    "experiment",
    "rollout",
  ]);

  manager.unenroll(experiment.slug);
  manager.unenroll(rollout.slug);

  targetingCtx = manager.createTargetingContext();
  Assert.deepEqual(await targetingCtx.activeExperiments, []);
  Assert.deepEqual(await targetingCtx.activeRollouts, []);
  Assert.deepEqual(await targetingCtx.previousExperiments, ["experiment"]);
  Assert.deepEqual(await targetingCtx.previousRollouts, ["rollout"]);
  Assert.deepEqual([...(await targetingCtx.enrollments)].sort(), [
    "experiment",
    "rollout",
  ]);

  await cleanup();
});

add_task(async function test_experimentStore_updateEvent() {
  const { sandbox, manager, cleanup } = await NimbusTestUtils.setupTest();
  const stub = sandbox.stub();

  manager.store.on("update", stub);

  await manager.enroll(
    NimbusTestUtils.factories.recipe("experiment"),
    "rs-loader"
  );
  Assert.ok(
    stub.calledOnceWith("update", { slug: "experiment", active: true })
  );
  stub.resetHistory();

  manager.unenroll(
    "experiment",
    UnenrollmentCause.fromReason(
      NimbusTelemetry.UnenrollReason.INDIVIDUAL_OPT_OUT
    )
  );
  Assert.ok(
    stub.calledOnceWith("update", {
      slug: "experiment",
      active: false,
      unenrollReason: "individual-opt-out",
    })
  );

  await cleanup();
});

add_task(async function testDb() {
  const conn = await ProfilesDatastoreService.getConnection();

  async function getEnrollmentSlugs() {
    const result = await conn.execute(
      `
      SELECT
        slug
      FROM NimbusEnrollments
      WHERE
        profileId = :profileId;
    `,
      { profileId: ExperimentAPI.profileId }
    );

    return result.map(row => row.getResultByName("slug")).sort();
  }

  const { manager, cleanup } = await NimbusTestUtils.setupTest();

  const experimentRecipe = NimbusTestUtils.factories.recipe("experiment", {
    branches: [
      {
        ratio: 1,
        slug: "control",
        features: [
          {
            featureId: "no-feature-firefox-desktop",
            value: {},
          },
        ],
      },
      {
        ratio: 0, // Force enrollment in control
        slug: "treatment",
        features: [
          {
            featureId: "no-feature-firefox-desktop",
            value: {},
          },
        ],
      },
    ],
  });

  const rolloutRecipe = NimbusTestUtils.factories.recipe.withFeatureConfig(
    "rollout",
    { branchSlug: "rollout", featureId: "no-feature-firefox-desktop" }
  );

  Assert.deepEqual(
    await getEnrollmentSlugs(),
    [],
    "There are no database entries"
  );

  // Enroll in an experiment
  await manager.enroll(experimentRecipe, "test");
  await NimbusTestUtils.flushStore();
  Assert.deepEqual(
    await getEnrollmentSlugs(),
    [experimentRecipe.slug],
    "There is one enrollment"
  );

  let experimentEnrollment = await NimbusTestUtils.queryEnrollment(
    experimentRecipe.slug
  );
  Assert.notEqual(
    experimentEnrollment,
    null,
    "experiment enrollment should exist"
  );
  Assert.ok(experimentEnrollment.active, "experiment enrollment is active");
  Assert.deepEqual(
    experimentEnrollment.recipe,
    experimentRecipe,
    "experiment enrollment has the correct recipe"
  );
  Assert.equal(
    experimentEnrollment.branchSlug,
    manager.store.get(experimentRecipe.slug).branch.slug,
    "experiment branch slug matches"
  );

  // Enroll in a rollout.
  await manager.enroll(rolloutRecipe, "test");
  await NimbusTestUtils.flushStore();
  Assert.deepEqual(
    await getEnrollmentSlugs(),
    [experimentRecipe.slug, rolloutRecipe.slug].sort(),
    "There are two enrollments"
  );

  let rolloutEnrollment = await NimbusTestUtils.queryEnrollment(
    rolloutRecipe.slug
  );
  Assert.notEqual(rolloutEnrollment, null, "rollout enrollment exists");
  Assert.ok(rolloutEnrollment.active, "rollout enrollment is active");
  Assert.deepEqual(
    rolloutEnrollment.recipe,
    rolloutRecipe,
    "rollout enrollment has the correct recipe"
  );
  Assert.equal(
    rolloutEnrollment.branchSlug,
    manager.store.get(rolloutRecipe.slug).branch.slug,
    "rollout branch slug matches"
  );

  // Unenroll from the rollout.
  manager.unenroll(rolloutRecipe.slug, { reason: "recipe-not-seen" });
  await NimbusTestUtils.flushStore();
  Assert.deepEqual(
    await getEnrollmentSlugs(),
    [experimentRecipe.slug, rolloutRecipe.slug].sort(),
    "There are two enrollments"
  );

  rolloutEnrollment = await NimbusTestUtils.queryEnrollment(rolloutRecipe.slug);
  Assert.notEqual(rolloutEnrollment, null, "rollout enrollment exists");
  Assert.ok(!rolloutEnrollment.active, "rollout enrollment is inactive");
  Assert.equal(
    rolloutEnrollment.unenrollReason,
    "recipe-not-seen",
    "rollout unenrollReason"
  );
  Assert.equal(
    rolloutEnrollment.branchSlug,
    manager.store.get(rolloutRecipe.slug).branch.slug,
    "rollout branch slug matches"
  );

  // Unenroll from the experiment.
  manager.unenroll(experimentEnrollment.slug, { reason: "targeting" });
  await NimbusTestUtils.flushStore();

  experimentEnrollment = await NimbusTestUtils.queryEnrollment(
    experimentRecipe.slug
  );
  Assert.notEqual(
    experimentEnrollment,
    null,
    "experiment enrollment still exists"
  );
  Assert.ok(!experimentEnrollment.active, "experiment enrollment is inactive");
  Assert.equal(
    experimentEnrollment.unenrollReason,
    "targeting",
    "experiment unenrollReason"
  );
  Assert.equal(
    experimentEnrollment.branchSlug,
    manager.store.get(experimentRecipe.slug).branch.slug,
    "experiment branch slug matches"
  );

  await cleanup();
});

add_task(async function testUpdateEnrollmentSourceMismatchActive() {
  const SLUG = "foo";

  const { manager, cleanup } = await NimbusTestUtils.setupTest({
    experiments: [
      NimbusTestUtils.factories.recipe.withFeatureConfig(
        SLUG,
        {
          featureId: "no-feature-firefox-desktop",
        },
        { isRollout: true }
      ),
    ],
    migrationState: NimbusTestUtils.migrationState.LATEST,
    storePath: await NimbusTestUtils.createStoreWith(store => {
      NimbusTestUtils.addEnrollmentForRecipe(
        NimbusTestUtils.factories.recipe.withFeatureConfig(
          SLUG,
          {
            featureId: "no-feature-firefox-desktop",
          },
          { isRollout: true }
        ),
        { store, extra: { source: "nimbus-devtools" } }
      );
    }),
  });

  const enrollment = manager.store.get(SLUG);

  Assert.equal(enrollment.source, "nimbus-devtools");
  Assert.ok(enrollment.active);

  await NimbusTestUtils.cleanupManager([SLUG]);

  await cleanup();
});

add_task(async function testUpdateEnrollmentSourceMismatchInactive() {
  const SLUG = "foo";

  const { manager, cleanup } = await NimbusTestUtils.setupTest({
    experiments: [
      NimbusTestUtils.factories.recipe.withFeatureConfig(
        SLUG,
        {
          featureId: "no-feature-firefox-desktop",
        },
        { isRollout: true }
      ),
    ],
    migrationState: NimbusTestUtils.migrationState.LATEST,
    storePath: await NimbusTestUtils.createStoreWith(store => {
      NimbusTestUtils.addEnrollmentForRecipe(
        NimbusTestUtils.factories.recipe.withFeatureConfig(
          SLUG,
          {
            featureId: "no-feature-firefox-desktop",
          },
          { isRollout: true }
        ),
        {
          store,
          extra: {
            active: false,
            unenrollReason: "bucketing",
            source: "nimbus-devtools",
          },
        }
      );
    }),
  });

  const enrollment = manager.store.get(SLUG);

  Assert.equal(enrollment.source, "nimbus-devtools");
  Assert.ok(!enrollment.active);

  await cleanup();
});

add_task(async function testRestoreFirefoxLabsOptIns() {
  const recipes = {};
  let currentDate = new Date().getTime();

  for (const slug of [
    "live-active",
    "live-inactive",
    "live-activePaused",
    "live-inactivePaused",
    "optin-active",
    "optin-inactive",
    "optin-activePaused",
    "optin-inactivePaused",
  ]) {
    recipes[slug] = NimbusTestUtils.factories.recipe(slug, {
      isRollout: true,
      isFirefoxLabsOptIn: true,
      publishedDate: new Date(currentDate).toISOString(),
      isEnrollmentPaused: slug.endsWith("Paused"),
    });

    currentDate += 10000;
  }

  const { sandbox, loader, manager, cleanup } = await NimbusTestUtils.setupTest(
    {
      experiments: [
        recipes["live-active"],
        recipes["live-inactive"],
        recipes["live-activePaused"],
        recipes["live-inactivePaused"],
      ],
      migrationState: NimbusTestUtils.migrationState.LATEST,
      storePath: await NimbusTestUtils.createStoreWith(async store => {
        // recipes.live-* are all provided by Remote Settings.
        await NimbusTestUtils.addEnrollmentForRecipe(recipes["live-active"], {
          store,
          extra: {
            source: "rs-loader",
          },
        });
        await NimbusTestUtils.addEnrollmentForRecipe(recipes["live-inactive"], {
          store,
          extra: {
            source: "rs-loader",
            active: false,
            unenrollReason: "labs-opt-out",
          },
        });
        await NimbusTestUtils.addEnrollmentForRecipe(
          recipes["live-activePaused"],
          {
            store,
            extra: {
              source: "rs-loader",
            },
          }
        );
        await NimbusTestUtils.addEnrollmentForRecipe(
          recipes["live-inactivePaused"],
          {
            store,
            extra: {
              source: "rs-loader",
              active: false,
              unenrollReason: "labs-opt-out",
            },
          }
        );

        // The remainder are opted-in (e.g., via force enrollment or nimbus devtools).
        await NimbusTestUtils.addEnrollmentForRecipe(recipes["optin-active"], {
          store,
          extra: {
            source: "force-enrollment",
          },
        });
        await NimbusTestUtils.addEnrollmentForRecipe(
          recipes["optin-inactive"],
          {
            store,
            extra: {
              source: "force-enrollment",
              active: false,
              unenrollReason: "labs-opt-out",
            },
          }
        );
        await NimbusTestUtils.addEnrollmentForRecipe(
          recipes["optin-activePaused"],
          {
            store,
            extra: {
              source: "nimbus-devtools",
            },
          }
        );
        await NimbusTestUtils.addEnrollmentForRecipe(
          recipes["optin-inactivePaused"],
          {
            store,
            extra: {
              source: "nimbus-devtools",
              active: false,
              unenrollReason: "labs-opt-out",
            },
          }
        );
      }),
      init: false,
    }
  );

  // At this point, the ExperimentAPI has not been initialized. We are going to
  // replace the the enable method on the RSEL instance with one that will
  // assert that the correct set of opt-ins is restored from the database before
  // dispatching to the real enable method.
  //
  // This stub will be called when we call ExperimentAPI.init() below.
  sandbox.stub(loader, "enable").callsFake(async (...args) => {
    // The only recipes that should be pre-loaded are those that:
    //
    // * are not sourced from rs-loader (e.g., they are force-enrollment or
    //   nimbus-devtools); and
    // * are either active (enrolled) or inactive but do not have paused
    //   enrollment.
    //
    // Thus no live-* recipes are present, nor is optin-inactivePaused.
    assertOptInSlugs(manager, [
      ["optin-active", "force-enrollment"],
      ["optin-activePaused", "nimbus-devtools"],
      ["optin-inactive", "force-enrollment"],
    ]);

    await RemoteSettingsExperimentLoader.prototype.enable.call(loader, ...args);
  });

  await ExperimentAPI.init();

  // Assert that our stub was actually called.
  Assert.ok(loader.enable.calledOnce, "loader enabled");

  // live-inactivePaused is present in the list, but will be unavailable in Firefox Labs.
  assertOptInSlugs(manager, [
    ["optin-active", "force-enrollment"],
    ["optin-activePaused", "nimbus-devtools"],
    ["optin-inactive", "force-enrollment"],
    ["live-active", "rs-loader"],
    ["live-activePaused", "rs-loader"],
    ["live-inactive", "rs-loader"],
    ["live-inactivePaused", "rs-loader"],
  ]);

  await NimbusTestUtils.cleanupManager([
    "live-active",
    "live-activePaused",
    "optin-active",
    "optin-activePaused",
  ]);
  await cleanup();
});

add_task(async function testRegisterOptIn() {
  const { manager, cleanup } = await NimbusTestUtils.setupTest();

  Assert.deepEqual(manager.optIns, []);

  const recipes = [
    NimbusTestUtils.factories.recipe.withFeatureConfig(
      "foo",
      { featureId: "no-feature-firefox-desktop" },
      { isFirefoxLabsOptIn: true, isRollout: true }
    ),
    NimbusTestUtils.factories.recipe.withFeatureConfig(
      "bar",
      { featureId: "no-feature-firefox-desktop" },
      { isFirefoxLabsOptIn: true, isRollout: true }
    ),
    NimbusTestUtils.factories.recipe.withFeatureConfig(
      "baz",
      { featureId: "no-feature-firefox-desktop" },
      { isFirefoxLabsOptIn: true, isRollout: true }
    ),
  ];

  for (const recipe of recipes) {
    Assert.ok(
      manager.registerOptIn(recipe, "nimbus-devtools"),
      `Can register opt-in ${recipe.slug}`
    );
    const entry = manager.optIns.find(
      entry => entry.recipe.slug === recipe.slug
    );
    Assert.notStrictEqual(
      typeof entry,
      "undefiend",
      `Opt-in ${recipe.slug} available on ExperimentManager`
    );
  }

  assertOptInSlugs(manager, [
    ["foo", "nimbus-devtools"],
    ["bar", "nimbus-devtools"],
    ["baz", "nimbus-devtools"],
  ]);

  for (const { slug } of recipes) {
    Assert.ok(manager.unregisterOptIn(slug), `Can unregister opt-in ${slug}`);
    Assert.ok(
      !manager.optIns.find(entry => entry.recipe.slug === slug),
      `Opt-in ${slug} no longer available`
    );
  }

  Assert.deepEqual(manager.optIns, []);

  Assert.ok(
    !manager.unregisterOptIn("bogus"),
    "Cannot unregister recipes that do not exist"
  );

  await cleanup();
});

add_task(async function testRegisterOptInConflicts() {
  const recipes = Object.fromEntries([
    ...[
      "active-fxlab-devtools",
      "inactive-fxlab-devtools",
      "active-fxlab-rs",
      "inactive-fxlab-rs",
      "expired-fxlab-rs",
    ].map(slug => [
      slug,
      NimbusTestUtils.factories.recipe.withFeatureConfig(
        slug,
        { featureId: "no-feature-firefox-desktop" },
        { isFirefoxLabsOptIn: true, isRollout: true }
      ),
    ]),

    ...[
      "active-experiment-devtools",
      "inactive-experiment-devtools",
      "active-experiment-rs",
      "inactive-experiment-rs",
    ].map(slug => [
      slug,
      NimbusTestUtils.factories.recipe.withFeatureConfig(slug, {
        featureId: "no-feature-firefox-desktop",
      }),
    ]),

    ...[
      "expired-rollout-rs",
      "active-rollout-rs",
      "inactive-rollout-rs",
      "active-rollout-devtools",
      "inactive-rollout-devtools",
    ].map(slug => [
      slug,
      NimbusTestUtils.factories.recipe.withFeatureConfig(
        slug,
        { featureId: "no-feature-firefox-desktop" },
        { isRollout: true }
      ),
    ]),
  ]);

  const { manager, cleanup } = await NimbusTestUtils.setupTest({
    experiments: [
      recipes["active-experiment-rs"],
      recipes["active-fxlab-devtools"],
      recipes["active-fxlab-rs"],
      recipes["active-rollout-rs"],
      recipes["inactive-experiment-rs"],
      recipes["inactive-fxlab-devtools"],
      recipes["inactive-fxlab-rs"],
      recipes["inactive-rollout-rs"],
    ],
    migrationState: NimbusTestUtils.migrationState.LATEST,
    storePath: await NimbusTestUtils.createStoreWith(store => {
      NimbusTestUtils.addEnrollmentForRecipe(
        recipes["active-experiment-devtools"],
        { store, extra: { active: true, source: "nimbus-devtools" } }
      );
      NimbusTestUtils.addEnrollmentForRecipe(recipes["active-fxlab-devtools"], {
        store,
        extra: { active: true, source: "nimbus-devtools" },
      });
      NimbusTestUtils.addEnrollmentForRecipe(
        recipes["active-rollout-devtools"],
        { store, extra: { active: true, source: "nimbus-devtools" } }
      );
      NimbusTestUtils.addEnrollmentForRecipe(
        recipes["inactive-experiment-devtools"],
        {
          store,
          extra: {
            active: false,
            unenrollReason: "individual-opt-out",
            source: "nimbus-devtools",
          },
        }
      );
      NimbusTestUtils.addEnrollmentForRecipe(
        recipes["inactive-experiment-rs"],
        {
          store,
          extra: { active: false, unenrollReason: "individual-opt-out" },
        }
      );
      NimbusTestUtils.addEnrollmentForRecipe(
        recipes["inactive-fxlab-devtools"],
        {
          store,
          extra: {
            active: false,
            source: "nimbus-devtools",
            unenrollReason: "labs-opt-out",
          },
        }
      );
      NimbusTestUtils.addEnrollmentForRecipe(recipes["inactive-fxlab-rs"], {
        store,
        extra: {
          active: false,
          source: "rs-loader",
          unenrollReason: "labs-opt-out",
        },
      });
      NimbusTestUtils.addEnrollmentForRecipe(
        recipes["inactive-rollout-devtools"],
        {
          store,
          extra: {
            active: false,
            unenrollReason: "individual-opt-out",
            source: "nimbus-devtools",
          },
        }
      );
      NimbusTestUtils.addEnrollmentForRecipe(recipes["inactive-rollout-rs"], {
        store,
        extra: { active: false, unenrollReason: "individual-opt-out" },
      });
      NimbusTestUtils.addEnrollmentForRecipe(recipes["expired-fxlab-rs"], {
        store,
        extra: {
          active: false,
          source: "rs-loader",
          unenrollReason: "recipe-not-seen",
        },
      });
      NimbusTestUtils.addEnrollmentForRecipe(recipes["expired-rollout-rs"], {
        store,
        extra: {
          active: false,
          source: "rs-loader",
          unenrollReason: "recipe-not-seen",
        },
      });
    }),
  });

  const expectedOptIns = [
    ["active-fxlab-devtools", "nimbus-devtools"],
    ["active-fxlab-rs", "rs-loader"],
    ["inactive-fxlab-devtools", "nimbus-devtools"],
    ["inactive-fxlab-rs", "rs-loader"],
  ];

  assertOptInSlugs(manager, expectedOptIns);

  function makeOptInRecipe(slug) {
    return NimbusTestUtils.factories.recipe.withFeatureConfig(
      slug,
      { featureId: "no-feature-firefox-desktop" },
      { isFirefoxLabsOptIn: true, isRollout: true }
    );
  }

  for (const entry of manager.optIns) {
    const recipe = makeOptInRecipe(entry.recipe.slug);

    for (const source of ["nimbus-devtools", "rs-loader"]) {
      Assert.ok(
        !manager.registerOptIn(recipe, source),
        `Cannot re-register opt-in with existing slug ${recipe.slug} with source=${source}`
      );
    }
  }

  Assert.ok(
    !manager.registerOptIn(
      makeOptInRecipe("active-experiment-devtools"),
      "nimbus-devtools"
    ),
    "Cannot register an opt-in that conflicts with an existing enrollment (experiment)"
  );
  Assert.ok(
    !manager.registerOptIn(
      makeOptInRecipe("active-rollout-devtools"),
      "nimbus-devtools"
    ),
    "Cannot register an opt-in that conflicts with an existing enrollment (rollout)"
  );

  Assert.ok(
    !manager.optIns.find(entry => entry.recipe.slug === "expired-fxlab-rs")
  );
  Assert.ok(
    !manager.registerOptIn(
      makeOptInRecipe("expired-fxlab-rs"),
      "nimbus-devtools"
    ),
    "Cannot register an opt-in with the same slug as a past labs enrollment with a different source"
  );
  Assert.ok(
    !manager.registerOptIn(makeOptInRecipe("expired-rollout-rs"), "rs-loader"),
    "Cannot register an opt-in with the same slug as a past non-enrollment enrollment with the same source"
  );

  assertOptInSlugs(
    manager,
    expectedOptIns,
    "The list of opt-ins did not change"
  );

  await NimbusTestUtils.cleanupManager([
    "active-experiment-devtools",
    "active-rollout-rs",
    "active-fxlab-devtools",
    "active-rollout-devtools",
    "active-experiment-rs",
  ]);

  await cleanup();
});

add_task(async function testForceEnrollMultifeature() {
  const { manager, cleanup } = await NimbusTestUtils.setupTest({
    features: [
      new ExperimentFeature("test-feature-1", { variables: {} }),
      new ExperimentFeature("test-feature-2", { variables: {} }),
    ],
  });

  await manager.enroll(
    NimbusTestUtils.factories.recipe("recipe-1", {
      branches: [
        {
          slug: "control",
          ratio: 1,
          features: [
            {
              featureId: "test-feature-1",
              value: {},
            },
            {
              featureId: "test-feature-2",
              value: {},
            },
          ],
        },
      ],
    }),
    "test"
  );

  Assert.ok(
    manager.store.get("recipe-1")?.active,
    "Enrollment in recipe-1 is active"
  );

  const recipe = NimbusTestUtils.factories.recipe("recipe-2", {
    branches: [
      {
        slug: "control",
        ratio: 1,
        features: [
          {
            featureId: "test-feature-1",
            value: {},
          },
          {
            featureId: "test-feature-2",
            value: {},
          },
        ],
      },
    ],
  });

  const result = manager.canEnroll(recipe);
  Assert.ok(!result.ok);
  Assert.equal(result.reason, "enrolled-in-feature");
  Assert.deepEqual(Array.from(result.conflictingEnrollments), ["recipe-1"]);

  manager.forceEnroll(recipe, "control");

  Assert.ok(
    !manager.store.get("recipe-1").active,
    "Enrollment in recipe-1 is inactive"
  );
  Assert.ok(
    manager.store.get("optin-recipe-2")?.active,
    "Enrollment in recipe-2 is active"
  );

  manager.unenroll("optin-recipe-2", "test");

  await cleanup();
});

// `ExperimentAPI.init()` is now called by multiple consumers. If a second
// caller arrives while the first is still doing init work, the second caller's
// `await init()` shouldn't resolve until the first caller's work has
// actually completed. See Bug 2042553
add_task(async function test_concurrent_init_callers_await_real_completion() {
  const { sandbox, loader, cleanup } = await NimbusTestUtils.setupTest({
    init: false,
  });

  // Gate _rsLoader.enable() so the first init() can be held in flight
  const enableGate = Promise.withResolvers();
  const realEnable = loader.enable.bind(loader);
  sandbox.stub(loader, "enable").callsFake(async (...args) => {
    await enableGate.promise;
    return realEnable(...args);
  });

  // Kick off both callers without awaiting, and capture loader state at the
  // moment the second call resolves
  const p1 = ExperimentAPI.init();
  let hasUpdatedOnceWhenP2Resolved = null;
  const p2 = ExperimentAPI.init().then(result => {
    hasUpdatedOnceWhenP2Resolved = loader._hasUpdatedOnce;
    return result;
  });

  // Unblock init now that both callers are pending
  enableGate.resolve();

  const [result1, result2] = await Promise.all([p1, p2]);

  Assert.strictEqual(result1, true, "First caller returned true");
  Assert.strictEqual(
    result2,
    false,
    "Second caller returned false (init was already in flight)"
  );
  Assert.strictEqual(
    hasUpdatedOnceWhenP2Resolved,
    true,
    "Second init() did not resolve until the RS loader had actually finished updating"
  );

  // A subsequent call after completion still returns false
  const result3 = await ExperimentAPI.init();
  Assert.strictEqual(
    result3,
    false,
    "Post-completion caller returned false (init already done)"
  );

  await cleanup();
});
