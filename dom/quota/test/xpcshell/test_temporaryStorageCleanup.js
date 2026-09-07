/**
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const { PrefUtils } = ChromeUtils.importESModule(
  "resource://testing-common/dom/quota/test/modules/PrefUtils.sys.mjs"
);
const { PrincipalUtils } = ChromeUtils.importESModule(
  "resource://testing-common/dom/quota/test/modules/PrincipalUtils.sys.mjs"
);
const { QuotaUtils } = ChromeUtils.importESModule(
  "resource://testing-common/dom/quota/test/modules/QuotaUtils.sys.mjs"
);
const { SimpleDBUtils } = ChromeUtils.importESModule(
  "resource://testing-common/dom/simpledb/test/modules/SimpleDBUtils.sys.mjs"
);

/**
 * This test exercises the clearing of non-persisted zero-usage origins during
 * temporary storage initialization. It verifies that:
 *
 * - When the pref
 *   `dom.quotaManager.temporaryStorage.clearNonPersistedZeroUsageOrigins`
 *   is enabled, origins that are:
 *     - non-persisted,
 *     - have zero quota-charged usage,
 *     - and have not been used recently (older than one week)
 *   are cleared in batches.
 *
 * - When the pref is disabled, no such origins are cleared and all remain
 *   present on disk.
 *
 * The test creates a set of origins with different combinations of:
 *   persisted / non-persisted,
 *   zero / non-zero,
 *   recent / old access time.
 *
 * After initializing and shutting down storage multiple times, the test checks
 * that only the expected origins remain. Batch size is controlled via
 * `dom.quotaManager.temporaryStorage.maxOriginsToClearDuringCleanup`.
 */

/**
 * Runs a callback while temporarily setting the initial access time offset.
 * This allows simulation of "older" origins without waiting in real time.
 */
async function withArtificialAccessTime(offset, callback) {
  const prefs = [
    [
      "dom.quotaManager.temporaryStorage.initialOriginAccessTimeOffsetSec",
      offset,
    ],
    // Disable updates so the artificial time persists.
    ["dom.quotaManager.temporaryStorage.updateOriginAccessTime", false],
  ];

  const originalPrefs = PrefUtils.getPrefs(prefs);

  try {
    PrefUtils.setPrefs(prefs);

    await callback();
  } finally {
    PrefUtils.setPrefs(originalPrefs);
  }
}

/**
 * Main test function. Creates a set of origins with varying attributes
 * (persisted, zero, recent), then verifies whether cleanup during temporary
 * storage initialization behaves as expected depending on the
 * `clearingEnabled` flag and `maxOriginsToClear` parameter.
 */
