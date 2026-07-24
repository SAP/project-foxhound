/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

const {
  createElement,
  createFactory,
} = require("resource://devtools/client/shared/vendor/react.mjs");
const {
  PropTypes,
} = require("resource://devtools/client/shared/vendor/react-prop-types.mjs");
const {
  button,
} = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const FluentReact = require("resource://devtools/client/shared/vendor/fluent-react.js");
const Localized = createFactory(FluentReact.Localized);

function Diagram({ rows, entriesByKey }) {
  let ctr = 0;
  return createElement(
    "tbody",
    {},
    ...rows.map(row =>
      createElement(
        "tr",
        {},
        row.map(({ age, key, sameDocNav }) => {
          const id = `entry-info-container-${ctr++}`;
          const className = sameDocNav ? "same-document-nav" : "";
          return key
            ? createElement(
                "td",
                {
                  colSpan: age,
                  className,
                },
                Localized(
                  {
                    id: "session-history-entry-info-button-title",
                    attrs: {
                      title: true,
                    },
                  },
                  button(
                    {
                      popovertarget: id,
                    },
                    `${entriesByKey[key].url.pathname}${entriesByKey[key].url.search}`
                  )
                ),
                createElement(EntryInfo, { fields: entriesByKey[key], id })
              )
            : createElement("td", {
                colSpan: age,
              });
        })
      )
    )
  );
}

Diagram.propTypes = {
  rows: PropTypes.object.isRequired,
  entriesByKey: PropTypes.object.isRequired,
};

function EntryInfo({ fields, id }) {
  return createElement(
    "div",
    { id, popover: "auto" },
    createElement(
      `dl`,
      {},
      ...Object.entries(fields).flatMap(([key, value]) => [
        createElement("dt", {}, key),
        createElement(
          "dd",
          {},
          value instanceof Array
            ? createElement("ul", {
                children: value.map(child =>
                  createElement("li", {}, `${child}`)
                ),
              })
            : `${value}`
        ),
      ])
    )
  );
}

EntryInfo.propTypes = {
  entry: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
};

function SessionHistoryDiagram({ count, current, rows, entriesByKey }) {
  const header = new Array(count);
  for (let index = 0; index < count; index++) {
    const props = index == current ? { id: "current" } : {};
    header.push(createElement("th", props, index));
  }

  return createElement(
    `table`,
    {},
    createElement("thead", {}, createElement("tr", {}, ...header)),
    createElement(Diagram, {
      rows,
      entriesByKey,
    })
  );
}

SessionHistoryDiagram.propTypes = {
  count: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
  rows: PropTypes.object.isRequired,
  entriesByKey: PropTypes.object.isRequired,
};

// Exports
module.exports = SessionHistoryDiagram;
