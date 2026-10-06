/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import PropTypes from "devtools/client/shared/vendor/react-prop-types";
import React, { Component } from "devtools/client/shared/vendor/react";

import FileSearchBar from "devtools/client/shared/components/FileSearchBar";
import CloseButton from "devtools/client/shared/components/CloseButton";

class FileSearch extends Component {
  static contextTypes = {
    shortcuts: PropTypes.object,
  };

  static get propTypes() {
    return {
      editor: PropTypes.object.isRequired,
      selectedSource: PropTypes.object.isRequired,
      modifiers: PropTypes.object.isRequired,
      textContent: PropTypes.object,
      searchInFileEnabled: PropTypes.bool.isRequired,
      shouldScroll: PropTypes.bool.isRequired,
      setActiveSearch: PropTypes.func.isRequired,
      closeFileSearch: PropTypes.func.isRequired,
      querySearchWorker: PropTypes.func.isRequired,
      selectLocation: PropTypes.func.isRequired,
      createLocation: PropTypes.func.isRequired,
      clearSearchEditor: PropTypes.func.isRequired,
      find: PropTypes.func.isRequired,
      findNext: PropTypes.func.isRequired,
      findPrev: PropTypes.func.isRequired,
      searchKey: PropTypes.string.isRequired,
      scrollList: PropTypes.func.isRequired,
    };
  }

  shouldComponentUpdate(nextProps) {
    return (
      this.props.selectedSource?.id !== nextProps.selectedSource?.id ||
      this.props.textContent !== nextProps.textContent ||
      this.props.searchInFileEnabled !== nextProps.searchInFileEnabled ||
      this.props.shouldScroll !== nextProps.shouldScroll ||
      this.props.editor !== nextProps.editor
    );
  }

  /**
   * Ensure showing the search result in CodeMirror editor,
   * and setting the cursor at the end of the matched string.
   *
   * @param {number} line
   * @param {number} ch
   * @param {string} matchContent
   */
  setCursorLocation = (line, ch, matchContent) => {
    this.props.selectLocation(
      this.props.createLocation({
        source: this.props.selectedSource,
        line: line + 1,
        column: ch + matchContent.length,
      }),
      {
        // Reset the context, so that we don't switch to original
        // while moving the cursor within a bundle
        keepContext: false,

        // Avoid highlighting the selected line
        highlight: false,

        // We should ensure showing the search result by scrolling it
        // into the viewport.
        // We won't be scrolling when receiving redux updates and we are paused.
        scroll: true,
      }
    );
  };

  render() {
    return React.createElement(FileSearchBar, {
      setCursorLocation: this.setCursorLocation,
      ...this.props,
      shortcuts: this.context.shortcuts,
      CloseButton,
    });
  }
}

export default FileSearch;
