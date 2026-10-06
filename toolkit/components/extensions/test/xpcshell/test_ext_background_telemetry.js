"use strict";

add_task(async function test_telemetry() {
  const { GleanTimingDistribution } = globalThis;

  let extension1 = ExtensionTestUtils.loadExtension({
    background() {
      browser.test.sendMessage("loaded");
    },
  });

  let extension2 = ExtensionTestUtils.loadExtension({
    background() {
      browser.test.sendMessage("loaded");
    },
  });

  Services.fog.testResetFOG();

  assertGleanMetricsNoSamples({
    metricId: "backgroundPageLoad",
    gleanMetric: Glean.extensionsTiming.backgroundPageLoad,
    gleanMetricConstructor: GleanTimingDistribution,
  });
  assertGleanLabeledMetricEmpty({
    metricId: "backgroundPageLoadByAddonid",
    gleanMetric: Glean.extensionsTiming.backgroundPageLoadByAddonid,
    gleanMetricLabels: [],
  });

  await extension1.startup();
  await extension1.awaitMessage("loaded");

  assertGleanMetricsSamplesCount({
    metricId: "backgroundPageLoad",
    gleanMetric: Glean.extensionsTiming.backgroundPageLoad,
    gleanMetricConstructor: GleanTimingDistribution,
    expectedSamplesCount: 1,
  });

  const allAddonsBackgroundPageLoadSum =
    Glean.extensionsTiming.backgroundPageLoad.testGetValue()?.sum;
  const ext1BackgroundPageLoadSum =
    Glean.extensionsTiming.backgroundPageLoadByAddonid.testGetValue()?.[
      extension1.id
    ]?.sum;
  Assert.greater(
    allAddonsBackgroundPageLoadSum,
    0,
    `Expect stored values in the backgroundPageLoad Glean metric`
  );
  Assert.greater(
    ext1BackgroundPageLoadSum,
    0,
    `Expect stored values in the backgroundPageLoadByAddonid Glean metric for extension1`
  );

  await extension2.startup();
  await extension2.awaitMessage("loaded");

  assertGleanMetricsSamplesCount({
    metricId: "backgroundPageLoad",
    gleanMetric: Glean.extensionsTiming.backgroundPageLoad,
    gleanMetricConstructor: GleanTimingDistribution,
    expectedSamplesCount: 2,
  });
  Assert.greater(
    Glean.extensionsTiming.backgroundPageLoad.testGetValue()?.sum,
    allAddonsBackgroundPageLoadSum,
    `Expect backgroundPageLoad sum to increae after extension2 is started`
  );
  Assert.equal(
    Glean.extensionsTiming.backgroundPageLoadByAddonid.testGetValue()?.[
      extension1.id
    ]?.sum,
    ext1BackgroundPageLoadSum,
    `Expect backgroundPageLoadByAddonid Glean for extension1 to not change after extension2 startup`
  );
  Assert.greater(
    Glean.extensionsTiming.backgroundPageLoadByAddonid.testGetValue()?.[
      extension2.id
    ]?.sum,
    0,
    `Expect stored values in the backgroundPageLoadByAddonid Glean metric for extension2`
  );

  await extension1.unload();
  await extension2.unload();
});
