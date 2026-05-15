/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// InactivePropertyHelper: `anchor-name` test cases.
const tests = [
  ...createDisplayTests(
    [
      "block",
      "block ruby",
      "flex",
      "flow-root",
      "flow-root list-item",
      "grid",
      "inherit",
      "inline flow-root list-item",
      "inline-block",
      "inline-flex",
      "inline-grid",
      "list-item",
      "table-caption",
      "initial",
      "inline",
      "inline list-item",
      "inline-table",
      "ruby",
      "ruby-base",
      "ruby-base-container",
      "ruby-text",
      "ruby-text-container",
      "table",
      "table-cell",
      "table-column",
      "table-column-group",
      "table-footer-group",
      "table-header-group",
      "table-row",
      "table-row-group",
      "unset",
    ],
    true
  ),
  ...createDisplayTests(["none", "contents"], false),
  {
    info: "anchor-name is active on replaced element",
    property: "anchor-name",
    tagName: "img",
    rules: ["img { anchor-name: --anchor; display: block; }"],
    isActive: true,
  },
];

function createDisplayTests(displayValues, active) {
  return displayValues.map(displayValue => {
    return {
      info: `anchor-name is ${
        active ? "active" : "inactive"
      } on an element with display: ${displayValue}`,
      property: "anchor-name",
      tagName: "div",
      rules: [`div { display: ${displayValue}; anchor-name: --anchor; }`],
      isActive: active,
    };
  });
}

export default tests;
