/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import React, { Component } from "devtools/client/shared/vendor/react";
import {
  button,
  div,
  main,
  span,
} from "devtools/client/shared/vendor/react-dom-factories";
import PropTypes from "devtools/client/shared/vendor/react-prop-types";
import { connect } from "devtools/client/shared/vendor/react-redux";
import { prefs } from "../utils/prefs";
import { primaryPaneTabs } from "../constants";
import actions from "../actions/index";
import AccessibleImage from "./shared/AccessibleImage";

import {
  getSelectedLocation,
  getPaneCollapse,
  getActiveSearch,
  getQuickOpenEnabled,
  getOrientation,
  getIsCurrentThreadPaused,
  isMapScopesEnabled,
  getSourceMapErrorForSourceActor,
} from "../selectors/index";
const KeyShortcuts = require("resource://devtools/client/shared/key-shortcuts.js");

const SplitBox = require("resource://devtools/client/shared/components/splitter/SplitBox.js");
const AppErrorBoundary = require("resource://devtools/client/shared/components/AppErrorBoundary.js");

const shortcuts = new KeyShortcuts({ window });

const horizontalLayoutBreakpoint = window.matchMedia("(min-width: 800px)");
const verticalLayoutBreakpoint = window.matchMedia(
  "(min-width: 10px) and (max-width: 799px)"
);

