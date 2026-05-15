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
    {
      code: ".a { font-weight: normal; }",
      description: "Using the normal keyword is valid.",
    },
    {
      code: ".a { font-weight: normal; }",
      description: "Using the normal keyword is valid.",
    },
    {
      code: ".a { font-weight: var(--font-weight); }",
      description: "Using font-weight token is valid.",
    },
    {
      code: ".a { font-weight: var(--font-weight-semibold); }",
      description: "Using font-weight-semibold token is valid.",
    },
    {
      code: ".a { font-weight: var(--font-weight-bold); }",
      description: "Using font-weight-bold token is valid.",
    },
    {
      code: ".a { font-weight: var(--button-font-weight); }",
      description: "Using button-font-weight token is valid.",
    },
    {
      code: ".a { font-weight: var(--heading-font-weight); }",
      description: "Using heading-font-weight token is valid.",
    },
    {
      code: ".a { font-weight: inherit; }",
      description: "Using inherit is valid.",
    },
    {
      code: ".a { font-weight: initial; }",
      description: "Using initial is valid.",
    },
    {
      code: ".a { font-weight: unset; }",
      description: "Using unset is valid.",
    },
    {
      code: ".a { font-weight:var(--my-local, var(--font-weight-semibold)); }",
      description:
        "Using a custom property with fallback to design token is valid.",
    },
    {
      code: `
        :root { --custom-token: var(--font-weight-semibold); }
        .a { font-weight: var(--custom-token); }
      `,
      description:
        "Using a custom property with fallback to a design token is valid.",
    },
    {
      code: `
        :root { --custom-token: normal; }
        .a { font-weight: var(--custom-token); }
      `,
      description:
        "Using a custom property with fallback to the normal keyword is valid.",
    },
  ],

  reject: [
    {
      code: ".a { font-weight: bold; }",
      message: messages.rejected(
        "bold",
        ["font-weight"],
        "var(--font-weight-bold)"
      ),
      description: "Using bold keyword should use a design token.",
    },
    {
      code: ".a { font-weight: bolder; }",
      message: messages.rejected(
        "bolder",
        ["font-weight"],
        "var(--font-weight-bold)"
      ),
      description: "Using bolder keyword should use a design token.",
    },
    {
      code: ".a { font-weight: 100; }",
      message: messages.rejected("100", ["font-weight"]),
      description: "Using a numeric value should use a design token.",
    },
    {
      code: ".a { font-weight: 200; }",
      message: messages.rejected("200", ["font-weight"], "normal"),
      description: "Using a numeric value should use a design token.",
    },
    {
      code: ".a { font-weight: 300; }",
      message: messages.rejected("300", ["font-weight"], "normal"),
      description: "Using a numeric value should use a design token.",
    },
    {
      code: ".a { font-weight: 400; }",
      message: messages.rejected("400", ["font-weight"], "normal"),
      description: "Using a numeric value should use a design token.",
    },
    {
      code: ".a { font-weight: 500; }",
      message: messages.rejected(
        "500",
        ["font-weight"],
        "var(--font-weight-semibold)"
      ),
      description: "Using a numeric value should use a design token.",
    },
    {
      code: ".a { font-weight: 600; }",
      message: messages.rejected(
        "600",
        ["font-weight"],
        "var(--font-weight-semibold)"
      ),
      description: "Using a numeric value should use a design token.",
    },
    {
      code: ".a { font-weight: 700; }",
      message: messages.rejected(
        "700",
        ["font-weight"],
        "var(--font-weight-bold)"
      ),
      description: "Using a numeric value should use a design token.",
    },
    {
      code: ".a { font-weight: 800; }",
      message: messages.rejected(
        "800",
        ["font-weight"],
        "var(--font-weight-bold)"
      ),
      description: "Using a numeric value should use a design token.",
    },
    {
      code: ".a { font-weight: 900; }",
      message: messages.rejected("900", ["font-weight"]),
      description: "Using a numeric value should use a design token.",
    },
    {
      code: ".a { font-weight: calc(var(--my-local) + 100); }",
      message: messages.rejected("calc(var(--my-local) + 100)", [
        "font-weight",
      ]),
      description:
        "Using a calc() with custom variables should use a design token.",
    },
    {
      code: ".a { font-weight: var(--random-token, 600); }",
      message: messages.rejected(
        "var(--random-token, 600)",
        ["font-weight"],
        "var(--random-token, var(--font-weight-semibold))"
      ),
      description: "Using a custom property should use a design token.",
    },
    {
      code: `
        :root { --custom-token: 600; }
        .a { font-weight: var(--custom-token); }
      `,
      message: messages.rejected("var(--custom-token)", ["font-weight"]),
      description:
        "Using a custom property that does not resolve to a design token should use a design token.",
    },
  ],
});

