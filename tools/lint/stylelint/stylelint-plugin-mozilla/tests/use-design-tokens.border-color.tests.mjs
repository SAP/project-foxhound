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
      code: ".a { border: 2px solid var(--border-color); }",
      description: "Using border token in border shorthand is valid.",
    },
    {
      code: ".a { border-color: var(--border-color); }",
      description: "Using border-color token is valid.",
    },
    {
      code: ".a { border-top: 2px solid var(--border-color); }",
      description: "Using border token in border-top is valid.",
    },
    {
      code: ".a { border-right: 2px solid var(--border-color); }",
      description: "Using border token in border-right is valid.",
    },
    {
      code: ".a { border-bottom: 2px solid var(--border-color); }",
      description: "Using border token in border-bottom is valid.",
    },
    {
      code: ".a { border-left: 2px solid var(--border-color); }",
      description: "Using border token in border-left is valid.",
    },
    {
      code: ".a { border-top-color: var(--border-color); }",
      description: "Using border token in border-top-color is valid.",
    },
    {
      code: ".a { border-right-color: var(--border-color); }",
      description: "Using border token in border-right-color is valid.",
    },
    {
      code: ".a { border-bottom-color: var(--border-color); }",
      description: "Using border token in border-bottom-color is valid.",
    },
    {
      code: ".a { border-left-color: var(--border-color); }",
      description: "Using border token in border-left-color is valid.",
    },
    {
      code: ".a { outline: 1px solid var(--border-color); }",
      description: "Using border token in outline shorthand is valid.",
    },
    {
      code: ".a { outline-color: var(--border-color); }",
      description: "Using border token in outline-color is valid.",
    },
    // allowed CSS values
    {
      code: ".a { border-color: currentColor; }",
      description: "Using currentColor is valid.",
    },
    {
      code: ".a { border-color: white; }",
      description: "Using white is valid.",
    },
    {
      code: ".a { border-color: black; }",
      description: "Using black is valid.",
    },
    {
      code: ".a { border: none; }",
      description: "Using none is valid.",
    },
    {
      code: ".a { border: 0; }",
      description: "Using 0 is valid.",
    },
    {
      code: ".a { border: 1px solid transparent; }",
      description: "Using transparent in shorthand is valid.",
    },
    {
      code: ".a { border-color: var(--border-color, var(--another-property)); }",
      description: "Using a fallback value with two tokens is valid.",
    },
    {
      code: ".a { border: 1px solid var(--border-color, transparent); }",
      description: "Using a fallback value with an allowed value is valid",
    },
    {
      code: ".a { border: 1px solid var(--border-color, #666); }",
      description: "Using a fallback value with an color value is valid",
    },
    {
      code: `
        :root { --custom-token: var(--border-color); }
        .a { border-color: var(--custom-token); }
      `,
      description: "Using a local custom property (in the same file) is valid.",
    },
    {
      code: `
        :root { --custom-token: var(--border-color); }
        .a { border: 1px solid var(--custom-token); }
      `,
      description:
        "Using a local custom property (in the same file) in shorthand is valid.",
    },
    {
      code: "outline: var(--focus-outline);",
      description: "Using a focus-outline token in outline is valid.",
    },
    {
      code: `
        :root { --custom-token: var(--border-width) solid var(--border-color); }
        .a { border: var(--custom-token); }
      `,
    },
    {
      code: ".a { border-color: oklch(from var(--border-color) l c h / 30%); }",
      description: "Using oklch() with valid colors is valid.",
    },
    {
      code: `
        :root { --custom-token: var(--color-red-70); }
        .a { border-color: var(--custom-token); }
      `,
      description:
        "Using a local custom property that resolves to base color token is valid.",
    },
    {
      code: `
        :root { --custom-token: var(--color-green-100); }
        .a { border: 1px solid var(--custom-token); }
      `,
      description:
        "Using a local custom property that resolves to base color token is valid.",
    },
    {
      code: `
        :root { --custom-token: oklch(from var(--color-red-70) l c h / 20%); }
        .a { border-color: var(--custom-token); }
      `,
      description:
        "Using a local custom property that resolves to an oklch function using a base color token is valid.",
    },
    {
      code: `
        :root { --custom-token: light-dark(var(--color-green-20), var(--color-green-100)); }
        .a { border: 1px solid var(--custom-token); }
      `,
      description:
        "Using a local custom property that resolves to a light-dark function using base color tokens is valid.",
    },
    {
      code: `
        :root { --custom-token: color-mix(in oklch, var(--color-red-70) 40%, transparent); }
        .a { border-color: var(--custom-token); }
      `,
      description:
        "Using a local custom property that resolves to a color-mix function using a base color token is valid.",
    },
    {
      code: `
        :root { --custom-token: var(--text-color); }
        .bg { border-color: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a text-color token is valid.",
    },
    {
      code: `
        :root { --custom-token: var(--button-background-color); }
        .bg { border-color: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a background-color token is valid.",
    },
    {
      code: `
        :root { --custom-token: ButtonBorder; }
        .bg { border-color: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a system color is valid.",
    },
    {
      code: `
        :root { --custom-token: ButtonText; }
        .bg { border-color: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a system color, even if non-semantic, is valid.",
    },
  ],

  reject: [
    {
      code: ".a { border-color: #666; }",
      message: messages.rejected("#666", ["border-color", "border", "outline"]),
      description: "#666 should use a border-color design token.",
    },
    {
      code: ".a { border: 2px solid #666; }",
      message: messages.rejected("2px solid #666", [
        "border-color",
        "border",
        "outline",
        "border-width",
      ]),
      description: "2px solid #666 should use a border-color design token.",
    },
    {
      code: ".a { border-color: oklch(69% 0.19 15); }",
      message: messages.rejected("oklch(69% 0.19 15)", [
        "border-color",
        "border",
        "outline",
      ]),
      description: "oklch(69% 0.19 15) should use a border-color design token.",
    },
    {
      code: ".a { border: 3px dashed oklch(42 42 42); }",
      message: messages.rejected("3px dashed oklch(42 42 42)", [
        "border-color",
        "border",
        "outline",
        "border-width",
      ]),
      description:
        "3px dashed oklch(42 42 42) should use a border-color design token.",
    },
    {
      code: ".a { border-color: rgba(42 42 42 / 0.15); }",
      message: messages.rejected("rgba(42 42 42 / 0.15)", [
        "border-color",
        "border",
        "outline",
      ]),
      description:
        "rgba(42 42 42 / 0.15) should use a border-color design token.",
    },
    {
      code: ".a { border-color: ButtonBorder; }",
      message: messages.warning("ButtonBorder", "var(--button-border-color)"),
      description:
        "ButtonBorder should use var(--button-border-color) instead.",
    },
    {
      code: ".a { border: 3px dashed rgba(42 42 42 / 0.15); }",
      message: messages.rejected("3px dashed rgba(42 42 42 / 0.15)", [
        "border-color",
        "border",
        "outline",
        "border-width",
      ]),
      description:
        "3px dashed rgba(42 42 42 / 0.15) should use a border-color design token.",
    },
    {
      code: ".a { border-top: 1px solid #666666; }",
      message: messages.rejected("1px solid #666666", [
        "border-color",
        "border",
        "outline",
        "border-width",
      ]),
      description: "1px solid #666666 should use a border-color design token.",
    },
    {
      code: ".a { border-top-color: rgb(10 20 30); }",
      message: messages.rejected("rgb(10 20 30)", [
        "border-color",
        "border",
        "outline",
      ]),
      description: "rgb(10 20 30) should use a border-color design token.",
    },
    {
      code: ".a { border-right: 4px dotted #666; }",
      message: messages.rejected("4px dotted #666", [
        "border-color",
        "border",
        "outline",
        "border-width",
      ]),
      description: "4px dotted #666 should use a border-color design token.",
    },
    {
      code: ".a { border-right-color: oklch(69% 0.19 15); }",
      message: messages.rejected("oklch(69% 0.19 15)", [
        "border-color",
        "border",
        "outline",
      ]),
      description: "oklch(69% 0.19 15) should use a border-color design token.",
    },
    {
      code: ".a { border-bottom: medium solid color-mix(in srgb, red, blue); }",
      message: messages.rejected("medium solid color-mix(in srgb, red, blue)", [
        "border-color",
        "border",
        "outline",
        "border-width",
      ]),
      description:
        "color-mix(in srgb, red, blue) should use a border-color design token.",
    },
    {
      code: ".a { border-bottom-color: oklch(69% 0.19 15); }",
      message: messages.rejected("oklch(69% 0.19 15)", [
        "border-color",
        "border",
        "outline",
      ]),
      description: "oklch(69% 0.19 15) should use a border-color design token.",
    },
    {
      code: ".a { border-left: thin double #191919; }",
      message: messages.rejected("thin double #191919", [
        "border-color",
        "border",
        "outline",
        "border-width",
      ]),
      description:
        "thin double #989898 should use a border-color design token.",
    },
    {
      code: ".a { border-left-color: oklch(69% 0.19 15); }",
      message: messages.rejected("oklch(69% 0.19 15)", [
        "border-color",
        "border",
        "outline",
      ]),
      description: "oklch(69% 0.19 15) should use a border-color design token.",
    },
    {
      code: ".a { outline: 2px solid #666; }",
      message: messages.rejected("2px solid #666", [
        "border-color",
        "border",
        "outline",
        "border-width",
      ]),
      description: "2px solid #616263 should use a border-color design token.",
    },
    {
      code: ".a { outline-color: rgba(0 0 0 / 0.25); }",
      message: messages.rejected("rgba(0 0 0 / 0.25)", [
        "border-color",
        "border",
        "outline",
      ]),
      description: "rgba(0 0 0 / 0.25) should use a border-color design token.",
    },
    {
      code: ".a { border: 1px solid var(--random-token, #666); }",
      message: messages.rejected("1px solid var(--random-token, #666)", [
        "border-color",
        "border",
        "outline",
        "border-width",
      ]),
      description:
        "1px solid var(--random-token, #666) should use a border-color design token.",
    },
    {
      code: ".a { border: 1px solid var(--random-token, var(--color-gray-50)); }",
      message: messages.rejected(
        "1px solid var(--random-token, var(--color-gray-50))",
        ["border-color", "border", "outline", "border-width"]
      ),
      description:
        "1px solid var(--random-token, var(--color-gray-50)) should use a border-color design token.",
    },
    {
      code: `
        :root { --custom-token: #666; }
        .a { border-color: var(--custom-token); }
      `,
      message: messages.rejected("var(--custom-token)", [
        "border-color",
        "border",
        "outline",
      ]),
      description:
        "var(--custom-token) should use a border-color design token.",
    },
    {
      code: `
        :root { --custom-token: #666; }
        .a { border-color: var(--random-token, var(--custom-token)); }
      `,
      message: messages.rejected("var(--random-token, var(--custom-token))", [
        "border-color",
        "border",
        "outline",
      ]),
      description:
        "var(--random-token, var(--custom-token)) should use a border-color design token.",
    },
    {
      code: ".a { border: 1px solid var(--color-gray-20); }",
      message: messages.rejected("1px solid var(--color-gray-20)", [
        "border-color",
        "border",
        "outline",
        "border-width",
      ]),
      description:
        "1px solid var(--color-gray-20) should use a border-color design token.",
    },
    {
      code: `
        :root { --custom-token: oklch(69% 0.19 15); }
        .a { border: 1px solid var(--custom-token); }
      `,
      message: messages.rejected("1px solid var(--custom-token)", [
        "border-color",
        "border",
        "outline",
        "border-width",
      ]),
      description:
        "1px solid var(--custom-token) should use a border-color design token.",
    },
    {
      code: ".a { border-color: FieldText; }",
      message: messages.rejected("FieldText", [
        "border-color",
        "border",
        "outline",
      ]),
      description: "FieldText should use a border-color design token.",
    },
    {
      code: ".a { border-color: ButtonBorder; }",
      message: messages.warning("ButtonBorder", "var(--button-border-color)"),
      description:
        "ButtonBorder should use var(--button-border-color) instead.",
    },
    {
      code: ".a { border: 1px solid color-mix(in oklch, var(--color-gray-20) 20%, transparent); }",
      message: messages.rejected(
        "1px solid color-mix(in oklch, var(--color-gray-20) 20%, transparent)",
        ["border-color", "border", "outline", "border-width"]
      ),
      description:
        "1px solid color-mix(in oklch, var(--color-gray-20) 20%, transparent) should use a border-color design token.",
    },
    {
      code: ".a { border-color: light-dark(var(--color-gray-20), var(--color-gray-80)); }",
      message: messages.rejected(
        "light-dark(var(--color-gray-20), var(--color-gray-80))",
        ["border-color", "border", "outline"]
      ),
      description:
        "light-dark(var(--color-gray-20), var(--color-gray-80)) should use a border-color design token.",
    },
    {
      code: ".a { border: 1px solid oklch(from var(--color-gray-20) l c h / 20%); }",
      message: messages.rejected(
        "1px solid oklch(from var(--color-gray-20) l c h / 20%)",
        ["border-color", "border", "outline", "border-width"]
      ),
      description:
        "1px solid oklch(from var(--color-gray-20) l c h / 20%) should use a border-color design token.",
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
      code: ".a { border-color: #fff; }",
      fixed: ".a { border-color: white; }",
      message: messages.rejected(
        "#fff",
        ["border-color", "border", "outline"],
        "white"
      ),
      description: "#fff should be fixed to white",
    },
    {
      code: ".a { border: 1px solid #ffffff; }",
      fixed: ".a { border: 1px solid white; }",
      message: messages.rejected(
        "1px solid #ffffff",
        ["border-color", "border", "outline", "border-width"],
        "1px solid white"
      ),
      description: "#ffffff should be fixed to white",
    },
    {
      code: ".a { outline-color: #FFF; }",
      fixed: ".a { outline-color: white; }",
      message: messages.rejected(
        "#FFF",
        ["border-color", "border", "outline"],
        "white"
      ),
      description: "#FFF should be fixed to white",
    },
    {
      code: ".a { border-left-color: #FFFFFF; }",
      fixed: ".a { border-left-color: white; }",
      message: messages.rejected(
        "#FFFFFF",
        ["border-color", "border", "outline"],
        "white"
      ),
      description: "#FFFFFF should be fixed to white",
    },
    {
      code: ".a { outline: 1px solid #000; }",
      fixed: ".a { outline: 1px solid black; }",
      message: messages.rejected(
        "1px solid #000",
        ["border-color", "border", "outline", "border-width"],
        "1px solid black"
      ),
      description: "#000 should be fixed to black",
    },
    {
      code: ".a { border-block-end-color: #000000; }",
      fixed: ".a { border-block-end-color: black; }",
      message: messages.rejected(
        "#000000",
        ["border-color", "border", "outline"],
        "black"
      ),
      description: "#000000 should be fixed to black",
    },
  ],
});
