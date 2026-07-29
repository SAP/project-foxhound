"use strict";

/* exported IS_OOP, GLEAN_EVENTPAGE_IDLE_RESULT_CATEGORIES, valueSum,
            assertDNRTelemetryMetricsDefined, assertDNRTelemetryMetricsNoSamples, assertDNRTelemetryMetricsGetValueEq,
            assertDNRTelemetryMetricsSamplesCount, setupTelemetryForTests */

ChromeUtils.defineESModuleGetters(this, {
  ContentTaskUtils: "resource://testing-common/ContentTaskUtils.sys.mjs",
});

// Allows to run xpcshell telemetry test also on products (e.g. Thunderbird) where
// that telemetry wouldn't be actually collected in practice (but to be sure
// that it will work on those products as well by just adding the product in
// the telemetry metric definitions if it turns out we want to).
Services.prefs.setBoolPref(
  "toolkit.telemetry.testing.overrideProductsCheck",
  true
);

const IS_OOP = Services.prefs.getBoolPref("extensions.webextensions.remote");

// Keep these labels in the same order as "eventpage_idle_result" Glean metric
// definition in toolkit/components/extensions/metrics.yaml to make it easier
// to keep them in sync (while keeping `__other__` as the last entry).
const GLEAN_EVENTPAGE_IDLE_RESULT_CATEGORIES = [
  "suspend",
  "reset_other",
  "reset_event",
  "reset_listeners",
  "reset_nativeapp",
  "reset_streamfilter",
  "reset_parentapicall",
  "__other__",
];

function valueSum(arr) {
  return Object.values(arr).reduce((a, b) => a + b, 0);
}

function setupTelemetryForTests() {
  // FOG needs a profile directory to put its data in.
  do_get_profile();
  // FOG needs to be initialized in order for data to flow.
  Services.fog.initializeFOG();
}

function assertValidGleanMetric({
  metricId,
  gleanMetric,
  gleanMetricConstructor,
  msg,
}) {
  const { GleanMetric } = globalThis;
  if (!(gleanMetric instanceof GleanMetric)) {
    throw new Error(
      `gleanMetric "${metricId}" ${gleanMetric} should be an instance of GleanMetric ${msg}`
    );
  }

  if (
    gleanMetricConstructor &&
    !(gleanMetric instanceof gleanMetricConstructor)
  ) {
    throw new Error(
      `gleanMetric "${metricId}" should be an instance of the given GleanMetric constructor: ${gleanMetric} not an instance of ${gleanMetricConstructor} ${msg}`
    );
  }
}

// TODO reuse this helper inside the DNR specific test helper which would be doing
// a similar assertion on DNR metrics.
function assertGleanMetricsNoSamples({
  metricId,
  gleanMetric,
  gleanMetricConstructor,
  message,
}) {
  const msg = message ? `(${message})` : "";
  assertValidGleanMetric({
    metricId,
    gleanMetric,
    gleanMetricConstructor,
    msg,
  });
  const gleanData = gleanMetric.testGetValue();
  Assert.deepEqual(
    gleanData,
    undefined,
    `Got no sample for Glean metric ${metricId} ${msg}`
  );
}

// TODO reuse this helper inside the DNR specific test helper which would be doing
// a similar assertion on DNR metrics.
function assertGleanMetricsSamplesCount({
  metricId,
  gleanMetric,
  gleanMetricConstructor,
  expectedSamplesCount,
  message,
}) {
  const msg = message ? `(${message})` : "";
  assertValidGleanMetric({
    metricId,
    gleanMetric,
    gleanMetricConstructor,
    msg,
  });
  const gleanData = gleanMetric.testGetValue();
  Assert.notEqual(
    gleanData,
    undefined,
    `Got some sample for Glean metric ${metricId} ${msg}`
  );
  Assert.equal(
    valueSum(gleanData.values),
    expectedSamplesCount,
    `Got the expected number of samples for Glean metric ${metricId} ${msg}`
  );
}

function assertGleanLabeledMetric({
  metricId,
  gleanMetric,
  gleanMetricLabels,
  expectedLabelsValue,
  ignoreNonExpectedLabels,
  ignoreUnknownLabels,
  preprocessLabelValueFn,
  message,
}) {
  const { GleanLabeled } = globalThis;
  const msg = message ? `(${message})` : "";
  if (!Array.isArray(gleanMetricLabels)) {
    throw new Error(
      `Missing mandatory gleanMetricLabels property ${msg}: ${gleanMetricLabels}`
    );
  }

  if (!(gleanMetric instanceof GleanLabeled)) {
    throw new Error(
      `Glean metric "${metricId}" should be an instance of GleanLabeled: ${gleanMetric} ${msg}`
    );
  }

  let actualLabeledValues = gleanMetric.testGetValue();

  for (const label of gleanMetricLabels) {
    const expectedLabelValue = expectedLabelsValue[label];
    if (ignoreNonExpectedLabels && !(label in expectedLabelsValue)) {
      continue;
    }

    // NOTE: no need for optional chaining on accessing actualLabeledValue,
    // GleanLabeled testGetValue calls will return an empty object when there
    // is no data.
    let actualLabelValue = actualLabeledValues[label];
    if (actualLabelValue != null && preprocessLabelValueFn) {
      // Optionally preprocess the actual labeled values to make it easier
      // to assert the expected values that the callers actually cares about.
      actualLabelValue = preprocessLabelValueFn(actualLabelValue);
    }
    Assert.deepEqual(
      actualLabelValue,
      expectedLabelValue,
      `Got expected value Glean "${metricId}" metric label "${label}"`
    );
  }

  if (gleanMetricLabels.length === 0) {
    Assert.deepEqual(
      actualLabeledValues,
      {},
      `Expect GleanLabeled "${metricId}" to be empty`
    );
  }

  if (!ignoreUnknownLabels) {
    Assert.deepEqual(
      gleanMetric["__other__"].testGetValue(), // eslint-disable-line dot-notation
      undefined,
      `Expect Glean "${metricId}" metric label "__other__" to be empty.`
    );
  }
}