testRule({
  plugins: [plugin],
  ruleName,
  config: true,
  fix: true,
  reject: [
    {
      code: ".a { font-weight: 600; }",
      fixed: ".a { font-weight: var(--font-weight-semibold); }",
      message: messages.rejected(
        "600",
        ["font-weight"],
        "var(--font-weight-semibold)"
      ),
      description: "Numeric value should be fixed to use design token.",
    },
    {
      code: ".a { font-weight: 700; }",
      fixed: ".a { font-weight: var(--font-weight-bold); }",
      message: messages.rejected(
        "700",
        ["font-weight"],
        "var(--font-weight-bold)"
      ),
      description: "Numeric value should be fixed to use design token.",
    },
    {
      code: ".a { font-weight: 200; }",
      fixed: ".a { font-weight: normal; }",
      message: messages.rejected("200", ["font-weight"], "normal"),
      description:
        "Numeric values less than or equal to 400 should be fixed to use normal.",
    },
    {
      code: ".a { font-weight: 300; }",
      fixed: ".a { font-weight: normal; }",
      message: messages.rejected("300", ["font-weight"], "normal"),
      description:
        "Numeric values less than or equal to 400 should be fixed to use normal.",
    },
    {
      code: ".a { font-weight: 400; }",
      fixed: ".a { font-weight: normal; }",
      message: messages.rejected("400", ["font-weight"], "normal"),
      description:
        "Numeric values less than or equal to 400 should be fixed to use normal.",
    },
    {
      code: ".a { font-weight: lighter; }",
      fixed: ".a { font-weight: normal; }",
      message: messages.rejected("lighter", ["font-weight"], "normal"),
      description: "The lighter keyword should be fixed to use normal.",
    },
    {
      code: ".a { font-weight: 500; }",
      fixed: ".a { font-weight: var(--font-weight-semibold); }",
      message: messages.rejected(
        "500",
        ["font-weight"],
        "var(--font-weight-semibold)"
      ),
      description:
        "Numeric values between 500 and 600 should be fixed to use the semibold font-weight token.",
    },
    {
      code: ".a { font-weight: 510; }",
      fixed: ".a { font-weight: var(--font-weight-semibold); }",
      message: messages.rejected(
        "510",
        ["font-weight"],
        "var(--font-weight-semibold)"
      ),
      description:
        "Numeric values between 500 and 600 should be fixed to use the semibold font-weight token.",
    },
    {
      code: ".a { font-weight: 800; }",
      fixed: ".a { font-weight: var(--font-weight-bold); }",
      message: messages.rejected(
        "800",
        ["font-weight"],
        "var(--font-weight-bold)"
      ),
      description:
        "Numeric values greater than 700 should be fixed to use the bold font-weight token.",
    },
    {
      code: ".a { font-weight: bold; }",
      fixed: ".a { font-weight: var(--font-weight-bold); }",
      message: messages.rejected(
        "bold",
        ["font-weight"],
        "var(--font-weight-bold)"
      ),
      description:
        "The bold keyword should be fixed to use the bold font-weight token.",
    },
    {
      code: ".a { font-weight: bolder; }",
      fixed: ".a { font-weight: var(--font-weight-bold); }",
      message: messages.rejected(
        "bolder",
        ["font-weight"],
        "var(--font-weight-bold)"
      ),
      description:
        "The bolder keyword should be fixed to use the bold font-weight token.",
    },
  ],
});
