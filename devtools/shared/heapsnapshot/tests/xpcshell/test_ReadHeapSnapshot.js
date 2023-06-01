/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Test that we can read core dumps into HeapSnapshot instances.
/* eslint-disable strict */
if (typeof Debugger != "function") {
  const { addDebuggerToGlobal } = ChromeUtils.importESModule(
    "resource://gre/modules/jsdebugger.sys.mjs"
  );
  addDebuggerToGlobal(globalThis);
}

function run_test() {
  const filePath = ChromeUtils.saveHeapSnapshot({ globals: [this] });
  ok(true, "Should be able to save a snapshot.");

  const snapshot = ChromeUtils.readHeapSnapshot(filePath);
  ok(snapshot, "Should be able to read a heap snapshot");
  ok(HeapSnapshot.isInstance(snapshot), "Should be an instanceof HeapSnapshot");

  do_test_finished();
}
