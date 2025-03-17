/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import PropTypes from "devtools/client/shared/vendor/react-prop-types";
import React, { PureComponent } from "devtools/client/shared/vendor/react";
import { div } from "devtools/client/shared/vendor/react-dom-factories";
import { bindActionCreators } from "devtools/client/shared/vendor/redux";
import ReactDOM from "devtools/client/shared/vendor/react-dom";
import { connect } from "devtools/client/shared/vendor/react-redux";

import { getLineText, isLineBlackboxed } from "./../../utils/source";
import { createLocation } from "./../../utils/location";
import { getIndentation } from "../../utils/indentation";
import { isWasm } from "../../utils/wasm";
import { features } from "../../utils/prefs";

import {
  getActiveSearch,
  getSelectedLocation,
  getSelectedSource,
  getSelectedSourceTextContent,
  getSelectedBreakableLines,
  getConditionalPanelLocation,
  getSymbols,
  getIsCurrentThreadPaused,
  getSkipPausing,
  getInlinePreview,
  getBlackBoxRanges,
  isSourceBlackBoxed,
  getHighlightedLineRangeForSelectedSource,
  isSourceMapIgnoreListEnabled,
  isSourceOnSourceMapIgnoreList,
  isMapScopesEnabled,
} from "../../selectors/index";

// Redux actions
import actions from "../../actions/index";

import SearchInFileBar from "./SearchInFileBar";
import HighlightLines from "./HighlightLines";
import Preview from "./Preview/index";
import Breakpoints from "./Breakpoints";
import ColumnBreakpoints from "./ColumnBreakpoints";
import DebugLine from "./DebugLine";
import HighlightLine from "./HighlightLine";
import EmptyLines from "./EmptyLines";
import ConditionalPanel from "./ConditionalPanel";
import InlinePreviews from "./InlinePreviews";
import Exceptions from "./Exceptions";
import BlackboxLines from "./BlackboxLines";

import {
  fromEditorLine,
  showSourceText,
  setDocument,
  resetLineNumberFormat,
  getEditor,
  getCursorLine,
  getCursorColumn,
  lineAtHeight,
  toSourceLine,
  getDocument,
  toEditorPosition,
  getSourceLocationFromMouseEvent,
  hasDocument,
  onMouseOver,
  startOperation,
  endOperation,
} from "../../utils/editor/index";

import {
  resizeToggleButton,
  getLineNumberWidth,
  resizeBreakpointGutter,
} from "../../utils/ui";

const { debounce } = require("resource://devtools/shared/debounce.js");
const classnames = require("resource://devtools/client/shared/classnames.js");

const { appinfo } = Services;
const isMacOS = appinfo.OS === "Darwin";

function isSecondary(ev) {
  return isMacOS && ev.ctrlKey && ev.button === 0;
}

function isCmd(ev) {
  return isMacOS ? ev.metaKey : ev.ctrlKey;
}

const cssVars = {
  searchbarHeight: "var(--editor-searchbar-height)",
};

class Editor extends PureComponent {
  static get propTypes() {
    return {
      selectedSource: PropTypes.object,
      selectedSourceTextContent: PropTypes.object,
      selectedSourceIsBlackBoxed: PropTypes.bool,
      closeTab: PropTypes.func.isRequired,
      toggleBreakpointAtLine: PropTypes.func.isRequired,
      conditionalPanelLocation: PropTypes.object,
      closeConditionalPanel: PropTypes.func.isRequired,
      openConditionalPanel: PropTypes.func.isRequired,
      updateViewport: PropTypes.func.isRequired,
      isPaused: PropTypes.bool.isRequired,
      addBreakpointAtLine: PropTypes.func.isRequired,
      continueToHere: PropTypes.func.isRequired,
      updateCursorPosition: PropTypes.func.isRequired,
      jumpToMappedLocation: PropTypes.func.isRequired,
      selectedLocation: PropTypes.object,
      symbols: PropTypes.object,
      startPanelSize: PropTypes.number.isRequired,
      endPanelSize: PropTypes.number.isRequired,
      searchInFileEnabled: PropTypes.bool.isRequired,
      inlinePreviewEnabled: PropTypes.bool.isRequired,
      skipPausing: PropTypes.bool.isRequired,
      blackboxedRanges: PropTypes.object.isRequired,
      breakableLines: PropTypes.object.isRequired,
      highlightedLineRange: PropTypes.object,
      isSourceOnIgnoreList: PropTypes.bool,
      mapScopesEnabled: PropTypes.bool,
    };
  }

