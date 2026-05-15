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
      code: ".a { margin: var(--space-small); }",
      description: "Using space token for margin is valid.",
    },
    {
      code: ".a { margin: var(--space-small) var(--space-large); }",
      description:
        "Using space token for margin with two shorthand values is valid.",
    },
    {
      code: ".a { margin: var(--space-small) var(--space-large) var(--space-medium); }",
      description:
        "Using space token for margin with three shorthand values is valid.",
    },
    {
      code: ".a { margin: var(--space-small) var(--space-large) var(--space-medium) var(--space-xlarge); }",
      description:
        "Using space token for margin with four shorthand values is valid.",
    },
    {
      code: ".a { scroll-margin: var(--space-small) var(--space-large) var(--space-medium) var(--space-xlarge); }",
      description:
        "Using space token for scroll-margin with four shorthand values is valid.",
    },
    {
      code: ".a { margin-block: var(--space-small); }",
      description: "Using space token for margin-block is valid.",
    },
    {
      code: ".a { margin-block: var(--space-small) var(--space-large); }",
      description:
        "Using space token for margin-block with two shorthand values is valid.",
    },
    {
      code: ".a { scroll-margin-block: var(--space-small) var(--space-large); }",
      description:
        "Using space token for scroll-margin-block with two shorthand values is valid.",
    },
    {
      code: ".a { margin-inline: var(--space-small); }",
      description: "Using space token for margin-inline is valid.",
    },
    {
      code: ".a { margin-inline: var(--space-small) var(--space-large); }",
      description:
        "Using space token for margin-inline with two shorthand values is valid.",
    },
    {
      code: ".a { scroll-margin-inline: var(--space-small) var(--space-large); }",
      description:
        "Using space token for scroll-margin-inline with two shorthand values is valid.",
    },
    {
      code: ".a { margin-block-end: var(--space-xxsmall); }",
      description: "Using space token for margin-block-end is valid.",
    },
    {
      code: ".a { margin-block-start: var(--space-xsmall); }",
      description: "Using space token for margin-block-start is valid.",
    },
    {
      code: ".a { margin-inline-end: var(--space-small); }",
      description: "Using space token for margin-inline-end is valid.",
    },
    {
      code: ".a { margin-inline-start: var(--space-medium); }",
      description: "Using space token for margin-inline-start is valid.",
    },
    {
      code: ".a { scroll-margin-inline-end: var(--space-small); }",
      description: "Using space token for scroll-margin-inline-end is valid.",
    },
    {
      code: ".a { scroll-margin-inline-start: var(--space-medium); }",
      description: "Using space token for scroll-margin-inline-start is valid.",
    },
    {
      code: ".a { margin-top: var(--space-large); }",
      description: "Using space token for margin-top is valid.",
    },
    {
      code: ".a { margin-right: var(--space-xlarge); }",
      description: "Using space token for margin-right is valid.",
    },
    {
      code: ".a { margin-bottom: var(--space-xxlarge); }",
      description: "Using space token for margin-bottom is valid.",
    },
    {
      code: ".a { margin-left: var(--space-small); }",
      description: "Using space token for margin-left is valid.",
    },
    {
      code: ".a { scroll-margin-top: var(--space-large); }",
      description: "Using space token for scroll-margin-top is valid.",
    },
    {
      code: ".a { scroll-margin-right: var(--space-xlarge); }",
      description: "Using space token for scroll-margin-right is valid.",
    },
    {
      code: ".a { scroll-margin-bottom: var(--space-xxlarge); }",
      description: "Using space token for scroll-margin-bottom is valid.",
    },
    {
      code: ".a { scroll-margin-left: var(--space-small); }",
      description: "Using space token for scroll-margin-left is valid.",
    },
    {
      code: ".a { padding: var(--space-small); }",
      description: "Using space token for padding is valid.",
    },
    {
      code: ".a { scroll-padding: var(--space-small); }",
      description: "Using space token for scroll-padding is valid.",
    },
    {
      code: ".a { padding: var(--space-small) var(--space-large); }",
      description:
        "Using space token for padding with two shorthand values is valid.",
    },
    {
      code: ".a { padding: var(--space-small) var(--space-large) var(--space-medium); }",
      description:
        "Using space token for padding with three shorthand values is valid.",
    },
    {
      code: ".a { padding: var(--space-small) var(--space-large) var(--space-medium) var(--space-xlarge); }",
      description:
        "Using space token for padding with four shorthand values is valid.",
    },
    {
      code: ".a { padding-block: var(--space-small); }",
      description: "Using space token for padding-block is valid.",
    },
    {
      code: ".a { scroll-padding-block: var(--space-small); }",
      description: "Using space token for scroll-padding-block is valid.",
    },
    {
      code: ".a { padding-block: var(--space-small) var(--space-large); }",
      description:
        "Using space token for padding-block with two shorthand values is valid.",
    },
    {
      code: ".a { padding-inline: var(--space-small); }",
      description: "Using space token for padding-inline is valid.",
    },
    {
      code: ".a { scroll-padding-inline: var(--space-small); }",
      description: "Using space token for scroll-padding-inline is valid.",
    },
    {
      code: ".a { padding-inline: var(--space-small) var(--space-large); }",
      description:
        "Using space token for padding-inline with two shorthand values is valid.",
    },
    {
      code: ".a { padding-block-end: var(--space-xxsmall); }",
      description: "Using space token for padding-block-end is valid.",
    },
    {
      code: ".a { padding-block-start: var(--space-xsmall); }",
      description: "Using space token for padding-block-start is valid.",
    },
    {
      code: ".a { padding-inline-end: var(--space-small); }",
      description: "Using space token for padding-inline-end is valid.",
    },
    {
      code: ".a { padding-inline-start: var(--space-medium); }",
      description: "Using space token for padding-inline-start is valid.",
    },
    {
      code: ".a { scroll-padding-inline-start: var(--space-medium); }",
      description:
        "Using space token for scroll-padding-inline-start is valid.",
    },
    {
      code: ".a { padding-top: var(--space-large); }",
      description: "Using space token for padding-top is valid.",
    },
    {
      code: ".a { padding-right: var(--space-xlarge); }",
      description: "Using space token for padding-right is valid.",
    },
    {
      code: ".a { padding-bottom: var(--space-xxlarge); }",
      description: "Using space token for padding-bottom is valid.",
    },
    {
      code: ".a { padding-left: var(--space-small); }",
      description: "Using space token for padding-left is valid.",
    },
    {
      code: ".a { scroll-padding-top: var(--space-large); }",
      description: "Using space token for scroll-padding-top is valid.",
    },
    {
      code: ".a { scroll-padding-right: var(--space-xlarge); }",
      description: "Using space token for scroll-padding-right is valid.",
    },
    {
      code: ".a { scroll-padding-bottom: var(--space-xxlarge); }",
      description: "Using space token for scroll-padding-bottom is valid.",
    },
    {
      code: ".a { scroll-padding-left: var(--space-small); }",
      description: "Using space token for scroll-padding-left is valid.",
    },
    {
      code: ".a { inset: var(--space-small); }",
      description: "Using space token for inset is valid.",
    },
    {
      code: ".a { inset: var(--space-small) var(--space-large); }",
      description:
        "Using space token for inset with two shorthand values is valid.",
    },
    {
      code: ".a { inset: var(--space-small) var(--space-large) var(--space-medium); }",
      description:
        "Using space token for inset with three shorthand values is valid.",
    },
    {
      code: ".a { inset: var(--space-small) var(--space-large) var(--space-medium) var(--space-xlarge); }",
      description:
        "Using space token for inset with four shorthand values is valid.",
    },
    {
      code: ".a { inset-block: var(--space-small); }",
      description: "Using space token for inset-block is valid.",
    },
    {
      code: ".a { inset-block: var(--space-small) var(--space-large); }",
      description:
        "Using space token for inset-block with two shorthand values is valid.",
    },
    {
      code: ".a { inset-inline: var(--space-small); }",
      description: "Using space token for inset-inline is valid.",
    },
    {
      code: ".a { inset-inline: var(--space-small) var(--space-large); }",
      description:
        "Using space token for inset-inline with two shorthand values is valid.",
    },
    {
      code: ".a { inset-block-end: var(--space-xxsmall); }",
      description: "Using space token for inset-block-end is valid.",
    },
    {
      code: ".a { inset-block-start: var(--space-xsmall); }",
      description: "Using space token for inset-block-start is valid.",
    },
    {
      code: ".a { inset-inline-end: var(--space-small); }",
      description: "Using space token for inset-inline-end is valid.",
    },
    {
      code: ".a { inset-inline-start: var(--space-medium); }",
      description: "Using space token for inset-inline-start is valid.",
    },
    {
      code: ".a { top: var(--space-small); }",
      description: "Using space token for top is valid.",
    },
    {
      code: ".a { right: var(--space-xxlarge); }",
      description: "Using space token for right is valid.",
    },
    {
      code: ".a { bottom: var(--space-xlarge); }",
      description: "Using space token for bottom is valid.",
    },
    {
      code: ".a { left: var(--space-medium); }",
      description: "Using space token for left is valid.",
    },
    {
      code: ".a { gap: var(--space-small); }",
      description: "Using space token for gap is valid.",
    },
    {
      code: ".a { gap: var(--space-small) var(--space-large); }",
      description:
        "Using space token for gap with two shorthand values is valid.",
    },
    {
      code: ".a { column-gap: var(--space-medium); }",
      description: "Using space token for column-gap is valid.",
    },
    {
      code: ".a { row-gap: var(--space-xlarge); }",
      description: "Using space token for row-gap is valid.",
    },
    {
      code: ".a { margin-inline: auto; }",
      description: "Using auto for spacing is valid.",
    },
    {
      code: ".a { padding: 0; }",
      description: "Using 0 for spacing is valid.",
    },
    {
      code: ".a { inset: initial; }",
      description: "Using a keyword for spacing is valid.",
    },
    {
      code: ".a { gap: inherit; }",
      description: "Using a keyword for spacing is valid.",
    },
    {
      code: ".a { margin-block-start: revert; }",
      description: "Using a keyword for spacing is valid.",
    },
    {
      code: ".a { left: revert-layer; }",
      description: "Using a keyword for spacing is valid.",
    },
    {
      code: ".a { column-gap: unset; }",
      description: "Using a keyword for spacing is valid.",
    },
    {
      code: `
        :root { --local-padding: var(--space-small); }
        .a { padding: var(--local-padding); }
      `,
      description:
        "Using a locally declared variable that resolves to a space token is valid.",
    },
    {
      code: `
        :root { --local-padding: var(--dimension-relative-100); }
        .a { padding: var(--local-padding); }
      `,
      description:
        "Using a locally declared variable that resolves to a dimension token is valid.",
    },
    {
      code: ".a { padding: var(--random-padding, var(--space-small)); }",
      description:
        "Using a variable that falls back to a space token is valid.",
    },
  ],
  reject: [
    {
      code: ".a { margin: 5px; }",
      message: messages.rejected("5px", ["space"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { margin: 0.5rem 1rem; }",
      message: messages.rejected("0.5rem 1rem", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { margin: 0.5em var(--space-large); }",
      message: messages.rejected("0.5em var(--space-large)", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { margin: 0.5rem 1rem 0.25rem; }",
      message: messages.rejected("0.5rem 1rem 0.25rem", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { margin: var(--space-small) 1rem 0.25rem; }",
      message: messages.rejected("var(--space-small) 1rem 0.25rem", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { margin: var(--space-small) 1rem var(--space-xsmall); }",
      message: messages.rejected(
        "var(--space-small) 1rem var(--space-xsmall)",
        ["space"]
      ),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { margin: 0.5em 1em 0.25em 0.5em; }",
      message: messages.rejected("0.5em 1em 0.25em 0.5em", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { margin: var(--space-small) 1em 0.25em 0.5em; }",
      message: messages.rejected("var(--space-small) 1em 0.25em 0.5em", [
        "space",
      ]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { margin: var(--space-small) 1em 0.25em var(--space-small); }",
      message: messages.rejected(
        "var(--space-small) 1em 0.25em var(--space-small)",
        ["space"]
      ),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { margin: var(--space-small) var(--space-medium) 0.25em var(--space-small); }",
      message: messages.rejected(
        "var(--space-small) var(--space-medium) 0.25em var(--space-small)",
        ["space"]
      ),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { margin-block: 5px; }",
      message: messages.rejected("5px", ["space"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { margin-block: 0.5rem 1rem; }",
      message: messages.rejected("0.5rem 1rem", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { margin-block: 0.5em var(--space-large); }",
      message: messages.rejected("0.5em var(--space-large)", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { margin-inline: 5px; }",
      message: messages.rejected("5px", ["space"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { margin-inline: 0.5rem 1rem; }",
      message: messages.rejected("0.5rem 1rem", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { margin-inline: var(--space-large) 0.5em; }",
      message: messages.rejected("var(--space-large) 0.5em", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { margin-block-end: 5px; }",
      message: messages.rejected("5px", ["space"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { margin-block-start: 1rem; }",
      message: messages.rejected("1rem", ["space"]),
      description: "Space value in rem should use a design token.",
    },
    {
      code: ".a { margin-inline-end: 5%; }",
      message: messages.rejected("5%", ["space"]),
      description: "Space value in percent should use a design token.",
    },
    {
      code: ".a { margin-inline-start: 0.5em; }",
      message: messages.rejected("0.5em", ["space"]),
      description: "Space value in em should use a design token.",
    },
    {
      code: ".a { margin-top: 1lh; }",
      message: messages.rejected("1lh", ["space"]),
      description: "Space value in lh should use a design token.",
    },
    {
      code: ".a { margin-right: 1cqi; }",
      message: messages.rejected("1cqi", ["space"]),
      description: "Space value in cqi should use a design token.",
    },
    {
      code: ".a { margin-bottom: 1ex; }",
      message: messages.rejected("1ex", ["space"]),
      description: "Space value in ex should use a design token.",
    },
    {
      code: ".a { margin-left: 1ch; }",
      message: messages.rejected("1ch", ["space"]),
      description: "Space value in ch should use a design token.",
    },
    {
      code: ".a { padding: 5px; }",
      message: messages.rejected("5px", ["space"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { padding: 0.5rem 1rem; }",
      message: messages.rejected("0.5rem 1rem", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { padding: 0.5em var(--space-large); }",
      message: messages.rejected("0.5em var(--space-large)", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { padding: 0.5rem 1rem 0.25rem; }",
      message: messages.rejected("0.5rem 1rem 0.25rem", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { padding: var(--space-small) 1rem 0.25rem; }",
      message: messages.rejected("var(--space-small) 1rem 0.25rem", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { padding: var(--space-small) 1rem var(--space-xsmall); }",
      message: messages.rejected(
        "var(--space-small) 1rem var(--space-xsmall)",
        ["space"]
      ),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { padding: 0.5em 1em 0.25em 0.5em; }",
      message: messages.rejected("0.5em 1em 0.25em 0.5em", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { padding: var(--space-small) 1em 0.25em 0.5em; }",
      message: messages.rejected("var(--space-small) 1em 0.25em 0.5em", [
        "space",
      ]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { padding: var(--space-small) 1em 0.25em var(--space-small); }",
      message: messages.rejected(
        "var(--space-small) 1em 0.25em var(--space-small)",
        ["space"]
      ),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { padding: var(--space-small) var(--space-medium) 0.25em var(--space-small); }",
      message: messages.rejected(
        "var(--space-small) var(--space-medium) 0.25em var(--space-small)",
        ["space"]
      ),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { padding-block: 5px; }",
      message: messages.rejected("5px", ["space"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { padding-block: 0.5rem 1rem; }",
      message: messages.rejected("0.5rem 1rem", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { padding-block: 0.5em var(--space-large); }",
      message: messages.rejected("0.5em var(--space-large)", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { padding-inline: 5px; }",
      message: messages.rejected("5px", ["space"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { padding-inline: 0.5rem 1rem; }",
      message: messages.rejected("0.5rem 1rem", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { padding-inline: var(--space-large) 0.5em; }",
      message: messages.rejected("var(--space-large) 0.5em", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { padding-block-end: 5px; }",
      message: messages.rejected("5px", ["space"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { padding-block-start: 1rem; }",
      message: messages.rejected("1rem", ["space"]),
      description: "Space value in rem should use a design token.",
    },
    {
      code: ".a { padding-inline-end: 5%; }",
      message: messages.rejected("5%", ["space"]),
      description: "Space value in percent should use a design token.",
    },
    {
      code: ".a { padding-inline-start: 0.5em; }",
      message: messages.rejected("0.5em", ["space"]),
      description: "Space value in em should use a design token.",
    },
    {
      code: ".a { padding-top: 1lh; }",
      message: messages.rejected("1lh", ["space"]),
      description: "Space value in lh should use a design token.",
    },
    {
      code: ".a { padding-right: 1cqi; }",
      message: messages.rejected("1cqi", ["space"]),
      description: "Space value in cqi should use a design token.",
    },
    {
      code: ".a { padding-bottom: 1ex; }",
      message: messages.rejected("1ex", ["space"]),
      description: "Space value in ex should use a design token.",
    },
    {
      code: ".a { padding-left: 1ch; }",
      message: messages.rejected("1ch", ["space"]),
      description: "Space value in ch should use a design token.",
    },
    {
      code: ".a { inset: 5px; }",
      message: messages.rejected("5px", ["space", "size", "icon-size"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { inset-block: 5px; }",
      message: messages.rejected("5px", ["space", "size", "icon-size"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { inset-inline: 5px; }",
      message: messages.rejected("5px", ["space", "size", "icon-size"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { inset-block-end: 5px; }",
      message: messages.rejected("5px", ["space", "size", "icon-size"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { top: 5px; }",
      message: messages.rejected("5px", ["space", "size", "icon-size"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { right: 0.5rem; }",
      message: messages.rejected("0.5rem", ["space", "size", "icon-size"]),
      description: "Space value in rem should use a design token.",
    },
    {
      code: ".a { left: 1lh; }",
      message: messages.rejected("1lh", ["space", "size", "icon-size"]),
      description: "Space value in lh should use a design token.",
    },
    {
      code: ".a { gap: 5px; }",
      message: messages.rejected("5px", ["space"]),
      description: "Space value in px should use a design token.",
    },
    {
      code: ".a { gap: 0.5rem 1rem; }",
      message: messages.rejected("0.5rem 1rem", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { gap: var(--space-large) 0.5em; }",
      message: messages.rejected("var(--space-large) 0.5em", ["space"]),
      description: "Space values in shorthand should use a design token.",
    },
    {
      code: ".a { column-gap: ch; }",
      message: messages.rejected("ch", ["space"]),
      description: "Space value in ch should use a design token.",
    },
    {
      code: ".a { row-gap: 0.5ex; }",
      message: messages.rejected("0.5ex", ["space"]),
      description: "Space value in ex should use a design token.",
    },
    {
      code: `
        :root { --local-padding: 5px; }
        .a { padding: var(--local-padding); }
      `,
      message: messages.rejected("var(--local-padding)", ["space"]),
      description:
        "Using a locally declared variable that does not resolve to a space token is invalid.",
    },
    {
      code: ".a { padding: var(--random-padding, 5px); }",
      message: messages.rejected("var(--random-padding, 5px)", ["space"]),
      description:
        "Using a variable that does not fall back to a space token is invalid.",
    },
    {
      code: ".a { padding: var(--dimension-relative-150); }",
      message: messages.rejected("var(--dimension-relative-150)", ["space"]),
      description: "Using a dimension token directly is invalid.",
    },
  ],
});

// autofix tests
testRule({
  plugins: [plugin],
  ruleName,
  config: true,
  fix: true,
  reject: [
    {
      code: ".a { margin: 2px; }",
      fixed: ".a { margin: var(--space-xxsmall); }",
      message: messages.rejected("2px", ["space"], "var(--space-xxsmall)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin: 8px 16px; }",
      fixed: ".a { margin: var(--space-small) var(--space-large); }",
      message: messages.rejected(
        "8px 16px",
        ["space"],
        "var(--space-small) var(--space-large)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { margin: 8px 16px 4px; }",
      fixed:
        ".a { margin: var(--space-small) var(--space-large) var(--space-xsmall); }",
      message: messages.rejected(
        "8px 16px 4px",
        ["space"],
        "var(--space-small) var(--space-large) var(--space-xsmall)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { margin: 8px 16px 4px 12px; }",
      fixed:
        ".a { margin: var(--space-small) var(--space-large) var(--space-xsmall) var(--space-medium); }",
      message: messages.rejected(
        "8px 16px 4px 12px",
        ["space"],
        "var(--space-small) var(--space-large) var(--space-xsmall) var(--space-medium)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { margin-block: 2px; }",
      fixed: ".a { margin-block: var(--space-xxsmall); }",
      message: messages.rejected("2px", ["space"], "var(--space-xxsmall)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-block: 8px var(--space-large); }",
      fixed: ".a { margin-block: var(--space-small) var(--space-large); }",
      message: messages.rejected(
        "8px var(--space-large)",
        ["space"],
        "var(--space-small) var(--space-large)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { margin-inline: 2px; }",
      fixed: ".a { margin-inline: var(--space-xxsmall); }",
      message: messages.rejected("2px", ["space"], "var(--space-xxsmall)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-inline: var(--space-small) 16px; }",
      fixed: ".a { margin-inline: var(--space-small) var(--space-large); }",
      message: messages.rejected(
        "var(--space-small) 16px",
        ["space"],
        "var(--space-small) var(--space-large)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { margin-block-end: 2px; }",
      fixed: ".a { margin-block-end: var(--space-xxsmall); }",
      message: messages.rejected("2px", ["space"], "var(--space-xxsmall)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-block-start: 4px; }",
      fixed: ".a { margin-block-start: var(--space-xsmall); }",
      message: messages.rejected("4px", ["space"], "var(--space-xsmall)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-inline-end: 8px; }",
      fixed: ".a { margin-inline-end: var(--space-small); }",
      message: messages.rejected("8px", ["space"], "var(--space-small)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-inline-start: 12px; }",
      fixed: ".a { margin-inline-start: var(--space-medium); }",
      message: messages.rejected("12px", ["space"], "var(--space-medium)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-top: 16px; }",
      fixed: ".a { margin-top: var(--space-large); }",
      message: messages.rejected("16px", ["space"], "var(--space-large)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-right: 24px; }",
      fixed: ".a { margin-right: var(--space-xlarge); }",
      message: messages.rejected("24px", ["space"], "var(--space-xlarge)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-bottom: 32px; }",
      fixed: ".a { margin-bottom: var(--space-xxlarge); }",
      message: messages.rejected("32px", ["space"], "var(--space-xxlarge)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-left: 2px; }",
      fixed: ".a { margin-left: var(--space-xxsmall); }",
      message: messages.rejected("2px", ["space"], "var(--space-xxsmall)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { padding: 2px; }",
      fixed: ".a { padding: var(--space-xxsmall); }",
      message: messages.rejected("2px", ["space"], "var(--space-xxsmall)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { padding: 8px 16px; }",
      fixed: ".a { padding: var(--space-small) var(--space-large); }",
      message: messages.rejected(
        "8px 16px",
        ["space"],
        "var(--space-small) var(--space-large)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { padding: 8px 16px 4px; }",
      fixed:
        ".a { padding: var(--space-small) var(--space-large) var(--space-xsmall); }",
      message: messages.rejected(
        "8px 16px 4px",
        ["space"],
        "var(--space-small) var(--space-large) var(--space-xsmall)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { padding: 8px 16px 4px 12px; }",
      fixed:
        ".a { padding: var(--space-small) var(--space-large) var(--space-xsmall) var(--space-medium); }",
      message: messages.rejected(
        "8px 16px 4px 12px",
        ["space"],
        "var(--space-small) var(--space-large) var(--space-xsmall) var(--space-medium)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { padding-block: 2px; }",
      fixed: ".a { padding-block: var(--space-xxsmall); }",
      message: messages.rejected("2px", ["space"], "var(--space-xxsmall)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { padding-block: 8px var(--space-large); }",
      fixed: ".a { padding-block: var(--space-small) var(--space-large); }",
      message: messages.rejected(
        "8px var(--space-large)",
        ["space"],
        "var(--space-small) var(--space-large)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { padding-inline: 2px; }",
      fixed: ".a { padding-inline: var(--space-xxsmall); }",
      message: messages.rejected("2px", ["space"], "var(--space-xxsmall)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { padding-inline: var(--space-small) 16px; }",
      fixed: ".a { padding-inline: var(--space-small) var(--space-large); }",
      message: messages.rejected(
        "var(--space-small) 16px",
        ["space"],
        "var(--space-small) var(--space-large)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { margin-block-end: 2px; }",
      fixed: ".a { margin-block-end: var(--space-xxsmall); }",
      message: messages.rejected("2px", ["space"], "var(--space-xxsmall)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-block-start: 4px; }",
      fixed: ".a { margin-block-start: var(--space-xsmall); }",
      message: messages.rejected("4px", ["space"], "var(--space-xsmall)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-inline-end: 8px; }",
      fixed: ".a { margin-inline-end: var(--space-small); }",
      message: messages.rejected("8px", ["space"], "var(--space-small)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-inline-start: 12px; }",
      fixed: ".a { margin-inline-start: var(--space-medium); }",
      message: messages.rejected("12px", ["space"], "var(--space-medium)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-top: 16px; }",
      fixed: ".a { margin-top: var(--space-large); }",
      message: messages.rejected("16px", ["space"], "var(--space-large)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-right: 24px; }",
      fixed: ".a { margin-right: var(--space-xlarge); }",
      message: messages.rejected("24px", ["space"], "var(--space-xlarge)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-bottom: 32px; }",
      fixed: ".a { margin-bottom: var(--space-xxlarge); }",
      message: messages.rejected("32px", ["space"], "var(--space-xxlarge)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { margin-left: 2px; }",
      fixed: ".a { margin-left: var(--space-xxsmall); }",
      message: messages.rejected("2px", ["space"], "var(--space-xxsmall)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { inset: 2px; }",
      fixed: ".a { inset: var(--space-xxsmall); }",
      message: messages.rejected(
        "2px",
        ["space", "size", "icon-size"],
        "var(--space-xxsmall)"
      ),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { inset: 8px 16px; }",
      fixed: ".a { inset: var(--space-small) var(--space-large); }",
      message: messages.rejected(
        "8px 16px",
        ["space", "size", "icon-size"],
        "var(--space-small) var(--space-large)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { inset: 8px 16px 4px; }",
      fixed:
        ".a { inset: var(--space-small) var(--space-large) var(--space-xsmall); }",
      message: messages.rejected(
        "8px 16px 4px",
        ["space", "size", "icon-size"],
        "var(--space-small) var(--space-large) var(--space-xsmall)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { inset: 8px 16px 4px 12px; }",
      fixed:
        ".a { inset: var(--space-small) var(--space-large) var(--space-xsmall) var(--space-medium); }",
      message: messages.rejected(
        "8px 16px 4px 12px",
        ["space", "size", "icon-size"],
        "var(--space-small) var(--space-large) var(--space-xsmall) var(--space-medium)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { inset-block: 2px; }",
      fixed: ".a { inset-block: var(--space-xxsmall); }",
      message: messages.rejected(
        "2px",
        ["space", "size", "icon-size"],
        "var(--space-xxsmall)"
      ),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { inset-block: 8px var(--space-large); }",
      fixed: ".a { inset-block: var(--space-small) var(--space-large); }",
      message: messages.rejected(
        "8px var(--space-large)",
        ["space", "size", "icon-size"],
        "var(--space-small) var(--space-large)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { inset-inline: 2px; }",
      fixed: ".a { inset-inline: var(--space-xxsmall); }",
      message: messages.rejected(
        "2px",
        ["space", "size", "icon-size"],
        "var(--space-xxsmall)"
      ),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { inset-inline: var(--space-small) 16px; }",
      fixed: ".a { inset-inline: var(--space-small) var(--space-large); }",
      message: messages.rejected(
        "var(--space-small) 16px",
        ["space", "size", "icon-size"],
        "var(--space-small) var(--space-large)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { inset-block-end: 2px; }",
      fixed: ".a { inset-block-end: var(--space-xxsmall); }",
      message: messages.rejected(
        "2px",
        ["space", "size", "icon-size"],
        "var(--space-xxsmall)"
      ),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { inset-block-start: 4px; }",
      fixed: ".a { inset-block-start: var(--space-xsmall); }",
      message: messages.rejected(
        "4px",
        ["space", "size", "icon-size"],
        "var(--space-xsmall)"
      ),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { inset-inline-end: 8px; }",
      fixed: ".a { inset-inline-end: var(--space-small); }",
      message: messages.rejected(
        "8px",
        ["space", "size", "icon-size"],
        "var(--space-small)"
      ),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { inset-inline-start: 12px; }",
      fixed: ".a { inset-inline-start: var(--space-medium); }",
      message: messages.rejected(
        "12px",
        ["space", "size", "icon-size"],
        "var(--space-medium)"
      ),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { top: 2px; }",
      fixed: ".a { top: var(--space-xxsmall); }",
      message: messages.rejected(
        "2px",
        ["space", "size", "icon-size"],
        "var(--space-xxsmall)"
      ),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { right: 4px; }",
      fixed: ".a { right: var(--space-xsmall); }",
      message: messages.rejected(
        "4px",
        ["space", "size", "icon-size"],
        "var(--space-xsmall)"
      ),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { bottom: 8px; }",
      fixed: ".a { bottom: var(--space-small); }",
      message: messages.rejected(
        "8px",
        ["space", "size", "icon-size"],
        "var(--space-small)"
      ),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { left: 32px; }",
      fixed: ".a { left: var(--space-xxlarge); }",
      message: messages.rejected(
        "32px",
        ["space", "size", "icon-size"],
        "var(--space-xxlarge)"
      ),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { gap: 2px; }",
      fixed: ".a { gap: var(--space-xxsmall); }",
      message: messages.rejected("2px", ["space"], "var(--space-xxsmall)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { gap: 24px 32px; }",
      fixed: ".a { gap: var(--space-xlarge) var(--space-xxlarge); }",
      message: messages.rejected(
        "24px 32px",
        ["space"],
        "var(--space-xlarge) var(--space-xxlarge)"
      ),
      description:
        "Space values in shorthand should be fixed to use a design token.",
    },
    {
      code: ".a { column-gap: 24px; }",
      fixed: ".a { column-gap: var(--space-xlarge); }",
      message: messages.rejected("24px", ["space"], "var(--space-xlarge)"),
      description: "Space value in px should be fixed to use a design token.",
    },
    {
      code: ".a { row-gap: 16px; }",
      fixed: ".a { row-gap: var(--space-large); }",
      message: messages.rejected("16px", ["space"], "var(--space-large)"),
      description: "Space value in px should be fixed to use a design token.",
    },
  ],
});
