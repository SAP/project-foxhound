/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const { ProgressStatusText, ProgressType } = ChromeUtils.importESModule(
  "chrome://global/content/ml/Utils.sys.mjs"
);

// Root URL of the fake hub, see the `data` dir in the tests.
const FAKE_HUB =
  "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/data";

const FAKE_MODEL_ARGS = {
  model: "acme/bert",
  revision: "main",
  file: "config.json",
  taskName: "task_model",
};

const FAKE_RELEASED_MODEL_ARGS = {
  model: "acme/bert",
  revision: "v0.1",
  file: "config.json",
  taskName: "task_released",
};

const FAKE_ONNX_MODEL_ARGS = {
  model: "acme/bert",
  revision: "main",
  file: "onnx/config.json",
  taskName: "task_onnx",
};

const badHubs = [
  "https://my.cool.hub",
  "https://sub.localhost/myhub", // Subdomain of allowed domain
  "https://model-hub.mozilla.org.evil.com", // Manipulating path to mimic domain
  "httpsz://localhost/myhub", // Similar-looking scheme
  "https://localhost.", // Trailing dot in domain
  "resource://user@localhost", // User info in URL
  "ftp://localhost/myhub", // Disallowed scheme with allowed host
  "https://model-hub.mozilla.org.hack", // Domain that contains allowed domain
];

function createBlob(size = 8) {
  return new Blob([new ArrayBuffer(size)]);
}

/**
 * Make sure we reject bad model hub URLs.
 */
add_task(async function test_bad_hubs() {
  for (const badHub of badHubs) {
    Assert.throws(
      () => new ModelHub({ rootUrl: badHub }),
      new RegExp(`Error: Invalid model hub root url: ${badHub}`),
      `Should throw with ${badHub}`
    );
  }
});

let goodHubs = [
  "https:///localhost/myhub", // Triple slashes, see https://stackoverflow.com/a/22775589
  "https://localhost:8080/myhub",
  "http://localhost/myhub",
  "https://model-hub.mozilla.org",
  "chrome://gre/somewhere/in/the/code/base",
];

add_task(async function test_allowed_hub() {
  goodHubs.forEach(url => new ModelHub({ rootUrl: url }));
});

/**
 * Test the MOZ_ALLOW_EXTERNAL_ML_HUB environment variable
 */
add_task(async function test_allow_external_ml_hub() {
  Services.env.set("MOZ_ALLOW_EXTERNAL_ML_HUB", "1");
  new ModelHub({ rootUrl: "https://huggingface.co" });
  Services.env.set("MOZ_ALLOW_EXTERNAL_ML_HUB", "");
});

const badInputs = [
  [
    {
      model: "ac me/bert",
      revision: "main",
      file: "config.json",
    },
    "Org can only contain letters, numbers, and hyphens",
  ],
  [
    {
      model: "1111/bert",
      revision: "main",
      file: "config.json",
    },
    "Org cannot contain only numbers",
  ],
  [
    {
      model: "-acme/bert",
      revision: "main",
      file: "config.json",
    },
    "Org start or end with a hyphen, or use consecutive hyphens",
  ],
  [
    {
      model: "a-c-m-e/#bert",
      revision: "main",
      file: "config.json",
    },
    "Models can only contain letters, numbers, and hyphens, underscord, periods",
  ],
  [
    {
      model: "a-c-m-e/b$ert",
      revision: "main",
      file: "config.json",
    },
    "Models cannot contain spaces or control characters",
  ],
  [
    {
      model: "a-c-m-e/b$ert",
      revision: "main",
      file: ".filename",
    },
    "File",
  ],
];

/**
 * Make sure we reject bad inputs.
 */
add_task(async function test_bad_inputs() {
  const hub = new ModelHub({ rootUrl: FAKE_HUB });

  for (const badInput of badInputs) {
    const params = badInput[0];
    const errorMsg = badInput[1];
    try {
      await hub.getModelFileAsArrayBuffer(params);
    } catch (error) {
      continue;
    }
    throw new Error(errorMsg);
  }
});

/**
 * Test that we can retrieve a file as an ArrayBuffer.
 */
