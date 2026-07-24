add_task(async function test_psi_annotation_in_crash_report() {
  if (!("@mozilla.org/toolkit/crash-reporter;1" in Cc)) {
    dump(
      "INFO | test_crash_psi_annotation.js | Can't test crashreporter in a non-libxul build.\n"
    );
    return;
  }

  // Create a mock PSI file with known values for testing
  const mockPSIContent =
    "some avg10=10.00 avg60=8.00 avg300=6.00 total=1000\n" +
    "full avg10=2.00 avg60=1.50 avg300=1.00 total=500\n";

  // Create mock PSI file as a temporary file
  const psiFile = do_get_tempdir();
  psiFile.append("test_psi_memory");
  psiFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);

  // Write mock PSI data
  await IOUtils.writeUTF8(psiFile.path, mockPSIContent);

  // Register cleanup to remove the test file
  registerCleanupFunction(async function () {
    if (psiFile.exists()) {
      try {
        psiFile.remove(false);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  // Set the PSI path for testing through environment variable
  // The callback runs in a separate process, so we need to pass the path via env
  Services.env.set("MOZ_TEST_PSI_PATH", psiFile.path);

  // Test that PSI annotation is recorded in crash report
  await do_crash(
    async function () {
      shouldWaitSetup = true;
      shouldDelay = true;

      // Read the PSI path from environment variable in the separate process
      const psiPath = Services.env.get("MOZ_TEST_PSI_PATH");
      const watcher = Cc["@mozilla.org/xpcom/memory-watcher;1"].getService(
        Ci.nsIAvailableMemoryWatcherBase
      );
      if (psiPath) {
        const testingWatcher = watcher.QueryInterface(
          Ci.nsIAvailableMemoryWatcherTestingLinux
        );
        testingWatcher.setPSIPathForTesting(psiPath);
      }

      // Set up tab unloader and wait for it to be called
      let tabUnloaderCalled = false;
      const tabUnloaderPromise = new Promise(resolve => {
        const mockTabUnloader = {
          queryInterface: ChromeUtils.generateQI(["nsITabUnloader"]),
          unloadTabAsync() {
            tabUnloaderCalled = true;
            resolve();
          },
        };

        // Register our mock tab unloader through the service
        watcher.registerTabUnloader(mockTabUnloader);
      });

      // Set memory threshold to 100% to ensure memory pressure is detected
      Services.prefs.setIntPref(
        "browser.low_commit_space_threshold_percent",
        100
      );

      // Start user interaction to begin polling
      Services.obs.notifyObservers(null, "user-interaction-active");

      // Wait for the tab unloader to be called
      await tabUnloaderPromise;

      // Verify that the tab unloader was actually called
      if (!tabUnloaderCalled) {
        throw new Error("Tab unloader was not called");
      }

      // Trigger the crash now that PSI data has been processed
      crashType = CrashTestUtils.CRASH_PURE_VIRTUAL_CALL;
      shouldWaitSetup = false;
    },
    function (mdump, extra) {
      Assert.ok(
        "LinuxMemoryPSI" in extra,
        "LinuxMemoryPSI annotation should be present"
      );

      // Verify the format is correct (comma-separated values)
      const psiValues = extra.LinuxMemoryPSI;
      Assert.strictEqual(
        typeof psiValues,
        "string",
        "PSI values should be a string"
      );

      // Parse the comma-separated values
      const values = psiValues.split(",");
      Assert.equal(
        values.length,
        8,
        "PSI annotation should have 8 comma-separated values"
      );

      // Verify the expected values from our mock PSI file
      // Format: some_avg10,some_avg60,some_avg300,some_total,full_avg10,full_avg60,full_avg300,full_total
      Assert.equal(values[0], "10", "some_avg10 should be 10");
      Assert.equal(values[1], "8", "some_avg60 should be 8");
      Assert.equal(values[2], "6", "some_avg300 should be 6");
      Assert.equal(values[3], "1000", "some_total should be 1000");
      Assert.equal(values[4], "2", "full_avg10 should be 2");
      Assert.equal(values[5], "1", "full_avg60 should be 1");
      Assert.equal(values[6], "1", "full_avg300 should be 1");
      Assert.equal(values[7], "500", "full_total should be 500");

      dump("INFO | PSI annotation test passed: " + psiValues + "\n");
    },
    // process will exit with a zero exit status
    true
  );
});

// Test PSI annotation when PSI file is not available
add_task(async function test_psi_annotation_no_psi_file() {
  if (!("@mozilla.org/toolkit/crash-reporter;1" in Cc)) {
    dump(
      "INFO | test_crash_psi_annotation.js | Can't test crashreporter in a non-libxul build.\n"
    );
    return;
  }

  await do_crash(
    async function () {
      shouldWaitSetup = true;
      shouldDelay = true;

      // Set the PSI path for testing (point to a unique non-existent file)
      const watcher = Cc["@mozilla.org/xpcom/memory-watcher;1"].getService(
        Ci.nsIAvailableMemoryWatcherBase
      );
      const testingWatcher = watcher.QueryInterface(
        Ci.nsIAvailableMemoryWatcherTestingLinux
      );

      // Build a unique path by appending PID and timestamp to the base name.
      // If a file happens to exist at that path, append a sequence number.
      const basePath =
        Services.env.get("XPCSHELL_TEST_TEMP_DIR") + "/non_existent_psi_file";
      const pid = Services.appinfo.processID;
      const timestamp = Date.now();
      let sequence = 0;
      let psiPath = `${basePath}_${pid}_${timestamp}`;
      while (await IOUtils.exists(psiPath)) {
        sequence++;
        psiPath = `${basePath}_${pid}_${timestamp}_${sequence}`;
      }

      testingWatcher.setPSIPathForTesting(psiPath);

      // Set memory threshold to 100% to ensure memory pressure is detected
      Services.prefs.setIntPref(
        "browser.low_commit_space_threshold_percent",
        100
      );

      // Wait for PSI data to be processed
      await new Promise(resolve => {
        Services.obs.addObserver(function observer(_subject, _topic) {
          Services.obs.removeObserver(observer, "memory-poller-sync");
          resolve();
        }, "memory-poller-sync");

        Services.obs.notifyObservers(null, "user-interaction-active");
      });

      // Trigger the crash now that PSI data has been processed
      crashType = CrashTestUtils.CRASH_PURE_VIRTUAL_CALL;
      shouldWaitSetup = false;
    },
    function (mdump, extra) {
      Assert.ok(
        "LinuxMemoryPSI" in extra,
        "LinuxMemoryPSI annotation should be present even when PSI file is unavailable"
      );

      const psiValues = extra.LinuxMemoryPSI;
      const values = psiValues.split(",");
      Assert.equal(
        values.length,
        8,
        "PSI annotation should have 8 values even when PSI file is unavailable"
      );

      // All values should be zero when PSI file is not available
      for (let i = 0; i < 8; i++) {
        Assert.equal(
          values[i],
          "0",
          `PSI value ${i} should be 0 when PSI file is unavailable`
        );
      }

      dump("INFO | PSI annotation test (no file) passed: " + psiValues + "\n");
    },
    true
  );
});