async function testNonPersistedZeroUsageOriginsClearing(
  clearingEnabled,
  maxOriginsToClear
) {
  /* prettier-ignore */
  const originInfos = [
    { url: "https://alpha.io",   persisted: false, zero: false, recent: false },
    { url: "https://beta.io",    persisted: false, zero: false, recent: true  },
    { url: "https://gamma.io",   persisted: false, zero: true,  recent: true  },
    { url: "https://delta.io",   persisted: true,  zero: false, recent: false },
    { url: "https://epsilon.io", persisted: true,  zero: false, recent: true  },
    { url: "https://zeta.io",    persisted: true,  zero: true,  recent: false },
    { url: "https://eta.io",     persisted: true,  zero: true,  recent: true  },

    // Three non-persisted, zero-usage, non-recent origins, candidates for
    // cleanup.
    { url: "https://omega1.io",  persisted: false, zero: true,  recent: false },
    { url: "https://omega2.io",  persisted: false, zero: true,  recent: false },
    { url: "https://omega3.io",  persisted: false, zero: true,  recent: false },
  ];

  // If clearing is enabled, only persisted, non-zero-usage, or recently used
  // origins should remain after cleanup.
  // If disabled, all origins are expected to remain.
  const expectedOriginInfos = clearingEnabled
    ? originInfos.filter(info => info.persisted || !info.zero || info.recent)
    : originInfos;

  const expectedOrigins = expectedOriginInfos.map(info => info.url);

  // Threshold in seconds used to distinguish recent from non-recent origins.
  // Set to 8 days to ensure origins are safely beyond the 7-day cutoff used
  // by quota manager for temporary storage cleanup.
  const nonRecentThresholdSec = 8 * 86400;

  const name = "test_testNonPersistedZeroUsageOriginsClearing";

  info("Initializing storage");

  {
    const request = Services.qms.init();
    await QuotaUtils.requestFinished(request);
  }

  info("Initializing temporary storage");

  {
    const request = Services.qms.initTemporaryStorage();
    await QuotaUtils.requestFinished(request);
  }

  // Create origins with the desired persisted, usage, and recency attributes.

  for (const originInfo of originInfos) {
    const principal = PrincipalUtils.createPrincipal(originInfo.url);

    // Simulate access time: 0s offset = recent, 8 days offset = non-recent.

    const offset = originInfo.recent ? 0 : nonRecentThresholdSec;

    await withArtificialAccessTime(offset, async function () {
      info("Initializing temporary origin");

      {
        const request = Services.qms.initializeTemporaryOrigin(
          "default",
          principal,
          /* aCreateIfNonExistent */ true
        );
        await QuotaUtils.requestFinished(request);

        if (originInfo.persisted) {
          const request = Services.qms.persist(principal);
          await QuotaUtils.requestFinished(request);
        }
      }

      info("Creating database");

      {
        const connection = SimpleDBUtils.createConnection(principal);

        const openRequest = connection.open(name);
        await SimpleDBUtils.requestFinished(openRequest);

        if (!originInfo.zero) {
          const writeRequest = connection.write(new ArrayBuffer(1));
          await SimpleDBUtils.requestFinished(writeRequest);
        }
      }

      info("Shutting down temporary origin");

      {
        const request = Services.qms.resetStoragesForPrincipal(
          principal,
          "default"
        );
        await QuotaUtils.requestFinished(request);
      }
    });
  }

  info("Shutting down storage");

  {
    const request = Services.qms.reset();
    await QuotaUtils.requestFinished(request);
  }

  info("Listing origins");

  let lastOrigins = await (async function () {
    const request = Services.qms.listOrigins();
    return QuotaUtils.requestFinished(request);
  })();

  let lastDelta;

  // Repeatedly initialize temporary storage to trigger cleanup batches.

  for (let index = 0; index < originInfos.length; index++) {
    info("Initializing storage");

    {
      const request = Services.qms.init();
      await QuotaUtils.requestFinished(request);
    }

    info("Initializing temporary storage");

    {
      const request = Services.qms.initTemporaryStorage();
      await QuotaUtils.requestFinished(request);
    }

    info("Shutting down storage");

    {
      const request = Services.qms.reset();
      await QuotaUtils.requestFinished(request);
    }

    info("Listing origins");

    const origins = await (async function () {
      const request = Services.qms.listOrigins();
      return QuotaUtils.requestFinished(request);
    })();

    info("Verifying number of origins");

    Assert.lessOrEqual(origins.length, lastOrigins.length);

    const delta = lastOrigins.length - origins.length;

    if (lastDelta === 0) {
      // Once no more origins are cleared, cleanup must stay stable.
      Assert.equal(delta, 0, "Correct delta");
    } else {
      // Allow either no change or a batch of maxOriginsToClear cleared.
      Assert.greaterOrEqual(delta, 0, "Correct delta");
      Assert.lessOrEqual(delta, maxOriginsToClear, "Correct delta");
    }

    lastOrigins = origins;
    lastDelta = delta;
  }

  info("Verifying origins");

  Assert.equal(
    lastOrigins.length,
    expectedOrigins.length,
    "Correct number of origins"
  );

  lastOrigins.sort();
  expectedOrigins.sort();

  for (let index = 0; index < lastOrigins.length; index++) {
    Assert.equal(
      lastOrigins[index],
      expectedOrigins[index],
      `Origin at index ${index} matches`
    );
  }
}

/**
 * Three runs:
 * 1. With clearing enabled and batch size = 2: up to two non-persisted,
 *    zero-usage, non-recent origins are cleared per initialization.
 * 2. With clearing enabled and batch size = 1: up to one non-persisted,
 *    zero-usage, non-recent origin is cleared per initialization.
 * 3. With clearing disabled: all origins remain intact to ensure no
 *    unintended removals occur.
 */
async function testSteps() {
  add_task(
    {
      pref_set: [
        [
          "dom.quotaManager.temporaryStorage.clearNonPersistedZeroUsageOrigins",
          true,
        ],
        ["dom.quotaManager.temporaryStorage.maxOriginsToClearDuringCleanup", 2],
      ],
    },
    async function () {
      await testNonPersistedZeroUsageOriginsClearing(
        /* clearingEnabled */ true,
        /* maxOriginsToClear */ 2
      );
    }
  );

  add_task(
    {
      pref_set: [
        [
          "dom.quotaManager.temporaryStorage.clearNonPersistedZeroUsageOrigins",
          true,
        ],
        ["dom.quotaManager.temporaryStorage.maxOriginsToClearDuringCleanup", 1],
      ],
    },
    async function () {
      await testNonPersistedZeroUsageOriginsClearing(
        /* clearingEnabled */ true,
        /* maxOriginsToClear */ 1
      );
    }
  );

  add_task(
    {
      pref_set: [
        [
          "dom.quotaManager.temporaryStorage.clearNonPersistedZeroUsageOrigins",
          false,
        ],
      ],
    },
    async function () {
      await testNonPersistedZeroUsageOriginsClearing(
        /* clearingEnabled */ false,
        /* maxOriginsToClear */ 0
      );
    }
  );
}
