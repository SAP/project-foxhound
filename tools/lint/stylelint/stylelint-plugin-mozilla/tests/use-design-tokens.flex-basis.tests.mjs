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
      code: ".layout { flex-basis: inherit; }",
      description: "Using the inherit keyword is valid.",
    },
    {
      code: ".layout { flex-basis: initial; }",
      description: "Using the initial keyword is valid.",
    },
    {
      code: ".layout { flex-basis: revert; }",
      description: "Using the revert keyword is valid.",
    },
    {
      code: ".layout { flex-basis: revert-layer; }",
      description: "Using the revert-layer keyword is valid.",
    },
    {
      code: ".layout { flex-basis: unset; }",
      description: "Using the unset keyword is valid.",
    },
    {
      code: ".layout { flex-basis: auto; }",
      description: "Using common values is valid.",
    },
    {
      code: ".layout { flex-basis: fit-content; }",
      description: "Using common values is valid.",
    },
    {
      code: ".layout { flex-basis: max-content; }",
      description: "Using common values is valid.",
    },
    {
      code: ".layout { flex-basis: max-content; }",
      description: "Using common values is valid.",
    },
    {
      code: ".layout { flex-basis: 50%; }",
      description: "Using percent values is valid.",
    },
    {
      code: ".layout { flex-basis: var(--size-item-large); }",
      description: "Using size tokens is valid.",
    },
    {
      code: ".layout { flex-basis: var(--icon-size-large); }",
      description: "Using icon size tokens is valid.",
    },
  ],
  reject: [
    {
      code: ".layout { flex-basis: var(--space-medium); }",
      message: messages.rejected("var(--space-medium)", ["size", "icon-size"]),
      description: "Space tokens should not be used for flex shorthand.",
    },
    {
      code: ".layout { flex-basis: 200px; }",
      message: messages.rejected("200px", ["size", "icon-size"]),
      description: "Pixel values should not be used for flex shorthand.",
    },
    {
      code: ".layout { flex-basis: 30ch; }",
      message: messages.rejected("30ch", ["size", "icon-size"]),
      description: "ch values should not be used for flex shorthand.",
    },
    {
      code: ".layout { flex-basis: 10em; }",
      message: messages.rejected("10em", ["size", "icon-size"]),
      description: "em values should not be used for flex shorthand.",
    },
    {
      code: ".layout { flex-basis: 10rem; }",
      message: messages.rejected("10rem", ["size", "icon-size"]),
      description: "rem values should not be used for flex shorthand.",
    },
    {
      code: ".layout { flex-basis: 50vw; }",
      message: messages.rejected("50vw", ["size", "icon-size"]),
      description: "vw values should not be used for flex shorthand.",
    },
  ],
});
