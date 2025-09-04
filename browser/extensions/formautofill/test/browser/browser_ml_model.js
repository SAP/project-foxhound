/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/head.js",
  this
);

const { MLAutofill } = ChromeUtils.importESModule(
  "resource://autofill/MLAutofill.sys.mjs"
);

async function setup() {
  const { removeMocks, remoteClients } = await createAndMockMLRemoteSettings({
    autoDownloadFromRemoteSettings: false,
  });

  await SpecialPowers.pushPrefEnv({
    set: [
      // Enabled by default.
      ["browser.ml.enable", true],
      ["browser.ml.logLevel", "All"],
      ["browser.ml.modelCacheTimeout", 1000],
    ],
  });

  return {
    remoteClients,
    async cleanup() {
      await removeMocks();
      await waitForCondition(
        () => EngineProcess.areAllEnginesTerminated(),
        "Waiting for all of the engines to be terminated.",
        100,
        200
      );
    },
  };
}

add_setup(async function () {
  const { cleanup, remoteClients } = await setup();

  const originalConfig = MLAutofill.readConfig();

  sinon.stub(MLAutofill, "readConfig").callsFake(() => {
    return { ...originalConfig, modelId: "test-echo" };
  });

  sinon.stub(MLAutofill, "run").callsFake(request => {
    const context = request.args[0];
    /* The input has the following format:
     * `
     * {{ header_text }} {{ name }} {{ label_text }} {{ placeholder_text }} {{ class }} {{ id }} <SEP>
     * {{ previous_name }} {{ previous_label_text }} {{ previous_placeholder_text }} {{ previous_class }} {{ previous_id }} <SEP>
     * {{ next_name }} {{ next_label_text }} {{ next_placeholder_text }} {{ next_class }} {{ next_id }} <SEP>
     * {{ button_text }} <SEP>
     * `
     * We extract the {{ id }} part because id is the same as field name in this test.
     * */
    const match = context.match(/\s+([^\s<]+)<SEP>/);
    return [
      {
        label: match[1],
        score: 0.9999,
      },
    ];
  });

  await SpecialPowers.pushPrefEnv({
    set: [
      ["extensions.formautofill.ml.experiment.enabled", true],
      ["extensions.formautofill.ml.experiment.runInAutomation", true],
      [
        "extensions.formautofill.creditCards.heuristics.fathom.testConfidence",
        "1",
      ],
    ],
  });

  await clearGleanTelemetry();

  registerCleanupFunction(async function () {
    MLAutofill.shutdown();
    await remoteClients["ml-onnx-runtime"].rejectPendingDownloads(1);
    await EngineProcess.destroyMLEngine();
    await cleanup();

    sinon.restore();
    await clearGleanTelemetry();
  });
});

add_task(async function test_run_ml_experiment() {
  function buildExpected(fieldName, fathom_label, fathom_score) {
    return {
      infer_field_name: fieldName,
      infer_reason: "autocomplete",
      is_valid_section: "true",
      fathom_infer_label: fathom_label ?? "",
      fathom_infer_score: fathom_score ?? "",
      ml_revision: "",
      ml_infer_label: fieldName,
      ml_infer_score: "0.9999",
    };
  }

  const expected_events = [
    buildExpected("cc-name", "cc-name", 1),
    buildExpected("cc-number", "cc-number", 1),
    buildExpected("cc-exp-month"),
    buildExpected("cc-exp-year"),
    buildExpected("cc-csc"),
    buildExpected("cc-type"),
  ];

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: CREDITCARD_FORM_URL },
    async function (browser) {
      const focusInput = "#cc-number";
      await SimpleTest.promiseFocus(browser);
      await focusAndWaitForFieldsIdentified(browser, focusInput);

      await Services.fog.testFlushAllChildren();
    }
  );

  let actual_events =
    Glean.formautofillMl.fieldInferResult.testGetValue() ?? [];
  Assert.equal(
    actual_events.length,
    expected_events.length,
    `Expected to have ${expected_events.length} events`
  );

  for (let i = 0; i < actual_events.length; i++) {
    Assert.deepEqual(actual_events[i].extra, expected_events[i]);
  }
});
