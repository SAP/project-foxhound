"use strict";

const { FirstStartup } = ChromeUtils.importESModule(
  "resource://gre/modules/FirstStartup.sys.mjs"
);

add_task(async function test_createTargetingContext() {
  const manager = NimbusTestUtils.stubs.manager();
  const sandbox = sinon.createSandbox();
  const recipe = NimbusTestUtils.factories.recipe("foo");
  const rollout = NimbusTestUtils.factories.rollout("bar");
  sandbox.stub(manager.store, "ready").resolves();
  sandbox.stub(manager.store, "getAllActiveExperiments").returns([recipe]);
  sandbox.stub(manager.store, "getAllActiveRollouts").returns([rollout]);
  sandbox.stub(manager.store, "getAll").returns([
    {
      slug: "foo",
      branch: {
        slug: "bar",
      },
    },
    {
      slug: "baz",
      branch: {
        slug: "qux",
      },
    },
  ]);

  let context = manager.createTargetingContext();
  const activeSlugs = await context.activeExperiments;
  const activeRollouts = await context.activeRollouts;
  const enrollments = await context.enrollmentsMap;

  Assert.ok(!context.isFirstStartup, "should not set the first startup flag");
  Assert.deepEqual(
    activeSlugs,
    ["foo"],
    "should return slugs for all the active experiment"
  );
  Assert.deepEqual(
    activeRollouts,
    ["bar"],
    "should return slugs for all rollouts stored"
  );
  Assert.deepEqual(
    enrollments,
    {
      foo: "bar",
      baz: "qux",
    },
    "should return a map of slugs to branch slugs"
  );

  // Pretend to be in the first startup
  FirstStartup._state = FirstStartup.IN_PROGRESS;
  context = manager.createTargetingContext();

  Assert.ok(context.isFirstStartup, "should set the first startup flag");
});

add_task(async function test_isNonStubFirstRun() {
  Assert.ok(
    !Services.prefs.getBoolPref("nimbus.firstUpdateComplete", false),
    "nimbus.firstUpdateComplete should be false on a new profile"
  );

  const { loader, cleanup } = await NimbusTestUtils.setupTest();

  Assert.ok(
    Services.prefs.getBoolPref("nimbus.firstUpdateComplete", false),
    "nimbus.firstUpdateComplete should be true after the first updateRecipes call"
  );
  Assert.ok(
    !loader.manager.createTargetingContext().isNonStubFirstRun,
    "isNonStubFirstRun should be false after the first updateRecipes call"
  );

  await loader.updateRecipes("test");

  Assert.ok(
    Services.prefs.getBoolPref("nimbus.firstUpdateComplete", false),
    "nimbus.firstUpdateComplete should remain true after subsequent updateRecipes calls"
  );
  Assert.ok(
    !loader.manager.createTargetingContext().isNonStubFirstRun,
    "isNonStubFirstRun should remain false after subsequent updateRecipes calls"
  );

  await cleanup();
});
