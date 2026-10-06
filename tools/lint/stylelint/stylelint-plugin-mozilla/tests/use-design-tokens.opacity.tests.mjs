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
      code: ".a { opacity: 0; }",
      description: "Using 0 for opacity is valid.",
    },
    {
      code: ".a { opacity: 1; }",
      description: "Using 1 for opacity is valid.",
    },
    {
      code: ".a { opacity: var(--opacity-deemphasized); }",
      description: "Using opacity-deemphasized token for opacity is valid.",
    },
    {
      code: ".a { opacity: var(--opacity-deemphasized-strong); }",
      description:
        "Using opacity-deemphasized-strong token for opacity is valid.",
    },
    {
      code: ".a { opacity: var(--button-opacity-disabled); }",
      description: "Using button-opacity-disabled token for opacity is valid.",
    },
    {
      code: `
        :root { --local-opacity: 0; }
        .a { opacity: var(--local-opacity); }
      `,
      description:
        "Using locally defined variable that falls back to 0 is valid.",
    },
    {
      code: ".a { opacity: inherit; }",
      description: "Using inherit for opacity is valid.",
    },
    {
      code: ".a { opacity: initial; }",
      description: "Using initial for opacity is valid.",
    },
    {
      code: ".a { opacity: unset; }",
      description: "Using unset for opacity is valid.",
    },
  ],
  reject: [
    {
      code: ".a { opacity: 0.5; }",
      message: messages.rejected("0.5", ["opacity"]),
      description: "hard-coded value should use an opacity design token.",
    },
    {
      code: ".a { opacity: var(--random-token, 0.4); }",
      message: messages.rejected("var(--random-token, 0.4)", ["opacity"]),
      description:
        "non-token var that is not defined locally should use an opacity design token.",
    },
    {
      code: `
        :root { --custom-token: 0.8; }
        .a { opacity: var(--custom-token); }
      `,
      message: messages.rejected("var(--custom-token)", ["opacity"]),
      description:
        "Custom local variable resolving to hard-coded value should use an opacity design token.",
    },
  ],
});
