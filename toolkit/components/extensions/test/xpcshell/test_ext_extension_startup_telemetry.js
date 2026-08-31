"use strict";

add_task(async function test_telemetry() {
  const { GleanTimingDistribution } = globalThis;
  let extension1 = ExtensionTestUtils.loadExtension({});
  let extension2 = ExtensionTestUtils.loadExtension({});

  Services.fog.testResetFOG();

  assertGleanMetricsNoSamples({
    metricId: "extensionStartup",
    gleanMetric: Glean.extensionsTiming.extensionStartup,
    gleanMetricConstructor: GleanTimingDistribution,
  });
  assertGleanLabeledMetricEmpty({
    metricId: "extensionStartupByAddonid",
    gleanMetric: Glean.extensionsTiming.extensionStartupByAddonid,
    gleanMetricLabels: [],
  });

  await extension1.startup();

  assertGleanMetricsSamplesCount({
    metricId: "extensionStartup",
    gleanMetric: Glean.extensionsTiming.extensionStartup,
    gleanMetricConstructor: GleanTimingDistribution,
    expectedSamplesCount: 1,
  });
  assertGleanLabeledMetric({
    metricId: "extensionStartupByAddonid",
    gleanMetric: Glean.extensionsTiming.extensionStartupByAddonid,
    gleanMetricLabels: [extension1.extension.id],
    expectedLabelsValue: {
      [extension1.extension.id]: { count: 1 },
    },
    preprocessLabelValueFn: v => ({ count: v.count }),
  });

  const allAddonsTimingSum =
    Glean.extensionsTiming.extensionStartup.testGetValue()?.sum;
  const ext1TimingSum =
    Glean.extensionsTiming.extensionStartupByAddonid.testGetValue()[
      extension1.extension.id
    ]?.sum;

  await extension2.startup();

  assertGleanMetricsSamplesCount({
    metricId: "extensionStartup",
    gleanMetric: Glean.extensionsTiming.extensionStartup,
    gleanMetricConstructor: GleanTimingDistribution,
    expectedSamplesCount: 2,
  });
  assertGleanLabeledMetric({
    metricId: "extensionStartupByAddonid",
    gleanMetric: Glean.extensionsTiming.extensionStartupByAddonid,
    gleanMetricLabels: [extension1.extension.id, extension2.extension.id],
    expectedLabelsValue: {
      [extension1.extension.id]: { count: 1 },
      [extension2.extension.id]: { count: 1 },
    },
    preprocessLabelValueFn: v => ({ count: v.count }),
  });

  Assert.greater(
    Glean.extensionsTiming.extensionStartup.testGetValue()?.sum,
    allAddonsTimingSum,
    "Expect extensionStartup timing sum to increase after extension2 startup"
  );
  Assert.equal(
    Glean.extensionsTiming.extensionStartupByAddonid.testGetValue()[
      extension1.extension.id
    ]?.sum,
    ext1TimingSum,
    `Data recorder for first extension is unchanged on the labeled extensionStartupByAddonid metric`
  );

  await extension1.unload();
  await extension2.unload();
});