add_task(async function test_getting_file() {
  const hub = new ModelHub({ rootUrl: FAKE_HUB });

  let [array, headers] = await hub.getModelFileAsArrayBuffer(FAKE_MODEL_ARGS);

  Assert.equal(headers["Content-Type"], "application/json");

  // check the content of the file.
  let jsonData = JSON.parse(
    String.fromCharCode.apply(null, new Uint8Array(array))
  );

  Assert.equal(jsonData.hidden_size, 768);
});

/**
 * Test that we can retrieve a file from a released model and skip head calls
 */
add_task(async function test_getting_released_file() {
  const hub = new ModelHub({ rootUrl: FAKE_HUB });
  console.log(hub);

  let spy = sinon.spy(hub, "getETag");
  let [array, headers] = await hub.getModelFileAsArrayBuffer(
    FAKE_RELEASED_MODEL_ARGS
  );

  Assert.equal(headers["Content-Type"], "application/json");

  // check the content of the file.
  let jsonData = JSON.parse(
    String.fromCharCode.apply(null, new Uint8Array(array))
  );

  Assert.equal(jsonData.hidden_size, 768);

  // check that head calls were not made
  Assert.ok(!spy.called, "getETag should have never been called.");
  spy.restore();
});

/**
 * Make sure files can be located in sub directories
 */
add_task(async function test_getting_file_in_subdir() {
  const hub = new ModelHub({ rootUrl: FAKE_HUB });

  let [array, metadata] = await hub.getModelFileAsArrayBuffer(
    FAKE_ONNX_MODEL_ARGS
  );

  Assert.equal(metadata["Content-Type"], "application/json");

  // check the content of the file.
  let jsonData = JSON.parse(
    String.fromCharCode.apply(null, new Uint8Array(array))
  );

  Assert.equal(jsonData.hidden_size, 768);
});

/**
 * Test that we can use a custom URL template.
 */
add_task(async function test_getting_file_custom_path() {
  const hub = new ModelHub({
    rootUrl: FAKE_HUB,
    urlTemplate: "{model}/resolve/{revision}",
  });

  let res = await hub.getModelFileAsArrayBuffer(FAKE_MODEL_ARGS);

  Assert.equal(res[1]["Content-Type"], "application/json");
});

/**
 * Test that we can't use an URL with a query for the template
 */
add_task(async function test_getting_file_custom_path_rogue() {
  const urlTemplate = "{model}/resolve/{revision}/?some_id=bedqwdw";
  Assert.throws(
    () => new ModelHub({ rootUrl: FAKE_HUB, urlTemplate }),
    /Invalid URL template/,
    `Should throw with ${urlTemplate}`
  );
});

/**
 * Test that the file can be returned as a response and its content correct.
 */
add_task(async function test_getting_file_as_response() {
  const hub = new ModelHub({ rootUrl: FAKE_HUB });

  let response = await hub.getModelFileAsResponse(FAKE_MODEL_ARGS);

  // check the content of the file.
  let jsonData = await response.json();
  Assert.equal(jsonData.hidden_size, 768);
});

/**
 * Test that the cache is used when the data is retrieved from the server
 * and that the cache is updated with the new data.
 */
add_task(async function test_getting_file_from_cache() {
  const hub = new ModelHub({ rootUrl: FAKE_HUB });
  let array = await hub.getModelFileAsArrayBuffer(FAKE_MODEL_ARGS);

  // stub to verify that the data was retrieved from IndexDB
  let matchMethod = hub.cache._testGetData;

  sinon.stub(hub.cache, "_testGetData").callsFake(function () {
    return matchMethod.apply(this, arguments).then(result => {
      Assert.notEqual(result, null);
      return result;
    });
  });

  // exercises the cache
  let array2 = await hub.getModelFileAsArrayBuffer(FAKE_MODEL_ARGS);
  hub.cache._testGetData.restore();

  Assert.deepEqual(array, array2);
});

/**
 * Test that the callback is appropriately called when the data is retrieved from the server
 * or from the cache.
 */
