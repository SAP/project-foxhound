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
      code: ".a { border-radius: var(--border-radius-small); }",
      description: "Using small border-radius token is valid.",
    },
    {
      code: ".a { border-radius: var(--border-radius-medium); }",
      description: "Using medium border-radius token is valid.",
    },
    {
      code: ".a { border-radius: var(--border-radius-large); }",
      description: "Using large border-radius token is valid.",
    },
    {
      code: ".a { border-radius: var(--border-radius-small) var(--border-radius-medium) var(--border-radius-large) var(--border-radius-circle); }",
      description: "Using shorthand with tokens is valid.",
    },
    {
      code: ".a { border-radius: 0 var(--border-radius-circle); }",
      description: "Using shorthand with allowed values and tokens is valid.",
    },
    {
      code: ".a { border-radius: var(--border-radius-circle); }",
      description: "Using circle border-radius token is valid.",
    },
    {
      code: ":root { --custom-radius: var(--border-radius-circle); }",
      description: "Defining a custom variable with a token is valid.",
    },
    {
      code: `
        :root { --local-radius: var(--border-radius-small); }
        .a { border-radius: var(--local-radius); }
      `,
      description:
        "Using a locally declared custom property that resolves to a design token is valid.",
    },
    {
      code: ".a { border-radius: var(--my-local, var(--border-radius-circle)); }",
      description:
        "Using a custom property with fallback to design token is valid.",
    },
    // allowed primitive/keyword values
    {
      code: ".a { border-radius: 0; }",
      description: "Using 0 is allowed.",
    },
    {
      code: ".a { border-radius: initial; }",
      description: "Using initial is allowed.",
    },
    {
      code: ".a { border-radius: unset; }",
      description: "Using unset is allowed.",
    },
    {
      code: ".a { border-radius: inherit; }",
      description: "Using inherit is allowed.",
    },
  ],
  reject: [
    {
      code: ".a { border-radius: 2px; }",
      message: messages.rejected(
        "2px",
        ["border-radius"],
        "var(--border-radius-xsmall)"
      ),
      description: "Using a pixel value should use a design token.",
    },
    {
      code: ".a { border-radius: 1rem; }",
      message: messages.rejected("1rem", ["border-radius"]),
      description: "Using a rem value should use a design token.",
    },
    {
      code: ".a { border-radius: 50%; }",
      message: messages.rejected(
        "50%",
        ["border-radius"],
        "var(--border-radius-circle)"
      ),
      description: "Using a percentage value should use a design token.",
    },
    {
      code: ".a { border-radius: 2px 4px; }",
      message: messages.rejected(
        "2px 4px",
        ["border-radius"],
        "var(--border-radius-xsmall) var(--border-radius-small)"
      ),
      description:
        "Using shorthand with non-token values should use design tokens.",
    },
    {
      code: ".a { border-radius: 2px var(--border-radius-small); }",
      message: messages.rejected(
        "2px var(--border-radius-small)",
        ["border-radius"],
        "var(--border-radius-xsmall) var(--border-radius-small)"
      ),
      description:
        "Using a disallowed value in a shorthand value should use a design token.",
    },
    {
      code: ".a { border-radius: var(--border-radius-small) 2px; }",
      message: messages.rejected(
        "var(--border-radius-small) 2px",
        ["border-radius"],
        "var(--border-radius-small) var(--border-radius-xsmall)"
      ),
      description:
        "Using a disallowed value in a shorthand value should use a design token regardless of order.",
    },
    {
      code: ".a { border-radius: var(--invalid-radius); }",
      message: messages.rejected("var(--invalid-radius)", ["border-radius"]),
      description: "Using a custom variable should use a design token.",
    },
    {
      code: ".a { border-radius: calc(var(--tab-border-radius) + 4px); }",
      message: messages.rejected(
        "calc(var(--tab-border-radius) + 4px)",
        ["border-radius"],
        "calc(var(--tab-border-radius) + var(--border-radius-small))"
      ),
      description:
        "Using calc() with custom variables should use design tokens.",
    },
    {
      code: ".a { border-radius: env(-moz-gtk-csd-titlebar-radius); }",
      message: messages.rejected("env(-moz-gtk-csd-titlebar-radius)", [
        "border-radius",
      ]),
      description: "Using env() function should use design tokens.",
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
      code: ".a { border-radius: 50%; }",
      fixed: ".a { border-radius: var(--border-radius-circle); }",
      message: messages.rejected(
        "50%",
        ["border-radius"],
        "var(--border-radius-circle)"
      ),
      description: "Percentage value should be fixed to use design token.",
    },
    {
      code: ".a { border-radius: 100%; }",
      fixed: ".a { border-radius: var(--border-radius-circle); }",
      message: messages.rejected(
        "100%",
        ["border-radius"],
        "var(--border-radius-circle)"
      ),
      description: "100% value should be fixed to use design token.",
    },
    {
      code: ".a { border-radius: 1000px; }",
      fixed: ".a { border-radius: var(--border-radius-circle); }",
      message: messages.rejected(
        "1000px",
        ["border-radius"],
        "var(--border-radius-circle)"
      ),
      description: "1000px value should be fixed to use design token.",
    },
    {
      code: ".a { border-radius: 9999px; }",
      fixed: ".a { border-radius: var(--border-radius-circle); }",
      message: messages.rejected(
        "9999px",
        ["border-radius"],
        "var(--border-radius-circle)"
      ),
      description: "9999px value should be fixed to use design token.",
    },
    {
      code: ".a { border-radius: 4px; }",
      fixed: ".a { border-radius: var(--border-radius-small); }",
      message: messages.rejected(
        "4px",
        ["border-radius"],
        "var(--border-radius-small)"
      ),
      description: "4px should be fixed to use --border-radius-small token.",
    },
    {
      code: ".a { border-radius: 8px; }",
      fixed: ".a { border-radius: var(--border-radius-medium); }",
      message: messages.rejected(
        "8px",
        ["border-radius"],
        "var(--border-radius-medium)"
      ),
      description: "8px should be fixed to use --border-radius-medium token.",
    },
    {
      code: ".a { border-radius: 16px; }",
      fixed: ".a { border-radius: var(--border-radius-large); }",
      message: messages.rejected(
        "16px",
        ["border-radius"],
        "var(--border-radius-large)"
      ),
      description: "16px should be fixed to use --border-radius-large token.",
    },
    {
      code: ".a { border-radius: 4px 8px; }",
      fixed:
        ".a { border-radius: var(--border-radius-small) var(--border-radius-medium); }",
      message: messages.rejected(
        "4px 8px",
        ["border-radius"],
        "var(--border-radius-small) var(--border-radius-medium)"
      ),
      description: "Shorthand values should be fixed to use design tokens.",
    },
    {
      code: ".a { border-radius: 0 4px 8px; }",
      fixed:
        ".a { border-radius: 0 var(--border-radius-small) var(--border-radius-medium); }",
      message: messages.rejected(
        "0 4px 8px",
        ["border-radius"],
        "0 var(--border-radius-small) var(--border-radius-medium)"
      ),
      description:
        "Mixed shorthand values should be fixed to use design tokens where possible.",
    },
    {
      code: ".a { border-radius: var(--my-local, 4px); }",
      fixed:
        ".a { border-radius: var(--my-local, var(--border-radius-small)); }",
      message: messages.rejected(
        "var(--my-local, 4px)",
        ["border-radius"],
        "var(--my-local, var(--border-radius-small))"
      ),
      description:
        "custom property with fallback should be fixed to use design token.",
    },
  ],
});
