/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_telemetry_success() {
  Services.fog.testResetFOG();

  await new Promise(resolve => {
    Services.clearData.clearPrivateBrowsingData({
      onDataDeleted() {
        resolve();
      },
    });
  });

  let duration = Glean.privateBrowsingCleanup.duration.testGetValue();
  Assert.equal(duration.count, 1, "duration recorded one sample");
  Assert.greater(duration.sum, 0, "duration sum is positive");

  let errorRate = Glean.privateBrowsingCleanup.errorRate.testGetValue();
  Assert.equal(errorRate.numerator, 0, "no errors on success");
  Assert.equal(errorRate.denominator, 1, "denominator incremented");
});

add_task(async function test_telemetry_failure() {
  Services.fog.testResetFOG();

  let observer = {
    observe(subject, topic) {
      if (topic !== "last-pb-context-exited") {
        return;
      }
      let collector;
      try {
        collector = subject.QueryInterface(Ci.nsIPBMCleanupCollector);
      } catch (e) {
        return;
      }
      let cb = collector.addPendingCleanup();
      Promise.resolve().then(() => cb.complete(Cr.NS_ERROR_FAILURE));
    },
  };

  Services.obs.addObserver(observer, "last-pb-context-exited");
  try {
    await new Promise(resolve => {
      Services.clearData.clearPrivateBrowsingData({
        onDataDeleted() {
          resolve();
        },
      });
    });
  } finally {
    Services.obs.removeObserver(observer, "last-pb-context-exited");
  }

  let duration = Glean.privateBrowsingCleanup.duration.testGetValue();
  Assert.equal(
    duration.count,
    1,
    "duration recorded one sample on failure path"
  );

  let errorRate = Glean.privateBrowsingCleanup.errorRate.testGetValue();
  Assert.equal(errorRate.numerator, 1, "numerator incremented on failure");
  Assert.equal(errorRate.denominator, 1, "denominator incremented on failure");
});

add_task(async function test_telemetry_accumulates() {
  Services.fog.testResetFOG();

  for (let i = 0; i < 3; i++) {
    await new Promise(resolve => {
      Services.clearData.clearPrivateBrowsingData({
        onDataDeleted() {
          resolve();
        },
      });
    });
  }

  let duration = Glean.privateBrowsingCleanup.duration.testGetValue();
  Assert.equal(duration.count, 3, "duration recorded three samples");

  let errorRate = Glean.privateBrowsingCleanup.errorRate.testGetValue();
  Assert.equal(
    errorRate.numerator,
    0,
    "no errors across three successful calls"
  );
  Assert.equal(errorRate.denominator, 3, "denominator incremented three times");
});
