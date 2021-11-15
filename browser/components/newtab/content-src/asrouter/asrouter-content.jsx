/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { MESSAGE_TYPE_HASH as msg } from "common/ActorConstants.jsm";
import { actionCreators as ac, actionTypes as at } from "common/Actions.jsm";
import { ASRouterUtils } from "./asrouter-utils";
import { generateBundles } from "./rich-text-strings";
import { ImpressionsWrapper } from "./components/ImpressionsWrapper/ImpressionsWrapper";
import { LocalizationProvider } from "fluent-react";
import { NEWTAB_DARK_THEME } from "content-src/lib/constants";
import React from "react";
import ReactDOM from "react-dom";
import { SnippetsTemplates } from "./templates/template-manifest";
import { FirstRun } from "./templates/FirstRun/FirstRun";

const TEMPLATES_ABOVE_PAGE = ["extended_triplets"];
const TEMPLATES_BELOW_SEARCH = ["simple_below_search_snippet"];

// Note: nextProps/prevProps refer to props passed to <ImpressionsWrapper />, not <ASRouterUISurface />
function shouldSendImpressionOnUpdate(nextProps, prevProps) {
  return (
    nextProps.message.id &&
    (!prevProps.message || prevProps.message.id !== nextProps.message.id)
  );
}

export class ASRouterUISurface extends React.PureComponent {
  constructor(props) {
    super(props);
    this.sendClick = this.sendClick.bind(this);
    this.sendImpression = this.sendImpression.bind(this);
    this.sendUserActionTelemetry = this.sendUserActionTelemetry.bind(this);
    this.onUserAction = this.onUserAction.bind(this);
    this.fetchFlowParams = this.fetchFlowParams.bind(this);
    this.onBlockSelected = this.onBlockSelected.bind(this);
    this.onBlockById = this.onBlockById.bind(this);
    this.onDismiss = this.onDismiss.bind(this);
    this.onMessageFromParent = this.onMessageFromParent.bind(this);

    this.state = { message: {} };
    if (props.document) {
      this.headerPortal = props.document.getElementById(
        "header-asrouter-container"
      );
      this.footerPortal = props.document.getElementById(
        "footer-asrouter-container"
      );
    }
  }

  async fetchFlowParams(params = {}) {
    let result = {};
    const { fxaEndpoint, dispatch } = this.props;
    if (!fxaEndpoint) {
      const err =
        "Tried to fetch flow params before fxaEndpoint pref was ready";
      console.error(err); // eslint-disable-line no-console
    }

    try {
      const urlObj = new URL(fxaEndpoint);
      urlObj.pathname = "metrics-flow";
      Object.keys(params).forEach(key => {
        urlObj.searchParams.append(key, params[key]);
      });
      const response = await fetch(urlObj.toString(), { credentials: "omit" });
      if (response.status === 200) {
        const { deviceId, flowId, flowBeginTime } = await response.json();
        result = { deviceId, flowId, flowBeginTime };
      } else {
        console.error("Non-200 response", response); // eslint-disable-line no-console
        dispatch(
          ac.OnlyToMain({
            type: at.TELEMETRY_UNDESIRED_EVENT,
            data: {
              event: "FXA_METRICS_FETCH_ERROR",
              value: response.status,
            },
          })
        );
      }
    } catch (error) {
      console.error(error); // eslint-disable-line no-console
      dispatch(
        ac.OnlyToMain({
          type: at.TELEMETRY_UNDESIRED_EVENT,
          data: { event: "FXA_METRICS_ERROR" },
        })
      );
    }
    return result;
  }

  sendUserActionTelemetry(extraProps = {}) {
    const { message } = this.state;
    const eventType = `${message.provider}_user_event`;
    ASRouterUtils.sendTelemetry({
      message_id: message.id,
      source: extraProps.id,
      action: eventType,
      ...extraProps,
    });
  }

