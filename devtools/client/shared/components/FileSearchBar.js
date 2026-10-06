/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

"use strict";

const React = require("devtools/client/shared/vendor/react");
const { Component } = React;

const PropTypes = require("devtools/client/shared/vendor/react-prop-types");
const { div } = require("devtools/client/shared/vendor/react-dom-factories");

const { PluralForm } = require("resource://devtools/shared/plural-form.js");
const { debounce } = require("resource://devtools/shared/debounce.js");

const SearchInput = require("devtools/client/shared/components/SearchInput");

const { LocalizationHelper } = require("resource://devtools/shared/l10n.js");
const locale = new LocalizationHelper(
  "devtools/client/locales/components.properties"
);

const SEARCH_IN_FILE_SHORTCUT = locale.getStr("sourceSearch.search.key2");

class FileSearchBar extends Component {
  static get propTypes() {
    return {
      closeFileSearch: PropTypes.func.isRequired,
      editor: PropTypes.object,
      modifiers: PropTypes.object.isRequired,
      searchInFileEnabled: PropTypes.bool.isRequired,
      setCursorLocation: PropTypes.func.isRequired,
      textContent: PropTypes.object,
      setActiveSearch: PropTypes.func.isRequired,
      querySearchWorker: PropTypes.func.isRequired,
      shortcuts: PropTypes.object,
      searchKey: PropTypes.string.isRequired,
      shouldScroll: PropTypes.bool.isRequired,
      scrollList: PropTypes.func.isRequired,
      clearSearchEditor: PropTypes.func.isRequired,
      find: PropTypes.func.isRequired,
      findNext: PropTypes.func.isRequired,
      findPrev: PropTypes.func.isRequired,
      setSearchOptions: PropTypes.func.isRequired,
      searchOptions: PropTypes.object.isRequired,
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      query: "",
      selectedResultIndex: 0,
      results: {
        matches: [],
        matchIndex: -1,
        count: 0,
        index: -1,
      },
      inputFocused: false,
    };
  }

  componentDidMount() {
    // overwrite this.doSearch with debounced version to
    // reduce frequency of queries
    this.doSearch = debounce(this.doSearch, 100);

    const { shortcuts } = this.props;
    if (!shortcuts) {
      return;
    }

    shortcuts.on(SEARCH_IN_FILE_SHORTCUT, this.toggleSearch);
    shortcuts.on("Escape", this.onEscape);
  }

  componentDidUpdate(prevProps) {
    if (this.refs.resultList && this.refs.resultList.refs) {
      this.props.scrollList(
        this.refs.resultList.refs,
        this.state.selectedResultIndex
      );
    }

    const { query } = this.state;
    const didEnableSearch =
      !prevProps.searchInFileEnabled && this.props.searchInFileEnabled;
    const didTextContentChange =
      prevProps.textContent !== this.props.textContent;

    if (
      query &&
      (didEnableSearch ||
        (this.props.searchInFileEnabled && didTextContentChange))
    ) {
      this.doSearch(query, this.props.shouldScroll);
    }
  }

  componentWillUnmount() {
    const { shortcuts } = this.props;

    if (shortcuts) {
      shortcuts.off(SEARCH_IN_FILE_SHORTCUT, this.toggleSearch);
      shortcuts.off("Escape", this.onEscape);
    }

    if (this.doSearch?.cancel) {
      this.doSearch.cancel();
    }
  }

  onEscape = e => {
    this.closeSearch(e);
  };

  clearSearch = () => {
    const { editor } = this.props;
    if (!editor) {
      return;
    }
    editor.clearSearchMatches();
    editor.removePositionContentMarker("active-selection-marker");
  };

  closeSearch = e => {
    const { closeFileSearch, editor, searchInFileEnabled } = this.props;
    this.clearSearch();

    if (editor && searchInFileEnabled) {
      closeFileSearch();
      e.stopPropagation();
      e.preventDefault();
    }

    this.setState({ inputFocused: false });
  };

  toggleSearch = e => {
    e.stopPropagation();
    e.preventDefault();

    const { editor, searchInFileEnabled, setActiveSearch } = this.props;

    // Set inputFocused to false, so that search query is highlighted whenever
    // search shortcut is used, even if the input already has focus.
    this.setState({ inputFocused: false });

    if (!searchInFileEnabled) {
      setActiveSearch("file");
    }

    if (searchInFileEnabled && editor) {
      const selectedText = editor.getSelectedText();
      const query = selectedText || this.state.query;

      if (query !== "") {
        this.setState({ query, inputFocused: true });
        this.doSearch(query);
      } else {
        this.setState({ query: "", inputFocused: true });
      }
    }
  };

