"use strict";

// nsIDNSListener that resolves a Promise when the lookup completes (or fails).
class DNSListener {
  constructor() {
    this.promise = new Promise(resolve => {
      this._resolve = resolve;
    });
  }

  onLookupComplete(request, record, status) {
    this._resolve({ request, record, status });
  }
}
DNSListener.prototype.QueryInterface = ChromeUtils.generateQI([
  "nsIDNSListener",
]);

// Fire `count` concurrent native DNS lookups for unique .test hostnames.
// Returns { wallMs, results } where results is the array of onLookupComplete
// arguments and wallMs is the total elapsed wall-clock time in ms.
async function runBatch(count, runId) {
  const flags =
    Ci.nsIDNSService.RESOLVE_BYPASS_CACHE |
    Ci.nsIDNSService.RESOLVE_DEFAULT_FLAGS;

  const listeners = [];
  const t0 = Date.now();

  for (let i = 0; i < count; i++) {
    const listener = new DNSListener();
    listeners.push(listener);
    Services.dns.asyncResolve(
      `dns-stress-${runId}-${i}.test`,
      Ci.nsIDNSService.RESOLVE_TYPE_DEFAULT,
      flags,
      null,
      listener,
      Services.tm.mainThread,
      {}
    );
  }

  const results = await Promise.all(listeners.map(l => l.promise));
  const wallMs = Date.now() - t0;
  return { wallMs, results };
}

// Helper to run a batch, verify completion, and log results.
async function runBatchAndVerify(count, runId, label) {
  Services.dns.clearCache(true);
  const batch = await runBatch(count, runId);
  info(`[${label} iter=${runId}] ${count} lookups in ${batch.wallMs}ms`);
  Assert.strictEqual(
    batch.results.length,
    count,
    `All ${label} callbacks fired`
  );
  return batch.wallMs;
}

// Helper to compute average of an array.
function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

add_task(async function dns_resolver_contention() {
  // Shrink the thread pool to make contention predictable.
  Services.prefs.setIntPref("network.dns.max_any_priority_threads", 2);
  Services.prefs.setIntPref("network.dns.max_high_priority_threads", 0);

  registerCleanupFunction(() => {
    Services.prefs.clearUserPref("network.dns.max_any_priority_threads");
    Services.prefs.clearUserPref("network.dns.max_high_priority_threads");
  });

  const ITERATIONS = 5;
  const LOW_COUNT = 2; // within thread pool, no queuing expected
  const HIGH_COUNT = 20; // far exceeds thread pool, queuing expected

  const lowTimes = [];
  const highTimes = [];

  for (let iter = 0; iter < ITERATIONS; iter++) {
    lowTimes.push(await runBatchAndVerify(LOW_COUNT, iter, "low-contention"));
    highTimes.push(
      await runBatchAndVerify(HIGH_COUNT, iter, "high-contention")
    );
  }

  const avgLow = average(lowTimes);
  const avgHigh = average(highTimes);
  const ratio = avgLow > 0 ? avgHigh / avgLow : avgHigh;

  info("perfMetrics", { ratio, avgLow, avgHigh });
  info(`=== DNS contention report ===`);
  info(`Low-contention  (N=${LOW_COUNT}): avg ${avgLow.toFixed(1)}ms`);
  info(`High-contention (N=${HIGH_COUNT}): avg ${avgHigh.toFixed(1)}ms`);
  info(`Ratio high/low: ${ratio.toFixed(2)}x`);
  info(
    `(If ratio > ${(HIGH_COUNT / LOW_COUNT).toFixed(1)}x the resolver serializes; ` +
      `if ~1x throughput scales with threads.)`
  );
});

/* exported perfMetadata */
var perfMetadata = {
  owner: "Network Team",
  name: "DNS Benchmark",
  description:
    "Benchmark for DNS resolver lock contention under low and high concurrency.",
  longDescription: `
  This test measures DNS resolver throughput by comparing baseline resolution
  times with low concurrency (within the thread pool) against performance under
  high concurrency (far exceeding the thread pool). It validates that the resolver
  scales with available threads rather than serializing all requests.
  `,
  supportedBrowsers: ["Firefox"],
  supportedPlatforms: ["Desktop"],
  options: {
    default: { perfherder: true },
  },
};
