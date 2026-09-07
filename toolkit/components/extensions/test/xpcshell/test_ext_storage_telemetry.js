"use strict";

const { ExtensionStorageIDB } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionStorageIDB.sys.mjs"
);
const { getTrimmedString } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionTelemetry.sys.mjs"
);

const EXTENSION_ID1 = "@test-extension1";
const EXTENSION_ID2 = "@test-extension2";

const GLEAN_STORAGE_LOCAL_METRICS = [
  "storageLocalGetIdb",
  "storageLocalSetIdb",
];
const GLEAN_STORAGE_LOCAL_METRICS_LABELED = [
  "storageLocalGetIdbByAddonid",
  "storageLocalSetIdbByAddonid",
];

const assertNoStorageLocalGleanData = () => {
  for (let metricId of GLEAN_STORAGE_LOCAL_METRICS) {
    const { GleanTimingDistribution } = globalThis;
    assertGleanMetricsNoSamples({
      metricId,
      gleanMetric: Glean.extensionsTiming[metricId],
      gleanMetricConstructor: GleanTimingDistribution,
    });
  }
  for (let metricId of GLEAN_STORAGE_LOCAL_METRICS_LABELED) {
    assertGleanLabeledMetricEmpty({
      metricId,
      gleanMetric: Glean.extensionsTiming[metricId],
      gleanMetricLabels: [],
    });
  }
};

const assertStorageLocalGleanData = ({
  allAddonsMetrics: { expectedSamplesCount },
  perAddonMetrics: { expectedLabelsValue },
}) => {
  if (ExtensionStorageIDB.isBackendEnabled) {
    for (let metricId of GLEAN_STORAGE_LOCAL_METRICS) {
      const { GleanTimingDistribution } = globalThis;
      assertGleanMetricsSamplesCount({
        metricId,
        gleanMetric: Glean.extensionsTiming[metricId],
        gleanMetricConstructor: GleanTimingDistribution,
        expectedSamplesCount,
      });
    }
    for (let metricId of GLEAN_STORAGE_LOCAL_METRICS_LABELED) {
      // TODO(Bug 2028892): replace this for loop with the assertGleanLabeledMetric
      // call that follows it once the underlying issue with testGetValue
      // for labeled_* metrics.
      for (const [k, v] of Object.entries(expectedLabelsValue)) {
        Assert.equal(
          Glean.extensionsTiming[metricId][k].testGetValue()?.count,
          v.count,
          `Got expected count on metric "${metricId}" and addon id "${k}"`
        );
      }

      /*
      assertGleanLabeledMetric({
        metricId,
        gleanMetric: Glean.extensionsTiming[metricId],
        gleanMetricLabels: Object.keys(expectedLabelsValue),
        // This parameter is meant to be set to an object
        // mapping values for the expected labels, e.g.
        //
        //   {
        //     [EXTENSION_ID1]: { count: 1 },
        //   }
        expectedLabelsValue,
        // Only assert on the count property, and ignore the
        // actual timing values collected.
        preprocessLabelValueFn: v => ({ count: v.count }),
      });
      */
    }
  } else {
    // NOTE: we do not collect telemetry for the legacy JSON backend anymore
    // and so if the IDB backend is not enabled we expect the related Glean
    // metrics to be empty.
    assertNoStorageLocalGleanData();
  }
};

