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
      code: ".bg { background-position: top; }",
      description: "Using the top keyword is valid.",
    },
    {
      code: ".bg { background-position-y: bottom; }",
      description: "Using the bottom keyword is valid.",
    },
    {
      code: ".bg { background-position: left; }",
      description: "Using the left keyword is valid.",
    },
    {
      code: ".bg { background-position-x: right; }",
      description: "Using the right keyword is valid.",
    },
    {
      code: ".bg { background-position: center; }",
      description: "Using the center keyword is valid.",
    },
    {
      code: ".bg { background-position: top center; }",
      description: "Using multiple keywords is valid.",
    },
    {
      code: ".bg { background-position-x: inherit; }",
      description: "Using the inherit keyword is valid.",
    },
    {
      code: ".bg { background-position: initial; }",
      description: "Using the initial keyword is valid.",
    },
    {
      code: ".bg { background-position-y: revert; }",
      description: "Using the revert keyword is valid.",
    },
    {
      code: ".bg { background-position: revert-layer; }",
      description: "Using the revert-layer keyword is valid.",
    },
    {
      code: ".bg { background-position: unset; }",
      description: "Using the unset keyword is valid.",
    },
    {
      code: ".bg { background-position: 25% 75%; }",
      description: "Using percent values is valid.",
    },
    {
      code: ".bg { background-position: 0 0, center; }",
      description: "Positioning multiple images is valid.",
    },
  ],
  reject: [
    {
      code: ".bg { background-position: var(--icon-size-small); }",
      message: messages.rejected("var(--icon-size-small)", ["size", "space"]),
      description:
        "Icon size tokens should not be used for background-position.",
    },
    {
      code: ".bg { background-position: var(--border-width); }",
      message: messages.rejected("var(--border-width)", ["size", "space"]),
      description:
        "Other width-based tokens should not be used for background-position.",
    },
  ],
});
