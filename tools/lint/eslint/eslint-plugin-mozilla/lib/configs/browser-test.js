// Parent config file for all browser-chrome files.
"use strict";

module.exports = {
  env: {
    browser: true,
    "mozilla/browser-window": true,
    "mozilla/simpletest": true,
  },

  // All globals made available in the test environment.
  globals: {
    // `$` is defined in SimpleTest.js
    $: false,
    Assert: false,
    BrowserTestUtils: false,
    ContentTask: false,
    ContentTaskUtils: false,
    EventUtils: false,
    IOUtils: false,
    PathUtils: false,
    PromiseDebugging: false,
    SpecialPowers: false,
    TestUtils: false,
    addLoadEvent: false,
    add_setup: false,
    add_task: false,
    content: false,
    executeSoon: false,
    expectUncaughtException: false,
    export_assertions: false,
    extractJarToTmp: false,
    finish: false,
    gTestPath: false,
    getChromeDir: false,
    getJar: false,
    getResolvedURI: false,
    getRootDirectory: false,
    getTestFilePath: false,
    ignoreAllUncaughtExceptions: false,
    info: false,
    is: false,
    isnot: false,
    ok: false,
    record: false,
    registerCleanupFunction: false,
    requestLongerTimeout: false,
    setExpectedFailuresForSelfTest: false,
    stringContains: false,
    stringMatches: false,
    todo: false,
    todo_is: false,
    todo_isnot: false,
    waitForClipboard: false,
    waitForExplicitFinish: false,
    waitForFocus: false,
  },

  plugins: ["mozilla"],

  rules: {
    "mozilla/no-addtask-setup": "error",
    "mozilla/no-comparison-or-assignment-inside-ok": "error",
    "mozilla/no-redeclare-with-import-autofix": [
      "error",
      { errorForNonImports: false },
    ],
  },
};
