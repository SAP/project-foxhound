"use strict";

// This test verifies that Subprocess is reasonably fast.
// NativeMessaging is a consumer of Subprocess and has a similar test at:
// toolkit/components/extensions/test/xpcshell/test_ext_native_messaging_perf.js
//
// NOTE: This test has fundamental issues that may cause timeouts or longer runs
// on slow, resource-constrained devices. See
// https://bugzilla.mozilla.org/show_bug.cgi?id=1729546#c4 and
// https://bugzilla.mozilla.org/show_bug.cgi?id=1951522#c31

let max_round_trip_time_ms = 30;

const MAX_ROUND_TRIP_TIME_MS = max_round_trip_time_ms;

const MAX_RETRIES = 5;

let PYTHON;

const TEST_SCRIPT = do_get_file("data_test_script.py").path;

let read = pipe => {
  return pipe.readUint32().then(count => {
    return pipe.readString(count);
  });
};

add_setup(async function setup() {
  PYTHON = await Subprocess.pathSearch(Services.env.get("PYTHON"));
});

add_task(async function test_subprocess_round_trip_perf() {
  let roundTripTime = Infinity;
  for (
    let i = 0;
    i < MAX_RETRIES && roundTripTime > MAX_ROUND_TRIP_TIME_MS;
    i++
  ) {
    let proc = await Subprocess.call({
      command: PYTHON,
      arguments: ["-u", TEST_SCRIPT, "echo"],
    });

    const LINE = "I'm a leaf on the wind.\n";

    let now = Date.now();
    const COUNT = 1000;
    for (let j = 0; j < COUNT; j++) {
      let [output] = await Promise.all([
        read(proc.stdout),
        proc.stdin.write(LINE),
      ]);

      // We don't want to log this for every iteration, but we still need
      // to fail if it goes wrong.
      if (output !== LINE) {
        equal(output, LINE, "Got expected output");
      }
    }

    roundTripTime = (Date.now() - now) / COUNT;

    await proc.stdin.close();

    let { exitCode } = await proc.wait();

    equal(exitCode, 0, "Got expected exit code");
  }

  Assert.lessOrEqual(
    roundTripTime,
    MAX_ROUND_TRIP_TIME_MS,
    `Expected round trip time (${roundTripTime}ms) to be less than ${MAX_ROUND_TRIP_TIME_MS}ms`
  );
});
