/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  Component,
  createRef,
  createFactory,
} = require("resource://devtools/client/shared/vendor/react.js");
const dom = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const { div } = dom;
const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.js");
const {
  connect,
} = require("resource://devtools/client/shared/redux/visibility-handler-connect.js");
const Actions = require("resource://devtools/client/netmonitor/src/actions/index.js");
const {
  findDOMNode,
} = require("resource://devtools/client/shared/vendor/react-dom.js");
const {
  getSelectedMessage,
  isSelectedMessageVisible,
} = require("resource://devtools/client/netmonitor/src/selectors/index.js");

// Components
const SplitBox = createFactory(
  require("resource://devtools/client/shared/components/splitter/SplitBox.js")
);
const MessageListContent = createFactory(
  require("resource://devtools/client/netmonitor/src/components/messages/MessageListContent.js")
);
const Toolbar = createFactory(
  require("resource://devtools/client/netmonitor/src/components/messages/Toolbar.js")
);
const StatusBar = createFactory(
  require("resource://devtools/client/netmonitor/src/components/messages/StatusBar.js")
);

loader.lazyGetter(this, "MessagePayload", function() {
  return createFactory(
    require("resource://devtools/client/netmonitor/src/components/messages/MessagePayload.js")
  );
});

/**
 * Renders a list of messages in table view.
 * Full payload is separated using a SplitBox.
 */
class MessagesView extends Component {
  static get propTypes() {
    return {
      connector: PropTypes.object.isRequired,
      selectedMessage: PropTypes.object,
      messageDetailsOpen: PropTypes.bool.isRequired,
      openMessageDetailsTab: PropTypes.func.isRequired,
      selectedMessageVisible: PropTypes.bool.isRequired,
      channelId: PropTypes.number,
    };
  }

  constructor(props) {
    super(props);

    this.searchboxRef = createRef();
    this.clearFilterText = this.clearFilterText.bind(this);
    this.handleContainerElement = this.handleContainerElement.bind(this);
    this.state = {
      startPanelContainer: null,
    };
  }

  componentDidUpdate(prevProps) {
    const {
      channelId,
      openMessageDetailsTab,
      selectedMessageVisible,
    } = this.props;

    // If a new connection is selected, clear the filter text
    if (channelId !== prevProps.channelId) {
      this.clearFilterText();
    }

    if (!selectedMessageVisible) {
      openMessageDetailsTab(false);
    }
  }

  componentWillUnmount() {
    const { openMessageDetailsTab } = this.props;
    openMessageDetailsTab(false);

    const { clientHeight } = findDOMNode(this.refs.endPanel) || {};

    if (clientHeight) {
      Services.prefs.setIntPref(
        "devtools.netmonitor.msg.payload-preview-height",
        clientHeight
      );
    }
  }

  /* Store the parent DOM element of the SplitBox startPanel's element.
     We need this element for as an option for the IntersectionObserver */
  handleContainerElement(element) {
    if (!this.state.startPanelContainer) {
      this.setState({
        startPanelContainer: element,
      });
    }
  }

  // Reset the filter text
  clearFilterText() {
    if (this.searchboxRef) {
      this.searchboxRef.current.onClearButtonClick();
    }
  }

  render() {
    const {
      messageDetailsOpen,
      connector,
      selectedMessage,
      channelId,
    } = this.props;

    const { searchboxRef } = this;
    const { startPanelContainer } = this.state;

    const initialHeight = Services.prefs.getIntPref(
      "devtools.netmonitor.msg.payload-preview-height"
    );

    return div(
      { id: "messages-view", className: "monitor-panel" },
      Toolbar({
        searchboxRef,
      }),
      SplitBox({
        className: "devtools-responsive-container",
        initialHeight,
        minSize: "50px",
        maxSize: "80%",
        splitterSize: messageDetailsOpen ? 1 : 0,
        onSelectContainerElement: this.handleContainerElement,
        startPanel: MessageListContent({
          connector,
          startPanelContainer,
          channelId,
        }),
        endPanel:
          messageDetailsOpen &&
          MessagePayload({
            ref: "endPanel",
            connector,
            selectedMessage,
          }),
        endPanelCollapsed: !messageDetailsOpen,
        endPanelControl: true,
        vert: false,
      }),
      StatusBar()
    );
  }
}

module.exports = connect(
  state => ({
    channelId: state.messages.currentChannelId,
    messageDetailsOpen: state.messages.messageDetailsOpen,
    selectedMessage: getSelectedMessage(state),
    selectedMessageVisible: isSelectedMessageVisible(state),
  }),
  dispatch => ({
    openMessageDetailsTab: open => dispatch(Actions.openMessageDetails(open)),
  })
)(MessagesView);
