/**
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const { PrincipalUtils } = ChromeUtils.importESModule(
  "resource://testing-common/dom/quota/test/modules/PrincipalUtils.sys.mjs"
);
const { QuotaUtils } = ChromeUtils.importESModule(
  "resource://testing-common/dom/quota/test/modules/QuotaUtils.sys.mjs"
);
const { SimpleDBUtils } = ChromeUtils.importESModule(
  "resource://testing-common/dom/simpledb/test/modules/SimpleDBUtils.sys.mjs"
);
const { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);

add_task(
  {
    pref_set: [
      ["dom.quotaManager.storageInitialization.pauseOnIOThreadMs", 2000],
    ],
  },
  async function testSteps() {
    const principal = PrincipalUtils.createPrincipal("https://example.com");
    const name = "test_slowStorageInitialization.js";

    info(
      "Testing origin clearing requested after starting client directory opening"
    );

    info("Starting database opening");

    const openPromise = (async function () {
      const connection = SimpleDBUtils.createConnection(principal);
      const request = connection.open(name);
      const promise = SimpleDBUtils.requestFinished(request);
      return promise;
    })();

    info("Waiting for client directory opening to start");

    await TestUtils.topicObserved(
      "QuotaManager::ClientDirectoryOpeningStarted"
    );

    info("Starting origin clearing");

    const clearPromise = (async function () {
      const request = Services.qms.clearStoragesForPrincipal(principal);
      const promise = QuotaUtils.requestFinished(request);
      return promise;
    })();

    info("Waiting for database to finish opening");

    try {
      await openPromise;
      ok(false, "Should have thrown");
    } catch (e) {
      ok(true, "Should have thrown");
      Assert.strictEqual(
        e.resultCode,
        Cr.NS_ERROR_ABORT,
        "Threw right result code"
      );
    }

    info("Waiting for origin to finish clearing");

    await clearPromise;
  }
);