import { ShortcutsModal } from "./ShortcutsModal";
import PrimaryPanes from "./PrimaryPanes/index";
import Editor from "./Editor/index";
import SecondaryPanes from "./SecondaryPanes/index";
import WelcomeBox from "./WelcomeBox";
import EditorTabs from "./Editor/Tabs";
import EditorFooter from "./Editor/Footer";
import QuickOpenModal from "./QuickOpenModal";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      shortcutsModalEnabled: false,
      startPanelSize: 0,
      endPanelSize: 0,
    };
  }

  static get propTypes() {
    return {
      activeSearch: PropTypes.oneOf(["file", "project"]),
      closeActiveSearch: PropTypes.func.isRequired,
      closeQuickOpen: PropTypes.func.isRequired,
      endPanelCollapsed: PropTypes.bool.isRequired,
      fluentBundles: PropTypes.array.isRequired,
      openQuickOpen: PropTypes.func.isRequired,
      orientation: PropTypes.oneOf(["horizontal", "vertical"]).isRequired,
      quickOpenEnabled: PropTypes.bool.isRequired,
      selectedLocation: PropTypes.object,
      setActiveSearch: PropTypes.func.isRequired,
      setOrientation: PropTypes.func.isRequired,
      setPrimaryPaneTab: PropTypes.func.isRequired,
      startPanelCollapsed: PropTypes.bool.isRequired,
      toolboxDoc: PropTypes.object.isRequired,
      showOriginalVariableMappingWarning: PropTypes.bool,
    };
  }

  getChildContext() {
    return {
      fluentBundles: this.props.fluentBundles,
      toolboxDoc: this.props.toolboxDoc,
      shortcuts,
      l10n: L10N,
    };
  }

  componentDidMount() {
    horizontalLayoutBreakpoint.addListener(this.onLayoutChange);
    verticalLayoutBreakpoint.addListener(this.onLayoutChange);
    this.setOrientation();

    shortcuts.on(L10N.getStr("symbolSearch.search.key2"), e =>
      this.toggleQuickOpenModal(e, "@")
    );

    [
      L10N.getStr("sources.search.key2"),
      L10N.getStr("sources.search.alt.key"),
    ].forEach(key => shortcuts.on(key, this.toggleQuickOpenModal));

    shortcuts.on(L10N.getStr("gotoLineModal.key3"), e =>
      this.toggleQuickOpenModal(e, ":")
    );

    shortcuts.on(
      L10N.getStr("projectTextSearch.key"),
      this.jumpToProjectSearch
    );

    shortcuts.on("Escape", this.onEscape);
    shortcuts.on("CmdOrCtrl+/", this.onCommandSlash);
  }

  componentWillUnmount() {
    horizontalLayoutBreakpoint.removeListener(this.onLayoutChange);
    verticalLayoutBreakpoint.removeListener(this.onLayoutChange);
    shortcuts.off(
      L10N.getStr("symbolSearch.search.key2"),
      this.toggleQuickOpenModal
    );

    [
      L10N.getStr("sources.search.key2"),
      L10N.getStr("sources.search.alt.key"),
    ].forEach(key => shortcuts.off(key, this.toggleQuickOpenModal));

    shortcuts.off(L10N.getStr("gotoLineModal.key3"), this.toggleQuickOpenModal);

    shortcuts.off(
      L10N.getStr("projectTextSearch.key"),
      this.jumpToProjectSearch
    );

    shortcuts.off("Escape", this.onEscape);
    shortcuts.off("CmdOrCtrl+/", this.onCommandSlash);
  }

  jumpToProjectSearch = e => {
    e.preventDefault();
    this.props.setPrimaryPaneTab(primaryPaneTabs.PROJECT_SEARCH);
    this.props.setActiveSearch(primaryPaneTabs.PROJECT_SEARCH);
  };

  onEscape = e => {
    const {
      activeSearch,
      closeActiveSearch,
      closeQuickOpen,
      quickOpenEnabled,
    } = this.props;
    const { shortcutsModalEnabled } = this.state;

    if (activeSearch) {
      e.preventDefault();
      closeActiveSearch();
    }

    if (quickOpenEnabled) {
      e.preventDefault();
      closeQuickOpen();
    }

    if (shortcutsModalEnabled) {
      e.preventDefault();
      this.toggleShortcutsModal();
    }
  };

  onCommandSlash = () => {
    this.toggleShortcutsModal();
  };

  isHorizontal() {
    return this.props.orientation === "horizontal";
  }

  toggleQuickOpenModal = (e, query) => {
    const { quickOpenEnabled, openQuickOpen, closeQuickOpen } = this.props;

    e.preventDefault();
    e.stopPropagation();

    if (quickOpenEnabled === true) {
      closeQuickOpen();
      return;
    }

    if (query != null) {
      openQuickOpen(query);
      return;
    }
    openQuickOpen();
  };

  onLayoutChange = () => {
    this.setOrientation();
  };

  setOrientation() {
    // If the orientation does not match (if it is not visible) it will
    // not setOrientation, or if it is the same as before, calling
    // setOrientation will not cause a rerender.
    if (horizontalLayoutBreakpoint.matches) {
      this.props.setOrientation("horizontal");
    } else if (verticalLayoutBreakpoint.matches) {
      this.props.setOrientation("vertical");
    }
  }

  closeSourceMapError = () => {
    this.setState({ hiddenSourceMapError: this.props.sourceMapError });
  };

  renderEditorNotificationBar() {
    if (
      this.props.sourceMapError &&
      this.state.hiddenSourceMapError != this.props.sourceMapError
    ) {
      return div(
        { className: "editor-notification-footer", "aria-role": "status" },
        span(
          { className: "info icon" },
          React.createElement(AccessibleImage, { className: "sourcemap" })
        ),
        `Source Map Error: ${this.props.sourceMapError}`,
        button({ className: "close-button", onClick: this.closeSourceMapError })
      );
    }
    if (this.props.showOriginalVariableMappingWarning) {
      return div(
        { className: "editor-notification-footer", "aria-role": "status" },
        span(
          { className: "info icon" },
          React.createElement(AccessibleImage, { className: "sourcemap" })
        ),
        L10N.getFormatStr(
          "editorNotificationFooter.noOriginalScopes",
          L10N.getStr("scopes.showOriginalScopes")
        )
      );
    }
    return null;
  }

  renderEditorPane = () => {
    const { startPanelCollapsed, endPanelCollapsed } = this.props;
    const { endPanelSize, startPanelSize } = this.state;
    const horizontal = this.isHorizontal();
    return main(
      {
        className: "editor-pane",
      },
      div(
        {
          className: "editor-container",
        },
        React.createElement(EditorTabs, {
          startPanelCollapsed,
          endPanelCollapsed,
          horizontal,
        }),
        React.createElement(Editor, {
          startPanelSize,
          endPanelSize,
        }),
        !this.props.selectedLocation
          ? React.createElement(WelcomeBox, {
              horizontal,
              toggleShortcutsModal: () => this.toggleShortcutsModal(),
            })
          : null,
        this.renderEditorNotificationBar(),
        React.createElement(EditorFooter, {
          horizontal,
        })
      )
    );
  };

  toggleShortcutsModal() {
    this.setState(prevState => ({
      shortcutsModalEnabled: !prevState.shortcutsModalEnabled,
    }));
  }

  // Important so that the tabs chevron updates appropriately when
  // the user resizes the left or right columns
  triggerEditorPaneResize() {
    const editorPane = window.document.querySelector(".editor-pane");
    if (editorPane) {
      editorPane.dispatchEvent(new Event("resizeend"));
    }
  }

  renderLayout = () => {
    const { startPanelCollapsed, endPanelCollapsed } = this.props;
    const horizontal = this.isHorizontal();
    return React.createElement(SplitBox, {
      style: {
        width: "100vw",
      },
      initialSize: prefs.endPanelSize,
      minSize: 30,
      maxSize: "70%",
      splitterSize: 1,
      vert: horizontal,
      onResizeEnd: num => {
        prefs.endPanelSize = num;
        this.triggerEditorPaneResize();
      },
      startPanel: React.createElement(SplitBox, {
        style: {
          width: "100vw",
        },
        initialSize: prefs.startPanelSize,
        minSize: 30,
        maxSize: "85%",
        splitterSize: 1,
        onResizeEnd: num => {
          prefs.startPanelSize = num;
          this.triggerEditorPaneResize();
        },
        startPanelCollapsed,
        startPanel: React.createElement(PrimaryPanes, {
          horizontal,
        }),
        endPanel: this.renderEditorPane(),
      }),
      endPanelControl: true,
      endPanel: React.createElement(SecondaryPanes, {
        horizontal,
      }),
      endPanelCollapsed,
    });
  };

  render() {
    const { quickOpenEnabled } = this.props;
    return div(
      {
        className: "debugger",
      },
      React.createElement(
        AppErrorBoundary,
        {
          componentName: "Debugger",
          panel: L10N.getStr("ToolboxDebugger.label"),
        },
        this.renderLayout(),
        quickOpenEnabled === true &&
          React.createElement(QuickOpenModal, {
            shortcutsModalEnabled: this.state.shortcutsModalEnabled,
            toggleShortcutsModal: () => this.toggleShortcutsModal(),
          }),
        React.createElement(ShortcutsModal, {
          enabled: this.state.shortcutsModalEnabled,
          handleClose: () => this.toggleShortcutsModal(),
        })
      )
    );
  }
}

