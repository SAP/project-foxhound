/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);

add_task(async function test_signal_origin_external_sender() {
  if (!("@mozilla.org/toolkit/crash-reporter;1" in Cc)) {
    dump(
      "INFO | test_crash_signal_origin_linux.js | Can't test crashreporter in a non-libxul build.\n"
    );
    return;
  }

  do_get_profile();
  await makeFakeAppDir();

  Services.appinfo.minidumpPath = do_get_tempdir();

  const crashD = do_get_tempdir();
  crashD.append("crash-events");
  if (!crashD.exists()) {
    crashD.create(crashD.DIRECTORY_TYPE, 0o700);
  }
  Services.env.set("CRASHES_EVENTS_DIR", crashD.path);

  try {
    // IOUtils.readUTF8 stats the file to size its buffer, but /proc/<pid>/comm
    // reports size 0, so we must read a fixed number of bytes instead. comm is
    // bounded by Linux's TASK_COMM_LEN (16); 64 bytes is plenty.
    const commBytes = await IOUtils.read("/proc/self/comm", { maxBytes: 64 });
    const expectedOrigin = new TextDecoder().decode(commBytes).trim();
    Assert.notEqual(
      expectedOrigin,
      "",
      "/proc/self/comm should yield a non-empty process name"
    );

    do_load_child_test_harness();

    const headfile = do_get_file("crasher_subprocess_head.js");
    await sendCommandAsync(
      'load("' + headfile.path.replace(/\\/g, "/") + '");'
    );

    const childPid = parseInt(
      await sendCommandAsync("Services.appinfo.processID"),
      10
    );

    const processTools = Cc["@mozilla.org/processtools-service;1"].getService(
      Ci.nsIProcessToolsService
    );
    // Send a SIGABRT to the child process.
    processTools.crash(childPid);

    const minidump = await TestUtils.waitForCondition(
      () => getMinidump(),
      "Waiting for minidump to be created"
    );
    const id = minidump.leafName.slice(0, -4);
    await Services.crashmanager.ensureCrashIsPresent(id);

    await handleMinidump(function (_mdump, extra) {
      Assert.equal(
        extra.SignalOrigin,
        expectedOrigin,
        "SignalOrigin should match /proc/self/comm of the signal-sending process"
      );
    });
  } finally {
    Services.env.set("CRASHES_EVENTS_DIR", "");
  }
});

add_task(async function test_signal_origin_disregard_self() {
  if (!("@mozilla.org/toolkit/crash-reporter;1" in Cc)) {
    return;
  }

  await do_crash(
    function () {
      crashType = CrashTestUtils.CRASH_ABORT;
    },
    function (_mdump, extra) {
      Assert.ok(
        "CrashEventID" in extra,
        "Sanity check: the crash report was produced"
      );
      Assert.ok(
        !("SignalOrigin" in extra),
        "SignalOrigin must not be recorded when the process aborts itself"
      );
    },
    true
  );
});
