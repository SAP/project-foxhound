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
      code: ".icon { stroke: none; }",
      description: "Using the none keyword is valid.",
    },
    {
      code: ".icon { stroke: currentColor; }",
      description: "Using the currentColor keyword is valid.",
    },
    {
      code: ".icon { stroke: context-stroke; }",
      description: "Using the context-stroke keyword is valid.",
    },
    {
      code: ".icon { stroke: inherit; }",
      description: "Using the inherit keyword is valid.",
    },
    {
      code: ".icon { stroke: initial; }",
      description: "Using the initial keyword is valid.",
    },
    {
      code: ".icon { stroke: revert; }",
      description: "Using the revert keyword is valid.",
    },
    {
      code: ".icon { stroke: revert-layer; }",
      description: "Using the revert-layer keyword is valid.",
    },
    {
      code: ".icon { stroke: unset; }",
      description: "Using the unset keyword is valid.",
    },
    {
      code: ".icon { fill: var(--icon-color); }",
      description: "Using an icon-color token is valid.",
    },
    {
      code: `
        :root { --custom-color: var(--button-background-color); }
        .icon { fill: var(--custom-color); }`,
      description:
        "Using a local variable that maps to a background-color token is valid.",
    },
    {
      code: `
        :root { --custom-color: var(--link-color); }
        .icon { fill: var(--custom-color); }`,
      description:
        "Using a local variable that maps to a text-color token is valid.",
    },
    {
      code: `
        :root { --custom-color: var(--border-color); }
        .icon { fill: var(--custom-color); }`,
      description:
        "Using a local variable that maps to a border-color token is valid.",
    },
    {
      code: ".icon { fill: url('image.png'); }",
      description: "Using an image url is valid.",
    },
    {
      code: ".icon { fill: url('image.png') var(--icon-color-success); }",
      description: "Using an image url with a fallback is valid.",
    },
  ],
  reject: [
    {
      code: ".icon { stroke: #ccc; }",
      message: messages.rejected("#ccc", ["icon-color"]),
      description: "Hex codes should not be used for stroke.",
    },
    {
      code: ".icon { stroke: var(--color-gray-50); }",
      message: messages.rejected("var(--color-gray-50)", ["icon-color"]),
      description: "Base color tokens should not be used for stroke.",
    },
  ],
});
