/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import React from "devtools/client/shared/vendor/react";
import PropTypes from "devtools/client/shared/vendor/react-prop-types";

const classnames = require("resource://devtools/client/shared/classnames.js");

const DebuggerImage = props => {
  const { name, className, ...attributes } = props;

  // The DebuggerImage name is prefixed with "dbg-img-", and therefore it should
  // not contain any space, otherwise the second word would unexpectedly not be
  // prefixed.
  if (/\s/.test(name)) {
    throw new Error(
      `DebuggerImage name should not contain any space character ("${name}").` +
        ` Use the className property for optional classes.`
    );
  }

  return React.createElement("span", {
    ...attributes,
    className: classnames("dbg-img", `dbg-img-${name}`, className),
  });
};

DebuggerImage.propTypes = {
  name: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default DebuggerImage;
