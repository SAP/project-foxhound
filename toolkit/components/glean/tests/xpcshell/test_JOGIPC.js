/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);
const { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

function sleep(ms) {
  /* eslint-disable mozilla/no-arbitrary-setTimeout */
  return new Promise(resolve => setTimeout(resolve, ms));
}

add_task(
  /* on Android FOG is set up through head.js */
  { skip_if: () => !runningInParent || AppConstants.platform == "android" },
  function test_setup() {
    // Give FOG a temp profile to init within.
    do_get_profile();

    // We need to initialize it once, otherwise operations will be stuck in the pre-init queue.
    Services.fog.initializeFOG();
  }
);

const COUNT = 42;
const STRING = "a string!";
const ANOTHER_STRING = "another string!";
const EVENT_EXTRA = { extra1: "so very extra" };
const MEMORIES = [13, 31];
const MEMORY_BUCKETS = ["13509772", "32131834"]; // buckets are strings : |
const COUNTERS_1 = 3;
const COUNTERS_2 = 5;
const INVALID_COUNTERS = 7;

// It is CRUCIAL that we register metrics in the same order in the parent and
// in the child or their metric ids will not line up and ALL WILL EXPLODE.
const METRICS = [
  ["counter", "jog_ipc", "jog_counter", ["test-only"], `"ping"`, false],
  ["string_list", "jog_ipc", "jog_string_list", ["test-only"], `"ping"`, false],
  ["event", "jog_ipc", "jog_event_no_extra", ["test-only"], `"ping"`, false],
  [
    "event",
    "jog_ipc",
    "jog_event",
    ["test-only"],
    `"ping"`,
    false,
    JSON.stringify({ allowed_extra_keys: ["extra1"] }),
  ],
  [
    "memory_distribution",
    "jog_ipc",
    "jog_memory_dist",
    ["test-only"],
    `"ping"`,
    false,
    JSON.stringify({ memory_unit: "megabyte" }),
  ],
  [
    "timing_distribution",
    "jog_ipc",
    "jog_timing_dist",
    ["test-only"],
    `"ping"`,
    false,
    JSON.stringify({ time_unit: "nanosecond" }),
  ],
  [
    "custom_distribution",
    "jog_ipc",
    "jog_custom_dist",
    ["test-only"],
    `"ping"`,
    false,
    JSON.stringify({
      range_min: 1,
      range_max: 2147483646,
      bucket_count: 10,
      histogram_type: "linear",
    }),
  ],
  [
    "labeled_counter",
    "jog_ipc",
    "jog_labeled_counter",
    ["test-only"],
    `"ping"`,
    false,
  ],
  [
    "labeled_counter",
    "jog_ipc",
    "jog_labeled_counter_err",
    ["test-only"],
    `"ping"`,
    false,
  ],
  [
    "labeled_counter",
    "jog_ipc",
    "jog_labeled_counter_with_labels",
    ["test-only"],
    `"ping"`,
    false,
    JSON.stringify({ labels: ["label_1", "label_2"] }),
  ],
  [
    "labeled_counter",
    "jog_ipc",
    "jog_labeled_counter_with_labels_err",
    ["test-only"],
    `"ping"`,
    false,
    JSON.stringify({ labels: ["label_1", "label_2"] }),
  ],
  ["rate", "jog_ipc", "jog_rate", ["test-only"], `"ping"`, false],
];

add_task({ skip_if: () => runningInParent }, async function run_child_stuff() {
  for (let metric of METRICS) {
    Services.fog.testRegisterRuntimeMetric(...metric);
  }
  Glean.jogIpc.jogCounter.add(COUNT);
  Glean.jogIpc.jogStringList.add(STRING);
  Glean.jogIpc.jogStringList.add(ANOTHER_STRING);

  Glean.jogIpc.jogEventNoExtra.record();
  Glean.jogIpc.jogEvent.record(EVENT_EXTRA);

  for (let memory of MEMORIES) {
    Glean.jogIpc.jogMemoryDist.accumulate(memory);
  }

  let t1 = Glean.jogIpc.jogTimingDist.start();
  let t2 = Glean.jogIpc.jogTimingDist.start();

  await sleep(5);

  let t3 = Glean.jogIpc.jogTimingDist.start();
  Glean.jogIpc.jogTimingDist.cancel(t1);

  await sleep(5);

  Glean.jogIpc.jogTimingDist.stopAndAccumulate(t2); // 10ms
  Glean.jogIpc.jogTimingDist.stopAndAccumulate(t3); // 5ms

  Glean.jogIpc.jogCustomDist.accumulateSamples([3, 4]);

  Glean.jogIpc.jogLabeledCounter.label_1.add(COUNTERS_1);
  Glean.jogIpc.jogLabeledCounter.label_2.add(COUNTERS_2);

  Glean.jogIpc.jogLabeledCounterErr.InvalidLabel.add(INVALID_COUNTERS);

  Glean.jogIpc.jogLabeledCounterWithLabels.label_1.add(COUNTERS_1);
  Glean.jogIpc.jogLabeledCounterWithLabels.label_2.add(COUNTERS_2);

  Glean.jogIpc.jogLabeledCounterWithLabelsErr.InvalidLabel.add(
    INVALID_COUNTERS
  );

  Glean.jogIpc.jogRate.addToNumerator(44);
  Glean.jogIpc.jogRate.addToDenominator(14);
});

add_task(
  { skip_if: () => !runningInParent },
  async function test_child_metrics() {
    for (let metric of METRICS) {
      Services.fog.testRegisterRuntimeMetric(...metric);
    }
    await run_test_in_child("test_JOGIPC.js");
    await Services.fog.testFlushAllChildren();

    Assert.equal(Glean.jogIpc.jogCounter.testGetValue(), COUNT);

    // Note: this will break if string list ever rearranges its items.
    const strings = Glean.jogIpc.jogStringList.testGetValue();
    Assert.deepEqual(strings, [STRING, ANOTHER_STRING]);

    const data = Glean.jogIpc.jogMemoryDist.testGetValue();
    Assert.equal(MEMORIES.reduce((a, b) => a + b, 0) * 1024 * 1024, data.sum);
    for (let [bucket, count] of Object.entries(data.values)) {
      // We could assert instead, but let's skip to save the logspam.
      if (count == 0) {
        continue;
      }
      Assert.ok(count == 1 && MEMORY_BUCKETS.includes(bucket));
    }

    const customData = Glean.jogIpc.jogCustomDist.testGetValue();
    Assert.equal(3 + 4, customData.sum, "Sum's correct");
    for (let [bucket, count] of Object.entries(customData.values)) {
      Assert.ok(
        count == 0 || (count == 2 && bucket == 1), // both values in the low bucket
        `Only two buckets have a sample ${bucket} ${count}`
      );
    }

    let events = Glean.jogIpc.jogEventNoExtra.testGetValue();
    Assert.equal(1, events.length);
    Assert.equal("jog_ipc", events[0].category);
    Assert.equal("jog_event_no_extra", events[0].name);

    events = Glean.jogIpc.jogEvent.testGetValue();
    Assert.equal(1, events.length);
    Assert.equal("jog_ipc", events[0].category);
    Assert.equal("jog_event", events[0].name);
    Assert.deepEqual(EVENT_EXTRA, events[0].extra);

    const NANOS_IN_MILLIS = 1e6;
    const EPSILON = 40000; // bug 1701949
    const times = Glean.jogIpc.jogTimingDist.testGetValue();
    Assert.greater(times.sum, 15 * NANOS_IN_MILLIS - EPSILON);
    // We can't guarantee any specific time values (thank you clocks),
    // but we can assert there are only two samples.
    Assert.equal(
      2,
      Object.entries(times.values).reduce(
        (acc, [bucket, count]) => acc + count,
        0
      )
    );

    const labeledCounter = Glean.jogIpc.jogLabeledCounter;
    Assert.equal(labeledCounter.label_1.testGetValue(), COUNTERS_1);
    Assert.equal(labeledCounter.label_2.testGetValue(), COUNTERS_2);

    Assert.throws(
      () => Glean.jogIpc.jogLabeledCounterErr.__other__.testGetValue(),
      /NS_ERROR_LOSS_OF_SIGNIFICANT_DATA/,
      "Invalid labels record errors, which throw"
    );

    const labeledCounterWLabels = Glean.jogIpc.jogLabeledCounterWithLabels;
    Assert.equal(labeledCounterWLabels.label_1.testGetValue(), COUNTERS_1);
    Assert.equal(labeledCounterWLabels.label_2.testGetValue(), COUNTERS_2);

    // TODO:(bug 1766515) - This should throw.
    /*Assert.throws(
      () =>
        Glean.jogIpc.jogLabeledCounterWithLabelsErr.__other__.testGetValue(),
      /NS_ERROR_LOSS_OF_SIGNIFICANT_DATA/,
      "Invalid labels record errors, which throw"
    );*/
    Assert.equal(
      Glean.jogIpc.jogLabeledCounterWithLabelsErr.__other__.testGetValue(),
      INVALID_COUNTERS
    );

    Assert.deepEqual(
      { numerator: 44, denominator: 14 },
      Glean.jogIpc.jogRate.testGetValue()
    );
  }
);
