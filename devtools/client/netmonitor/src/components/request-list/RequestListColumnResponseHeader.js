/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  Component,
} = require("resource://devtools/client/shared/vendor/react.js");
const dom = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.js");
const {
  getResponseHeader,
  fetchNetworkUpdatePacket,
} = require("resource://devtools/client/netmonitor/src/utils/request-utils.js");

/**
 * Renders a response header column in the requests list.  The actual
 * header to show is passed as a prop.
 */
class RequestListColumnResponseHeader extends Component {
  static get propTypes() {
    return {
      connector: PropTypes.object.isRequired,
      item: PropTypes.object.isRequired,
      header: PropTypes.string.isRequired,
    };
  }

  componentDidMount() {
    const { item, connector } = this.props;
    fetchNetworkUpdatePacket(connector.requestData, item, ["responseHeaders"]);
  }

  // FIXME: https://bugzilla.mozilla.org/show_bug.cgi?id=1774507
  UNSAFE_componentWillReceiveProps(nextProps) {
    const { item, connector } = nextProps;
    fetchNetworkUpdatePacket(connector.requestData, item, ["responseHeaders"]);
  }

  shouldComponentUpdate(nextProps) {
    const currHeader = getResponseHeader(this.props.item, this.props.header);
    const nextHeader = getResponseHeader(nextProps.item, nextProps.header);
    return currHeader !== nextHeader;
  }

  render() {
    const header = getResponseHeader(this.props.item, this.props.header);
    return dom.td(
      {
        className: "requests-list-column requests-list-response-header",
        title: header,
      },
      header
    );
  }
}

module.exports = RequestListColumnResponseHeader;