  $editorWrapper;
  constructor(props) {
    super(props);

    this.state = {
      editor: null,
    };
  }

  // FIXME: https://bugzilla.mozilla.org/show_bug.cgi?id=1774507
  UNSAFE_componentWillReceiveProps(nextProps) {
    let { editor } = this.state;

    if (!editor && nextProps.selectedSource) {
      editor = this.setupEditor();
    }

    const shouldUpdateText =
      nextProps.selectedSource !== this.props.selectedSource ||
      nextProps.selectedSourceTextContent?.value !==
        this.props.selectedSourceTextContent?.value ||
      nextProps.symbols !== this.props.symbols;

    const shouldScroll =
      nextProps.selectedLocation &&
      this.shouldScrollToLocation(nextProps, editor);

    if (!features.codemirrorNext) {
      const shouldUpdateSize =
        nextProps.startPanelSize !== this.props.startPanelSize ||
        nextProps.endPanelSize !== this.props.endPanelSize;

      if (shouldUpdateText || shouldUpdateSize || shouldScroll) {
        startOperation();
        if (shouldUpdateText) {
          this.setText(nextProps, editor);
        }
        if (shouldUpdateSize) {
          editor.codeMirror.setSize();
        }
        if (shouldScroll) {
          this.scrollToLocation(nextProps, editor);
        }
        endOperation();
      }

      if (this.props.selectedSource != nextProps.selectedSource) {
        this.props.updateViewport();
        resizeBreakpointGutter(editor.codeMirror);
        resizeToggleButton(getLineNumberWidth(editor.codeMirror));
      }
    } else {
      // For codemirror 6
      // eslint-disable-next-line no-lonely-if
      if (shouldUpdateText) {
        this.setText(nextProps, editor);
      }

      if (shouldScroll) {
        this.scrollToLocation(nextProps, editor);
      }
    }
  }

  onEditorUpdated = v => {
    if (v.docChanged || v.geometryChanged) {
      resizeToggleButton(v.view.dom.querySelector(".cm-gutters").clientWidth);
      this.props.updateViewport();
    }
  };

  setupEditor() {
    const editor = getEditor(features.codemirrorNext);

    // disables the default search shortcuts
    editor._initShortcuts = () => {};

    const node = ReactDOM.findDOMNode(this);
    if (node instanceof HTMLElement) {
      editor.appendToLocalElement(node.querySelector(".editor-mount"));
    }

    if (!features.codemirrorNext) {
      const { codeMirror } = editor;

      this.abortController = new window.AbortController();

      // CodeMirror refreshes its internal state on window resize, but we need to also
      // refresh it when the side panels are resized.
      // We could have a ResizeObserver instead, but we wouldn't be able to differentiate
      // between window resize and side panel resize and as a result, might refresh
      // codeMirror twice, which is wasteful.
      window.document
        .querySelector(".editor-pane")
        .addEventListener("resizeend", () => codeMirror.refresh(), {
          signal: this.abortController.signal,
        });

      codeMirror.on("gutterClick", this.onGutterClick);
      codeMirror.on("cursorActivity", this.onCursorChange);

      const codeMirrorWrapper = codeMirror.getWrapperElement();
      // Set code editor wrapper to be focusable
      codeMirrorWrapper.tabIndex = 0;
      codeMirrorWrapper.addEventListener("keydown", e => this.onKeyDown(e));
      codeMirrorWrapper.addEventListener("click", e => this.onClick(e));
      codeMirrorWrapper.addEventListener("mouseover", onMouseOver(codeMirror));
      codeMirrorWrapper.addEventListener("contextmenu", event =>
        this.openMenu(event)
      );

      codeMirror.on("scroll", this.onEditorScroll);
      this.onEditorScroll();
    } else {
      editor.setUpdateListener(this.onEditorUpdated);
      editor.setGutterEventListeners({
        click: (event, cm, line) => this.onGutterClick(cm, line, null, event),
        contextmenu: (event, cm, line) => this.openMenu(event, line),
      });
      editor.addEditorDOMEventListeners({
        click: (event, cm, line, column) => this.onClick(event, line, column),
        contextmenu: (event, cm, line, column) =>
          this.openMenu(event, line, column),
        mouseover: onMouseOver(editor),
      });
    }
    this.setState({ editor });
    return editor;
  }

