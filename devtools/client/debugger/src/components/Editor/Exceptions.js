/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import React, { Component } from "devtools/client/shared/vendor/react";
import PropTypes from "devtools/client/shared/vendor/react-prop-types";
import { connect } from "devtools/client/shared/vendor/react-redux";

import { getDocument } from "../../utils/editor/index";
import { markerTypes } from "../../constants";
import { features } from "../../utils/prefs";

import Exception from "./Exception";

import {
  getSelectedSource,
  getSelectedSourceExceptions,
} from "../../selectors/index";

class Exceptions extends Component {
  static get propTypes() {
    return {
      exceptions: PropTypes.array,
      selectedSource: PropTypes.object,
      editor: PropTypes.object,
    };
  }

  componentDidMount() {
    this.setMarkers();
  }

  componentDidUpdate(prevProps) {
    this.clearMarkers(prevProps);
    this.setMarkers();
  }

  componentWillUnmount() {
    this.clearMarkers();
  }

  clearMarkers(prevProps) {
    const { exceptions, selectedSource, editor } = this.props;
    if (!features.codemirrorNext || !editor) {
      return;
    }

    if (
      !selectedSource ||
      !exceptions.length ||
      prevProps?.selectedSource !== selectedSource
    ) {
      editor.removeLineContentMarker(markerTypes.LINE_EXCEPTION_MARKER);
      editor.removePositionContentMarker(markerTypes.EXCEPTION_POSITION_MARKER);
    }
  }

  setMarkers() {
    const { exceptions, selectedSource, editor } = this.props;
    if (
      !features.codemirrorNext ||
      !selectedSource ||
      !editor ||
      !exceptions.length
    ) {
      return;
    }

    editor.setLineContentMarker({
      id: markerTypes.LINE_EXCEPTION_MARKER,
      lineClassName: "line-exception",
      lines: exceptions.map(e => ({ line: e.lineNumber })),
    });

    editor.setPositionContentMarker({
      id: markerTypes.EXCEPTION_POSITION_MARKER,
      positionClassName: "mark-text-exception",
      positions: exceptions.map(e => ({
        line: e.lineNumber,
        // Exceptions are reported with column being 1-based
        // while the frontend uses 0-based column.
        column: e.columnNumber - 1,
      })),
    });
  }

  render() {
    const { exceptions, selectedSource } = this.props;

    if (features.codemirrorNext) {
      return null;
    }

    if (!selectedSource || !exceptions.length) {
      return null;
    }

    const doc = getDocument(selectedSource.id);
    return React.createElement(
      React.Fragment,
      null,
      exceptions.map(exception =>
        React.createElement(Exception, {
          exception,
          doc,
          key: `${exception.sourceActorId}:${exception.lineNumber}`,
          selectedSource,
        })
      )
    );
  }
}

export default connect(state => {
  const selectedSource = getSelectedSource(state);

  // Avoid calling getSelectedSourceExceptions when there is no source selected.
  if (!selectedSource) {
    return {};
  }

  // Avoid causing any update until we start having exceptions
  const exceptions = getSelectedSourceExceptions(state);
  if (!exceptions.length) {
    return {};
  }

  return {
    exceptions: getSelectedSourceExceptions(state),
    selectedSource,
  };
})(Exceptions);
