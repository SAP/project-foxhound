// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/
"use strict";

// Tests that the SSL session cache is cleared when the
// "last-pb-context-exited" notification fires (Bug 2017877).

do_get_profile();

const GOOD_DOMAIN = "good.include-subdomains.pinning.example.com";

const statsPtr = getSSLStatistics();
const toInt32 = ctypes.Int64.lo;

function run_test() {
  add_tls_server_setup("BadCertAndPinningServer", "bad_certs");

  // Phase 1: Make an initial connection to populate the session cache.
  add_connection_test(GOOD_DOMAIN, PRErrorCodeSuccess, clearSessionCache);

  // Phase 2: Verify session resumption works (cache is populated).
  let hitsBeforeResume;
  let missesBeforeResume;
  add_connection_test(
    GOOD_DOMAIN,
    PRErrorCodeSuccess,
    function () {
      let stats = statsPtr.contents;
      hitsBeforeResume = toInt32(stats.sch_sid_cache_hits);
      missesBeforeResume = toInt32(stats.sch_sid_cache_misses);
    },
    function (transportSecurityInfo) {
      ok(transportSecurityInfo.resumed, "Second connection should be resumed");
      let stats = statsPtr.contents;
      equal(
        toInt32(stats.sch_sid_cache_hits),
        hitsBeforeResume + 1,
        "Should have one additional cache hit"
      );
      equal(
        toInt32(stats.sch_sid_cache_misses),
        missesBeforeResume,
        "Should have no additional cache misses"
      );
    }
  );

  // Phase 3: Fire "last-pb-context-exited" to clear the session cache.
  add_test(function () {
    Services.obs.notifyObservers(null, "last-pb-context-exited");
    run_next_test();
  });

  // Phase 4: Verify the session cache was cleared.
  let hitsAfterClear;
  let missesAfterClear;
  add_connection_test(
    GOOD_DOMAIN,
    PRErrorCodeSuccess,
    function () {
      let stats = statsPtr.contents;
      hitsAfterClear = toInt32(stats.sch_sid_cache_hits);
      missesAfterClear = toInt32(stats.sch_sid_cache_misses);
    },
    function (transportSecurityInfo) {
      ok(
        !transportSecurityInfo.resumed,
        "Connection after PBM exit should not be resumed"
      );
      let stats = statsPtr.contents;
      equal(
        toInt32(stats.sch_sid_cache_hits),
        hitsAfterClear,
        "Should have no additional cache hits after PBM exit"
      );
      equal(
        toInt32(stats.sch_sid_cache_misses),
        missesAfterClear + 1,
        "Should have one additional cache miss after PBM exit"
      );
    }
  );

  // Phase 5: Verify that session caching works again after re-populating.
  add_connection_test(
    GOOD_DOMAIN,
    PRErrorCodeSuccess,
    null,
    function (transportSecurityInfo) {
      ok(
        transportSecurityInfo.resumed,
        "Connection should resume again after cache is re-populated"
      );
    }
  );

  run_next_test();
}