  componentDidMount() {
    if (!features.codemirrorNext) {
      const { shortcuts } = this.context;

      shortcuts.on(
        L10N.getStr("toggleBreakpoint.key"),
        this.onToggleBreakpoint
      );
      shortcuts.on(
        L10N.getStr("toggleCondPanel.breakpoint.key"),
        this.onToggleConditionalPanel
      );
      shortcuts.on(
        L10N.getStr("toggleCondPanel.logPoint.key"),
        this.onToggleConditionalPanel
      );
      shortcuts.on(
        L10N.getStr("sourceTabs.closeTab.key"),
        this.onCloseShortcutPress
      );
      shortcuts.on("Esc", this.onEscape);
    }
  }

  onCloseShortcutPress = e => {
    const { selectedSource } = this.props;
    if (selectedSource) {
      e.preventDefault();
      e.stopPropagation();
      this.props.closeTab(selectedSource, "shortcut");
    }
  };

  componentDidUpdate(prevProps, prevState) {
    const {
      selectedSource,
      blackboxedRanges,
      isSourceOnIgnoreList,
      breakableLines,
    } = this.props;
    const { editor } = this.state;

    if (!selectedSource || !editor) {
      return;
    }

    // Sets the breakables lines for codemirror 6
    if (features.codemirrorNext) {
      const shouldUpdateBreakableLines =
        prevProps.breakableLines.size !== this.props.breakableLines.size ||
        prevProps.selectedSource?.id !== selectedSource.id ||
        // Make sure we update after the editor has loaded
        (!prevState.editor && !!editor);

      const isSourceWasm = isWasm(selectedSource.id);

      if (shouldUpdateBreakableLines) {
        editor.setLineGutterMarkers([
          {
            id: "empty-line-marker",
            lineClassName: "empty-line",
            condition: line => {
              const lineNumber = fromEditorLine(
                selectedSource.id,
                line,
                isSourceWasm
              );
              return !breakableLines.has(lineNumber);
            },
          },
        ]);
      }

      function condition(line) {
        const lineNumber = fromEditorLine(selectedSource.id, line);

        return isLineBlackboxed(
          blackboxedRanges[selectedSource.url],
          lineNumber,
          isSourceOnIgnoreList
        );
      }

      editor.setLineGutterMarkers([
        {
          id: "blackboxed-line-gutter-marker",
          lineClassName: "blackboxed-line",
          condition,
        },
      ]);
      editor.setLineContentMarker({
        id: "blackboxed-line-marker",
        lineClassName: "blackboxed-line",
        condition,
      });
    }
  }

  componentWillUnmount() {
    const { editor } = this.state;
    if (!features.codemirrorNext) {
      const { shortcuts } = this.context;
      shortcuts.off(L10N.getStr("sourceTabs.closeTab.key"));
      shortcuts.off(L10N.getStr("toggleBreakpoint.key"));
      shortcuts.off(L10N.getStr("toggleCondPanel.breakpoint.key"));
      shortcuts.off(L10N.getStr("toggleCondPanel.logPoint.key"));

      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
    }
    if (editor) {
      if (!features.codemirrorNext) {
        editor.codeMirror.off("scroll", this.onEditorScroll);
      }
      editor.destroy();
      this.setState({ editor: null });
    }
  }

  getCurrentLine() {
    const { codeMirror } = this.state.editor;
    const { selectedSource } = this.props;
    if (!selectedSource) {
      return null;
    }

    const line = getCursorLine(codeMirror);
    return toSourceLine(selectedSource.id, line);
  }

