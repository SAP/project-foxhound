/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { DevToolsWorker } = ChromeUtils.importESModule(
  "resource://devtools/shared/worker/worker.sys.mjs"
);

const BUFFER_SIZE = 8;

add_task(async function () {
  // Test both CJS and JSM versions

  await testWorker();
  await testTransfer();
});

async function testWorker() {
  const worker = new DevToolsWorker(
    getRootDirectory(gTestPath) + "file_worker-01-worker.worker.js"
  );

  const results = await worker.performTask("groupByField", {
    items: [
      { name: "Paris", country: "France" },
      { name: "Lagos", country: "Nigeria" },
      { name: "Lyon", country: "France" },
    ],
    groupField: "country",
  });

  is(
    Object.keys(results.groups).join(","),
    "France,Nigeria",
    `worker should have returned the expected result`
  );

  worker.destroy();
}

async function testTransfer() {
  const worker = new DevToolsWorker(
    getRootDirectory(gTestPath) + "file_worker-01-transfer.worker.js"
  );

  const buf = new ArrayBuffer(BUFFER_SIZE);

  is(
    buf.byteLength,
    BUFFER_SIZE,
    "Size of the buffer before transfer is correct."
  );

  is(
    await worker.performTask("transfer", { buf }),
    8,
    "Sent array buffer to worker"
  );
  is(buf.byteLength, 8, "Array buffer was copied, not transferred.");

  is(
    await worker.performTask("transfer", { buf }, [buf]),
    8,
    "Sent array buffer to worker"
  );
  is(buf.byteLength, 0, "Array buffer was transferred, not copied.");

  worker.destroy();
}
