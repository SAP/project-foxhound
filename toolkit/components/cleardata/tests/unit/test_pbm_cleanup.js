/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for nsIClearDataService.clearPrivateBrowsingData().
 */

"use strict";

add_task(async function test_clearPrivateBrowsingData_fires_notification() {
  let notificationFired = false;
  let observer = {
    observe(_subject, topic) {
      if (topic === "last-pb-context-exited") {
        notificationFired = true;
      }
    },
  };

  Services.obs.addObserver(observer, "last-pb-context-exited");
  try {
    let flags = await new Promise(resolve => {
      Services.clearData.clearPrivateBrowsingData({
        onDataDeleted(aFailedFlags) {
          resolve(aFailedFlags);
        },
      });
    });

    Assert.ok(notificationFired, "last-pb-context-exited notification fired");
    Assert.equal(flags, 0, "No failure flags");
  } finally {
    Services.obs.removeObserver(observer, "last-pb-context-exited");
  }
});

add_task(async function test_clearPrivateBrowsingData_passes_collector() {
  let receivedCollector = null;
  let observer = {
    observe(subject, topic) {
      if (topic === "last-pb-context-exited") {
        try {
          receivedCollector = subject.QueryInterface(Ci.nsIPBMCleanupCollector);
        } catch (e) {}
      }
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

    Assert.ok(receivedCollector, "Subject is an nsIPBMCleanupCollector");
  } finally {
    Services.obs.removeObserver(observer, "last-pb-context-exited");
  }
});

add_task(async function test_clearPrivateBrowsingData_awaits_async_observers() {
  let asyncWorkDone = false;
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

      // Simulate async cleanup that takes some time
      Promise.resolve().then(() => {
        asyncWorkDone = true;
        cb.complete(Cr.NS_OK);
      });
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

    Assert.ok(asyncWorkDone, "Async observer work completed before callback");
  } finally {
    Services.obs.removeObserver(observer, "last-pb-context-exited");
  }
});

add_task(
  async function test_clearPrivateBrowsingData_awaits_multiple_observers() {
    let completionOrder = [];
    let observer1 = {
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

        // Complete after a microtask
        Promise.resolve()
          .then(() => Promise.resolve())
          .then(() => {
            completionOrder.push("observer1");
            cb.complete(Cr.NS_OK);
          });
      },
    };

    let observer2 = {
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

        // Complete immediately
        Promise.resolve().then(() => {
          completionOrder.push("observer2");
          cb.complete(Cr.NS_OK);
        });
      },
    };

    Services.obs.addObserver(observer1, "last-pb-context-exited");
    Services.obs.addObserver(observer2, "last-pb-context-exited");
    try {
      await new Promise(resolve => {
        Services.clearData.clearPrivateBrowsingData({
          onDataDeleted() {
            resolve();
          },
        });
      });

      Assert.equal(
        completionOrder.length,
        2,
        "Both observers completed before callback"
      );
    } finally {
      Services.obs.removeObserver(observer1, "last-pb-context-exited");
      Services.obs.removeObserver(observer2, "last-pb-context-exited");
    }
  }
);

add_task(
  async function test_clearPrivateBrowsingData_propagates_observer_failure() {
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
      let flags = await new Promise(resolve => {
        Services.clearData.clearPrivateBrowsingData({
          onDataDeleted(aFailedFlags) {
            resolve(aFailedFlags);
          },
        });
      });

      Assert.notEqual(
        flags,
        0,
        "Failure flags are non-zero when observer fails"
      );
    } finally {
      Services.obs.removeObserver(observer, "last-pb-context-exited");
    }
  }
);

add_task(async function test_clearPrivateBrowsingData_partial_failure() {
  let observer1 = {
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
      Promise.resolve().then(() => cb.complete(Cr.NS_OK));
    },
  };

  let observer2 = {
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

  Services.obs.addObserver(observer1, "last-pb-context-exited");
  Services.obs.addObserver(observer2, "last-pb-context-exited");
  try {
    let flags = await new Promise(resolve => {
      Services.clearData.clearPrivateBrowsingData({
        onDataDeleted(aFailedFlags) {
          resolve(aFailedFlags);
        },
      });
    });

    Assert.notEqual(
      flags,
      0,
      "Failure flags are non-zero when any observer fails"
    );
  } finally {
    Services.obs.removeObserver(observer1, "last-pb-context-exited");
    Services.obs.removeObserver(observer2, "last-pb-context-exited");
  }
});

add_task(async function test_clearPrivateBrowsingData_completes() {
  // clearPrivateBrowsingData should resolve even when called multiple times.
  for (let i = 0; i < 3; i++) {
    let flags = await new Promise(resolve => {
      Services.clearData.clearPrivateBrowsingData({
        onDataDeleted(aFailedFlags) {
          resolve(aFailedFlags);
        },
      });
    });

    Assert.equal(flags, 0, `No failure flags on iteration ${i}`);
  }
});

add_task(async function test_clearPrivateBrowsingData_null_callback() {
  // Should not throw when called with null callback.
  Services.clearData.clearPrivateBrowsingData(null);

  // Wait for the cleanup to finish so the guard clears.
  await new Promise(resolve =>
    ChromeUtils.idleDispatch(resolve, { timeout: 100 })
  );
});

add_task(async function test_clearPrivateBrowsingData_rejects_overlap() {
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
      // Delay completion so the first call is still in progress.
      ChromeUtils.idleDispatch(() => cb.complete(Cr.NS_OK), { timeout: 100 });
    },
  };

  Services.obs.addObserver(observer, "last-pb-context-exited");
  try {
    let firstDone = false;
    let firstPromise = new Promise(resolve => {
      Services.clearData.clearPrivateBrowsingData({
        onDataDeleted() {
          firstDone = true;
          resolve();
        },
      });
    });

    // Second call while first is still in progress should return an error.
    Assert.ok(!firstDone, "First cleanup still in progress");
    Assert.throws(
      () => Services.clearData.clearPrivateBrowsingData(null),
      /NS_ERROR_ABORT/,
      "Overlapping call returns NS_ERROR_ABORT"
    );

    await firstPromise;

    // After first completes, a new call should succeed.
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
});