  sendImpression(extraProps) {
    if (this.state.message.provider === "preview") {
      return Promise.resolve();
    }

    this.sendUserActionTelemetry({ event: "IMPRESSION", ...extraProps });
    return ASRouterUtils.sendMessage({
      type: msg.IMPRESSION,
      data: this.state.message,
    });
  }

  // If link has a `metric` data attribute send it as part of the `event_context`
  // telemetry field which can have arbitrary values.
  // Used for router messages with links as part of the content.
  sendClick(event) {
    const { dataset } = event.target;
    const metric = {
      event_context: dataset.metric,
      // Used for the `source` of the event. Needed to differentiate
      // from other snippet or onboarding events that may occur.
      id: "NEWTAB_FOOTER_BAR_CONTENT",
    };
    const { entrypoint_name, entrypoint_value } = dataset;
    // Assign the snippet referral for the action
    const entrypoint = entrypoint_name
      ? new URLSearchParams([[entrypoint_name, entrypoint_value]]).toString()
      : entrypoint_value;
    const action = {
      type: dataset.action,
      data: {
        args: dataset.args,
        ...(entrypoint && { entrypoint }),
      },
    };
    if (action.type) {
      ASRouterUtils.executeAction(action);
    }
    if (
      !this.state.message.content.do_not_autoblock &&
      !dataset.do_not_autoblock
    ) {
      this.onBlockById(this.state.message.id);
    }
    if (this.state.message.provider !== "preview") {
      this.sendUserActionTelemetry({ event: "CLICK_BUTTON", ...metric });
    }
  }

  onBlockSelected(options) {
    return this.onBlockById(this.state.message.id, options);
  }

  onBlockById(id, options) {
    return ASRouterUtils.blockById(id, options).then(clearAll => {
      if (clearAll) {
        this.setState({ message: {} });
      }
    });
  }

  onDismiss() {
    this.clearMessage(this.state.message.id);
  }

  clearMessage(id) {
    // Request new set of dynamic triplet cards when click on a card CTA clear
    // message and 'id' matches one of the cards in message bundle
    if (
      this.state.message &&
      this.state.message.bundle &&
      this.state.message.bundle.find(card => card.id === id)
    ) {
      this.requestMessage();
    }

    if (id === this.state.message.id) {
      this.setState({ message: {} });
    }
  }

  clearProvider(id) {
    if (this.state.message.provider === id) {
      this.setState({ message: {} });
    }
  }

  onMessageFromParent({ type, data }) {
    // These only exists due to onPrefChange events in ASRouter
    switch (type) {
      case "ClearMessages": {
        data.forEach(id => this.clearMessage(id));
        break;
      }
      case "ClearProviders": {
        data.forEach(id => this.clearProvider(id));
        break;
      }
      case "EnterSnippetsPreviewMode": {
        this.props.dispatch({ type: at.SNIPPETS_PREVIEW_MODE });
        break;
      }
    }
  }

  requestMessage(endpoint) {
    ASRouterUtils.sendMessage({
      type: "NEWTAB_MESSAGE_REQUEST",
      data: { endpoint },
    }).then(state => this.setState(state));
  }

  componentWillMount() {
    const endpoint = ASRouterUtils.getPreviewEndpoint();
    if (endpoint && endpoint.theme === "dark") {
      global.window.dispatchEvent(
        new CustomEvent("LightweightTheme:Set", {
          detail: { data: NEWTAB_DARK_THEME },
        })
      );
    }
    if (endpoint && endpoint.dir === "rtl") {
      //Set `dir = rtl` on the HTML
      this.props.document.dir = "rtl";
    }
    ASRouterUtils.addListener(this.onMessageFromParent);
    this.requestMessage(endpoint);
  }

