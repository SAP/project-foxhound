/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { TranslationsTelemetry } = ChromeUtils.importESModule(
  "chrome://global/content/translations/TranslationsTelemetry.sys.mjs"
);

add_task(function test_sampling_across_channels() {
  // prettier-ignore
  const sampleRates = {
    applyInAutomation: true,
    default: 1 /      10,
    nightly: 1 /     100,
       beta: 1 /   1_000,
        esr: 1 /  10_000,
    release: 1 / 100_000,
  };

  // prettier-ignore
  const outcomes = {
    default: { recordedCount: 0, skippedCount: 0 },
    nightly: { recordedCount: 0, skippedCount: 0 },
       beta: { recordedCount: 0, skippedCount: 0 },
        esr: { recordedCount: 0, skippedCount: 0 },
    release: { recordedCount: 0, skippedCount: 0 },
  };

  const channels = Object.keys(outcomes);
  const iterations = 1_000_000;

  info(`Collecting ${iterations} outcomes for each channel.`);
  for (let iteration = 0; iteration < iterations; iteration++) {
    const flowContext = TranslationsTelemetry.createFlowContext();

    for (const channel of channels) {
      const shouldSkip = TranslationsTelemetry.shouldSkipSample(
        sampleRates,
        flowContext,
        channel
      );

      if (shouldSkip) {
        outcomes[channel].skippedCount++;
      } else {
        outcomes[channel].recordedCount++;
      }
    }
  }

  info(
    `Checking that all ${iterations} outcomes are present for each channel.`
  );
  for (const channel of channels) {
    const { recordedCount: recourdedCount, skippedCount } = outcomes[channel];
    equal(
      recourdedCount + skippedCount,
      iterations,
      `The total outcomes for the "${channel}" channel should cover every iteration.`
    );
  }

  info(
    `Checking that channels with a higher probability to record have more recorded events.`
  );
  for (let index = 0; index < channels.length - 1; index++) {
    const current = channels[index];
    const next = channels[index + 1];

    // Since the are denominators in this test increase so drastically with each subsequent channel,
    // these assertions are nearly impossible to fail, even with non-deterministically seeded randomness.
    Assert.greater(
      outcomes[current].recordedCount,
      outcomes[next].recordedCount,
      `The recorded count for the "${current}" channel should be greater than the "${next}" channel.`
    );
  }

  // Each channel has its own probability to record an event or skip an event.
  // For a large number of iterations, the number of recorded events should follow a binomial distribution.
  //
  // - https://en.wikipedia.org/wiki/Binomial_distribution
  //
  // The variance of a binomial is defined as n * p * (1 - p),
  // where n is the number of iterations and p is the probability to record an event.
  //
  // The square root of that variance is the standard deviation.
  //
  // We will use a tolerance of +/- 6x standard deviation to ensure that our randomness does not cause excessive intermittent failures.
  //
  // - https://en.wikipedia.org/wiki/68–95–99.7_rule
  //
  // Within a normal distribution, a tolerance of +/- 3x standard deviation covers 99.7% of outcomes.
  // Accordig to the table on the linked Wikipedia page, +/- 6x should fail only 1 out of 506,797,346 times.
  //
  // Using non-determinstically seeded randomness in this test will help ensure that our in-production rng behaves as expeced.
  const multiplier = 6;

  info(
    "Checking that each channel's recorded event count is within the expected statistical tolerance."
  );
  for (const channel of channels) {
    const sampleRate = sampleRates[channel];
    const { recordedCount } = outcomes[channel];
    const expectedRecordedCount = iterations * sampleRate;
    const deviation = Math.abs(recordedCount - expectedRecordedCount);
    const standardDeviation = Math.sqrt(
      iterations * sampleRate * (1 - sampleRate)
    );
    const tolerance = multiplier * standardDeviation;

    info(
      `Channel("${channel}"): expected(${expectedRecordedCount}), recorded(${recordedCount}), deviation(${deviation.toFixed(1)}), tolerance(${tolerance.toFixed(1)})`
    );

    Assert.lessOrEqual(
      deviation,
      tolerance,
      `The recorded count for "${channel}" remains within +/- ${multiplier}x of the expected standard deviation.`
    );
  }
});
