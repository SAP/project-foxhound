/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import React, { PureComponent } from "devtools/client/shared/vendor/react";
import PropTypes from "devtools/client/shared/vendor/react-prop-types";

import { connect } from "devtools/client/shared/vendor/react-redux";

import DebuggerImage from "./DebuggerImage";

import { getSourceClassnames } from "../../utils/source";
import { isSourceBlackBoxed } from "../../selectors/index";

class SourceIcon extends PureComponent {
  static get propTypes() {
    return {
      className: PropTypes.string,
      modifier: PropTypes.func,
      location: PropTypes.object.isRequired,
      iconName: PropTypes.string,
    };
  }

  render() {
    const { className, modifier } = this.props;
    let { iconName } = this.props;

    if (modifier) {
      const modified = modifier(iconName);
      if (!modified) {
        return null;
      }
      iconName = modified;
    }

    return React.createElement(DebuggerImage, {
      name: iconName,
      // Append the optional className to the default "source-icon" class.
      className: `source-icon${className ? ` ${className}` : ""}`,
    });
  }
}

export default connect((state, props) => {
  const { location } = props;
  const isBlackBoxed = isSourceBlackBoxed(state, location.source);

  // This is the key function that will compute the icon type,
  // In addition to the "modifier" implemented by each callsite.
  const iconName = getSourceClassnames(location.source, isBlackBoxed);

  return {
    iconName,
  };
})(SourceIcon);