add_task(async function test_getting_file_from_url_cache_with_callback() {
  const hub = new ModelHub({ rootUrl: FAKE_HUB });

  hub.cache = await initializeCache();

  let numCalls = 0;
  let currentData = null;
  let array = await hub.getModelFileAsArrayBuffer({
    ...FAKE_MODEL_ARGS,
    progressCallback: data => {
      // expecting initiate status and download
      currentData = data;
      if (numCalls == 0) {
        Assert.deepEqual(
          {
            type: data.type,
            statusText: data.statusText,
            ok: data.ok,
            model: currentData?.metadata?.model,
            file: currentData?.metadata?.file,
            revision: currentData?.metadata?.revision,
            taskName: currentData?.metadata?.taskName,
          },
          {
            type: ProgressType.DOWNLOAD,
            statusText: ProgressStatusText.INITIATE,
            ok: true,
            ...FAKE_MODEL_ARGS,
          },
          "Initiate Data from server should be correct"
        );
      }

      if (numCalls == 1) {
        Assert.deepEqual(
          {
            type: data.type,
            statusText: data.statusText,
            ok: data.ok,
            model: currentData?.metadata?.model,
            file: currentData?.metadata?.file,
            revision: currentData?.metadata?.revision,
            taskName: currentData?.metadata?.taskName,
          },
          {
            type: ProgressType.DOWNLOAD,
            statusText: ProgressStatusText.SIZE_ESTIMATE,
            ok: true,
            ...FAKE_MODEL_ARGS,
          },
          "size estimate Data from server should be correct"
        );
      }

      numCalls += 1;
    },
  });

  Assert.greaterOrEqual(numCalls, 3);

  // last received message is DONE
  Assert.deepEqual(
    {
      type: currentData?.type,
      statusText: currentData?.statusText,
      ok: currentData?.ok,
      model: currentData?.metadata?.model,
      file: currentData?.metadata?.file,
      revision: currentData?.metadata?.revision,
      taskName: currentData?.metadata?.taskName,
    },
    {
      type: ProgressType.DOWNLOAD,
      statusText: ProgressStatusText.DONE,
      ok: true,
      ...FAKE_MODEL_ARGS,
    },
    "Done Data from server should be correct"
  );

  // stub to verify that the data was retrieved from IndexDB
  let matchMethod = hub.cache._testGetData;

  sinon.stub(hub.cache, "_testGetData").callsFake(function () {
    return matchMethod.apply(this, arguments).then(result => {
      Assert.notEqual(result, null);
      return result;
    });
  });

  numCalls = 0;
  currentData = null;

  // Now we expect the callback to indicate cache usage.
  let array2 = await hub.getModelFileAsArrayBuffer({
    ...FAKE_MODEL_ARGS,
    progressCallback: data => {
      // expecting initiate status and download

      currentData = data;

      if (numCalls == 0) {
        Assert.deepEqual(
          {
            type: data.type,
            statusText: data.statusText,
            ok: data.ok,
            model: currentData?.metadata?.model,
            file: currentData?.metadata?.file,
            revision: currentData?.metadata?.revision,
            taskName: currentData?.metadata?.taskName,
          },
          {
            type: ProgressType.LOAD_FROM_CACHE,
            statusText: ProgressStatusText.INITIATE,
            ok: true,
            ...FAKE_MODEL_ARGS,
          },
          "Initiate Data from cache should be correct"
        );
      }

      numCalls += 1;
    },
  });
  hub.cache._testGetData.restore();

  Assert.deepEqual(array, array2);

  // last received message is DONE
  Assert.deepEqual(
    {
      type: currentData?.type,
      statusText: currentData?.statusText,
      ok: currentData?.ok,
      model: currentData?.metadata?.model,
      file: currentData?.metadata?.file,
      revision: currentData?.metadata?.revision,
      taskName: currentData?.metadata?.taskName,
    },
    {
      type: ProgressType.LOAD_FROM_CACHE,
      statusText: ProgressStatusText.DONE,
      ok: true,
      ...FAKE_MODEL_ARGS,
    },
    "Done Data from cache should be correct"
  );

  await deleteCache(hub.cache);
});

/**
 * Test parsing of a well-formed full URL, including protocol and path.
 */
add_task(async function testWellFormedFullUrl() {
  const hub = new ModelHub({ rootUrl: FAKE_HUB });
  const url = `${FAKE_HUB}/org1/model1/v1/file/path`;
  const result = hub.parseUrl(url);

  Assert.equal(
    result.model,
    "org1/model1",
    "Model should be parsed correctly."
  );
  Assert.equal(result.revision, "v1", "Revision should be parsed correctly.");
  Assert.equal(
    result.file,
    "file/path",
    "File path should be parsed correctly."
  );
});

/**
 * Test parsing of a well-formed relative URL, starting with a slash.
 */
