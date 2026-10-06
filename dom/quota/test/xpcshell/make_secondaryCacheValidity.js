/**
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// TODO: Replace with a module for blob/file utils once available
loadScript("dom/quota/test/common/file.js");

const { IndexedDBUtils } = ChromeUtils.importESModule(
  "resource://testing-common/dom/indexedDB/test/modules/IndexedDBUtils.sys.mjs"
);
const { LocalStorageUtils } = ChromeUtils.importESModule(
  "resource://testing-common/dom/localstorage/test/modules/LocalStorageUtils.sys.mjs"
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

async function makeSecondaryCacheValidity() {
  const principal = PrincipalUtils.createPrincipal("http://example42.com");

  // IndexedDB
  {
    const request = indexedDB.openForPrincipal(principal, "myIndexedDB");
    // TODO: Use IndexedDBUtils once they support waiting for upgrade needed
    await openDBRequestUpgradeNeeded(request);

    const database = request.result;

    const objectStore = database.createObjectStore("Blobs", {});

    objectStore.add(getNullBlob(200), 42);

    await IndexedDBUtils.requestFinished(request);

    database.close();
  }

  // Cache API
  {
    async function sandboxScript() {
      const cache = await caches.open("myCache");
      const request = new Request("http://example.com/index.html");
      const response = new Response("hello world");
      await cache.put(request, response);
    }

    const sandbox = new Cu.Sandbox(principal, {
      wantGlobalProperties: ["caches", "fetch"],
    });

    const promise = new Promise(function (resolve, reject) {
      sandbox.resolve = resolve;
      sandbox.reject = reject;
    });

    Cu.evalInSandbox(
      sandboxScript.toSource() + " sandboxScript().then(resolve, reject);",
      sandbox
    );
    await promise;
  }

  // SimpleDB
  {
    const connection = SimpleDBUtils.createConnection(principal);

    const openRequest = connection.open("mySimpleDB");
    await SimpleDBUtils.requestFinished(openRequest);

    const writeRequest = connection.write(getBuffer(100));
    await SimpleDBUtils.requestFinished(writeRequest);

    const closeRequest = connection.close();
    await SimpleDBUtils.requestFinished(closeRequest);
  }

  // LocalStorage
  {
    const storage = LocalStorageUtils.createStorage(principal);

    storage.setItem("foo", "bar");

    storage.close();
  }

  // OPFS
  {
    async function sandboxScript() {
      const root = await storage.getDirectory();

      {
        const file = await root.getFileHandle("data.bin", { create: true });

        const writable = await file.createWritable();
        await writable.write(new Uint8Array(512));
        await writable.close();
      }

      {
        const directory = await root.getDirectoryHandle("dir", {
          create: true,
        });

        const file = await directory.getFileHandle("data.bin", {
          create: true,
        });

        const writable = await file.createWritable();
        await writable.write(new Uint8Array(128));
        await writable.close();
      }
    }

    const sandbox = new Cu.Sandbox(principal, {
      wantGlobalProperties: ["storage"],
      forceSecureContext: true,
    });

    const promise = new Promise(function (resolve, reject) {
      sandbox.resolve = resolve;
      sandbox.reject = reject;
    });

    Cu.evalInSandbox(
      sandboxScript.toSource() + " sandboxScript().then(resolve, reject);",
      sandbox
    );
    await promise;
  }

  // Force update of the metadata file, so it contains up to date cached usage
  // information.

  info("Shutting down storage");

  {
    const request = Services.qms.reset();
    await QuotaUtils.requestFinished(request);
  }

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
}

async function testSteps() {
  add_task(
    {
      pref_set: [
        ["dom.quotaManager.loadQuotaFromCache", false],
        ["dom.storage.testing", true],
        ["dom.storage.client_validation", false],
      ],
    },
    makeSecondaryCacheValidity
  );
}
