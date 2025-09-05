add_task(async function run_test() {
  if (!("@mozilla.org/toolkit/crash-reporter;1" in Cc)) {
    dump(
      "INFO | test_crash_exc_guard.js | Can't test crashreporter in a non-libxul build.\n"
    );
    return;
  }

  // Try crashing by closing a guarded file descriptor
  await do_crash(
    function () {
      crashType = CrashTestUtils.CRASH_EXC_GUARD;
      crashReporter.annotateCrashReport("TestKey", "TestValue");
    },
    async function (mdump, extra, extraFile) {
      runMinidumpAnalyzer(mdump);

      // Refresh updated extra data
      extra = await IOUtils.readJSON(extraFile.path);

      Assert.ok(
        extra.StackTraces.crash_info.type.startsWith(
          "EXC_GUARD / GUARD_TYPE_FD / GUARD_EXC_CLOSE"
        )
      );
      Assert.equal(extra.TestKey, "TestValue");
    },
    // process will exit with a zero exit status
    true
  );
});