add_task(async function testWellFormedRelativeUrl() {
  const hub = new ModelHub({ rootUrl: FAKE_HUB });

  const url = "/org1/model1/v1/file/path";
  const result = hub.parseUrl(url);

  Assert.equal(
    result.model,
    "org1/model1",
    "Model should be parsed correctly."
  );
  Assert.equal(result.revision, "v1", "Revision should be parsed correctly.");
  Assert.equal(
    result.file,
    "file/path",
    "File path should be parsed correctly."
  );
});

/**
 * Ensures an error is thrown when the URL does not start with the expected root URL or a slash.
 */
add_task(async function testInvalidDomain() {
  const hub = new ModelHub({ rootUrl: FAKE_HUB });
  const url = "https://example.com/org1/model1/v1/file/path";
  Assert.throws(
    () => hub.parseUrl(url),
    new RegExp(`Error: Invalid domain for model URL: ${url}`),
    `Should throw with ${url}`
  );
});

/** Tests the method's error handling when the URL format does not include the required segments.
 *
 */
add_task(async function testTooFewParts() {
  const hub = new ModelHub({ rootUrl: FAKE_HUB });
  const url = "/org1/model1";
  Assert.throws(
    () => hub.parseUrl(url),
    new RegExp(`Error: Invalid model URL: ${url}`),
    `Should throw with ${url}`
  );
});

// IndexedDB tests

/**
 * Helper function to initialize the cache
 */
async function initializeCache() {
  const randomSuffix = Math.floor(Math.random() * 10000);
  return await IndexedDBCache.init({ dbName: `modelFiles-${randomSuffix}` });
}

/**
 * Helper function to delete the cache database
 */
async function deleteCache(cache) {
  await cache.dispose();
  indexedDB.deleteDatabase(cache.dbName);
}

/**
 * Test the initialization and creation of the IndexedDBCache instance.
 */
add_task(async function test_Init() {
  const cache = await initializeCache();
  Assert.ok(
    cache instanceof IndexedDBCache,
    "The cache instance should be created successfully."
  );
  Assert.ok(
    IDBDatabase.isInstance(cache.db),
    `The cache should have an IDBDatabase instance. Found ${cache.db}`
  );
  await deleteCache(cache);
});

/**
 * Test checking existence of data in the cache.
 */
add_task(async function test_PutAndCheckExists() {
  const cache = await initializeCache();
  const testData = createBlob();
  const key = "file.txt";
  await cache.put({
    taskName: "task",
    model: "org/model",
    revision: "v1",
    file: "file.txt",
    data: testData,
    headers: {
      ETag: "ETAG123",
    },
  });

  // Checking if the file exists
  let exists = await cache.fileExists({
    model: "org/model",
    revision: "v1",
    file: key,
  });
  Assert.ok(exists, "The file should exist in the cache.");

  // Removing all files from the model
  await cache.deleteModels({ model: "org/model", revision: "v1" });

  exists = await cache.fileExists({
    taskName: "task",
    model: "org/model",
    revision: "v1",
    file: key,
  });
  Assert.ok(!exists, "The file should be gone from the cache.");

  await deleteCache(cache);
});

/**
 * Test adding data to the cache and retrieving it.
 */
add_task(async function test_PutAndGet() {
  const cache = await initializeCache();
  const testData = createBlob();
  await cache.put({
    taskName: "task",
    model: "org/model",
    revision: "v1",
    file: "file.txt",
    data: testData,
    headers: {
      ETag: "ETAG123",
    },
  });

  const [retrievedData, headers] = await cache.getFile({
    model: "org/model",
    revision: "v1",
    file: "file.txt",
  });
  Assert.deepEqual(
    retrievedData,
    testData,
    "The retrieved data should match the stored data."
  );
  Assert.equal(
    headers.ETag,
    "ETAG123",
    "The retrieved ETag should match the stored ETag."
  );

  await deleteCache(cache);
});

/**
 * Test retrieving the headers for a cache entry.
 */
add_task(async function test_GetHeaders() {
  const cache = await initializeCache();
  const testData = createBlob();
  const headers = {
    ETag: "ETAG123",
    status: 200,
    extra: "extra",
  };

  await cache.put({
    taskName: "task",
    model: "org/model",
    revision: "v1",
    file: "file.txt",
    data: testData,
    headers,
  });

  const storedHeaders = await cache.getHeaders({
    model: "org/model",
    revision: "v1",
    file: "file.txt",
  });

  // The `extra` field should be removed from the stored headers because
  // it's not part of the allowed keys.
  // The content-type one is added when not present
  Assert.deepEqual(
    {
      ETag: "ETAG123",
      status: 200,
      "Content-Type": "application/octet-stream",
      fileSize: 8,
    },
    storedHeaders,
    "The retrieved headers should match the stored headers."
  );
  await deleteCache(cache);
});

