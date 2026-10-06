/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// InactivePropertyHelper: block container test cases.
const tests = [];
const properties = ["text-overflow"];
properties.forEach(property => {
  tests.push(
    ...createDisplayTests(
      property,
      [
        "block",
        "block ruby",
        "flow-root",
        "flow-root list-item",
        "inline flow-root list-item",
        "inline-block",
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
        "flex",
        "grid",
        "inline",
        "inline list-item",
        "inline-flex",
        "inline-grid",
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
