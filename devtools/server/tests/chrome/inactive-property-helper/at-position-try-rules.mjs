/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
  InactivePropertyHelper `@position-try`
  - position-anchor
  - position-area
  - Inset property descriptors
    - top
    - left
    - bottom
    - right
    - inset-block-start
    - inset-block-end
    - inset-inline-start
    - inset-inline-end
    - inset-block
    - inset-inline
    - inset
  - Margin property descriptors:
    - margin-top
    - margin-left
    - margin-bottom
    - margin-right
    - margin-block-start
    - margin-block-end
    - margin-inline-start
    - margin-inline-end
    - margin
    - margin-block
    - margin-inline
  - Sizing property descriptors:
    - width
    - height
    - min-width
    - min-height
    - max-width
    - max-height
    - block-size
    - inline-size
    - min-block-size
    - min-inline-size
    - max-block-size
    - max-inline-size
  - Self-alignment property descriptors:
    - align-self
    - justify-self
    - place-self
*/

export default [
  {
    info: "color is inactive in @position-try",
    property: "color",
    tagName: "div",
    rules: ["@position-try --pt { color: tomato; }"],
    isActive: false,
    expectedMsgId: "inactive-css-at-position-try-not-supported",
  },
  {
    info: "background is inactive in @position-try",
    property: "background",
    tagName: "div",
    rules: ["@position-try --pt { background: gold; }"],
    isActive: false,
    expectedMsgId: "inactive-css-at-position-try-not-supported",
  },
  {
    info: "top is still inactive on non-fixed element",
    property: "top",
    tagName: "div",
    rules: ["@position-try --pt { top: 0; }"],
    isActive: false,
  },
  {
    info: "custom property are inactive in @position-try",
    property: "--my-var",
    tagName: "div",
    rules: ["@position-try --pt { --my-var: red; }"],
    isActive: false,
  },
  {
    info: "position-anchor is active in @position-try",
    property: "position-anchor",
    tagName: "div",
    rules: ["@position-try --pt { position-anchor: auto; }"],
    isActive: true,
  },
  {
    info: "position-area is active in @position-try",
    property: "position-area",
    tagName: "div",
    rules: ["@position-try --pt { position-area: top left; }"],
    isActive: true,
  },
  {
    info: "top is active in @position-try",
    property: "top",
    tagName: "div",
    rules: ["@position-try --pt { top: 0; }", "div { position: fixed; }"],
    isActive: true,
  },
  {
    info: "left is active in @position-try",
    property: "left",
    tagName: "div",
    rules: ["@position-try --pt { left: 0; }", "div { position: fixed; }"],
    isActive: true,
  },
  {
    info: "bottom is active in @position-try",
    property: "bottom",
    tagName: "div",
    rules: ["@position-try --pt { bottom: 0; }", "div { position: fixed; }"],
    isActive: true,
  },
  {
    info: "right is active in @position-try",
    property: "right",
    tagName: "div",
    rules: ["@position-try --pt { right: 0; }", "div { position: fixed; }"],
    isActive: true,
  },
  {
    info: "inset-block-start is active in @position-try",
    property: "inset-block-start",
    tagName: "div",
    rules: [
      "@position-try --pt { inset-block-start: 0; }",
      "div { position: fixed; }",
    ],
    isActive: true,
  },
  {
    info: "inset-block-end is active in @position-try",
    property: "inset-block-end",
    tagName: "div",
    rules: [
      "@position-try --pt { inset-block-end: 0; }",
      "div { position: fixed; }",
    ],
    isActive: true,
  },
  {
    info: "inset-inline-start is active in @position-try",
    property: "inset-inline-start",
    tagName: "div",
    rules: [
      "@position-try --pt { inset-inline-start: 0; }",
      "div { position: fixed; }",
    ],
    isActive: true,
  },
  {
    info: "inset-inline-end is active in @position-try",
    property: "inset-inline-end",
    tagName: "div",
    rules: [
      "@position-try --pt { inset-inline-end: 0; }",
      "div { position: fixed; }",
    ],
    isActive: true,
  },
  {
    info: "inset-block is active in @position-try",
    property: "inset-block",
    tagName: "div",
    rules: [
      "@position-try --pt { inset-block: 0; }",
      "div { position: fixed; }",
    ],
    isActive: true,
  },
  {
    info: "inset-inline is active in @position-try",
    property: "inset-inline",
    tagName: "div",
    rules: [
      "@position-try --pt { inset-inline: 0; }",
      "div { position: fixed; }",
    ],
    isActive: true,
  },
  {
    info: "inset is active in @position-try",
    property: "inset",
    tagName: "div",
    rules: ["@position-try --pt { inset: 0; }", "div { position: fixed; }"],
    isActive: true,
  },
  {
    info: "margin-top is active in @position-try",
    property: "margin-top",
    tagName: "div",
    rules: ["@position-try --pt { margin-top: 10px; }"],
    isActive: true,
  },
  {
    info: "margin-left is active in @position-try",
    property: "margin-left",
    tagName: "div",
    rules: ["@position-try --pt { margin-left: 10px; }"],
    isActive: true,
  },
  {
    info: "margin-bottom is active in @position-try",
    property: "margin-bottom",
    tagName: "div",
    rules: ["@position-try --pt { margin-bottom: 10px; }"],
    isActive: true,
  },
  {
    info: "margin-right is active in @position-try",
    property: "margin-right",
    tagName: "div",
    rules: ["@position-try --pt { margin-right: 10px; }"],
    isActive: true,
  },
  {
    info: "margin-block-start is active in @position-try",
    property: "margin-block-start",
    tagName: "div",
    rules: ["@position-try --pt { margin-block-start: 10px; }"],
    isActive: true,
  },
  {
    info: "margin-block-end is active in @position-try",
    property: "margin-block-end",
    tagName: "div",
    rules: ["@position-try --pt { margin-block-end: 10px; }"],
    isActive: true,
  },
  {
    info: "margin-inline-start is active in @position-try",
    property: "margin-inline-start",
    tagName: "div",
    rules: ["@position-try --pt { margin-inline-start: 10px; }"],
    isActive: true,
  },
  {
    info: "margin-inline-end is active in @position-try",
    property: "margin-inline-end",
    tagName: "div",
    rules: ["@position-try --pt { margin-inline-end: 10px; }"],
    isActive: true,
  },
  {
    info: "margin is active in @position-try",
    property: "margin",
    tagName: "div",
    rules: ["@position-try --pt { margin: 10px; }"],
    isActive: true,
  },
  {
    info: "margin-block is active in @position-try",
    property: "margin-block",
    tagName: "div",
    rules: ["@position-try --pt { margin-block: 10px; }"],
    isActive: true,
  },
  {
    info: "margin-inline is active in @position-try",
    property: "margin-inline",
    tagName: "div",
    rules: ["@position-try --pt { margin-inline: 10px; }"],
    isActive: true,
  },
  {
    info: "width is active in @position-try",
    property: "width",
    tagName: "div",
    rules: ["@position-try --pt { width: 200px; }"],
    isActive: true,
  },
  {
    info: "height is active in @position-try",
    property: "height",
    tagName: "div",
    rules: ["@position-try --pt { height: 200px; }"],
    isActive: true,
  },
  {
    info: "min-width is active in @position-try",
    property: "min-width",
    tagName: "div",
    rules: ["@position-try --pt { min-width: 200px; }"],
    isActive: true,
  },
  {
    info: "min-height is active in @position-try",
    property: "min-height",
    tagName: "div",
    rules: ["@position-try --pt { min-height: 200px; }"],
    isActive: true,
  },
  {
    info: "max-width is active in @position-try",
    property: "max-width",
    tagName: "div",
    rules: ["@position-try --pt { max-width: 200px; }"],
    isActive: true,
  },
  {
    info: "max-height is active in @position-try",
    property: "max-height",
    tagName: "div",
    rules: ["@position-try --pt { max-height: 200px; }"],
    isActive: true,
  },
  {
    info: "block-size is active in @position-try",
    property: "block-size",
    tagName: "div",
    rules: ["@position-try --pt { block-size: 200px; }"],
    isActive: true,
  },
  {
    info: "inline-size is active in @position-try",
    property: "inline-size",
    tagName: "div",
    rules: ["@position-try --pt { inline-size: 200px; }"],
    isActive: true,
  },
  {
    info: "min-block-size is active in @position-try",
    property: "min-block-size",
    tagName: "div",
    rules: ["@position-try --pt { min-block-size: 200px; }"],
    isActive: true,
  },
  {
    info: "min-inline-size is active in @position-try",
    property: "min-inline-size",
    tagName: "div",
    rules: ["@position-try --pt { min-inline-size: 200px; }"],
    isActive: true,
  },
  {
    info: "max-block-size is active in @position-try",
    property: "max-block-size",
    tagName: "div",
    rules: ["@position-try --pt { max-block-size: 200px; }"],
    isActive: true,
  },
  {
    info: "max-inline-size is active in @position-try",
    property: "max-inline-size",
    tagName: "div",
    rules: ["@position-try --pt { max-inline-size: 200px; }"],
    isActive: true,
  },
  {
    info: "align-self is active in @position-try",
    property: "align-self",
    tagName: "div",
    rules: [
      "@position-try --pt { align-self: center; }",
      "div { position: fixed; }",
    ],
    isActive: true,
  },
  {
    info: "justify-self is active in @position-try",
    property: "justify-self",
    tagName: "div",
    rules: [
      "@position-try --pt { justify-self: center; }",
      "div { position: fixed; }",
    ],
    isActive: true,
  },
  {
    info: "place-self is active in @position-try",
    property: "place-self",
    tagName: "div",
    rules: [
      "@position-try --pt { place-self: center; }",
      "div { position: fixed; }",
    ],
    isActive: true,
  },
];
