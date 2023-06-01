/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

var rule = require("../lib/rules/reject-chromeutils-import-params");
var RuleTester = require("eslint").RuleTester;

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 8 } });

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

function invalidError(suggested) {
  return [
    {
      message: "ChromeUtils.import only takes one argument.",
      type: "CallExpression",
      suggestions: [
        {
          desc: "Remove the unnecessary parameters.",
          output: suggested,
        },
      ],
    },
  ];
}

ruleTester.run("reject-chromeutils-import-params", rule, {
  valid: ['ChromeUtils.import("resource://some/path/to/My.jsm")'],
  invalid: [
    {
      code: 'ChromeUtils.import("resource://some/path/to/My.jsm", null)',
      errors: invalidError(
        `ChromeUtils.import("resource://some/path/to/My.jsm")`
      ),
    },
    {
      code: `
ChromeUtils.import(
  "resource://some/path/to/My.jsm",
  null
);`,
      errors: invalidError(`
ChromeUtils.import(
  "resource://some/path/to/My.jsm"
);`),
    },
    {
      code: 'ChromeUtils.import("resource://some/path/to/My.jsm", this)',
      errors: invalidError(
        `ChromeUtils.import("resource://some/path/to/My.jsm")`
      ),
    },
    {
      code: 'ChromeUtils.import("resource://some/path/to/My.jsm", foo, bar)',
      errors: invalidError(
        `ChromeUtils.import("resource://some/path/to/My.jsm")`
      ),
    },
  ],
});
