/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// React deps
const {
  Component,
} = require("resource://devtools/client/shared/vendor/react.mjs");
const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.mjs");
const dom = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const { div, h1, h2, h3, p, a, button } = dom;

loader.lazyRequireGetter(
  this,
  "Telemetry",
  "resource://devtools/client/shared/telemetry.js"
);

// Localized strings for (devtools/client/locales/en-US/components.properties)
loader.lazyGetter(this, "L10N", function () {
  const { LocalizationHelper } = require("resource://devtools/shared/l10n.js");
  return new LocalizationHelper(
    "devtools/client/locales/components.properties"
  );
});

loader.lazyGetter(this, "FILE_BUG_BUTTON", function () {
  return L10N.getStr("appErrorBoundary.fileBugButton");
});

loader.lazyGetter(this, "RELOAD_PAGE_INFO", function () {
  return L10N.getStr("appErrorBoundary.reloadPanelInfo");
});

// File a bug for the selected component specifically
// Add format=__default__ to make sure users without EDITBUGS permission still
// use the regular UI to create bugs, including the prefilled description.
const bugLink =
  "https://bugzilla.mozilla.org/enter_bug.cgi?format=__default__&blocked=devtools-toolbox-crash&product=DevTools&component=";

/**
 * Error boundary that wraps around the a given component.
 */
class AppErrorBoundary extends Component {
  static get propTypes() {
    return {
      children: PropTypes.any.isRequired,
      panel: PropTypes.any.isRequired,
      componentName: PropTypes.string.isRequired,
      openLink: PropTypes.func,
    };
  }

  // Keep a flag to avoid submitting extra pings in case several components
  // fail in cascade.
  #pingSubmitted = false;

  constructor(props) {
    super(props);

    this.state = {
      errorMsg: "No error",
      errorStack: null,
      errorInfo: null,
      // Will be used to provide a button to close the toolbox.
      toolbox: null,
    };
  }

  /**
   *  Map the `info` object to a render.
   *  Currently, `info` usually just contains something similar to the
   *  following object (which is provided to componentDidCatch):
   *  componentStack: {"\n in (component) \n in (other component)..."}
   */
  renderErrorInfo(info = {}) {
    if (Object.keys(info).length) {
      return Object.keys(info)
        .filter(key => info[key])
        .map((obj, outerIdx) => {
          switch (obj) {
            case "componentStack": {
              const traceParts = info[obj]
                .split("\n")
                .map((part, idx) => p({ key: `strace${idx}` }, part));
              return div(
                { key: `st-div-${outerIdx}`, className: "stack-trace-section" },
                h3({}, "React Component Stack"),
                traceParts
              );
            }
            case "clientPacket":
            case "serverPacket": {
              // Only serverPacket has a stack.
              const stack = info[obj].stack;
              const traceParts = stack
                ? stack
                    .split("\n")
                    .map((part, idx) => p({ key: `strace${idx}` }, part))
                : null;
              return div(
                { className: "stack-trace-section" },
                h3(
                  {},
                  obj == "clientPacket" ? "Client packet" : "Server packet"
                ),
                // Display the packet as JSON, while removing the artifical `stack` attribute from it
                p(
                  {},
                  JSON.stringify({ ...info[obj], stack: undefined }, null, 2)
                ),
                stack ? h3({}, "Server stack") : null,
                traceParts
              );
            }
          }
          return null;
        });
    }

    return p({}, "undefined errorInfo");
  }

  renderStackTrace(stacktrace = "") {
    const re = /:\d+:\d+/g;
    const traces = stacktrace
      .replace(re, "$&,")
      .split(",")
      .map((trace, index) => {
        return p({ key: `rst-${index}` }, trace);
      });

    return div(
      { className: "stack-trace-section" },
      h3({}, "Stacktrace"),
      traces
    );
  }

  renderServerPacket(packet) {
    const traceParts = packet.stack
      .split("\n")
      .map((part, idx) => p({ key: `strace${idx}` }, part));
    return [
      div(
        { className: "stack-trace-section" },
        h3({}, "Server packet"),
        p({}, JSON.stringify(packet, null, 2))
      ),
      div(
        { className: "stack-trace-section" },
        h3({}, "Server Stack"),
        traceParts
      ),
    ];
  }

  // Return a valid object, even if we don't receive one
  getValidInfo(infoObj) {
    if (!infoObj.componentStack) {
      try {
        return { componentStack: JSON.stringify(infoObj) };
      } catch (err) {
        return { componentStack: `Unknown Error: ${err}` };
      }
    }
    return infoObj;
  }