/**
 * Test listing all models stored in the cache.
 */
add_task(async function test_ListModels() {
  const cache = await initializeCache();

  await Promise.all([
    cache.put({
      taskName: "task1",
      model: "org1/modelA",
      revision: "v1",
      file: "file1.txt",
      data: createBlob(),
      headers: null,
    }),
    cache.put({
      taskName: "task2",
      model: "org2/modelB",
      revision: "v2",
      file: "file2.txt",
      data: createBlob(),
      headers: null,
    }),
  ]);

  const models = await cache.listModels();
  const expected = [
    { name: "org1/modelA", revision: "v1" },
    { name: "org2/modelB", revision: "v2" },
  ];
  Assert.deepEqual(models, expected, "All models should be listed");
  await deleteCache(cache);
});

/**
 * Test deleting a model and its data from the cache.
 */
add_task(async function test_DeleteModels() {
  const cache = await initializeCache();
  await cache.put({
    taskName: "task",
    model: "org/model",
    revision: "v1",
    file: "file.txt",
    data: createBlob(),
    headers: null,
  });
  await cache.deleteModels({ model: "org/model", revision: "v1" });

  const dataAfterDelete = await cache.getFile({
    model: "org/model",
    revision: "v1",
    file: "file.txt",
  });
  Assert.equal(
    dataAfterDelete,
    null,
    "The data for the deleted model should not exist."
  );
  await deleteCache(cache);
});

/**
 * Test deleting a model and its data from the cache using a task name.
 */
add_task(async function test_DeleteModelsUsingTaskName() {
  const cache = await initializeCache();
  const model = "mozilla/distilvit";
  const revision = "main";
  const taskName = "echo";

  await cache.put({
    taskName,
    model,
    revision,
    file: "file.txt",
    data: createBlob(),
    headers: null,
  });

  await cache.deleteModels({ taskName });

  // Model should be gone.
  const models = await cache.listModels();
  const expected = [];
  Assert.deepEqual(models, expected, "All models should be deleted.");

  const dataAfterDelete = await cache.getFile({
    model,
    revision,
    file: "file.txt",
  });
  Assert.equal(
    dataAfterDelete,
    null,
    "The data for the deleted model should not exist."
  );
  await deleteCache(cache);
});

/**
 * Test deleting a model and its data from the cache using a non-existing task name.
 */
add_task(async function test_DeleteModelsUsingNonExistingTaskName() {
  const cache = await initializeCache();
  const model = "mozilla/distilvit";
  const revision = "main";
  const taskName = "echo";

  await cache.put({
    taskName,
    model,
    revision,
    file: "file.txt",
    data: createBlob(),
    headers: null,
  });

  await cache.deleteModels({ taskName: "non-existing-task" });

  // Model should still be there.
  const models = await cache.listModels();
  const expected = [{ name: model, revision }];
  Assert.deepEqual(models, expected, "All models should be listed");

  await deleteCache(cache);
});

/**
 * Test listing files
 */
add_task(async function test_listFiles() {
  const cache = await initializeCache();
  const headers = { "Content-Length": "12345", ETag: "XYZ" };
  const blob = createBlob();

  await Promise.all([
    cache.put({
      taskName: "task1",
      model: "org/model",
      revision: "v1",
      file: "file.txt",
      data: blob,
      headers: null,
    }),

    cache.put({
      taskName: "task1",
      model: "org/model",
      revision: "v1",
      file: "file2.txt",
      data: blob,
      headers: null,
    }),

    cache.put({
      taskName: "task2",
      model: "org/model",
      revision: "v1",
      file: "sub/file3.txt",
      data: createBlob(32),
      headers,
    }),
  ]);

  const files = await cache.listFiles({ model: "org/model", revision: "v1" });
  const expected = [
    {
      path: "file.txt",
      headers: {
        "Content-Type": "application/octet-stream",
        fileSize: 8,
        ETag: "NO_ETAG",
      },
    },
    {
      path: "file2.txt",
      headers: {
        "Content-Type": "application/octet-stream",
        fileSize: 8,
        ETag: "NO_ETAG",
      },
    },
    {
      path: "sub/file3.txt",
      headers: {
        "Content-Length": "12345",
        "Content-Type": "application/octet-stream",
        fileSize: 32,
        ETag: "XYZ",
      },
    },
  ];

  Assert.deepEqual(files, expected);
  await deleteCache(cache);
});

