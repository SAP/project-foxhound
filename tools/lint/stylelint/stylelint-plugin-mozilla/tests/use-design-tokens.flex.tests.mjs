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
import useDesignTokens from "../rules/use-design-tokens.mjs";

let plugin = stylelint.createPlugin(useDesignTokens.ruleName, useDesignTokens);
let {
  ruleName,
  rule: { messages },
} = plugin;

testRule({
  plugins: [plugin],
  ruleName,
  config: true,
  fix: false,
  accept: [
    {
      code: ".layout { flex: inherit; }",
      description: "Using the inherit keyword is valid.",
    },
    {
      code: ".layout { flex: initial; }",
      description: "Using the initial keyword is valid.",
    },
    {
      code: ".layout { flex: revert; }",
      description: "Using the revert keyword is valid.",
    },
    {
      code: ".layout { flex: revert-layer; }",
      description: "Using the revert-layer keyword is valid.",
    },
    {
      code: ".layout { flex: unset; }",
      description: "Using the unset keyword is valid.",
    },
    {
      code: ".layout { flex: 1 0 auto; }",
      description: "Using common values is valid.",
    },
    {
      code: ".layout { flex: 2 3 fit-content; }",
      description: "Using common values is valid.",
    },
    {
      code: ".layout { flex: 4 100 max-content; }",
      description: "Using common values is valid.",
    },
    {
      code: ".layout { flex: 1000 10000 max-content; }",
      description: "Using common values is valid.",
    },
    {
      code: ".layout { flex: 1 1 50%; }",
      description: "Using percent values is valid.",
    },
    {
      code: ".layout { flex: 1 1 var(--size-item-large); }",
      description: "Using size tokens is valid.",
    },
    {
      code: ".layout { flex: 1 1 var(--icon-size-large); }",
      description: "Using icon size tokens is valid.",
    },
  ],
  reject: [
    {
      code: ".layout { flex: 1 0 var(--space-medium); }",
      message: messages.rejected("1 0 var(--space-medium)", [
        "size",
        "icon-size",
      ]),
      description: "Space tokens should not be used for flex shorthand.",
    },
    {
      code: ".layout { flex: 1 0 200px; }",
      message: messages.rejected("1 0 200px", ["size", "icon-size"]),
      description: "Pixel values should not be used for flex shorthand.",
    },
    {
      code: ".layout { flex: 1 0 30ch; }",
      message: messages.rejected("1 0 30ch", ["size", "icon-size"]),
      description: "ch values should not be used for flex shorthand.",
    },
    {
      code: ".layout { flex: 1 0 10em; }",
      message: messages.rejected("1 0 10em", ["size", "icon-size"]),
      description: "em values should not be used for flex shorthand.",
    },
    {
      code: ".layout { flex: 1 0 10rem; }",
      message: messages.rejected("1 0 10rem", ["size", "icon-size"]),
      description: "rem values should not be used for flex shorthand.",
    },
    {
      code: ".layout { flex: 1 0 50vw; }",
      message: messages.rejected("1 0 50vw", ["size", "icon-size"]),
      description: "vw values should not be used for flex shorthand.",
    },
  ],
});
