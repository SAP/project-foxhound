"use strict";

add_setup(() => {
  do_get_profile();
  Services.fog.initializeFOG();
});

add_task(function test_recordException_instrumentation() {
  const e = new Error("For the test!");
  const expected = {
    module: "test module",
    context: "test context",
    message: "Error: For the test!",
    line: 9,
    file: e.fileName,
  };

  AddonManagerPrivate.recordException(expected.module, expected.context, e);

  Assert.deepEqual(Glean.addonsManager.exception.testGetValue(), expected);
});
