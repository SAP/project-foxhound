/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

"use strict";

const React = require("devtools/client/shared/vendor/react");
const { Component } = React;

const PropTypes = require("devtools/client/shared/vendor/react-prop-types");
const {
  button,
  div,
  label,
  input,
  span,
} = require("devtools/client/shared/vendor/react-dom-factories");

const DebuggerImage = require("devtools/client/shared/components/DebuggerImage");
const CloseButton = require("devtools/client/shared/components/CloseButton");

const classnames = require("resource://devtools/client/shared/classnames.js");
const SearchModifiers = require("resource://devtools/client/shared/components/SearchModifiers.js");

const { LocalizationHelper } = require("resource://devtools/shared/l10n.js");
const locale = new LocalizationHelper(
  "devtools/client/locales/components.properties"
);

const arrowBtn = (onClick, type, className, tooltip) => {
  const props = {
    className,
    key: type,
    onClick,
    title: tooltip,
    type,
  };
  return button(
    props,
    React.createElement(DebuggerImage, {
      name: type,
    })
  );
};

class SearchInput extends Component {
  static get propTypes() {
    return {
      count: PropTypes.number.isRequired,
      expanded: PropTypes.bool.isRequired,
      handleClose: PropTypes.func,
      handleNext: PropTypes.func,
      handlePrev: PropTypes.func,
      hasPrefix: PropTypes.bool.isRequired,
      isLoading: PropTypes.bool.isRequired,
      onBlur: PropTypes.func,
      onChange: PropTypes.func,
      onFocus: PropTypes.func,
      onHistoryScroll: PropTypes.func,
      onKeyDown: PropTypes.func,
      onKeyUp: PropTypes.func,
      placeholder: PropTypes.string,
      query: PropTypes.string,
      selectedItemId: PropTypes.string,
      shouldFocus: PropTypes.bool,
      showClose: PropTypes.bool.isRequired,
      showExcludePatterns: PropTypes.bool.isRequired,
      excludePatternsLabel: PropTypes.string,
      excludePatternsPlaceholder: PropTypes.string,
      showErrorEmoji: PropTypes.bool.isRequired,
      size: PropTypes.string,
      disabled: PropTypes.bool,
      summaryMsg: PropTypes.string,
      searchKey: PropTypes.string.isRequired,
      searchOptions: PropTypes.object.isRequired,
      setSearchOptions: PropTypes.func.isRequired,
      showSearchModifiers: PropTypes.bool.isRequired,
      onToggleSearchModifier: PropTypes.func,
    };
  }

  static defaultProps = {
    expanded: false,
    hasPrefix: false,
    selectedItemId: "",
    size: "",
    showClose: true,
  };

  constructor(props) {
    super(props);
    this.state = {
      history: [],
      excludePatterns: this.props.showSearchModifiers
        ? (props.searchOptions?.excludePatterns ?? "")
        : null,
    };
  }

  componentDidMount() {
    this.setFocus();
  }

  componentDidUpdate(prevProps) {
    if (this.props.shouldFocus && !prevProps.shouldFocus) {
      this.setFocus();
    }
  }

  setFocus() {
    if (this.$input) {
      const _input = this.$input;
      _input.focus();

      if (!_input.value) {
        return;
      }

      // omit prefix @:# from being selected
      const selectStartPos = this.props.hasPrefix ? 1 : 0;
      _input.setSelectionRange(selectStartPos, _input.value.length + 1);
    }
  }

  renderArrowButtons() {
    const { handleNext, handlePrev } = this.props;

    return [
      arrowBtn(
        handlePrev,
        "arrow-up",
        classnames("nav-btn", "prev"),
        locale.getStr("editor.searchResults.prevResult"),
        DebuggerImage
      ),
      arrowBtn(
        handleNext,
        "arrow-down",
        classnames("nav-btn", "next"),
        locale.getStr("editor.searchResults.nextResult"),
        DebuggerImage
      ),
    ];
  }

  onFocus = e => {
    const { onFocus } = this.props;

    if (onFocus) {
      onFocus(e);
    }
  };

  onBlur = e => {
    const { onBlur } = this.props;

    if (onBlur) {
      onBlur(e);
    }
  };