  // Called when a child component throws an error.
  componentDidCatch(error, info) {
    const validInfo = this.getValidInfo(info);
    const errorMessage = error.toString();

    this.setState({
      errorMsg: errorMessage,
      errorStack: error.stack,
      errorInfo: validInfo,
    });

    if (this.#pingSubmitted) {
      // If the component already sent the telemetry ping for this session, skip
      // recording a new event.
      return;
    }

    const extras = Telemetry.sanitizeEventExtras(
      {
        component_stack: validInfo.componentStack || "",
        error_name: error.name,
        stack: error.stack || "",
      },
      "devtoolsMain.toolboxComponentError",
      // Allow up to 500 characters for each extra value (maximum value
      // supported by Glean events).
      { limit: 500 }
    );
    Glean.devtoolsMain.toolboxComponentError.record(extras);
    this.#pingSubmitted = true;
  }

  // This is explicitly called by the toolbox when a server issue is captured.
  toolboxDidCatch(error, toolbox) {
    const errorMessage = error.toString();
    const clientPacket = error.clientPacket || {};
    const serverPacket = error.serverPacket || {};

    this.setState({
      errorMsg: errorMessage,
      errorStack: error.stack,
      errorInfo: {
        clientPacket,
        serverPacket,
      },
      // Toolbox state will be used to provide a button to close the toolbox.
      toolbox,
    });

    if (this.#pingSubmitted) {
      // If the component already sent the telemetry ping for this session, skip
      // recording a new event.
      return;
    }

    const extras = Telemetry.sanitizeEventExtras(
      {
        error_name: error.name,
        packet_error: serverPacket.error,
        packet_target: serverPacket.from,
        packet_type: clientPacket.type,
        server_stack: serverPacket.stack || "",
        stack: error.stack || "",
      },
      "devtoolsMain.toolboxServerError",
      // Allow up to 500 characters for each extra value (maximum value
      // supported by Glean events).
      { limit: 500 }
    );
    Glean.devtoolsMain.toolboxServerError.record(extras);
    this.#pingSubmitted = true;
  }

  getBugLink() {
    const { componentStack, clientPacket, serverPacket } = this.state.errorInfo;

    let msg =
      "## Steps to reproduce:\n\n" +
      "If possible, please share specific steps to reproduce the error.\n" +
      "Otherwise add any additional information useful to investigate the issue.\n\n";

    msg += `## Error in ${this.props.panel}: \n${this.state.errorMsg}\n\n`;

    if (componentStack) {
      msg += `## React Component Stack:${componentStack}\n\n`;
    }

    if (clientPacket) {
      msg += `## Client Packet:\n\`\`\`\n${JSON.stringify(clientPacket, null, 2)}\n\`\`\`\n\n`;
    }

    if (serverPacket) {
      // Display the packet as JSON, while removing the artifical `stack` attribute from it
      msg += `## Server Packet:\n\`\`\`\n${JSON.stringify({ ...serverPacket, stack: undefined }, null, 2)}\n\`\`\`\n\n`;
      msg += `## Server Stack:\n\`\`\`\n${serverPacket.stack}\n\`\`\`\n\n`;
    }

    msg += `## Stacktrace: \n\`\`\`\n${this.state.errorStack}\n\`\`\``;

    return `${bugLink}${this.props.componentName}&comment=${encodeURIComponent(
      msg
    )}`;
  }

  render() {
    if (this.state.errorInfo !== null) {
      // "The (componentDesc) has crashed"
      const errorDescription = L10N.getFormatStr(
        "appErrorBoundary.description",
        this.props.panel
      );

      const href = this.getBugLink();

      return div(
        {
          className: `app-error-panel`,
        },
        h1({ className: "error-panel-header" }, errorDescription),
        a(
          {
            className: "error-panel-file-button",
            href,
            target: "_blank",
            onClick: this.props.openLink
              ? e => this.props.openLink(href, e)
              : null,
          },
          FILE_BUG_BUTTON
        ),
        this.state.toolbox
          ? button({
              className: "devtools-tabbar-button error-panel-close",
              onClick: () => {
                this.state.toolbox.closeToolbox();
              },
            })
          : null,
        h2({ className: "error-panel-error" }, this.state.errorMsg),
        div({}, this.renderErrorInfo(this.state.errorInfo)),
        div({}, this.renderStackTrace(this.state.errorStack)),
        p({ className: "error-panel-reload-info" }, RELOAD_PAGE_INFO)
      );
    }
    return this.props.children;
  }
}

module.exports = AppErrorBoundary;