/**
 * Test listing files using a task name
 */
add_task(async function test_listFilesUsingTaskName() {
  const cache = await initializeCache();

  const model = "mozilla/distilvit";
  const revision = "main";
  const taskName = "echo";

  const headers = { "Content-Length": "12345", ETag: "XYZ" };
  const blob = createBlob();

  await Promise.all([
    cache.put({
      taskName,
      model,
      revision,
      file: "file.txt",
      data: blob,
      headers: null,
    }),
    cache.put({
      taskName,
      model,
      revision,
      file: "file2.txt",
      data: blob,
      headers: null,
    }),

    cache.put({
      taskName,
      model,
      revision,
      file: "sub/file3.txt",
      data: createBlob(32),
      headers,
    }),
  ]);

  const files = await cache.listFiles({ taskName });
  const expected = [
    {
      path: "file.txt",
      headers: {
        "Content-Type": "application/octet-stream",
        fileSize: 8,
        ETag: "NO_ETAG",
      },
    },
    {
      path: "file2.txt",
      headers: {
        "Content-Type": "application/octet-stream",
        fileSize: 8,
        ETag: "NO_ETAG",
      },
    },
    {
      path: "sub/file3.txt",
      headers: {
        "Content-Length": "12345",
        "Content-Type": "application/octet-stream",
        fileSize: 32,
        ETag: "XYZ",
      },
    },
  ];

  Assert.deepEqual(files, expected);

  await deleteCache(cache);
});

/**
 * Test listing files using a non existing task name
 */
add_task(async function test_listFilesUsingNonExistingTaskName() {
  const cache = await initializeCache();

  const model = "mozilla/distilvit";
  const revision = "main";
  const taskName = "echo";

  const headers = { "Content-Length": "12345", ETag: "XYZ" };
  const blob = createBlob();

  await Promise.all([
    cache.put({
      taskName,
      model,
      revision,
      file: "file.txt",
      data: blob,
      headers: null,
    }),
    cache.put({
      taskName,
      model,
      revision,
      file: "file2.txt",
      data: blob,
      headers: null,
    }),
    cache.put({
      taskName,
      model,
      revision,
      file: "sub/file3.txt",
      data: createBlob(32),
      headers,
    }),
  ]);

  const files = await cache.listFiles({ taskName: "non-existing-task" });

  Assert.deepEqual(files, []);

  await deleteCache(cache);
});

/**
 * Test the ability to add a database from a non-existing database.
 */
add_task(async function test_initDbFromNonExisting() {
  const randomSuffix = Math.floor(Math.random() * 10000);
  const cache = await IndexedDBCache.init({
    dbName: `modelFiles-${randomSuffix}`,
  });

  Assert.notEqual(cache, null);

  await deleteCache(cache);
});

/**
 * Test that we can upgrade even if the existing database is missing some stores or indices.
 */
add_task(async function test_initDbFromExistingEmpty() {
  const randomSuffix = Math.floor(Math.random() * 10000);
  const dbName = `modelFiles-${randomSuffix}`;

  const dbVersion = 1;

  const newVersion = dbVersion + 1;

  async function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);
      request.onerror = event => reject(event.target.error);
      request.onsuccess = event => resolve(event.target.result);
    });
  }

  const db = await openDB();
  db.close();

  const cache = await IndexedDBCache.init({ dbName, version: newVersion });

  Assert.notEqual(cache, null);
  Assert.equal(cache.db.version, newVersion);

  const model = "mozilla/distilvit";
  const revision = "main";
  const taskName = "echo";

  const blob = createBlob();

  await cache.put({
    taskName,
    model,
    revision,
    file: "file.txt",
    data: blob,
    headers: null,
  });

  const expected = [
    {
      path: "file.txt",
      headers: {
        "Content-Type": "application/octet-stream",
        fileSize: 8,
        ETag: "NO_ETAG",
      },
    },
  ];

  // Ensure every table & indices is on so that we can list files
  const files = await cache.listFiles({ taskName });
  Assert.deepEqual(files, expected);

  await deleteCache(cache);
});

