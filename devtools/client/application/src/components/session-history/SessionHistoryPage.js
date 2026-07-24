/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.mjs");
const {
  createElement,
  PureComponent,
} = require("resource://devtools/client/shared/vendor/react.mjs");
const {
  div,
  section,
} = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const {
  connect,
} = require("resource://devtools/client/shared/vendor/react-redux.js");

const SessionHistoryDiagram = require("resource://devtools/client/application/src/components/session-history/SessionHistory.js");

class SessionHistoryPage extends PureComponent {
  static get propTypes() {
    return {
      count: PropTypes.number.isRequired,
      current: PropTypes.number.isRequired,
      rows: PropTypes.object.isRequired,
      entriesByKey: PropTypes.object.isRequired,
    };
  }

  render() {
    const { count, current, rows, entriesByKey } = this.props;
    return section(
      {
        className: `app-page js-session-history-page`,
      },
      div(
        { id: "diagram-container" },
        createElement(SessionHistoryDiagram, {
          count,
          current,
          rows,
          entriesByKey,
        })
      )
    );
  }
}

function mapStateToProps(state) {
  return { ...state.sessionHistory };
}

// Exports
module.exports = connect(mapStateToProps)(SessionHistoryPage);
