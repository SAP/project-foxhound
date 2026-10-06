/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import { Component } from "devtools/client/shared/vendor/react";
import {
  button,
  div,
  span,
} from "devtools/client/shared/vendor/react-dom-factories";
import ReactDOM from "devtools/client/shared/vendor/react-dom";
import PropTypes from "devtools/client/shared/vendor/react-prop-types";
import { connect } from "devtools/client/shared/vendor/react-redux";
import { toEditorLine } from "../../utils/editor/index";
import actions from "../../actions/index";

import {
  getSelectedTraceLocation,
  getAllTraces,
  getSelectedTraceIndex,
  getSelectedLocationTraces,
} from "../../selectors/index";

export class TracePanel extends Component {
  constructor() {
    super();
  }

  static get propTypes() {
    return {
      editor: PropTypes.object.isRequired,
      selectedTraceLocation: PropTypes.any.isRequired,
    };
  }

  shouldComponentUpdate(nextProps) {
    return (
      nextProps.selectedTraceLocation.source.id !=
        this.props.selectedTraceLocation.source.id ||
      nextProps.selectedTraceLocation.line !=
        this.props.selectedTraceLocation.line ||
      nextProps.allTraces.length != this.props.allTraces.length ||
      nextProps.selectedTraceLocationTraces !==
        this.props.selectedTraceLocationTraces ||
      nextProps.selectedTraceIndex != this.props.selectedTraceIndex
    );
  }

  // FIXME: https://bugzilla.mozilla.org/show_bug.cgi?id=1774507
  UNSAFE_componentWillMount() {
    return this.renderToWidget(this.props);
  }

  // FIXME: https://bugzilla.mozilla.org/show_bug.cgi?id=1774507
  UNSAFE_componentWillUpdate() {}

  componentDidUpdate() {
    this.renderToWidget(this.props);
  }

  componentWillUnmount() {
    const { editor } = this.props;
    editor.removeLineContentMarker(editor.markerTypes.TRACE_MARKER);
  }

  renderToWidget(props) {
    const { selectedTraceLocation, editor } = props;

    editor.removeLineContentMarker(editor.markerTypes.TRACE_MARKER);

    if (!selectedTraceLocation || !this.props.selectedTraceLocationTraces) {
      return;
    }

    const editorLine = toEditorLine(
      selectedTraceLocation.source.id,
      selectedTraceLocation.line || 0
    );
    editor.setLineContentMarker({
      id: editor.markerTypes.TRACE_MARKER,
      lines: [{ line: editorLine }],
      renderAsBlock: true,
      createLineElementNode: () => {
        return this.renderTracePanel(this.props);
      },
    });
  }

  renderTracePanel() {
    const panel = document.createElement("aside");
    panel.className = "trace-inline-panel-container";

    const { allTraces, selectedTraceLocationTraces, selectedTraceIndex } =
      this.props;
    const traceButtons = [];
    const selectedIndex = selectedTraceLocationTraces.indexOf(
      allTraces[selectedTraceIndex]
    );
    const startIndex = selectedIndex == -1 ? 0 : Math.max(0, selectedIndex - 5);
    const lastIndex = Math.min(
      selectedTraceLocationTraces.length,
      startIndex + 10
    );
    for (let traceIndex = startIndex; traceIndex < lastIndex; traceIndex++) {
      const selected = traceIndex === selectedIndex;
      traceButtons.push(
        button(
          {
            key: `${traceIndex}-${selected}`,
            className: `trace-item${selected ? " selected" : ""}`,

            onClick: () => {
              this.props.selectTrace(
                allTraces.indexOf(selectedTraceLocationTraces[traceIndex])
              );
            },
          },
          traceIndex + 1
        )
      );
    }
    const traceCount = this.props.selectedTraceLocationTraces.length;
    ReactDOM.render(
      div(
        { className: "trace-panel" },
        span(null, `${traceCount} execution${traceCount > 1 ? "s" : ""}: `),
        traceButtons
      ),
      panel
    );
    return panel;
  }

  render() {
    return null;
  }
}

const mapStateToProps = state => {
  const selectedTraceLocation = getSelectedTraceLocation(state);

  const allTraces = getAllTraces(state);
  const selectedTraceIndex = getSelectedTraceIndex(state);
  const selectedTraceLocationTraces = getSelectedLocationTraces(state);

  return {
    selectedTraceLocation,
    allTraces,
    selectedTraceLocationTraces,
    selectedTraceIndex,
  };
};

const mapDispatchToProps = {
  selectTrace: actions.selectTrace,
};

export default connect(mapStateToProps, mapDispatchToProps)(TracePanel);
