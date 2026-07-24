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
      code: ".bg { background-color: var(--background-color-box); }",
      description: "Using background-color token is valid.",
    },
    {
      code: ".bg { background-color: var(--background-color-box, #666); }",
      description:
        "Using background-color token with a raw color fallback is valid.",
    },
    {
      code: ".bg { background-color: var(--background-color-box, var(--another-token)); }",
      description:
        "Using background-color token with a variable fallback is valid.",
    },
    {
      code: `
        :root { --custom-token: var(--background-color-box); }
        .bg { background-color: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a background-color token is valid.",
    },
    {
      code: ".bg { background-color: inherit; }",
      description: "Using a keyword is valid.",
    },
    {
      code: ".bg { background-color: initial; }",
      description: "Using a keyword is valid.",
    },
    {
      code: ".bg { background-color: revert; }",
      description: "Using a keyword is valid.",
    },
    {
      code: ".bg { background-color: revert-layer; }",
      description: "Using a keyword is valid.",
    },
    {
      code: ".bg { background-color: unset; }",
      description: "Using a keyword is valid.",
    },
    {
      code: ".bg { background-color: transparent; }",
      description: "Using a keyword is valid.",
    },
    {
      code: ".bg { background-color: currentColor; }",
      description: "Using a keyword is valid.",
    },
    {
      code: ".bg { background-color: auto; }",
      description: "Using a keyword is valid.",
    },
    {
      code: ".bg { background-color: normal; }",
      description: "Using a keyword is valid.",
    },
    {
      code: ".bg { background-color: none; }",
      description: "Using a keyword is valid.",
    },
    {
      code: ".bg { background: var(--background-color-box); }",
      description: "Using background-color token is valid in the shorthand.",
    },
    {
      code: ".bg { background: var(--background-color-box, #666); }",
      description:
        "Using background-color token with a raw color fallback is valid in the shorthand.",
    },
    {
      code: ".bg { background: var(--background-color-box, var(--another-token)); }",
      description:
        "Using background-color token with a token fallback is valid in the shorthand.",
    },
    {
      code: `
        :root { --custom-token: var(--background-color-box); }
        .bg { background: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a background-color token is valid in the shorthand.",
    },
    {
      code: ".bg { background: url('image.png'); }",
      description:
        "Using the background shorthand without any color declarations is valid.",
    },
    {
      code: ".bg { background: linear-gradient(to bottom, #fff, #000) var(--background-color-box); }",
      description:
        "Using the background shorthand, other properties plus a background-color token is valid.",
    },
    {
      code: ".bg { background: url('image.png') no-repeat center center / auto var(--background-color-box, oklch(69% 0.19 15)); }",
      description:
        "Using a background-color token with a raw color value fallback is valid in the shorthand.",
    },
    {
      code: ".bg { background: url('image.png') fixed content-box var(--background-color-box, var(--another-token)); }",
      description:
        "Using a background-color token with another token fallback is valid in the shorthand.",
    },
    {
      code: `
        :root { --custom-token: var(--background-color-box); }
        .bg { background: url('image.png') var(--custom-token) repeat-y fixed; }
      `,
      description:
        "Using a custom token that resolves to a background-color token is valid in the shorthand.",
    },
    {
      code: ".bg { background: inherit; }",
      description: "Using a keyword is valid in the shorthand.",
    },
    {
      code: ".bg { background: initial; }",
      description: "Using a keyword is valid in the shorthand.",
    },
    {
      code: ".bg { background: revert; }",
      description: "Using a keyword is valid in the shorthand.",
    },
    {
      code: ".bg { background: revert-layer; }",
      description: "Using a keyword is valid in the shorthand.",
    },
    {
      code: ".bg { background: unset; }",
      description: "Using a keyword is valid in the shorthand.",
    },
    {
      code: ".bg { background: transparent; }",
      description: "Using a keyword is valid in the shorthand.",
    },
    {
      code: ".bg { background: currentColor; }",
      description: "Using a keyword is valid in the shorthand.",
    },
    {
      code: ".bg { background: auto; }",
      description: "Using a keyword is valid in the shorthand.",
    },
    {
      code: ".bg { background: normal; }",
      description: "Using a keyword is valid in the shorthand.",
    },
    {
      code: ".bg { background: none; }",
      description: "Using a keyword is valid in the shorthand.",
    },
    {
      code: ".bg { background-color: calc(2 * var(--background-color-box)); }",
      description: "Using calc() with a valid token inside is valid.",
    },
    {
      code: ".bg { background-color: calc(var(--background-color-box) * -1); }",
      description:
        "Using calc() with negative number and background-color token is valid.",
    },
    {
      code: ".bg { background-color: calc(var(--background-color-box) * -0.5); }",
      description:
        "Using calc() with negative decimal and background-color token is valid.",
    },
    {
      code: ".bg { background-color: light-dark(var(--background-color-box), var(--background-color-box)); }",
      description: "Using light-dark() with valid tokens is valid.",
    },
    {
      code: ".bg { background-color: light-dark(transparent, transparent); }",
      description: "Using light-dark() with valid keywords is valid.",
    },
    {
      code: ".bg { background-color: color-mix(in srgb, currentColor 10%, transparent); }",
      description: "Using color-mix() with valid colors is valid.",
    },
    {
      code: ".bg { background-color: color-mix(in srgb, var(--background-color-box) 20%, transparent); }",
      description: "Using color-mix() with valid token and keyword is valid.",
    },
    {
      code: ".bg { background-color: oklch(from var(--background-color-box-info) l c h / 30%); }",
      description: "Using oklch() with valid colors is valid.",
    },
    {
      code: `
        :root { --custom-token: var(--color-blue-50); }
        .bg { background-color: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a base color token is valid.",
    },
    {
      code: `
        :root { --custom-token: oklch(from var(--color-blue-50) l c h / 20%); }
        .bg { background-color: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a base color token in a color function is valid.",
    },
    {
      code: `
        :root { --custom-token: color-mix(in oklch, var(--color-blue-50) 20%, transparent); }
        .bg { background-color: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a base color token in a color-mix function is valid.",
    },
    {
      code: `
        :root { --custom-token: light-dark(var(--color-gray-05), var(--color-gray-100)); }
        .bg { background-color: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a base color token in a light-dark function is valid.",
    },
    {
      code: `
        :root { --custom-token: var(--color-orange-100); }
        .bg { background-color: var(--random-token, var(--custom-token)); }
      `,
      description:
        "Using a custom token with a fallback that resolves to a base color token is valid.",
    },
    {
      code: `
        :root { --custom-token: var(--text-color); }
        .bg { background-color: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a text-color token is valid.",
    },
    {
      code: `
        :root { --custom-token: var(--border-color); }
        .bg { background-color: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a border-color token is valid.",
    },
    {
      code: `
        :root { --custom-token: ButtonFace; }
        .bg { background-color: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a system color is valid.",
    },
    {
      code: `
        :root { --custom-token: ButtonText; }
        .bg { background-color: var(--custom-token); }
      `,
      description:
        "Using a custom token that resolves to a system color, even if non-semantic, is valid.",
    },
  ],
  reject: [
    {
      code: ".bg { background-color: #666; }",
      message: messages.rejected("#666", ["background-color"]),
      description: "#666 should use a background-color design token.",
    },
    {
      code: ".bg { background-color: #fff0; }",
      message: messages.rejected("#fff0", ["background-color"]),
      description: "#fff0 should use a background-color design token.",
    },
    {
      code: ".bg { background-color: #666666; }",
      message: messages.rejected("#666666", ["background-color"]),
      description: "#666666 should use a background-color design token.",
    },
    {
      code: ".bg { background-color: #ffffff00; }",
      message: messages.rejected("#ffffff00", ["background-color"]),
      description: "#ffffff00 should use a background-color design token.",
    },
    {
      code: ".bg { background-color: oklch(69% 0.19 15); }",
      message: messages.rejected("oklch(69% 0.19 15)", ["background-color"]),
      description:
        "oklch(69% 0.19 15) should use a background-color design token.",
    },
    {
      code: ".bg { background-color: rgba(42 42 42 / 0.15); }",
      message: messages.rejected("rgba(42 42 42 / 0.15)", ["background-color"]),
      description:
        "rgba(42 42 42 / 0.15) should use a background-color design token.",
    },
    {
      code: ".bg { background-color: ButtonFace; }",
      message: messages.warning("ButtonFace", "var(--button-background-color)"),
      description:
        "ButtonFace should use var(--button-background-color) instead.",
    },
    {
      code: ".bg { background-color: Field; }",
      message: messages.rejected("Field", ["background-color"]),
      description: "Field should use a background-color design token.",
    },
    {
      code: ".bg { background-color: var(--random-token, oklch(69% 0.19 15)); }",
      message: messages.rejected("var(--random-token, oklch(69% 0.19 15))", [
        "background-color",
      ]),
      description:
        "var(--random-token, oklch(69% 0.19 15)) should use a background-color design token.",
    },
    {
      code: ".bg { background-color: var(--random-token, var(--color-gray-30)); }",
      message: messages.rejected("var(--random-token, var(--color-gray-30))", [
        "background-color",
      ]),
      description:
        "var(--random-token, var(--color-gray-30)) should use a background-color design token.",
    },
    {
      code: `
        :root { --custom-token: #666; }
        .bg { background-color: var(--custom-token); }
      `,
      message: messages.rejected("var(--custom-token)", ["background-color"]),
      description:
        "var(--custom-token) should use a background-color design token.",
    },
    {
      code: `
        :root { --fallback-token: #666; }
        .bg { background-color: var(--custom-token, var(--fallback-token)); }
      `,
      message: messages.rejected("var(--custom-token, var(--fallback-token))", [
        "background-color",
      ]),
      description:
        "var(--custom-token, var(--fallback-token)) should use a background-color design token.",
    },
    {
      code: `
        :root { --custom-token: #666; }
        .bg { background-color: var(--random-token, var(--custom-token)); }
      `,
      message: messages.rejected("var(--random-token, var(--custom-token))", [
        "background-color",
      ]),
      description:
        "var(--random-token, var(--custom-token)) should use a background-color design token.",
    },
    {
      code: ".bg { background-color: var(--color-blue-50); }",
      message: messages.rejected("var(--color-blue-50)", ["background-color"]),
      description:
        "var(--color-blue-50) should use a background-color design token",
    },
    {
      code: ".bg { background: #666; }",
      message: messages.rejected("#666", [
        "background-color",
        "size",
        "space",
        "icon-size",
      ]),
      description: "#666 should use a background design token.",
    },
    {
      code: ".bg { background: #fff0; }",
      message: messages.rejected("#fff0", [
        "background-color",
        "size",
        "space",
        "icon-size",
      ]),
      description: "#fff0 should use a background design token.",
    },
    {
      code: ".bg { background: #666666; }",
      message: messages.rejected("#666666", [
        "background-color",
        "size",
        "space",
        "icon-size",
      ]),
      description: "#666666 should use a background design token.",
    },
    {
      code: ".bg { background: #ffffff00; }",
      message: messages.rejected("#ffffff00", [
        "background-color",
        "size",
        "space",
        "icon-size",
      ]),
      description: "#ffffff00 should use a background design token.",
    },
    {
      code: ".bg { background: oklch(69% 0.19 15); }",
      message: messages.rejected("oklch(69% 0.19 15)", [
        "background-color",
        "size",
        "space",
        "icon-size",
      ]),
      description: "oklch(69% 0.19 15) should use a background design token.",
    },
    {
      code: ".bg { background: rgba(42 42 42 / 0.15); }",
      message: messages.rejected("rgba(42 42 42 / 0.15)", [
        "background-color",
        "size",
        "space",
        "icon-size",
      ]),
      description:
        "rgba(42 42 42 / 0.15) should use a background design token.",
    },
    {
      code: ".bg { background-color: light-dark(#666, #333); }",
      message: messages.rejected("light-dark(#666, #333)", [
        "background-color",
      ]),
      description:
        "light-dark(#666, #333) should use a background-color design token.",
    },
    {
      code: ".bg { background-color: color-mix(in oklch, #666 20%, transparent); }",
      message: messages.rejected("color-mix(in oklch, #666 20%, transparent)", [
        "background-color",
      ]),
      description:
        "color-mix(in oklch, #666 20%, transparent) should use a background-color design token.",
    },
    {
      code: ".bg { background-color: oklch(from var(--color-blue-50) l c h / 20%); }",
      message: messages.rejected(
        "oklch(from var(--color-blue-50) l c h / 20%)",
        ["background-color"]
      ),
      description:
        "oklch(from var(--color-blue-50) l c h / 20%) should use a background-color design token.",
    },
    {
      code: ".bg { background: border-box #666; }",
      message: messages.rejected("border-box #666", [
        "background-color",
        "size",
        "space",
        "icon-size",
      ]),
      description: "border-box #666 should use a background design token.",
    },
    {
      code: ".bg { background: url('image.png') #fff0, #666; }",
      message: messages.rejected("url('image.png') #fff0, #666", [
        "background-color",
        "size",
        "space",
        "icon-size",
      ]),
      description:
        "url('image.png') #fff0, #666 should use a background design token.",
    },
    {
      code: ".bg { background: url('image.png') oklch(69% 0.19 15) repeat-y; }",
      message: messages.rejected(
        "url('image.png') oklch(69% 0.19 15) repeat-y",
        ["background-color", "size", "space", "icon-size"]
      ),
      description:
        "url('image.png') oklch(69% 0.19 15) repeat-y should use a background design token.",
    },
    {
      code: ".bg { background: url('image.png') top center fixed #ffffff00; }",
      message: messages.rejected(
        "url('image.png') top center fixed #ffffff00",
        ["background-color", "size", "space", "icon-size"]
      ),
      description:
        "url('image.png') top center fixed #ffffff00 should use a background design token.",
    },
    {
      code: ".bg { background: url('image.png') center left / auto no-repeat scroll content-box padding-box red, rgba(42 42 42 / 0.15); }",
      message: messages.rejected(
        "url('image.png') center left / auto no-repeat scroll content-box padding-box red, rgba(42 42 42 / 0.15)",
        ["background-color", "size", "space", "icon-size"]
      ),
      description:
        "url('image.png') center left / auto no-repeat scroll content-box padding-box red, rgba(42 42 42 / 0.15) should use a background design token.",
    },
    {
      code: ".bg { background: url('image.png') var(--random-token, rgba(42 42 42 / 0.15)); }",
      message: messages.rejected(
        "url('image.png') var(--random-token, rgba(42 42 42 / 0.15))",
        ["background-color", "size", "space", "icon-size"]
      ),
      description:
        "url('image.png') var(--random-token, rgba(42 42 42 / 0.15)) should use a background design token.",
    },
    {
      code: ".bg { background: url('image.png') Canvas; }",
      message: messages.warning(
        "url('image.png') Canvas",
        "url('image.png') var(--background-color-canvas)"
      ),
      description: "Canvas should use var(--background-color-canvas) instead.",
    },
    {
      code: `
        :root { --custom-token: #666666; }
        .bg { background: url('image.png') no-repeat center / auto var(--custom-token); }
      `,
      message: messages.rejected(
        "url('image.png') no-repeat center / auto var(--custom-token)",
        ["background-color", "size", "space", "icon-size"]
      ),
      description:
        "url('image.png') no-repeat center / auto var(--custom-token) should use a background design token.",
    },
    {
      code: ".bg { background-color: calc(2 * #666); }",
      message: messages.rejected("calc(2 * #666)", ["background-color"]),
      description: "calc() with invalid color inside should be rejected.",
    },
    {
      code: ".bg { background-color: light-dark(#666, var(--background-color-box)); }",
      message: messages.rejected(
        "light-dark(#666, var(--background-color-box))",
        ["background-color"]
      ),
      description: "light-dark() with invalid first color should be rejected.",
    },
    {
      code: ".bg { background-color: light-dark(var(--background-color-box), #666); }",
      message: messages.rejected(
        "light-dark(var(--background-color-box), #666)",
        ["background-color"]
      ),
      description: "light-dark() with invalid second color should be rejected.",
    },
    {
      code: ".bg { background-color: color-mix(in srgb, #666 10%, transparent); }",
      message: messages.rejected("color-mix(in srgb, #666 10%, transparent)", [
        "background-color",
      ]),
      description: "color-mix() with invalid first color should be rejected.",
    },
    {
      code: ".bg { background-color: color-mix(in srgb, currentColor 10%, #666); }",
      message: messages.rejected("color-mix(in srgb, currentColor 10%, #666)", [
        "background-color",
      ]),
      description: "color-mix() with invalid second color should be rejected.",
    },
    {
      code: ".bg { background-color: color-mix(in srgb, ButtonFace 10%, #fff); }",
      message: messages.rejected(
        "color-mix(in srgb, ButtonFace 10%, #fff)",
        ["background-color"],
        "color-mix(in srgb, ButtonFace 10%, white)"
      ),
      description:
        "Fixable errors in values with multiple problems should be prioritized.",
    },
    {
      code: ".bg { background-color: color-mix(in srgb, ButtonFace 10%, white); }",
      message: messages.warning(
        "color-mix(in srgb, ButtonFace 10%, white)",
        "color-mix(in srgb, var(--button-background-color) 10%, white)"
      ),
      description:
        "Warnings should be reported after autofixable problems have been fixed.",
    },
    {
      code: ".bg { background-color: color-mix(in srgb, ButtonFace 10%, #ccc); }",
      message: messages.rejected("color-mix(in srgb, ButtonFace 10%, #ccc)", [
        "background-color",
      ]),
      description:
        "When a warning and non-autofixable error appear in the same value, prioritize the error.",
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
      code: ".bg { background-color: #fff; }",
      fixed: ".bg { background-color: white; }",
      message: messages.rejected("#fff", ["background-color"], "white"),
      description: "#fff should be fixed to white.",
    },
    {
      code: ".bg { background-color: #ffffff; }",
      fixed: ".bg { background-color: white; }",
      message: messages.rejected("#ffffff", ["background-color"], "white"),
      description: "#ffffff should be fixed to white.",
    },
    {
      code: ".bg { background-color: #FFF; }",
      fixed: ".bg { background-color: white; }",
      message: messages.rejected("#FFF", ["background-color"], "white"),
      description: "#FFF should be fixed to white.",
    },
    {
      code: ".bg { background-color: #FFFFFF; }",
      fixed: ".bg { background-color: white; }",
      message: messages.rejected("#FFFFFF", ["background-color"], "white"),
      description: "#FFFFFF should be fixed to white.",
    },
    {
      code: ".bg { background-color: #000; }",
      fixed: ".bg { background-color: black; }",
      message: messages.rejected("#000", ["background-color"], "black"),
      description: "#000 should be fixed to black.",
    },
    {
      code: ".bg { background-color: #000000; }",
      fixed: ".bg { background-color: black; }",
      message: messages.rejected("#000000", ["background-color"], "black"),
      description: "#000000 should be fixed to black.",
    },
    {
      code: ".bg { background: #fff; }",
      fixed: ".bg { background: white; }",
      message: messages.rejected(
        "#fff",
        ["background-color", "size", "space", "icon-size"],
        "white"
      ),
      description: "#fff should be fixed to white in background shorthand.",
    },
    {
      code: ".bg { background: #ffffff; }",
      fixed: ".bg { background: white; }",
      message: messages.rejected(
        "#ffffff",
        ["background-color", "size", "space", "icon-size"],
        "white"
      ),
      description: "#ffffff should be fixed to white in background shorthand.",
    },
    {
      code: ".bg { background: #000; }",
      fixed: ".bg { background: black; }",
      message: messages.rejected(
        "#000",
        ["background-color", "size", "space", "icon-size"],
        "black"
      ),
      description: "#000 should be fixed to black in background shorthand.",
    },
    {
      code: ".bg { background: #000000; }",
      fixed: ".bg { background: black; }",
      message: messages.rejected(
        "#000000",
        ["background-color", "size", "space", "icon-size"],
        "black"
      ),
      description: "#000000 should be fixed to black in background shorthand.",
    },
    {
      code: ".bg { background: url('image.png') #fff; }",
      fixed: ".bg { background: url('image.png') white; }",
      message: messages.rejected(
        "url('image.png') #fff",
        ["background-color", "size", "space", "icon-size"],
        "url('image.png') white"
      ),
      description:
        "#fff should be fixed to white in background shorthand with other properties.",
    },
    {
      code: ".bg { background: url('image.png') #000 repeat-y; }",
      fixed: ".bg { background: url('image.png') black repeat-y; }",
      message: messages.rejected(
        "url('image.png') #000 repeat-y",
        ["background-color", "size", "space", "icon-size"],
        "url('image.png') black repeat-y"
      ),
      description:
        "#000 should be fixed to black in background shorthand with other properties.",
    },
  ],
});
