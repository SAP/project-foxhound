"use strict";

// Verify that the resolver's drain loop picks up all queued records even
// when only one pool thread is available. This is the key behavior changed
// by bug 1478732: instead of each thread blocking in GetHostToLookup(),
// ResolveHostTask loops to DequeueNextRecord() after each completion.

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

add_task(async function drain_loop_single_thread() {
  // Limit to a single any-priority slot. All lookups below are default
  // (medium) priority, so only one can be in flight at a time.
  Services.prefs.setIntPref("network.dns.max_any_priority_threads", 1);
  Services.prefs.setIntPref("network.dns.max_high_priority_threads", 1);

  registerCleanupFunction(() => {
    Services.prefs.clearUserPref("network.dns.max_any_priority_threads");
    Services.prefs.clearUserPref("network.dns.max_high_priority_threads");
  });

  Services.dns.clearCache(true);

  const COUNT = 10;
  const flags =
    Ci.nsIDNSService.RESOLVE_BYPASS_CACHE |
    Ci.nsIDNSService.RESOLVE_DEFAULT_FLAGS;

  // Fire all lookups before any can complete.
  const listeners = [];
  for (let i = 0; i < COUNT; i++) {
    const listener = new DNSListener();
    listeners.push(listener);
    Services.dns.asyncResolve(
      `drain-loop-${i}.test`,
      Ci.nsIDNSService.RESOLVE_TYPE_DEFAULT,
      flags,
      null,
      listener,
      Services.tm.mainThread,
      {}
    );
  }

  // All must complete even with a single thread.
  const results = await Promise.all(listeners.map(l => l.promise));
  Assert.strictEqual(results.length, COUNT, `All ${COUNT} lookups completed`);

  for (let i = 0; i < COUNT; i++) {
    // .test domains will fail resolution, but the callback must still fire.
    Assert.notStrictEqual(
      results[i].status,
      undefined,
      `Lookup ${i} got a status`
    );
  }
});

// Verify that lookups blocked by the mActiveAnyThreadCount priority limit
// still complete once earlier lookups finish and free up slots.
add_task(async function drain_loop_priority_limit() {
  // Allow only 1 any-priority thread but several high-priority threads.
  // This means only 1 med/low lookup can be in flight at a time.
  Services.prefs.setIntPref("network.dns.max_any_priority_threads", 1);
  Services.prefs.setIntPref("network.dns.max_high_priority_threads", 4);

  registerCleanupFunction(() => {
    Services.prefs.clearUserPref("network.dns.max_any_priority_threads");
    Services.prefs.clearUserPref("network.dns.max_high_priority_threads");
  });

  Services.dns.clearCache(true);

  const COUNT = 10;
  // Default flags = medium priority, subject to the any-priority limit.
  const flags =
    Ci.nsIDNSService.RESOLVE_BYPASS_CACHE |
    Ci.nsIDNSService.RESOLVE_DEFAULT_FLAGS;

  const listeners = [];
  for (let i = 0; i < COUNT; i++) {
    const listener = new DNSListener();
    listeners.push(listener);
    Services.dns.asyncResolve(
      `drain-prio-${i}.test`,
      Ci.nsIDNSService.RESOLVE_TYPE_DEFAULT,
      flags,
      null,
      listener,
      Services.tm.mainThread,
      {}
    );
  }

  // All must complete even though only 1 any-priority slot is available.
  const results = await Promise.all(listeners.map(l => l.promise));
  Assert.strictEqual(
    results.length,
    COUNT,
    `All ${COUNT} priority-limited lookups completed`
  );
});