  componentWillUnmount() {
    ASRouterUtils.removeListener(this.onMessageFromParent);
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.adminContent &&
      JSON.stringify(prevProps.adminContent) !==
        JSON.stringify(this.props.adminContent)
    ) {
      this.updateContent();
    }
  }

  updateContent() {
    this.setState({
      ...this.props.adminContent,
    });
  }

  async getMonitorUrl({ url, flowRequestParams = {} }) {
    const flowValues = await this.fetchFlowParams(flowRequestParams);

    // Note that flowParams are actually added dynamically on the page
    const urlObj = new URL(url);
    ["deviceId", "flowId", "flowBeginTime"].forEach(key => {
      if (key in flowValues) {
        urlObj.searchParams.append(key, flowValues[key]);
      }
    });

    return urlObj.toString();
  }

  async onUserAction(action) {
    switch (action.type) {
      // This needs to be handled locally because its
      case "ENABLE_FIREFOX_MONITOR":
        const url = await this.getMonitorUrl(action.data.args);
        ASRouterUtils.executeAction({ type: "OPEN_URL", data: { args: url } });
        break;
      default:
        ASRouterUtils.executeAction(action);
    }
  }

  renderSnippets() {
    const { message } = this.state;
    if (!SnippetsTemplates[message.template]) {
      return null;
    }
    const SnippetComponent = SnippetsTemplates[message.template];
    const { content } = this.state.message;

    return (
      <ImpressionsWrapper
        id="NEWTAB_FOOTER_BAR"
        message={this.state.message}
        sendImpression={this.sendImpression}
        shouldSendImpressionOnUpdate={shouldSendImpressionOnUpdate}
        // This helps with testing
        document={this.props.document}
      >
        <LocalizationProvider bundles={generateBundles(content)}>
          <SnippetComponent
            {...this.state.message}
            UISurface="NEWTAB_FOOTER_BAR"
            onBlock={this.onBlockSelected}
            onDismiss={this.onDismiss}
            onAction={this.onUserAction}
            sendClick={this.sendClick}
            sendUserActionTelemetry={this.sendUserActionTelemetry}
          />
        </LocalizationProvider>
      </ImpressionsWrapper>
    );
  }

  renderPreviewBanner() {
    if (this.state.message.provider !== "preview") {
      return null;
    }

    return (
      <div className="snippets-preview-banner">
        <span className="icon icon-small-spacer icon-info" />
        <span>Preview Purposes Only</span>
      </div>
    );
  }

  renderFirstRun() {
    const { message } = this.state;
    if (TEMPLATES_ABOVE_PAGE.includes(message.template)) {
      return (
        <ImpressionsWrapper
          id="FIRST_RUN"
          message={this.state.message}
          sendImpression={this.sendImpression}
          shouldSendImpressionOnUpdate={shouldSendImpressionOnUpdate}
          // This helps with testing
          document={this.props.document}
        >
          <FirstRun
            document={this.props.document}
            message={message}
            sendUserActionTelemetry={this.sendUserActionTelemetry}
            executeAction={ASRouterUtils.executeAction}
            onBlockById={ASRouterUtils.blockById}
            onDismiss={this.onDismiss}
            fxaEndpoint={this.props.fxaEndpoint}
            appUpdateChannel={this.props.appUpdateChannel}
            fetchFlowParams={this.fetchFlowParams}
          />
        </ImpressionsWrapper>
      );
    }
    return null;
  }

  render() {
    const { message } = this.state;
    if (!message.id) {
      return null;
    }
    const shouldRenderBelowSearch = TEMPLATES_BELOW_SEARCH.includes(
      message.template
    );
    const shouldRenderInHeader = TEMPLATES_ABOVE_PAGE.includes(
      message.template
    );

    return shouldRenderBelowSearch ? (
      // Render special below search snippets in place;
      <div className="below-search-snippet-wrapper">
        {this.renderSnippets()}
      </div>
    ) : (
      // For onboarding, regular snippets etc. we should render
      // everything in our footer container.
      ReactDOM.createPortal(
        <>
          {this.renderPreviewBanner()}
          {this.renderFirstRun()}
          {this.renderSnippets()}
        </>,
        shouldRenderInHeader ? this.headerPortal : this.footerPortal
      )
    );
  }
}

ASRouterUISurface.defaultProps = { document: global.document };
