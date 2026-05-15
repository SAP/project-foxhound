/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/* import-globals-from ../../../aboutconfig/test/browser/head.js */

"use strict";

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/toolkit/components/aboutconfig/test/browser/head.js",
  this
);

const {
  NimbusTelemetry: { UnenrollReason },
} = ChromeUtils.importESModule("resource://nimbus/lib/Telemetry.sys.mjs");

add_setup(async function setup() {
  const cleanup = await setupTest();
  Services.fog.testResetFOG();

  registerCleanupFunction(async function () {
    await cleanup();
    Services.fog.testResetFOG();
  });
});

const PREF_PREFIX = "nimbus.test-only";
const BOOL_PREF = `${PREF_PREFIX}.foo`;
const STRING_PREF = `${PREF_PREFIX}.bar`;

add_task(async function testSetPref() {
  using disposer = new DisposableStack();

  disposer.defer(
    NimbusTestUtils.addTestFeatures(
      new ExperimentFeature("test-bool-feature", {
        variables: {
          foo: {
            type: "boolean",
            setPref: {
              branch: "user",
              pref: BOOL_PREF,
            },
          },
        },
      }),
      new ExperimentFeature("test-string-feature", {
        variables: {
          bar: {
            type: "string",
            setPref: {
              branch: "user",
              pref: STRING_PREF,
            },
          },
        },
      })
    )
  );

  disposer.defer(() => Services.prefs.deleteBranch(PREF_PREFIX));

  await NimbusTestUtils.enrollWithFeatureConfig(
    { featureId: "test-bool-feature", value: { foo: true } },
    { slug: "bool-recipe" }
  );
  await NimbusTestUtils.enrollWithFeatureConfig(
    { featureId: "test-string-feature", value: { bar: "string" } },
    { slug: "string-recipe" }
  );

  await AboutConfigTest.withNewTab(async function () {
    this.search(PREF_PREFIX);

    const boolRow = this.getRow(BOOL_PREF);
    boolRow.editColumnButton.click();

    const boolEnrollment = ExperimentAPI.manager.store.get("bool-recipe");
    Assert.ok(!boolEnrollment.active, "Enrollment is not active");
    Assert.equal(boolEnrollment.unenrollReason, UnenrollReason.CHANGED_PREF);

    Assert.deepEqual(
      Glean.nimbusEvents.unenrollment
        .testGetValue("events")
        ?.map(ev => ev.extra),
      [
        {
          experiment: "bool-recipe",
          branch: "control",
          reason: UnenrollReason.CHANGED_PREF,
          changed_pref: BOOL_PREF,
          about_config_change: "true",
        },
      ]
    );

    Services.fog.testResetFOG();

    const stringRow = this.getRow(STRING_PREF);
    stringRow.editColumnButton.click();
    stringRow.valueInput.value = "different";
    stringRow.valueInput.blur();
    stringRow.editColumnButton.click();

    const stringEnrollment = ExperimentAPI.manager.store.get("string-recipe");
    Assert.ok(!stringEnrollment.active, "Enrollment is not active");
    Assert.equal(stringEnrollment.unenrollReason, UnenrollReason.CHANGED_PREF);

    Assert.deepEqual(
      Glean.nimbusEvents.unenrollment
        .testGetValue("events")
        ?.map(ev => ev.extra),
      [
        {
          experiment: "string-recipe",
          branch: "control",
          reason: UnenrollReason.CHANGED_PREF,
          changed_pref: STRING_PREF,
          about_config_change: "true",
        },
      ]
    );

    Services.fog.testResetFOG();
  });
});

add_task(async function testPrefFlips() {
  using disposer = new DisposableStack();
  disposer.defer(() => Services.prefs.deleteBranch(PREF_PREFIX));

  await NimbusTestUtils.enrollWithFeatureConfig(
    {
      featureId: "prefFlips",
      value: {
        prefs: {
          [BOOL_PREF]: {
            branch: "user",
            value: true,
          },
        },
      },
    },
    { slug: "bool-flip" }
  );

  await NimbusTestUtils.enrollWithFeatureConfig(
    {
      featureId: "prefFlips",
      value: {
        prefs: {
          [STRING_PREF]: {
            branch: "user",
            value: "string",
          },
        },
      },
    },
    { slug: "string-flip" }
  );

  await AboutConfigTest.withNewTab(async function () {
    this.search(PREF_PREFIX);

    const boolRow = this.getRow(BOOL_PREF);
    boolRow.editColumnButton.click();

    const boolEnrollment = ExperimentAPI.manager.store.get("bool-flip");
    Assert.ok(!boolEnrollment.active, "Enrollment is not active");
    Assert.equal(boolEnrollment.unenrollReason, UnenrollReason.CHANGED_PREF);

    Assert.deepEqual(
      Glean.nimbusEvents.unenrollment
        .testGetValue("events")
        ?.map(ev => ev.extra),
      [
        {
          experiment: "bool-flip",
          branch: "control",
          reason: UnenrollReason.CHANGED_PREF,
          changed_pref: BOOL_PREF,
          about_config_change: "true",
        },
      ]
    );

    Services.fog.testResetFOG();

    const stringRow = this.getRow(STRING_PREF);
    stringRow.editColumnButton.click();
    stringRow.valueInput.value = "different";
    stringRow.valueInput.blur();
    stringRow.editColumnButton.click();

    const stringEnrollment = ExperimentAPI.manager.store.get("string-flip");
    Assert.ok(!stringEnrollment.active, "Enrollment is not active");
    Assert.equal(stringEnrollment.unenrollReason, UnenrollReason.CHANGED_PREF);

    Assert.deepEqual(
      Glean.nimbusEvents.unenrollment
        .testGetValue("events")
        ?.map(ev => ev.extra),
      [
        {
          experiment: "string-flip",
          branch: "control",
          reason: UnenrollReason.CHANGED_PREF,
          changed_pref: STRING_PREF,
          about_config_change: "true",
        },
      ]
    );

    Services.fog.testResetFOG();
  });
});
