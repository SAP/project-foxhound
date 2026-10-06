/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const { StructuredLogger } = ChromeUtils.importESModule(
  "resource://testing-common/StructuredLog.sys.mjs"
);

add_task(function test_StructuredLogger() {
  let testBuffer = [];

  let appendBuffer = function (msg) {
    testBuffer.push(JSON.stringify(msg));
  };

  let assertLastMsg = function (refData) {
    // Check all fields in refData agree with those in the
    // last message logged, and pop that message.
    let lastMsg = JSON.parse(testBuffer.pop());
    for (let field in refData) {
      deepEqual(lastMsg[field], refData[field]);
    }
    // The logger should always set the source to the logger name.
    equal(lastMsg.source, "test_log");
  };

  let logger = new StructuredLogger("test_log", appendBuffer);

  // Test unstructured logging
  logger.info("Test message");
  assertLastMsg({
    action: "log",
    message: "Test message",
    level: "INFO",
  });

  logger.info("Test message", { foo: "bar" });
  assertLastMsg({
    action: "log",
    message: "Test message",
    level: "INFO",
    extra: { foo: "bar" },
  });

  // Test end / start actions
  logger.testStart("aTest");
  assertLastMsg({
    test: "aTest",
    action: "test_start",
  });

  logger.testEnd("aTest", "OK");
  assertLastMsg({
    test: "aTest",
    action: "test_end",
    status: "OK",
  });

  // A failed test populates the "expected" field.
  logger.testStart("aTest");
  logger.testEnd("aTest", "FAIL", "PASS");
  assertLastMsg({
    action: "test_end",
    test: "aTest",
    status: "FAIL",
    expected: "PASS",
  });

  // A failed test populates the "expected" field.
  logger.testStart("aTest");
  logger.testEnd("aTest", "FAIL", "PASS", null, "Many\nlines\nof\nstack\n");
  assertLastMsg({
    action: "test_end",
    test: "aTest",
    status: "FAIL",
    expected: "PASS",
    stack: "Many\nlines\nof\nstack\n",
  });

  // Skipped tests don't log failures
  logger.testStart("aTest");
  logger.testEnd("aTest", "SKIP", "PASS");
  ok(!JSON.parse(testBuffer[testBuffer.length - 1]).hasOwnProperty("expected"));
  assertLastMsg({
    action: "test_end",
    test: "aTest",
    status: "SKIP",
  });

  logger.testStatus("aTest", "foo", "PASS", "PASS", "Passed test");
  ok(!JSON.parse(testBuffer[testBuffer.length - 1]).hasOwnProperty("expected"));
  assertLastMsg({
    action: "test_status",
    test: "aTest",
    subtest: "foo",
    status: "PASS",
    message: "Passed test",
  });

  logger.testStatus("aTest", "bar", "FAIL");
  assertLastMsg({
    action: "test_status",
    test: "aTest",
    subtest: "bar",
    status: "FAIL",
    expected: "PASS",
  });

  logger.testStatus(
    "aTest",
    "bar",
    "FAIL",
    "PASS",
    null,
    "Many\nlines\nof\nstack\n"
  );
  assertLastMsg({
    action: "test_status",
    test: "aTest",
    subtest: "bar",
    status: "FAIL",
    expected: "PASS",
    stack: "Many\nlines\nof\nstack\n",
  });

  // Skipped tests don't log failures
  logger.testStatus("aTest", "baz", "SKIP");
  ok(!JSON.parse(testBuffer[testBuffer.length - 1]).hasOwnProperty("expected"));
  assertLastMsg({
    action: "test_status",
    test: "aTest",
    subtest: "baz",
    status: "SKIP",
  });

  // Suite start and end messages.
  var ids = { aManifest: ["aTest"] };
  logger.suiteStart(ids);
  assertLastMsg({
    action: "suite_start",
    tests: { aManifest: ["aTest"] },
  });

  logger.suiteEnd();
  assertLastMsg({
    action: "suite_end",
  });
});

add_task(function test_StructuredLogger_with_dumpScope() {
  let testBuffer = [];
  let appendBuffer2 = msg => {
    testBuffer.push(msg);
  };

  let assertSeenMsg = (expected, checkExtra) => {
    const { action, message, level, extra } = testBuffer.shift();
    deepEqual({ action, message, level }, expected);
    ok(checkExtra(extra), `Extra: ${uneval(extra)}`);
  };

  // Regression test for bug 2007587: Logger gracefully handles clone failures.
  let logger2 = new StructuredLogger("test_dump", appendBuffer2, globalThis);
  const extraNotCloneable = { notCloneable: () => {} };
  logger2.info("Test non-cloneable", extraNotCloneable);

  assertSeenMsg(
    {
      action: "log",
      message:
        "Failed to cloneInto: Error: Permission denied to pass a Function via structured clone",
      level: "ERROR",
    },
    extra => extra === undefined
  );

  testBuffer[0].message = testBuffer[0].message.replace(/time:\d+/, "time:123");
  assertSeenMsg(
    {
      action: "log",
      message: `Tried to clone: ({action:"log", time:123, thread:null, pid:null, source:"test_dump", level:"INFO", message:"Test non-cloneable", extra:{notCloneable:() => {}}})`,
      level: "WARNING",
    },
    extra => extra === undefined
  );

  assertSeenMsg(
    { action: "log", message: "Test non-cloneable", level: "INFO" },
    extra => extra === extraNotCloneable
  );

  // Now verify the most common / desired behavior: clone where possible.
  const extraCloneable = { cloneable: "Yes I am" };
  logger2.info("Test cloneable", extraCloneable);

  assertSeenMsg(
    { action: "log", message: "Test cloneable", level: "INFO" },
    extra => {
      deepEqual(extra, extraCloneable);
      return extra !== extraCloneable;
    }
  );

  equal(testBuffer.length, 0, "No messages unaccounted for");
});
