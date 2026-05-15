add_task(async function run_test() {
  if (!("@mozilla.org/toolkit/crash-reporter;1" in Cc)) {
    dump(
      "INFO | test_crash_stl.js | Can't test crashreporter in a non-libxul build.\n"
    );
    return;
  }

  // Try crashing with an out of bounds std::vector access.
  await do_crash(
    function () {
      crashType = CrashTestUtils.CRASH_STL_VECTOR_OOB;
      crashReporter.annotateCrashReport("TestKey", "TestValue");
    },
    async function (mdump, extra, extraFile) {
      runMinidumpAnalyzer(mdump);

      // Refresh updated extra data
      extra = await IOUtils.readJSON(extraFile.path);

      Assert.equal(extra.TestKey, "TestValue");
    },
    // process will exit with a zero exit status
    true
  );
});
