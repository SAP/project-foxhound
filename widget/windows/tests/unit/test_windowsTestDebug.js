/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * Test nsIWindowsTestDebug.
 */

const { BasePromiseWorker } = ChromeUtils.importESModule(
  "resource://gre/modules/PromiseWorker.sys.mjs"
);

add_task(async () => {
  const path = await IOUtils.createUniqueFile(PathUtils.tempDir, "openedFile");
  await IOUtils.writeUTF8(path, "");
  Assert.ok(await IOUtils.exists(path), path + " should have been created");
  registerCleanupFunction(async () => {
    await IOUtils.remove(path);
  });

  // Use a worker to keep the testFile open.
  const worker = new BasePromiseWorker(
    "resource://test/test_keep_file_open.worker.js"
  );
  await worker.post("open", [path]);

  // Check that nsIWindowsTestDebug tells us that we have the file open.
  const WindowsTestDebug = Cc["@mozilla.org/win-test-debug;1"].getService(
    Ci.nsIWindowsTestDebug
  );
  let procs = WindowsTestDebug.processesThatOpenedFile(path);
  info(JSON.stringify(procs));
  Assert.equal(procs.length, 1, "Process list contains one process");
  const ProcessTools = Cc["@mozilla.org/processtools-service;1"].getService(
    Ci.nsIProcessToolsService
  );
  Assert.equal(
    procs[0].pid,
    ProcessTools.pid,
    "Process list contains this process"
  );
  await worker.post("close", []);
  await IOUtils.remove(path);
});
