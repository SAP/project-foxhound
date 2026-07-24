/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// InactivePropertyHelper: block, flex, and grid container test cases.
const tests = [];
const properties = [
  "overflow",
  "overflow-block",
  "overflow-inline",
  "overflow-x",
  "overflow-y",
];
properties.forEach(property => {
  tests.push(
    ...createDisplayTests(
      property,
      [
        "block",
        "block ruby",
        "flex",
        "flow-root",
        "flow-root list-item",
        "grid",
        "inline flow-root list-item",
        "inline-block",
        "inline-flex",
        "inline-grid",
        "list-item",
        "table-caption",
        "table-cell",
      ],
      true
    ),
    ...createDisplayTests(
      property,
      [
        "contents",
        "inline",
        "inline list-item",
        "inline-table",
        "none",
        "ruby",
        "ruby-base",
        "ruby-base-container",
        "ruby-text",
        "ruby-text-container",
        "table",
        "table-column",
        "table-column-group",
        "table-footer-group",
        "table-header-group",
        "table-row",
        "table-row-group",
      ],
      false
    )
  );
});

function createDisplayTests(property, displayValues, active) {
  return displayValues.map(displayValue => {
    return {
      info: `${property} is ${
        active ? "active" : "inactive"
      } on an element with display: ${displayValue}`,
      property,
      tagName: "div",
      rules: [
        `div { display: ${displayValue}; overflow: hidden; ${property}: initial; }`,
      ],
      isActive: active,
    };
  });
}

export default tests;