  onToggleBreakpoint = e => {
    e.preventDefault();
    e.stopPropagation();

    const line = this.getCurrentLine();
    if (typeof line !== "number") {
      return;
    }

    this.props.toggleBreakpointAtLine(line);
  };

  onToggleConditionalPanel = e => {
    e.stopPropagation();
    e.preventDefault();

    const {
      conditionalPanelLocation,
      closeConditionalPanel,
      openConditionalPanel,
      selectedSource,
    } = this.props;

    const line = this.getCurrentLine();

    const { codeMirror } = this.state.editor;
    // add one to column for correct position in editor.
    const column = getCursorColumn(codeMirror) + 1;

    if (conditionalPanelLocation) {
      return closeConditionalPanel();
    }

    if (!selectedSource || typeof line !== "number") {
      return null;
    }

    return openConditionalPanel(
      createLocation({
        line,
        column,
        source: selectedSource,
      }),
      false
    );
  };

  onEditorScroll = debounce(this.props.updateViewport, 75);

  onKeyDown(e) {
    const { codeMirror } = this.state.editor;
    const { key, target } = e;
    const codeWrapper = codeMirror.getWrapperElement();
    const textArea = codeWrapper.querySelector("textArea");

    if (key === "Escape" && target == textArea) {
      e.stopPropagation();
      e.preventDefault();
      codeWrapper.focus();
    } else if (key === "Enter" && target == codeWrapper) {
      e.preventDefault();
      // Focus into editor's text area
      textArea.focus();
    }
  }

  /*
   * The default Esc command is overridden in the CodeMirror keymap to allow
   * the Esc keypress event to be catched by the toolbox and trigger the
   * split console. Restore it here, but preventDefault if and only if there
   * is a multiselection.
   */
  onEscape = e => {
    if (!this.state.editor) {
      return;
    }

    const { codeMirror } = this.state.editor;
    if (codeMirror.listSelections().length > 1) {
      codeMirror.execCommand("singleSelection");
      e.preventDefault();
    }
  };
  // Note: The line is optional, if not passed (as is likely for codemirror 6)
  // it fallsback to lineAtHeight.
  openMenu(event, line, ch) {
    event.stopPropagation();
    event.preventDefault();

    const {
      selectedSource,
      selectedSourceTextContent,
      conditionalPanelLocation,
      closeConditionalPanel,
    } = this.props;

    const { editor } = this.state;

    if (!selectedSource || !editor) {
      return;
    }

    // only allow one conditionalPanel location.
    if (conditionalPanelLocation) {
      closeConditionalPanel();
    }

    const target = event.target;
    const { id: sourceId } = selectedSource;
    line = line ?? lineAtHeight(editor, sourceId, event);

    if (typeof line != "number") {
      return;
    }

    if (
      // handles codemirror 6
      (target.classList.contains("cm-gutterElement") &&
        target.closest(".cm-gutter.cm-lineNumbers")) ||
      // handles codemirror 5
      target.classList.contains("CodeMirror-linenumber")
    ) {
      const location = createLocation({
        line,
        column: undefined,
        source: selectedSource,
      });

      const lineText = getLineText(
        sourceId,
        selectedSourceTextContent,
        line
      ).trim();

      const lineObject = { from: { line, ch }, to: { line, ch } };

      this.props.showEditorGutterContextMenu(
        event,
        lineObject,
        location,
        lineText
      );
      return;
    }

    if (target.getAttribute("id") === "columnmarker") {
      return;
    }

    let location;
    if (features.codemirrorNext) {
      location = createLocation({
        source: selectedSource,
        line: fromEditorLine(
          selectedSource.id,
          line,
          isWasm(selectedSource.id)
        ),
        column: isWasm(selectedSource.id) ? 0 : ch + 1,
      });
    } else {
      location = getSourceLocationFromMouseEvent(editor, selectedSource, event);
    }

    const lineObject = editor.getSelectionCursor();
    this.props.showEditorContextMenu(event, editor, lineObject, location);
  }

