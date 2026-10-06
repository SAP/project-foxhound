/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the devtools/shared/worker can handle:
// returned primitives (or promise or Error)

const { DevToolsWorker } = ChromeUtils.importESModule(
  "resource://devtools/shared/worker/worker.sys.mjs"
);

add_task(async function () {
  const worker = new DevToolsWorker(
    getRootDirectory(gTestPath) + "file_worker-03.worker.js"
  );

  is(await worker.performTask("square", 5), 25, "return primitives successful");

  is(
    await worker.performTask("squarePromise", 5),
    25,
    "promise primitives successful"
  );

  try {
    await worker.performTask("squareError", 5);
    ok(false, "return error should reject");
  } catch (e) {
    ok(true, "return error should reject");
  }

  try {
    await worker.performTask("squarePromiseReject", 5);
    ok(false, "returned rejected promise rejects");
  } catch (e) {
    ok(true, "returned rejected promise rejects");
  }

  worker.destroy();
});