function assertGleanLabeledMetricEmpty({
  metricId,
  gleanMetric,
  gleanMetricLabels,
  message,
}) {
  // All empty labels passed to the other helpers to make it
  // assert that all labels are empty.
  assertGleanLabeledMetric({
    metricId,
    gleanMetric,
    gleanMetricLabels,
    expectedLabelsValue: {},
    message,
  });
}

function assertGleanLabeledMetricNotEmpty({
  metricId,
  gleanMetric,
  expectedNotEmptyLabels,
  ignoreUnknownLabels,
  message,
}) {
  const { GleanLabeled } = globalThis;
  const msg = message ? `(${message})` : "";
  if (
    !Array.isArray(expectedNotEmptyLabels) ||
    !expectedNotEmptyLabels.length
  ) {
    throw new Error(
      `Missing mandatory expectedNotEmptyLabels property ${msg}: ${expectedNotEmptyLabels}`
    );
  }

  if (!(gleanMetric instanceof GleanLabeled)) {
    throw new Error(
      `Glean metric "${metricId}" should be an instance of GleanLabeled: ${gleanMetric} ${msg}`
    );
  }

  for (const label of expectedNotEmptyLabels) {
    Assert.notEqual(
      gleanMetric[label].testGetValue(),
      undefined,
      `Expect Glean "${metricId}" metric label "${label}" to not be empty`
    );
  }

  if (!ignoreUnknownLabels) {
    Assert.deepEqual(
      gleanMetric["__other__"].testGetValue(), // eslint-disable-line dot-notation
      undefined,
      `Expect Glean "${metricId}" metric label "__other__" to be empty.`
    );
  }
}

function assertDNRTelemetryMetricsDefined(metrics) {
  const metricsNotFound = metrics.filter(metricDetails => {
    const { metric, label } = metricDetails;
    if (!Glean.extensionsApisDnr[metric]) {
      return true;
    }
    if (label) {
      return !Glean.extensionsApisDnr[metric][label];
    }
    return false;
  });
  Assert.deepEqual(
    metricsNotFound,
    [],
    `All expected extensionsApisDnr Glean metrics should be found`
  );
}

function assertDNRTelemetryMetricsNoSamples(metrics, msg) {
  assertDNRTelemetryMetricsDefined(metrics);
  for (const metricDetails of metrics) {
    const { metric, label } = metricDetails;

    const gleanData = label
      ? Glean.extensionsApisDnr[metric][label].testGetValue()
      : Glean.extensionsApisDnr[metric].testGetValue();
    Assert.deepEqual(
      gleanData,
      undefined,
      `Expect no sample for Glean metric extensionApisDnr.${metric} (${msg}): ${gleanData}`
    );
  }
}

function assertDNRTelemetryMetricsGetValueEq(metrics, msg) {
  assertDNRTelemetryMetricsDefined(metrics);
  for (const metricDetails of metrics) {
    const { metric, label, expectedGetValue } = metricDetails;

    const gleanData = label
      ? Glean.extensionsApisDnr[metric][label].testGetValue()
      : Glean.extensionsApisDnr[metric].testGetValue();
    Assert.deepEqual(
      gleanData,
      expectedGetValue,
      `Got expected value set on Glean metric extensionApisDnr.${metric}${
        label ? `.${label}` : ""
      } (${msg})`
    );
  }
}

function assertDNRTelemetryMetricsSamplesCount(metrics, msg) {
  assertDNRTelemetryMetricsDefined(metrics);

  // This assertion helpers doesn't currently handle labeled metrics,
  // raise an explicit error to catch if one is included by mistake.
  const labeledMetricsFound = metrics.filter(metric => !!metric.label);
  if (labeledMetricsFound.length) {
    throw new Error(
      `Unexpected labeled metrics in call to assertDNRTelemetryMetricsSamplesCount: ${labeledMetricsFound}`
    );
  }

  for (const metricDetails of metrics) {
    const { metric, expectedSamplesCount } = metricDetails;

    const gleanData = Glean.extensionsApisDnr[metric].testGetValue();
    Assert.notEqual(
      gleanData,
      undefined,
      `Got some sample for Glean metric extensionApisDnr.${metric}: ${
        gleanData && JSON.stringify(gleanData)
      }`
    );
    Assert.equal(
      valueSum(gleanData.values),
      expectedSamplesCount,
      `Got the expected number of samples for Glean metric extensionsApisDnr.${metric} (${msg})`
    );
    // Make sure we are accumulating meaningfull values in the sample,
    // if we do have samples for the bucket "0" it likely means we have
    // not been collecting the value correctly (e.g. typo in the property
    // name being collected).
    Assert.ok(
      !gleanData.values["0"],
      `No sample for Glean metric extensionsApisDnr.${metric} should be collected for the bucket "0"`
    );
  }
}