/**
 * Test that upgrading from version 1 to version 2 results in existing data being deleted.
 */
add_task(async function test_initDbFromExistingNoChange() {
  const randomSuffix = Math.floor(Math.random() * 10000);
  const dbName = `modelFiles-${randomSuffix}`;

  // Create version 1
  let cache = await IndexedDBCache.init({ dbName, version: 1 });

  Assert.notEqual(cache, null);
  Assert.equal(cache.db.version, 1);

  const model = "mozilla/distilvit";
  const revision = "main";
  const taskName = "echo";

  const blob = createBlob();

  await cache.put({
    taskName,
    model,
    revision,
    file: "file.txt",
    data: blob,
    headers: null,
  });

  cache.db.close();

  // Create version 2
  cache = await IndexedDBCache.init({ dbName, version: 2 });

  Assert.notEqual(cache, null);
  Assert.equal(cache.db.version, 2);

  // Ensure tables are all empty.
  const files = await cache.listFiles({ taskName });

  Assert.deepEqual(files, []);

  await deleteCache(cache);
});

/**
 * Test that upgrading the indices of an existing database does not lead to data deletion.
 */
add_task(async function test_initDbFromExistingIndexChanges() {
  const randomSuffix = Math.floor(Math.random() * 10000);
  const dbName = `modelFiles-${randomSuffix}`;

  const dbVersion = 2;
  const model = "mozilla/distilvit";
  const revision = "main";
  const taskName = "echo";

  const blob = createBlob();
  // Create version 2
  let cache = await IndexedDBCache.init({ dbName, version: dbVersion });

  Assert.notEqual(cache, null);
  Assert.equal(cache.db.version, 2);
  await cache.put({
    taskName,
    model,
    revision,
    file: "file.txt",
    data: blob,
    headers: null,
  });

  cache.db.close();

  // Delete all indices
  async function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion + 1);
      request.onerror = event => reject(event.target.error);
      request.onsuccess = event => resolve(event.target.result);
      request.onupgradeneeded = event => {
        const db = event.target.result;

        for (const storeName of db.objectStoreNames) {
          const store = request.transaction.objectStore(storeName);

          for (const indexName of store.indexNames) {
            store.deleteIndex(indexName);
          }
        }
      };
    });
  }

  const db = await openDB();
  db.close();

  // Create version 4
  cache = await IndexedDBCache.init({ dbName, version: dbVersion + 2 });

  Assert.notEqual(cache, null);
  Assert.equal(cache.db.version, 4);

  const expected = [
    {
      path: "file.txt",
      headers: {
        "Content-Type": "application/octet-stream",
        fileSize: 8,
        ETag: "NO_ETAG",
      },
    },
  ];

  // Ensure every table & indices is on so that we can list files
  const files = await cache.listFiles({ taskName });
  Assert.deepEqual(files, expected);

  await deleteCache(cache);
});

/**
 * Test that upgrading an existing cache from another source is possible.
 */
add_task(async function test_initDbFromExistingElseWhereStoreChanges() {
  const randomSuffix = Math.floor(Math.random() * 10000);
  const dbName = `modelFiles-${randomSuffix}`;

  const dbVersion = 2;
  const model = "mozilla/distilvit";
  const revision = "main";
  const taskName = "echo";

  const blob = createBlob();
  // Create version 2
  const cache1 = await IndexedDBCache.init({ dbName, version: dbVersion });

  Assert.notEqual(cache1, null);
  Assert.equal(cache1.db.version, 2);

  // Cache1 is not closed by design of this test

  // Create version 3
  const cache2 = await IndexedDBCache.init({ dbName, version: dbVersion + 1 });

  Assert.notEqual(cache2, null);
  Assert.equal(cache2.db.version, 3);

  await cache2.put({
    taskName,
    model,
    revision,
    file: "file.txt",
    data: blob,
    headers: null,
  });

  const expected = [
    {
      path: "file.txt",
      headers: {
        "Content-Type": "application/octet-stream",
        fileSize: 8,
        ETag: "NO_ETAG",
      },
    },
  ];

  // Ensure every table & indices is on so that we can list files
  const files = await cache2.listFiles({ taskName });
  Assert.deepEqual(files, expected);

  await deleteCache(cache2);
});
