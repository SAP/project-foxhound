/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

"use strict";

const React = require("devtools/client/shared/vendor/react");
const { button } = require("devtools/client/shared/vendor/react-dom-factories");
const PropTypes = require("devtools/client/shared/vendor/react-prop-types");

const DebuggerImage = require("devtools/client/shared/components/DebuggerImage");

function CloseButton({ handleClick, buttonClass, tooltip }) {
  return button(
    {
      className: buttonClass ? `close-btn ${buttonClass}` : "close-btn",
      onClick: handleClick,
      title: tooltip,
    },
    React.createElement(DebuggerImage, {
      name: "close",
    })
  );
}

CloseButton.propTypes = {
  buttonClass: PropTypes.string,
  handleClick: PropTypes.func.isRequired,
  tooltip: PropTypes.string,
};

module.exports = CloseButton;
