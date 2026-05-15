/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import React, { PureComponent } from "devtools/client/shared/vendor/react";
import {
  div,
  ul,
  li,
  span,
} from "devtools/client/shared/vendor/react-dom-factories";
import PropTypes from "devtools/client/shared/vendor/react-prop-types";
import { connect } from "devtools/client/shared/vendor/react-redux";

import {
  getOpenedSources,
  getSelectedSource,
  getIsPaused,
  getCurrentThread,
  getBlackBoxRanges,
} from "../../selectors/index";
import { isVisible } from "../../utils/ui";

import { getHiddenTabsSources } from "../../utils/tabs";
import { getFileURL } from "../../utils/source";
import actions from "../../actions/index";

import Tab from "./Tab";
import { PaneToggleButton } from "../shared/Button/index";
import Dropdown from "../shared/Dropdown";
import DebuggerImage from "../shared/DebuggerImage";
import CommandBar from "../SecondaryPanes/CommandBar";

const { debounce } = require("resource://devtools/shared/debounce.js");

class Tabs extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      dropdownShown: false,
      // List of Sources objects for the tabs that overflow and are shown in the drop down menu
      hiddenSources: [],
    };

    this.onResize = debounce(() => {
      this.updateHiddenTabs();
    });
  }

  static get propTypes() {
    return {
      endPanelCollapsed: PropTypes.bool.isRequired,
      horizontal: PropTypes.bool.isRequired,
      isPaused: PropTypes.bool.isRequired,
      moveTab: PropTypes.func.isRequired,
      moveTabBySourceId: PropTypes.func.isRequired,
      selectSource: PropTypes.func.isRequired,
      selectedSource: PropTypes.object,
      blackBoxRanges: PropTypes.object.isRequired,
      startPanelCollapsed: PropTypes.bool.isRequired,
      openedSources: PropTypes.array.isRequired,
      togglePaneCollapse: PropTypes.func.isRequired,
    };
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.selectedSource !== prevProps.selectedSource ||
      this.props.openedSources !== prevProps.openedSources
    ) {
      this.updateHiddenTabs();
    }
  }

  componentDidMount() {
    window.requestIdleCallback(this.updateHiddenTabs);
    window.addEventListener("resize", this.onResize);
    window.document
      .querySelector(".editor-pane")
      .addEventListener("resizeend", this.onResize);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.onResize);
    window.document
      .querySelector(".editor-pane")
      .removeEventListener("resizeend", this.onResize);
  }

  /*
   * Updates the hiddenSourceTabs state, by
   * finding the source tabs which are wrapped and are not on the top row.
   */
  updateHiddenTabs = () => {
    if (!this.refs.sourceTabs) {
      // Ensure hiding the dropdown if we removed all sources.
      if (this.state.hiddenSources.length) {
        this.setState({ hiddenSources: [] });
      }
      return;
    }
    const { selectedSource, moveTab } = this.props;
    const sourceTabEls = this.refs.sourceTabs.children;
    const hiddenSources = getHiddenTabsSources(
      this.props.openedSources,
      sourceTabEls
    );

    if (
      selectedSource &&
      isVisible() &&
      hiddenSources.includes(selectedSource)
    ) {
      moveTab(selectedSource.url, 0);
      return;
    }

    this.setState({ hiddenSources });
  };

  toggleSourcesDropdown() {
    this.setState(prevState => ({
      dropdownShown: !prevState.dropdownShown,
    }));
  }

  getIconClass(source) {
    if (this.props.blackBoxRanges[source.url]) {
      return "blackBox";
    }
    return "file";
  }

  renderDropdownSource = source => {
    const { selectSource } = this.props;

    const onClick = () => selectSource(source);
    return li(
      {
        key: source.id,
        onClick,
        title: getFileURL(source, false),
      },
      React.createElement(DebuggerImage, {
        name: this.getIconClass(source),
        className: "dropdown-icon",
      }),
      span(
        {
          className: "dropdown-label",
        },
        source.shortName
      )
    );
  };

  // Note that these three listener will be called from Tab component
  // so that e.target will be Tab's DOM (and not Tabs one).
  onTabDragStart = e => {
    this.draggedSourceId = e.target.dataset.sourceId;
    this.draggedSourceIndex = e.target.dataset.index;
  };

  onTabDragEnd = () => {
    this.draggedSourceId = null;
    this.draggedSourceIndex = -1;
  };

  onTabDragOver = e => {
    e.preventDefault();

    const hoveredTabIndex = e.target.dataset.index;
    const { moveTabBySourceId } = this.props;

    if (hoveredTabIndex === this.draggedSourceIndex) {
      return;
    }

    const tabDOMRect = e.target.getBoundingClientRect();
    const { pageX: mouseCursorX } = e;
    if (
      /* Case: the mouse cursor moves into the left half of any target tab */
      mouseCursorX - tabDOMRect.left <
      tabDOMRect.width / 2
    ) {
      // The current tab goes to the left of the target tab
      const targetTab =
        hoveredTabIndex > this.draggedSourceIndex
          ? hoveredTabIndex - 1
          : hoveredTabIndex;
      moveTabBySourceId(this.draggedSourceId, targetTab);
      this.draggedSourceIndex = targetTab;
    } else if (
      /* Case: the mouse cursor moves into the right half of any target tab */
      mouseCursorX - tabDOMRect.left >=
      tabDOMRect.width / 2
    ) {
      // The current tab goes to the right of the target tab
      const targetTab =
        hoveredTabIndex < this.draggedSourceIndex
          ? hoveredTabIndex + 1
          : hoveredTabIndex;
      moveTabBySourceId(this.draggedSourceId, targetTab);
      this.draggedSourceIndex = targetTab;
    }
  };

  renderTabs() {
    const { openedSources } = this.props;
    if (!openedSources.length) {
      return null;
    }
    return div(
      {
        className: "source-tabs",
        ref: "sourceTabs",
      },
      openedSources.map((source, index) => {
        return React.createElement(Tab, {
          onDragStart: this.onTabDragStart,
          onDragOver: this.onTabDragOver,
          onDragEnd: this.onTabDragEnd,
          key: source.id,
          index,
          source,
        });
      })
    );
  }

  renderDropdown() {
    const { hiddenSources } = this.state;
    if (!hiddenSources || !hiddenSources.length) {
      return null;
    }
    const panel = ul(null, hiddenSources.map(this.renderDropdownSource));
    const icon = React.createElement(DebuggerImage, {
      name: "more-tabs",
    });
    return React.createElement(Dropdown, {
      panel,
      icon,
    });
  }

  renderCommandBar() {
    const { horizontal, endPanelCollapsed, isPaused } = this.props;
    if (!endPanelCollapsed || !isPaused) {
      return null;
    }
    return React.createElement(CommandBar, {
      horizontal,
    });
  }

  renderStartPanelToggleButton() {
    return React.createElement(PaneToggleButton, {
      position: "start",
      collapsed: this.props.startPanelCollapsed,
      handleClick: this.props.togglePaneCollapse,
    });
  }

  renderEndPanelToggleButton() {
    const { horizontal, endPanelCollapsed, togglePaneCollapse } = this.props;
    if (!horizontal) {
      return null;
    }
    return React.createElement(PaneToggleButton, {
      position: "end",
      collapsed: endPanelCollapsed,
      handleClick: togglePaneCollapse,
      horizontal,
    });
  }

  render() {
    return div(
      {
        className: "source-header",
      },
      this.renderStartPanelToggleButton(),
      this.renderTabs(),
      this.renderDropdown(),
      this.renderEndPanelToggleButton(),
      this.renderCommandBar()
    );
  }
}

const mapStateToProps = state => {
  return {
    selectedSource: getSelectedSource(state),
    openedSources: getOpenedSources(state),
    blackBoxRanges: getBlackBoxRanges(state),
    isPaused: getIsPaused(state, getCurrentThread(state)),
  };
};

export default connect(mapStateToProps, {
  selectSource: actions.selectSource,
  moveTab: actions.moveTab,
  moveTabBySourceId: actions.moveTabBySourceId,
  togglePaneCollapse: actions.togglePaneCollapse,
})(Tabs);
