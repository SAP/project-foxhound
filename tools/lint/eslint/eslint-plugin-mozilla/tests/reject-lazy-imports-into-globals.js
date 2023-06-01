/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

var rule = require("../lib/rules/reject-lazy-imports-into-globals");
var RuleTester = require("eslint").RuleTester;

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 13, sourceType: "module" },
});

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

function invalidCode(code) {
  return { code, errors: [{ messageId: "rejectLazyImportsIntoGlobals" }] };
}

ruleTester.run("reject-lazy-imports-into-globals", rule, {
  valid: [
    `
      const lazy = {};
      XPCOMUtils.defineLazyGetter(lazy, "foo", () => {});
    `,
  ],
  invalid: [
    invalidCode(`XPCOMUtils.defineLazyGetter(globalThis, "foo", () => {});`),
    invalidCode(`XPCOMUtils.defineLazyGetter(window, "foo", () => {});`),
    invalidCode(
      `XPCOMUtils.defineLazyModuleGetter(globalThis, "foo", "foo.jsm");`
    ),
    invalidCode(`XPCOMUtils.defineLazyModuleGetter(window, "foo", "foo.jsm");`),
    invalidCode(
      `XPCOMUtils.defineLazyPreferenceGetter(globalThis, "foo", "foo.bar");`
    ),
    invalidCode(
      `XPCOMUtils.defineLazyServiceGetter(globalThis, "foo", "@foo", "nsIFoo");`
    ),
    invalidCode(`XPCOMUtils.defineLazyGlobalGetters(globalThis, {});`),
    invalidCode(`XPCOMUtils.defineLazyGlobalGetters(window, {});`),
    invalidCode(`XPCOMUtils.defineLazyModuleGetters(globalThis, {});`),
    invalidCode(`ChromeUtils.defineESModuleGetters(window, {});`),
  ],
});