App.childContextTypes = {
  toolboxDoc: PropTypes.object,
  shortcuts: PropTypes.object,
  l10n: PropTypes.object,
  fluentBundles: PropTypes.array,
};

const mapStateToProps = state => {
  const selectedLocation = getSelectedLocation(state);
  const mapScopeEnabled = isMapScopesEnabled(state);
  const isPaused = getIsCurrentThreadPaused(state);

  const showOriginalVariableMappingWarning =
    isPaused &&
    selectedLocation?.source.isOriginal &&
    !selectedLocation?.source.isPrettyPrinted &&
    !mapScopeEnabled;

  return {
    showOriginalVariableMappingWarning,
    selectedLocation,
    startPanelCollapsed: getPaneCollapse(state, "start"),
    endPanelCollapsed: getPaneCollapse(state, "end"),
    activeSearch: getActiveSearch(state),
    quickOpenEnabled: getQuickOpenEnabled(state),
    orientation: getOrientation(state),
    sourceMapError: selectedLocation?.sourceActor
      ? getSourceMapErrorForSourceActor(state, selectedLocation.sourceActor.id)
      : null,
  };
};

export default connect(mapStateToProps, {
  setActiveSearch: actions.setActiveSearch,
  closeActiveSearch: actions.closeActiveSearch,
  openQuickOpen: actions.openQuickOpen,
  closeQuickOpen: actions.closeQuickOpen,
  setOrientation: actions.setOrientation,
  setPrimaryPaneTab: actions.setPrimaryPaneTab,
})(App);
