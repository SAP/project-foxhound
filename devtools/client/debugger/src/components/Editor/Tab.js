/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import React, { PureComponent } from "devtools/client/shared/vendor/react";
import { div, span } from "devtools/client/shared/vendor/react-dom-factories";
import PropTypes from "devtools/client/shared/vendor/react-prop-types";
import { connect } from "devtools/client/shared/vendor/react-redux";

import SourceIcon from "../shared/SourceIcon";
import { CloseButton } from "../shared/Button/index";

import actions from "../../actions/index";

import {
  getDisplayPath,
  getFileURL,
  getTruncatedFileName,
} from "../../utils/source";
import { createLocation } from "../../utils/location";

import {
  getSelectedLocation,
  isSourceBlackBoxed,
  getOpenedSources,
} from "../../selectors/index";

const classnames = require("resource://devtools/client/shared/classnames.js");

class Tab extends PureComponent {
  static get propTypes() {
    return {
      closeTabForSource: PropTypes.func.isRequired,
      onDragEnd: PropTypes.func.isRequired,
      onDragOver: PropTypes.func.isRequired,
      onDragStart: PropTypes.func.isRequired,
      selectSource: PropTypes.func.isRequired,
      source: PropTypes.object.isRequired,
      isBlackBoxed: PropTypes.bool.isRequired,
    };
  }

  onContextMenu = event => {
    event.preventDefault();
    this.props.showTabContextMenu(event, this.props.source);
  };

  isSourceSearchEnabled() {
    return this.props.activeSearch === "source";
  }

  render() {
    const {
      selectSource,
      closeTabForSource,
      source,
      onDragOver,
      onDragStart,
      onDragEnd,
      index,
      isActive,
    } = this.props;

    function onClickClose(e) {
      e.stopPropagation();
      closeTabForSource(source);
    }

    function handleTabClick(e) {
      e.preventDefault();
      e.stopPropagation();
      return selectSource(source);
    }

    const className = classnames("source-tab", {
      active: isActive,
      blackboxed: this.props.isBlackBoxed,
    });

    const path = getDisplayPath(source, this.props.openedSources);
    return div(
      {
        draggable: true,
        onDragOver,
        onDragStart,
        onDragEnd,
        className,
        "data-index": index,
        "data-source-id": source.id,
        onClick: handleTabClick,
        // Accommodate middle click to close tab
        onMouseUp: e => e.button === 1 && closeTabForSource(source),
        onContextMenu: this.onContextMenu,
        title: getFileURL(source, false),
      },
      React.createElement(SourceIcon, {
        location: createLocation({
          source,
        }),
      }),
      div(
        {
          className: "filename",
        },
        getTruncatedFileName(source),
        path && span(null, `../${path}/..`)
      ),
      React.createElement(CloseButton, {
        handleClick: onClickClose,
        tooltip: L10N.getStr("sourceTabs.closeTabButtonTooltip"),
      })
    );
  }
}

const mapStateToProps = (state, { source }) => {
  const selectedSource = getSelectedLocation(state)?.source;
  // When a pretty printed source is selected, we should check if the related minimized/generated source is opened in a tab.
  const isActive = selectedSource?.isPrettyPrinted
    ? selectedSource.generatedSource == source
    : selectedSource == source;
  return {
    isBlackBoxed: isSourceBlackBoxed(state, source),
    isActive,
    openedSources: getOpenedSources(state),
  };
};

export default connect(
  mapStateToProps,
  {
    selectSource: actions.selectSource,
    closeTabForSource: actions.closeTabForSource,
    showTabContextMenu: actions.showTabContextMenu,
  },
  null,
  {
    withRef: true,
  }
)(Tab);
