"use strict";

const GLEAN_METRIC_ID = "contentScriptInjection";
const GLEAN_LABELED_METRIC_ID = "contentScriptInjectionByAddonid";

const server = createHttpServer();
server.registerDirectory("/data/", do_get_file("data"));

const BASE_URL = `http://localhost:${server.identity.primaryPort}/data`;

add_task(async function test_telemetry() {
  const { GleanTimingDistribution } = globalThis;

  function contentScript() {
    browser.test.sendMessage("content-script-run");
  }

  let extension1 = ExtensionTestUtils.loadExtension({
    manifest: {
      content_scripts: [
        {
          matches: ["http://*/*/file_sample.html"],
          js: ["content_script.js"],
          run_at: "document_end",
        },
      ],
    },

    files: {
      "content_script.js": contentScript,
    },
  });
  let extension2 = ExtensionTestUtils.loadExtension({
    manifest: {
      content_scripts: [
        {
          matches: ["http://*/*/file_sample.html"],
          js: ["content_script.js"],
          run_at: "document_end",
        },
      ],
    },

    files: {
      "content_script.js": contentScript,
    },
  });

  // Make sure to force flushing glean fog data from child processes before
  // resetting the already collected data.
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  assertGleanMetricsNoSamples({
    metricId: GLEAN_METRIC_ID,
    gleanMetric: Glean.extensionsTiming[GLEAN_METRIC_ID],
    gleanMetricConstructor: GleanTimingDistribution,
  });
  assertGleanLabeledMetricEmpty({
    metricId: GLEAN_LABELED_METRIC_ID,
    gleanMetric: Glean.extensionsTiming[GLEAN_LABELED_METRIC_ID],
    gleanMetricLabels: [],
  });

  await extension1.startup();
  let extensionId = extension1.extension.id;

  info(`Started extension with id ${extensionId}`);

  // After starting the extension we still expect no content script
  // telemetry data to be found collected yet.
  await Services.fog.testFlushAllChildren();
  assertGleanMetricsNoSamples({
    metricId: GLEAN_METRIC_ID,
    gleanMetric: Glean.extensionsTiming[GLEAN_METRIC_ID],
    gleanMetricConstructor: GleanTimingDistribution,
  });
  assertGleanLabeledMetricEmpty({
    metricId: GLEAN_LABELED_METRIC_ID,
    gleanMetric: Glean.extensionsTiming[GLEAN_LABELED_METRIC_ID],
    gleanMetricLabels: [],
  });

  let contentPage = await ExtensionTestUtils.loadContentPage(
    `${BASE_URL}/file_sample.html`
  );
  await extension1.awaitMessage("content-script-run");

  // Assert the content script has been executed, verify
  // the expected glean telemetry data has been collected.
  await Services.fog.testFlushAllChildren();
  assertGleanMetricsSamplesCount({
    metricId: GLEAN_METRIC_ID,
    gleanMetric: Glean.extensionsTiming[GLEAN_METRIC_ID],
    gleanMetricConstructor: GleanTimingDistribution,
    expectedSamplesCount: 1,
  });
  const ext1ContentScriptInjectionSum =
    Glean.extensionsTiming[GLEAN_LABELED_METRIC_ID].testGetValue()?.[
      extensionId
    ]?.sum;
  Assert.greater(
    ext1ContentScriptInjectionSum,
    0,
    `Expect ${GLEAN_LABELED_METRIC_ID} data for extension1 to be found`
  );

  await contentPage.close();
  await extension1.unload();

  await extension2.startup();
  let extensionId2 = extension2.extension.id;

  info(`Started extension with id ${extensionId2}`);

  // Assert no additional telemetry data yet for these metrics
  // after extension2 startup.
  await Services.fog.testFlushAllChildren();
  assertGleanMetricsSamplesCount({
    metricId: GLEAN_METRIC_ID,
    gleanMetric: Glean.extensionsTiming[GLEAN_METRIC_ID],
    gleanMetricConstructor: GleanTimingDistribution,
    expectedSamplesCount: 1,
    message: "No new data recorded yet after extension 2 startup",
  });
  Assert.equal(
    Glean.extensionsTiming[GLEAN_LABELED_METRIC_ID].testGetValue()?.[
      extensionId
    ]?.sum,
    ext1ContentScriptInjectionSum,
    `Expect no new ${GLEAN_LABELED_METRIC_ID} data for extension1 data to be found`
  );
  Assert.equal(
    Glean.extensionsTiming[GLEAN_LABELED_METRIC_ID].testGetValue()?.[
      extensionId2
    ]?.sum,
    null,
    `Expect no ${GLEAN_LABELED_METRIC_ID} data for extension2 data to be found`
  );

  contentPage = await ExtensionTestUtils.loadContentPage(
    `${BASE_URL}/file_sample.html`
  );
  await extension2.awaitMessage("content-script-run");

  // Assert on the additional telemetry data for these metrics
  // expected to be collected after extension2 content script
  // execution.
  await Services.fog.testFlushAllChildren();
  assertGleanMetricsSamplesCount({
    metricId: GLEAN_METRIC_ID,
    gleanMetric: Glean.extensionsTiming[GLEAN_METRIC_ID],
    gleanMetricConstructor: GleanTimingDistribution,
    expectedSamplesCount: 2,
    message: "New data recorded after extension 2 content script injection",
  });
  Assert.equal(
    Glean.extensionsTiming[GLEAN_LABELED_METRIC_ID].testGetValue()?.[
      extensionId
    ]?.sum,
    ext1ContentScriptInjectionSum,
    `Expect no new ${GLEAN_LABELED_METRIC_ID} data for extension1 data to be found`
  );
  Assert.greater(
    Glean.extensionsTiming[GLEAN_LABELED_METRIC_ID].testGetValue()?.[
      extensionId2
    ]?.sum,
    0,
    `Expect ${GLEAN_LABELED_METRIC_ID} data for extension2 to be found`
  );

  await contentPage.close();
  await extension2.unload();
});
