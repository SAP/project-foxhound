// Parent config file for all xpcshell files.
"use strict";

module.exports = {
  env: {
    browser: false,
    "mozilla/privileged": true,
    "mozilla/xpcshell": true,
  },

  overrides: [
    {
      // Some directories have multiple kinds of tests, and some rules
      // don't work well for plain mochitests, so disable those.
      files: ["*.html", "*.xhtml"],
      // plain/chrome mochitests don't automatically include Assert, so
      // autofixing `ok()` to Assert.something is bad.
      rules: {
        "mozilla/no-comparison-or-assignment-inside-ok": "off",
      },
    },
    {
      // If it is a head file, we turn off global unused variable checks, as it
      // would require searching the other test files to know if they are used or not.
      // This would be expensive and slow, and it isn't worth it for head files.
      // We could get developers to declare as exported, but that doesn't seem worth it.
      files: "head*.js",
      rules: {
        "no-unused-vars": [
          "error",
          {
            args: "none",
            vars: "local",
          },
        ],
      },
    },
    {
      // No declaring variables that are never used
      files: "test*.js",
      rules: {
        "no-unused-vars": [
          "error",
          {
            args: "none",
            vars: "all",
          },
        ],
      },
    },
  ],

  rules: {
    "mozilla/import-headjs-globals": "error",
    "mozilla/mark-test-function-used": "error",
    "mozilla/no-arbitrary-setTimeout": "error",
    "mozilla/no-comparison-or-assignment-inside-ok": "error",
    "mozilla/no-useless-run-test": "error",
    "no-shadow": "error",
    // Turn off no-unsanitized for tests, as we do want to be able to use
    // these for testing.
    "no-unsanitized/method": "off",
    "no-unsanitized/property": "off",
  },
};