async function test_telemetry_background() {
  const server = createHttpServer();
  server.registerDirectory("/data/", do_get_file("data"));

  const BASE_URL = `http://localhost:${server.identity.primaryPort}/data`;

  async function contentScript() {
    await browser.storage.local.set({ a: "b" });
    await browser.storage.local.get("a");
    browser.test.sendMessage("contentDone");
  }

  let baseManifest = {
    permissions: ["storage"],
    content_scripts: [
      {
        matches: ["http://*/*/file_sample.html"],
        js: ["content_script.js"],
      },
    ],
  };

  let baseExtInfo = {
    async background() {
      await browser.storage.local.set({ a: "b" });
      await browser.storage.local.get("a");
      browser.test.sendMessage("backgroundDone");
    },
    files: {
      "content_script.js": contentScript,
    },
  };

  let extension1 = ExtensionTestUtils.loadExtension({
    ...baseExtInfo,
    manifest: {
      ...baseManifest,
      browser_specific_settings: {
        gecko: { id: EXTENSION_ID1 },
      },
    },
  });
  let extension2 = ExtensionTestUtils.loadExtension({
    ...baseExtInfo,
    manifest: {
      ...baseManifest,
      browser_specific_settings: {
        gecko: { id: EXTENSION_ID2 },
      },
    },
  });

  // Make sure to force flushing glean fog data from child processes before
  // resetting the already collected data.
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
  assertNoStorageLocalGleanData();

  await extension1.startup();
  await extension1.awaitMessage("backgroundDone");

  // Assert glean telemetry data.
  info("Assert storage.local metrics collected for background page API calls");

  await Services.fog.testFlushAllChildren();
  assertStorageLocalGleanData({
    allAddonsMetrics: { expectedSamplesCount: 1 },
    perAddonMetrics: {
      expectedLabelsValue: {
        [EXTENSION_ID1]: { count: 1 },
      },
    },
  });

  await extension2.startup();
  await extension2.awaitMessage("backgroundDone");

  // Assert glean telemetry data.
  await Services.fog.testFlushAllChildren();
  assertStorageLocalGleanData({
    allAddonsMetrics: { expectedSamplesCount: 2 },
    perAddonMetrics: {
      expectedLabelsValue: {
        [EXTENSION_ID1]: { count: 1 },
        [EXTENSION_ID2]: { count: 1 },
      },
    },
  });

  await extension2.unload();

  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  // Run a content script.
  let contentPage = await ExtensionTestUtils.loadContentPage(
    `${BASE_URL}/file_sample.html`
  );
  await extension1.awaitMessage("contentDone");

  info("Assert storage.local metrics collected for content scripts API calls");
  await Services.fog.testFlushAllChildren();
  // Expect only telemetry for the single extension content script
  // that should be executed when loading the test webpage.
  assertStorageLocalGleanData({
    allAddonsMetrics: { expectedSamplesCount: 1 },
    perAddonMetrics: {
      expectedLabelsValue: {
        [EXTENSION_ID1]: { count: 1 },
      },
    },
  });

  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  await extension1.unload();
  await contentPage.close();
}

add_task(function test_telemetry_background_file_backend() {
  return runWithPrefs(
    [[ExtensionStorageIDB.BACKEND_ENABLED_PREF, false]],
    test_telemetry_background
  );
});

add_task(function test_telemetry_background_idb_backend() {
  return runWithPrefs(
    [
      [ExtensionStorageIDB.BACKEND_ENABLED_PREF, true],
      // Set the migrated preference for the two test extension, because the
      // first storage.local call fallbacks to run in the parent process when we
      // don't know which is the selected backend during the extension startup
      // and so we can't choose the telemetry histogram to use.
      [
        `${ExtensionStorageIDB.IDB_MIGRATED_PREF_BRANCH}.${EXTENSION_ID1}`,
        true,
      ],
      [
        `${ExtensionStorageIDB.IDB_MIGRATED_PREF_BRANCH}.${EXTENSION_ID2}`,
        true,
      ],
    ],
    test_telemetry_background
  );
});

// This test verifies that we do record the expected telemetry event when we
// normalize the error message for an unexpected error (an error raised internally
// by the QuotaManager and/or IndexedDB, which it is being normalized into the generic
// "An unexpected error occurred" error message).
add_task(async function test_telemetry_storage_local_unexpected_error() {
  Services.fog.testResetFOG();

  const methods = ["clear", "get", "remove", "set"];
  const veryLongErrorName = `VeryLongErrorName${Array(200).fill(0).join("")}`;
  const otherError = new Error("an error recorded as OtherError");

  const recordedErrors = [
    new DOMException("error message", "UnexpectedDOMException"),
    new DOMException("error message", veryLongErrorName),
    otherError,
  ];

  // We expect the following errors to not be recorded in telemetry (because they
  // are raised on scenarios that we already expect).
  const nonRecordedErrors = [
    new DOMException("error message", "QuotaExceededError"),
    new DOMException("error message", "DataCloneError"),
  ];

  const expectedEvents = [];

  const errors = [].concat(recordedErrors, nonRecordedErrors);

  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    const storageMethod = methods[i] || "set";
    ExtensionStorageIDB.normalizeStorageError({
      error: errors[i],
      extensionId: EXTENSION_ID1,
      storageMethod,
    });

    if (recordedErrors.includes(error)) {
      let error_name =
        error === otherError ? "OtherError" : getTrimmedString(error.name);

      expectedEvents.push({
        value: EXTENSION_ID1,
        object: storageMethod,
        extra: { error_name },
      });
    }
  }

  let glean = Glean.extensionsData.storageLocalError.testGetValue() ?? [];
  equal(glean.length, expectedEvents.length, "Correct number of events.");

  for (let i = 0; i < expectedEvents.length; i++) {
    let event = expectedEvents[i];
    equal(glean[i].extra.addon_id, event.value, "Correct addon_id.");
    equal(glean[i].extra.method, event.object, "Correct method.");
    equal(glean[i].extra.error_name, event.extra.error_name, "Correct error.");
  }
  Services.fog.testResetFOG();
});
