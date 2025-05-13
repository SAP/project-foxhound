/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

/**
 * Uses of this panel are:-
 * - Highlighting lines of a function selected to be copied using the "Copy function" context menu in the Outline panel
 */

import { Component } from "devtools/client/shared/vendor/react";
import PropTypes from "devtools/client/shared/vendor/react-prop-types";
import { features } from "../../utils/prefs";
import { markerTypes } from "../../constants";

class HighlightLines extends Component {
  static get propTypes() {
    return {
      editor: PropTypes.object.isRequired,
      range: PropTypes.object.isRequired,
    };
  }

  componentDidMount() {
    this.highlightLineRange();
  }

  // FIXME: https://bugzilla.mozilla.org/show_bug.cgi?id=1774507
  UNSAFE_componentWillUpdate() {
    this.clearHighlightRange();
  }

  componentDidUpdate() {
    this.highlightLineRange();
  }

  componentWillUnmount() {
    this.clearHighlightRange();
  }

  clearHighlightRange() {
    const { range, editor } = this.props;

    if (!range) {
      return;
    }

    if (features.codemirrorNext) {
      if (editor) {
        editor.removeLineContentMarker("multi-highlight-line-marker");
      }
      return;
    }

    const { codeMirror } = editor;
    if (!codeMirror) {
      return;
    }

    const { start, end } = range;
    codeMirror.operation(() => {
      for (let line = start - 1; line < end; line++) {
        codeMirror.removeLineClass(line, "wrap", "highlight-lines");
      }
    });
  }

  highlightLineRange = () => {
    const { range, editor } = this.props;

    if (!range) {
      return;
    }

    if (features.codemirrorNext) {
      if (editor) {
        editor.scrollTo(range.start, 0);
        const lines = [];
        for (let line = range.start; line <= range.end; line++) {
          lines.push({ line });
        }
        editor.setLineContentMarker({
          id: markerTypes.MULTI_HIGHLIGHT_LINE_MARKER,
          lineClassName: "highlight-lines",
          lines,
        });
      }
      return;
    }

    const { codeMirror } = editor;
    if (!codeMirror) {
      return;
    }

    const { start, end } = range;
    codeMirror.operation(() => {
      editor.alignLine(start);
      for (let line = start - 1; line < end; line++) {
        codeMirror.addLineClass(line, "wrap", "highlight-lines");
      }
    });
  };

  render() {
    return null;
  }
}

export default HighlightLines;