  doSearch = async (query, shouldScroll = true) => {
    const { editor, modifiers, textContent } = this.props;

    if (!editor || !textContent || !modifiers) {
      return;
    }

    const selectedContent = textContent;
    const ctx = { editor, cm: editor.codeMirror };

    if (!query) {
      this.props.clearSearchEditor(ctx);
      return;
    }

    let text;
    if (selectedContent.type === "wasm") {
      text = editor.renderWasmText(selectedContent).join("\n");
    } else {
      text = selectedContent.value;
    }

    const matches = await this.props.querySearchWorker(query, text, modifiers);
    const results = this.props.find(ctx, query, true, modifiers, {
      shouldScroll,
    });

    this.setSearchResults(results, matches, shouldScroll);
  };

  traverseResults = (e, reverse = false) => {
    e.stopPropagation();
    e.preventDefault();

    const { editor } = this.props;
    if (!editor) {
      return;
    }

    const ctx = { editor, cm: editor.codeMirror };
    const { modifiers, findPrev, findNext } = this.props;
    const { query } = this.state;
    const { matches } = this.state.results;

    if (query === "" && !this.props.searchInFileEnabled) {
      this.props.setActiveSearch("file");
    }

    if (modifiers) {
      const findArgs = [ctx, query, true, modifiers];
      const results = reverse ? findPrev(...findArgs) : findNext(...findArgs);
      this.setSearchResults(results, matches, true);
    }
  };

  /**
   * Update the state with the results and matches from the search.
   * This will also scroll to result's location in CodeMirror.
   *
   * @param {object} results
   * @param {Array} matches
   * @returns
   */
  setSearchResults(results, matches, shouldScroll) {
    if (!results) {
      this.setState({
        results: {
          matches,
          matchIndex: 0,
          count: matches.length,
          index: -1,
        },
      });
      return;
    }

    const { ch, line } = results;
    let matchContent = "";
    const matchIndex = matches.findIndex(elm => {
      if (elm.line === line && elm.ch === ch) {
        matchContent = elm.match;
        return true;
      }
      return false;
    });

    if (shouldScroll) {
      this.props.setCursorLocation(line, ch, matchContent);
    }

    // Only change the selected location if we should scroll to it,
    // otherwise we are most likely updating the search results while being paused
    // and don't want to change the selected location from the current paused location
    this.setState({
      results: {
        matches,
        matchIndex,
        count: matches.length,
        index: ch,
      },
    });
  }

  onChange = e => {
    this.setState({ query: e.target.value });
    return this.doSearch(e.target.value);
  };

  onFocus = () => {
    this.setState({ inputFocused: true });
  };

  onBlur = () => {
    this.setState({ inputFocused: false });
  };

  onKeyDown = e => {
    if (e.key !== "Enter" && e.key !== "F3") {
      return;
    }

    e.preventDefault();
    this.traverseResults(e, e.shiftKey);
  };

  onHistoryScroll = query => {
    this.setState({ query });
    this.doSearch(query);
  };

  // Renderers
  buildSummaryMsg() {
    const {
      query,
      results: { matchIndex, count, index },
    } = this.state;

    if (query.trim() == "") {
      return "";
    }

    if (count == 0) {
      return locale.getStr("editor.noResultsFound");
    }

    if (index == -1) {
      const resultsSummaryString = locale.getStr(
        "sourceSearch.resultsSummary2"
      );
      return PluralForm.get(count, resultsSummaryString).replace("#1", count);
    }

    const searchResultsString = locale.getStr("editor.searchResults1");
    return PluralForm.get(count, searchResultsString)
      .replace("#1", count)
      .replace("%d", matchIndex + 1);
  }

  shouldShowErrorEmoji() {
    const {
      query,
      results: { count },
    } = this.state;
    return !!query && !count;
  }

  render() {
    const { searchInFileEnabled, searchKey, setSearchOptions, searchOptions } =
      this.props;

    const {
      results: { count },
    } = this.state;

    if (!searchInFileEnabled) {
      return div(null);
    }

    return div(
      {
        className: "search-bar",
      },
      React.createElement(SearchInput, {
        query: this.state.query,
        count,
        placeholder: locale.getStr("sourceSearch.search.placeholder2"),
        summaryMsg: this.buildSummaryMsg(),
        isLoading: false,
        onChange: this.onChange,
        onFocus: this.onFocus,
        onBlur: this.onBlur,
        showErrorEmoji: this.shouldShowErrorEmoji(),
        onKeyDown: this.onKeyDown,
        onHistoryScroll: this.onHistoryScroll,
        handleNext: e => this.traverseResults(e, false),
        handlePrev: e => this.traverseResults(e, true),
        shouldFocus: this.state.inputFocused,
        showClose: true,
        showExcludePatterns: false,
        handleClose: this.closeSearch,
        showSearchModifiers: true,
        searchKey,
        onToggleSearchModifier: () => this.doSearch(this.state.query),
        setSearchOptions,
        searchOptions,
      })
    );
  }
}

module.exports = FileSearchBar;