  /**
   * CodeMirror event handler, called whenever the cursor moves
   * for user-driven or programatic reasons.
   */
  onCursorChange = event => {
    const { line, ch } = event.doc.getCursor();
    this.props.selectLocation(
      createLocation({
        source: this.props.selectedSource,
        // CodeMirror cursor location is all 0-based.
        // Whereast in DevTools frontend and backend,
        // only colunm is 0-based, the line is 1 based.
        line: line + 1,
        column: ch,
      }),
      {
        // Reset the context, so that we don't switch to original
        // while moving the cursor within a bundle
        keepContext: false,

        // Avoid highlighting the selected line
        highlight: false,
      }
    );
  };

  onGutterClick = (cm, line, gutter, ev) => {
    const {
      selectedSource,
      conditionalPanelLocation,
      closeConditionalPanel,
      addBreakpointAtLine,
      continueToHere,
      breakableLines,
      blackboxedRanges,
      isSourceOnIgnoreList,
    } = this.props;

    // ignore right clicks in the gutter
    if (isSecondary(ev) || ev.button === 2 || !selectedSource) {
      return;
    }

    if (conditionalPanelLocation) {
      closeConditionalPanel();
      return;
    }

    if (gutter === "CodeMirror-foldgutter") {
      return;
    }

    const sourceLine = toSourceLine(selectedSource.id, line);
    if (typeof sourceLine !== "number") {
      return;
    }

    // ignore clicks on a non-breakable line
    if (!breakableLines.has(sourceLine)) {
      return;
    }

    if (isCmd(ev)) {
      continueToHere(
        createLocation({
          line: sourceLine,
          column: undefined,
          source: selectedSource,
        })
      );
      return;
    }

    addBreakpointAtLine(
      sourceLine,
      ev.altKey,
      ev.shiftKey ||
        isLineBlackboxed(
          blackboxedRanges[selectedSource.url],
          sourceLine,
          isSourceOnIgnoreList
        )
    );
  };

  onClick(e, line, ch) {
    const { selectedSource, updateCursorPosition, jumpToMappedLocation } =
      this.props;

    if (selectedSource) {
      let sourceLocation;
      if (features.codemirrorNext) {
        sourceLocation = createLocation({
          source: selectedSource,
          line: fromEditorLine(
            selectedSource.id,
            line,
            isWasm(selectedSource.id)
          ),
          column: isWasm(selectedSource.id) ? 0 : ch + 1,
        });
      } else {
        sourceLocation = getSourceLocationFromMouseEvent(
          this.state.editor,
          selectedSource,
          e
        );
      }

      if (e.metaKey && e.altKey) {
        jumpToMappedLocation(sourceLocation);
      }

      updateCursorPosition(sourceLocation);
    }
  }

  shouldScrollToLocation(nextProps) {
    if (
      !nextProps.selectedLocation?.line ||
      !nextProps.selectedSourceTextContent
    ) {
      return false;
    }

    const { selectedLocation, selectedSourceTextContent } = this.props;
    const contentChanged =
      !selectedSourceTextContent?.value &&
      nextProps.selectedSourceTextContent?.value;
    const locationChanged = selectedLocation !== nextProps.selectedLocation;
    const symbolsChanged = nextProps.symbols != this.props.symbols;

    return contentChanged || locationChanged || symbolsChanged;
  }

  scrollToLocation(nextProps, editor) {
    const { selectedLocation, selectedSource } = nextProps;

    let { line, column } = toEditorPosition(selectedLocation);

    if (selectedSource && hasDocument(selectedSource.id)) {
      const doc = getDocument(selectedSource.id);
      const lineText = doc.getLine(line);
      column = Math.max(column, getIndentation(lineText));
    }
    editor.scrollTo(line, column);
  }

