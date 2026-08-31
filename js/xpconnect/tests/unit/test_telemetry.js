/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(function test_setup() {
  do_get_profile();
  Services.fog.initializeFOG();
});

add_task(async function test_telemetry() {
  // Prime the cache with self-hosted functions used by Assert and addition so
  // they don't affect the metrics captured below
  Assert.equal(1 + 2, 3);

  let startTotal = Glean.javascriptSelfHostedCache.total.testGetValue();

  // Delazify self-hosted function SetIteratorNext and store its code in the
  // JIT cache
  let a = new Set(); for (b of a) 30;

  let endTotal = Glean.javascriptSelfHostedCache.total.testGetValue();
  Assert.equal(startTotal + 1, endTotal);

  let startingHits = Glean.javascriptSelfHostedCache.hits.testGetValue();

  // Use a sandbox so we delazify SetIteratorNext again.
  // This should pull the code from the JIT cache
  let sandbox = Cu.Sandbox("about:blank");
  Cu.evalInSandbox(`a = new Set(); for (b of a) 30;`, sandbox);

  let endHits = Glean.javascriptSelfHostedCache.hits.testGetValue();
  Assert.equal(startingHits.numerator + 1, endHits.numerator);
  Assert.equal(startingHits.denominator + 1, endHits.denominator);
});
