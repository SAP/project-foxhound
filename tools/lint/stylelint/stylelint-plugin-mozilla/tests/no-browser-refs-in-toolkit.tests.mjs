/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/PL/2.0/.
 */

// Bug 1948378: remove this exception when the eslint import plugin fully
// supports exports in package.json files
// eslint-disable-next-line import/no-unresolved
import { testRule } from "stylelint-test-rule-node";
import stylelint from "stylelint";
import noBrowserRefsInToolkit from "../rules/no-browser-refs-in-toolkit.mjs";

let plugin = stylelint.createPlugin(
  noBrowserRefsInToolkit.ruleName,
  noBrowserRefsInToolkit
);
let {
  ruleName,
  rule: { messages },
} = plugin;

testRule({
  plugins: [plugin],
  ruleName,
  config: [true],
  fix: false,
  accept: [
    // @import statements
    {
      code: '@import "chrome://global/skin/global.css";',
      description: "Using chrome://global is valid.",
    },
    {
      code: '@import url("chrome://global/skin/global.css");',
      description: "Using chrome://global with url function is valid.",
    },
    {
      code: '@import "close-icon.css";',
      description: "Using relative path is valid.",
    },
    {
      code: '@import url("close-icon.css");',
      description: "Using relative path with url function is valid.",
    },
    {
      code: '@import "resource://content-accessible/viewsource.css";',
      description: "Using non-app resource is valid.",
    },
    {
      code: '@import url("resource://content-accessible/viewsource.css");',
      description: "Using non-app resource with url function is valid.",
    },
    // property values
    {
      code: 'a { background: url("chrome://global/skin/global.css"); }',
      description: "Using chrome://global in property value is valid.",
    },
    {
      code: 'a { background: url("close-icon.svg"); }',
      description: "Using relative path in property value is valid.",
    },
  ],

  reject: [
    // @import statements
    {
      code: '@import "chrome://browser/skin/browser-colors.css";',
      message: messages.rejected("chrome://browser/skin/browser-colors.css"),
      description: "Using chrome://browser import should be flagged.",
    },
    {
      code: '@import url("chrome://browser/skin/browser-colors.css");',
      message: messages.rejected("chrome://browser/skin/browser-colors.css"),
      description:
        "Using chrome://browser import with url function should be flagged.",
    },
    {
      code: '@import "resource:///modules/testfile.css";',
      message: messages.rejected("resource:///modules/testfile.css"),
      description: "Using resource:/// import should be flagged.",
    },
    {
      code: '@import url("resource:///modules/testfile.css");',
      message: messages.rejected("resource:///modules/testfile.css"),
      description:
        "Using resource:/// import with url function should be flagged.",
    },
    {
      code: '@import "resource://app/modules/testfile.css";',
      message: messages.rejected("resource://app/modules/testfile.css"),
      description: "Using resource://app/ import should be flagged.",
    },
    {
      code: '@import url("resource://app/modules/testfile.css");',
      message: messages.rejected("resource://app/modules/testfile.css"),
      description:
        "Using resource://app/ import with url function should be flagged.",
    },
    {
      code: '@import "moz-src:///browser/testfile.css";',
      message: messages.rejected("moz-src:///browser/testfile.css"),
      description: "Using moz-src browser path should be flagged.",
    },
    {
      code: '@import url("moz-src:///browser/testfile.css");',
      message: messages.rejected("moz-src:///browser/testfile.css"),
      description:
        "Using moz-src browser path with url function should be flagged.",
    },
    {
      code: "background: url(chrome://browser/skin/notification-fill-12.svg) no-repeat center;",
      message: messages.rejected(
        "chrome://browser/skin/notification-fill-12.svg"
      ),
      description:
        "Using chrome://browser in property value should be flagged.",
    },
    // property values
    {
      code: 'a { background: url("chrome://browser/skin/browser-colors.css"); }',
      message: messages.rejected("chrome://browser/skin/browser-colors.css"),
      description:
        "Using chrome://browser with quotes in property value should be flagged.",
    },
    {
      code: "a { background: url(moz-src:///browser/testfile.svg); }",
      message: messages.rejected("moz-src:///browser/testfile.svg"),
      description:
        "Using moz-src browser path in property value should be flagged.",
    },
    {
      code: 'a { background: url("moz-src:///browser/testfile.svg"); }',
      message: messages.rejected("moz-src:///browser/testfile.svg"),
      description:
        "Using moz-src browser path with quotes in property value should be flagged.",
    },
    {
      code: 'background-image: url("moz-src://foo/browser/testfile.svg");',
      message: messages.rejected("moz-src://foo/browser/testfile.svg"),
      description:
        "Using moz-src browser path in property value should be flagged.",
    },
  ],
});