  setText(props, editor) {
    const { selectedSource, selectedSourceTextContent, symbols } = props;

    if (!editor) {
      return;
    }

    // check if we previously had a selected source
    if (!selectedSource) {
      if (!features.codemirrorNext) {
        this.clearEditor();
      }
      return;
    }

    if (!selectedSourceTextContent?.value) {
      this.showLoadingMessage(editor);
      return;
    }

    if (selectedSourceTextContent.state === "rejected") {
      let { value } = selectedSourceTextContent;
      if (typeof value !== "string") {
        value = "Unexpected source error";
      }

      this.showErrorMessage(value);
      return;
    }

    if (!features.codemirrorNext) {
      showSourceText(
        editor,
        selectedSource,
        selectedSourceTextContent,
        symbols
      );
    } else {
      editor.setText(selectedSourceTextContent.value.value);
    }
  }

  clearEditor() {
    const { editor } = this.state;
    if (!editor) {
      return;
    }

    const doc = editor.createDocument("", { name: "text" });
    editor.replaceDocument(doc);
    resetLineNumberFormat(editor);
  }

  showErrorMessage(msg) {
    const { editor } = this.state;
    if (!editor) {
      return;
    }

    let error;
    if (msg.includes("WebAssembly binary source is not available")) {
      error = L10N.getStr("wasmIsNotAvailable");
    } else {
      error = L10N.getFormatStr("errorLoadingText3", msg);
    }
    if (!features.codemirrorNext) {
      const doc = editor.createDocument(error, { name: "text" });
      editor.replaceDocument(doc);
      resetLineNumberFormat(editor);
    } else {
      editor.setText(error);
    }
  }

  showLoadingMessage(editor) {
    if (!features.codemirrorNext) {
      // Create the "loading message" document only once
      let doc = getDocument("loading");
      if (!doc) {
        doc = editor.createDocument(L10N.getStr("loadingText"), {
          name: "text",
        });
        setDocument("loading", doc);
      }
      // `createDocument` won't be used right away in the editor, we still need to
      // explicitely update it
      editor.replaceDocument(doc);
    } else {
      editor.setText(L10N.getStr("loadingText"));
    }
  }

  getInlineEditorStyles() {
    const { searchInFileEnabled } = this.props;

    if (searchInFileEnabled) {
      return {
        height: `calc(100% - ${cssVars.searchbarHeight})`,
      };
    }

    return {
      height: "100%",
    };
  }

  // eslint-disable-next-line complexity
  renderItems() {
    const {
      selectedSource,
      conditionalPanelLocation,
      isPaused,
      inlinePreviewEnabled,
      highlightedLineRange,
      blackboxedRanges,
      isSourceOnIgnoreList,
      selectedSourceIsBlackBoxed,
      mapScopesEnabled,
    } = this.props;
    const { editor } = this.state;

    if (!selectedSource || !editor) {
      return null;
    }

    if (features.codemirrorNext) {
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(Breakpoints, { editor }),
        isPaused &&
          selectedSource.isOriginal &&
          !selectedSource.isPrettyPrinted &&
          !mapScopesEnabled
          ? null
          : React.createElement(Preview, {
              editor,
              editorRef: this.$editorWrapper,
            }),
        React.createElement(DebugLine, { editor, selectedSource }),
        React.createElement(HighlightLine, { editor }),
        React.createElement(Exceptions, { editor }),
        conditionalPanelLocation
          ? React.createElement(ConditionalPanel, {
              editor,
              selectedSource,
            })
          : null,
        isPaused &&
          inlinePreviewEnabled &&
          (!selectedSource.isOriginal ||
            selectedSource.isPrettyPrinted ||
            mapScopesEnabled)
          ? React.createElement(InlinePreviews, {
              editor,
              selectedSource,
            })
          : null,
        highlightedLineRange
          ? React.createElement(HighlightLines, {
              editor,
              range: highlightedLineRange,
            })
          : null,
        React.createElement(ColumnBreakpoints, {
          editor,
        })
      );
    }

