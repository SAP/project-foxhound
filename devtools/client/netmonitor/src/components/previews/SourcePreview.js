/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";
const {
  Component,
} = require("resource://devtools/client/shared/vendor/react.mjs");
const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.mjs");
const {
  connect,
} = require("resource://devtools/client/shared/vendor/react-redux.js");
const dom = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const Editor = require("resource://devtools/client/shared/sourceeditor/editor.js");
const {
  setTargetSearchResult,
} = require("resource://devtools/client/netmonitor/src/actions/search.js");
const { div } = dom;
/**
 * CodeMirror editor as a React component
 */
class SourcePreview extends Component {
  static get propTypes() {
    return {
      // Source editor syntax highlight mimeType, which is a mime type defined in CodeMirror
      mimeType: PropTypes.string,
      // Source editor content
      text: PropTypes.string,
      // Search result text to select
      targetSearchResult: PropTypes.object,
      // Reset target search result that has been used for navigation in this panel.
      // This is done to avoid second navigation the next time.
      resetTargetSearchResult: PropTypes.func,
      url: PropTypes.string,
    };
  }

  componentDidMount() {
    this.loadEditor();
    this.updateEditor();
  }

  shouldComponentUpdate(nextProps) {
    return (
      nextProps.mimeType !== this.props.mimeType ||
      nextProps.text !== this.props.text ||
      nextProps.targetSearchResult !== this.props.targetSearchResult
    );
  }

  componentDidUpdate(prevProps) {
    const { targetSearchResult, text } = this.props;
    if (prevProps.text !== text) {
      // When updating from editor to editor
      this.updateEditor();
    } else if (prevProps.targetSearchResult !== targetSearchResult) {
      this.findSearchResult();
    }
  }

  componentWillUnmount() {
    this.unloadEditor();
  }

  getSourceEditorModeForMimetype(mimeType) {
    const lang = mimeType.split("/")[1];
    return Editor.modes[lang];
  }

  loadEditor() {
    this.editor = new Editor({
      cm6: true,
      lineNumbers: true,
      lineWrapping: false,
      disableSearchAddon: false,
      useSearchAddonPanel: true,
      mode: null, // Disable auto syntax detection, but then we set the mode later
      readOnly: true,
      theme: "mozilla",
      value: "",
    });

    this.editor.appendToLocalElement(this.refs.editorElement);
    // Used for netmonitor tests
    window.codeMirrorSourceEditorTestInstance = this.editor;
  }

  async updateEditor() {
    const { mimeType, text, url } = this.props;
    if (this?.editor?.hasCodeMirror) {
      const mode = this.getSourceEditorModeForMimetype(mimeType);
      await this.editor.setMode(mode);
      await this.editor.setText(text, { documentId: url });
      // When navigating from the netmonitor search, find and highlight the
      // the current search result.
      await this.findSearchResult();
    }
  }

  unloadEditor() {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  }

  async findSearchResult() {
    const { targetSearchResult, resetTargetSearchResult } = this.props;
    if (targetSearchResult?.line) {
      const { line } = targetSearchResult;
      // scroll the editor to center the line
      // with the target search result
      if (this.editor) {
        await this.editor.setCursorAt(line, 0);

        // Highlight line
        this.editor.setLineContentMarker({
          id: this.editor.markerTypes.HIGHLIGHT_LINE_MARKER,
          lineClassName: "highlight-line",
          lines: [{ line }],
        });
        this.clearHighlightLineAfterDuration();
      }
    }

    resetTargetSearchResult();
  }

  clearHighlightLineAfterDuration() {
    const editorContainer = document.querySelector(".editor-row-container");

    if (editorContainer === null) {
      return;
    }

    const duration = parseInt(
      getComputedStyle(editorContainer).getPropertyValue(
        "--highlight-line-duration"
      ),
      10
    );

    const highlightTimeout = setTimeout(() => {
      if (!this.editor) {
        return;
      }
      clearTimeout(highlightTimeout);
      this.editor.removeLineContentMarker("highlight-line-marker");
    }, duration);
  }

  render() {
    return div(
      { className: "editor-row-container" },
      div({
        ref: "editorElement",
        className: "source-editor-mount devtools-monospace",
      })
    );
  }
}

module.exports = connect(
  state => {
    if (!state.search) {
      return null;
    }
    return {
      targetSearchResult: state.search.targetSearchResult,
    };
  },
  dispatch => ({
    resetTargetSearchResult: () => dispatch(setTargetSearchResult(null)),
  })
)(SourcePreview);