  onKeyDown = e => {
    const { onHistoryScroll, onKeyDown } = this.props;
    if (!onHistoryScroll) {
      onKeyDown(e);
      return;
    }

    const inputValue = e.target.value;
    const { history } = this.state;
    const currentHistoryIndex = history.indexOf(inputValue);

    if (e.key === "Enter") {
      this.saveEnteredTerm(inputValue);
      onKeyDown(e);
      return;
    }

    if (e.key === "ArrowUp") {
      const previous =
        currentHistoryIndex > -1 ? currentHistoryIndex - 1 : history.length - 1;
      const previousInHistory = history[previous];
      if (previousInHistory) {
        e.preventDefault();
        onHistoryScroll(previousInHistory);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      const next = currentHistoryIndex + 1;
      const nextInHistory = history[next];
      if (nextInHistory) {
        onHistoryScroll(nextInHistory);
      }
    }
  };

  onExcludeKeyDown = e => {
    if (e.key === "Enter") {
      this.props.setSearchOptions(this.props.searchKey, {
        excludePatterns: this.state.excludePatterns,
      });
      this.props.onKeyDown(e);
    }
  };

  saveEnteredTerm(query) {
    const { history } = this.state;
    const previousIndex = history.indexOf(query);
    if (previousIndex !== -1) {
      history.splice(previousIndex, 1);
    }
    history.push(query);
    this.setState({ history });
  }

  renderSummaryMsg() {
    const { summaryMsg } = this.props;

    if (!summaryMsg) {
      return null;
    }
    return div(
      {
        className: "search-field-summary",
      },
      summaryMsg
    );
  }

  renderSpinner() {
    const { isLoading } = this.props;
    if (!isLoading) {
      return null;
    }
    return React.createElement(DebuggerImage, {
      name: "loader",
      className: "spin",
    });
  }

  renderNav() {
    const { count, handleNext, handlePrev } = this.props;
    if ((!handleNext && !handlePrev) || !count || count == 1) {
      return null;
    }
    return div(
      {
        className: "search-nav-buttons",
      },
      this.renderArrowButtons()
    );
  }

  renderSearchModifiers() {
    if (!this.props.showSearchModifiers) {
      return null;
    }
    return React.createElement(SearchModifiers, {
      modifiers: this.props.searchOptions,
      onToggleSearchModifier: updatedOptions => {
        this.props.setSearchOptions(this.props.searchKey, updatedOptions);
        this.props.onToggleSearchModifier();
      },
    });
  }

  renderExcludePatterns() {
    if (!this.props.showExcludePatterns) {
      return null;
    }
    return div(
      {
        className: classnames("exclude-patterns-field", this.props.size),
      },
      label(null, this.props.excludePatternsLabel),
      input({
        placeholder: this.props.excludePatternsPlaceholder,
        value: this.state.excludePatterns,
        onKeyDown: this.onExcludeKeyDown,
        onChange: e =>
          this.setState({
            excludePatterns: e.target.value,
          }),
      })
    );
  }

  renderClose() {
    if (!this.props.showClose) {
      return null;
    }
    return React.createElement(
      React.Fragment,
      null,
      span({
        className: "pipe-divider",
      }),
      React.createElement(CloseButton, {
        handleClick: this.props.handleClose,
        buttonClass: this.props.size,
      })
    );
  }

  render() {
    const {
      expanded,
      onChange,
      onKeyUp,
      placeholder,
      query,
      selectedItemId,
      showErrorEmoji,
      size,
      disabled,
    } = this.props;

    const inputProps = {
      className: classnames({
        empty: showErrorEmoji,
      }),
      disabled,
      onChange,
      onKeyDown: e => this.onKeyDown(e),
      onKeyUp,
      onFocus: e => this.onFocus(e),
      onBlur: e => this.onBlur(e),
      "aria-autocomplete": "list",
      "aria-controls": "result-list",
      "aria-activedescendant":
        expanded && selectedItemId ? `${selectedItemId}-title` : "",
      placeholder,
      value: query,
      spellCheck: false,
      ref: c => (this.$input = c),
    };
    return div(
      {
        className: "search-outline",
      },
      div(
        {
          className: classnames("search-field", size),
          role: "combobox",
          "aria-haspopup": "listbox",
          "aria-owns": "result-list",
          "aria-expanded": expanded,
        },
        React.createElement(DebuggerImage, {
          name: "search",
        }),
        input(inputProps),
        this.renderSpinner(),
        this.renderSummaryMsg(),
        this.renderNav(),
        div(
          {
            className: "search-buttons-bar",
          },
          this.renderSearchModifiers(),
          this.renderClose()
        )
      ),
      this.renderExcludePatterns()
    );
  }
}

module.exports = SearchInput;