    if (!getDocument(selectedSource.id)) {
      return null;
    }
    return div(
      null,
      React.createElement(DebugLine, null),
      React.createElement(HighlightLine, null),
      React.createElement(EmptyLines, {
        editor,
      }),
      React.createElement(Breakpoints, {
        editor,
      }),
      isPaused &&
        selectedSource.isOriginal &&
        !selectedSource.isPrettyPrinted &&
        !mapScopesEnabled
        ? null
        : React.createElement(Preview, {
            editor,
            editorRef: this.$editorWrapper,
          }),
      highlightedLineRange
        ? React.createElement(HighlightLines, {
            editor,
            range: highlightedLineRange,
          })
        : null,
      isSourceOnIgnoreList || selectedSourceIsBlackBoxed
        ? React.createElement(BlackboxLines, {
            editor,
            selectedSource,
            isSourceOnIgnoreList,
            blackboxedRangesForSelectedSource:
              blackboxedRanges[selectedSource.url],
          })
        : null,
      React.createElement(Exceptions, null),
      conditionalPanelLocation
        ? React.createElement(ConditionalPanel, {
            editor,
          })
        : null,
      React.createElement(ColumnBreakpoints, {
        editor,
      }),
      isPaused &&
        inlinePreviewEnabled &&
        (!selectedSource.isOriginal ||
          (selectedSource.isOriginal && selectedSource.isPrettyPrinted) ||
          (selectedSource.isOriginal && mapScopesEnabled))
        ? React.createElement(InlinePreviews, {
            editor,
            selectedSource,
          })
        : null
    );
  }

  renderSearchInFileBar() {
    if (!this.props.selectedSource) {
      return null;
    }
    return React.createElement(SearchInFileBar, {
      editor: this.state.editor,
    });
  }

  render() {
    const { selectedSourceIsBlackBoxed, skipPausing } = this.props;
    return div(
      {
        className: classnames("editor-wrapper", {
          blackboxed: selectedSourceIsBlackBoxed,
          "skip-pausing": skipPausing,
        }),
        ref: c => (this.$editorWrapper = c),
      },
      div({
        className: "editor-mount devtools-monospace",
        style: this.getInlineEditorStyles(),
      }),
      this.renderSearchInFileBar(),
      this.renderItems()
    );
  }
}

Editor.contextTypes = {
  shortcuts: PropTypes.object,
};

const mapStateToProps = state => {
  const selectedSource = getSelectedSource(state);
  const selectedLocation = getSelectedLocation(state);

  return {
    selectedLocation,
    selectedSource,
    selectedSourceTextContent: getSelectedSourceTextContent(state),
    selectedSourceIsBlackBoxed: selectedSource
      ? isSourceBlackBoxed(state, selectedSource)
      : null,
    isSourceOnIgnoreList:
      isSourceMapIgnoreListEnabled(state) &&
      isSourceOnSourceMapIgnoreList(state, selectedSource),
    searchInFileEnabled: getActiveSearch(state) === "file",
    conditionalPanelLocation: getConditionalPanelLocation(state),
    symbols: getSymbols(state, selectedLocation),
    isPaused: getIsCurrentThreadPaused(state),
    skipPausing: getSkipPausing(state),
    inlinePreviewEnabled: getInlinePreview(state),
    blackboxedRanges: getBlackBoxRanges(state),
    breakableLines: getSelectedBreakableLines(state),
    highlightedLineRange: getHighlightedLineRangeForSelectedSource(state),
    mapScopesEnabled: selectedSource?.isOriginal
      ? isMapScopesEnabled(state)
      : null,
  };
};

const mapDispatchToProps = dispatch => ({
  ...bindActionCreators(
    {
      openConditionalPanel: actions.openConditionalPanel,
      closeConditionalPanel: actions.closeConditionalPanel,
      continueToHere: actions.continueToHere,
      toggleBreakpointAtLine: actions.toggleBreakpointAtLine,
      addBreakpointAtLine: actions.addBreakpointAtLine,
      jumpToMappedLocation: actions.jumpToMappedLocation,
      updateViewport: actions.updateViewport,
      updateCursorPosition: actions.updateCursorPosition,
      closeTab: actions.closeTab,
      showEditorContextMenu: actions.showEditorContextMenu,
      showEditorGutterContextMenu: actions.showEditorGutterContextMenu,
      selectLocation: actions.selectLocation,
    },
    dispatch
  ),
});

export default connect(mapStateToProps, mapDispatchToProps)(Editor);
