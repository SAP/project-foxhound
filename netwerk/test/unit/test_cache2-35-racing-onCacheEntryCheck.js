"use strict";

// Test for bug 2043675: when two consumers open a READY entry and both return
// ENTRY_NEEDS_REVALIDATION, InvokeCallback must detect the mState change that
// occurred during the first consumer's OnCacheEntryCheck (lock released) and
// re-queue it rather than proceeding as a second concurrent revalidator.
//
// Consumer B is opened synchronously from within A's onCacheEntryCheck (while
// mLock is released). B's InvokeCallback runs inline, sets mState =
// REVALIDATING, and defers setValid via executeSoon. When A re-acquires the
// lock, mState is REVALIDATING (not READY). With the fix, A is re-queued and
// notified only after B calls setValid. Without the fix, A proceeds inline and
// fires before setValid has been called.

function run_test() {
  do_get_profile();

  asyncOpenCacheEntry(
    "http://race/",
    "disk",
    Ci.nsICacheStorage.OPEN_NORMALLY,
    null,
    new OpenCallback(NEW, "m1", "d1", function () {
      let bSetValidCalled = false;
      let bHandle = null;

      let consumerB = {
        QueryInterface: ChromeUtils.generateQI(["nsICacheEntryOpenCallback"]),
        onCacheEntryCheck() {
          return Ci.nsICacheEntryOpenCallback.ENTRY_NEEDS_REVALIDATION;
        },
        onCacheEntryAvailable(entry, isNew, status) {
          Assert.equal(Cr.NS_OK, status);
          bHandle = entry;
          // Defer setValid so mState stays REVALIDATING when A re-acquires
          // the lock.
          executeSoon(function () {
            bSetValidCalled = true;
            bHandle.setValid();
          });
        },
      };

      let firstCheckDone = false;

      asyncOpenCacheEntry(
        "http://race/",
        "disk",
        Ci.nsICacheStorage.OPEN_NORMALLY,
        null,
        {
          QueryInterface: ChromeUtils.generateQI(["nsICacheEntryOpenCallback"]),
          onCacheEntryCheck() {
            if (!firstCheckDone) {
              firstCheckDone = true;
              // Open B while A's mLock is released. B processes synchronously:
              // its OnCacheEntryCheck runs, sets mState = REVALIDATING, and
              // B's onCacheEntryAvailable queues setValid via executeSoon.
              asyncOpenCacheEntry(
                "http://race/",
                "disk",
                Ci.nsICacheStorage.OPEN_NORMALLY,
                null,
                consumerB
              );
              return Ci.nsICacheEntryOpenCallback.ENTRY_NEEDS_REVALIDATION;
            }
            // Second check (with fix, after B called setValid): just read.
            return Ci.nsICacheEntryOpenCallback.ENTRY_WANTED;
          },
          onCacheEntryAvailable(entry, isNew, status) {
            // With fix: A is re-queued when mState != READY after the first
            // check, and notified only after B's setValid.
            // Without fix: A fires inline before executeSoon, so
            // bSetValidCalled is still false.
            Assert.ok(
              bSetValidCalled,
              "A must be notified only after B has called setValid (bug 2043675)"
            );
            Assert.equal(Cr.NS_OK, status);
            finish_cache2_test();
          },
        }
      );
    })
  );

  do_test_pending();
}
