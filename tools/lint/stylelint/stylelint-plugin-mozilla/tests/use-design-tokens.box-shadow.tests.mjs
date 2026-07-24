/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
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
    // allowed token values
    {
      code: ".a { box-shadow: var(--box-shadow-card); }",
      description: "Using box-shadow-card token is valid.",
    },
    {
      code: ".a { box-shadow: var(--box-shadow-card-hover); }",
      description: "Using box-shadow-card-hover token is valid.",
    },
    {
      code: ".a { box-shadow: var(--box-shadow-level-1); }",
      description: "Using box-shadow-level-1 token is valid.",
    },
    {
      code: ".a { box-shadow: var(--box-shadow-level-2); }",
      description: "Using box-shadow-level-2 token is valid.",
    },
    {
      code: ".a { box-shadow: var(--box-shadow-level-2), var(--box-shadow-level-1); }",
      description: "Multiple shadows using tokens is allowed.",
    },
    {
      code: ".a { box-shadow: var(--box-shadow-level-3); }",
      description: "Using box-shadow-level-3 token is valid.",
    },
    {
      code: ".a { box-shadow: var(--box-shadow-level-4); }",
      description: "Using box-shadow-level-4 token is valid.",
    },
    {
      code: ".a { box-shadow: var(--box-shadow-popup); }",
      description: "Using box-shadow-popup token is valid.",
    },
    {
      code: ".a { box-shadow: var(--box-shadow-tab); }",
      description: "Using box-shadow-tab token is valid.",
    },
    // allowed CSS values
    {
      code: ".a { box-shadow: inherit; }",
      description: "Using inherit is valid.",
    },
    {
      code: ".a { box-shadow: initial; }",
      description: "Using initial is valid.",
    },
    {
      code: ".a { box-shadow: revert; }",
      description: "Using revert is valid.",
    },
    {
      code: ".a { box-shadow: revert-layer; }",
      description: "Using revert-layer is valid.",
    },
    {
      code: ".a { box-shadow: unset; }",
      description: "Using unset is valid.",
    },
    {
      code: ".a { box-shadow: none; }",
      description: "Using none keyword is valid.",
    },
    // fallbacks and custom properties
    {
      code: ".a { box-shadow:var(--my-local, var(--box-shadow-level-1)); }",
      description:
        "Using a custom property with fallback to design token is valid.",
    },
    {
      code: `
        :root { --custom-token: var(--box-shadow-card); }
        .a { box-shadow: var(--custom-token); }
      `,
      description:
        "Using a custom property with fallback to a design token is valid.",
    },
  ],

  reject: [
    {
      code: ".a { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }",
      message: messages.rejected("0 1px 3px rgba(0, 0, 0, 0.12)", [
        "box-shadow",
      ]),
      description: "Using hardcoded box-shadow should use a design token.",
    },
    {
      code: ".a { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24); }",
      message: messages.rejected(
        "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
        ["box-shadow"]
      ),
      description: "Using multiple box-shadows should use a design token.",
    },
    {
      code: ".a { box-shadow: calc(var(--my-local) + 1px) 2px 4px rgba(0, 0, 0, 0.1); }",
      message: messages.rejected(
        "calc(var(--my-local) + 1px) 2px 4px rgba(0, 0, 0, 0.1)",
        ["box-shadow"]
      ),
      description:
        "Using a calc() with custom variables should use a design token.",
    },
    {
      code: ".a { box-shadow: var(--random-token, 0 2px 4px rgba(0, 0, 0, 0.1)); }",
      message: messages.rejected(
        "var(--random-token, 0 2px 4px rgba(0, 0, 0, 0.1))",
        ["box-shadow"]
      ),
      description: "Using a custom property should use a design token.",
    },
    {
      code: `
        :root { --custom-token: 0 2px 4px rgba(0, 0, 0, 0.1); }
        .a { box-shadow: var(--custom-token); }
      `,
      message: messages.rejected("var(--custom-token)", ["box-shadow"]),
      description:
        "Using a custom property that does not resolve to a design token should use a design token.",
    },
    {
      code: `
        :root { --custom-token: 0 2px 4px rgba(0, 0, 0, 0.1); }
        .a { box-shadow: var(--custom-token), var(--box-shadow-level-1); }
      `,
      message: messages.rejected(
        "var(--custom-token), var(--box-shadow-level-1)",
        ["box-shadow"]
      ),
      description: "All shadows must use a design token (invalid first)",
    },
    {
      code: `
        :root { --custom-token: 0 2px 4px rgba(0, 0, 0, 0.1); }
        .a { box-shadow: var(--box-shadow-level-1), var(--custom-token); }
      `,
      message: messages.rejected(
        "var(--box-shadow-level-1), var(--custom-token)",
        ["box-shadow"]
      ),
      description: "All shadows must use a design token (invalid second)",
    },
  ],
});
