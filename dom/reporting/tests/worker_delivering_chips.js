/* eslint-disable no-undef */

// Trigger a deprecation report from the worker.
new TestingDeprecatedInterface();

postMessage("done");
