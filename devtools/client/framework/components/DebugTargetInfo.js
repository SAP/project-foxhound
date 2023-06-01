/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const {
  PureComponent,
  createFactory,
} = require("resource://devtools/client/shared/vendor/react.js");
const dom = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.js");
const {
  CONNECTION_TYPES,
} = require("resource://devtools/client/shared/remote-debugging/constants.js");
const DESCRIPTOR_TYPES = require("resource://devtools/client/fronts/descriptors/descriptor-types.js");
const FluentReact = require("resource://devtools/client/shared/vendor/fluent-react.js");
const Localized = createFactory(FluentReact.Localized);

/**
 * This is header that should be displayed on top of the toolbox when using
 * about:devtools-toolbox.
 */
class DebugTargetInfo extends PureComponent {
  static get propTypes() {
    return {
      alwaysOnTop: PropTypes.boolean.isRequired,
      focusedState: PropTypes.boolean,
      toggleAlwaysOnTop: PropTypes.func.isRequired,
      debugTargetData: PropTypes.shape({
        connectionType: PropTypes.oneOf(Object.values(CONNECTION_TYPES))
          .isRequired,
        runtimeInfo: PropTypes.shape({
          deviceName: PropTypes.string,
          icon: PropTypes.string.isRequired,
          name: PropTypes.string.isRequired,
          version: PropTypes.string.isRequired,
        }).isRequired,
        descriptorType: PropTypes.oneOf(Object.values(DESCRIPTOR_TYPES))
          .isRequired,
      }).isRequired,
      L10N: PropTypes.object.isRequired,
      toolbox: PropTypes.object.isRequired,
    };
  }

  constructor(props) {
    super(props);

    this.state = { urlValue: props.toolbox.target.url };

    this.onChange = this.onChange.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  componentDidMount() {
    this.updateTitle();
  }

  updateTitle() {
    const { L10N, debugTargetData, toolbox } = this.props;
    const title = toolbox.target.name;
    const descriptorTypeStr = L10N.getStr(
      this.getAssetsForDebugDescriptorType().l10nId
    );

    const { connectionType } = debugTargetData;
    if (connectionType === CONNECTION_TYPES.THIS_FIREFOX) {
      toolbox.doc.title = L10N.getFormatStr(
        "toolbox.debugTargetInfo.tabTitleLocal",
        descriptorTypeStr,
        title
      );
    } else {
      const connectionTypeStr = L10N.getStr(
        this.getAssetsForConnectionType().l10nId
      );
      toolbox.doc.title = L10N.getFormatStr(
        "toolbox.debugTargetInfo.tabTitleRemote",
        connectionTypeStr,
        descriptorTypeStr,
        title
      );
    }
  }

  getRuntimeText() {
    const { debugTargetData, L10N } = this.props;
    const { name, version } = debugTargetData.runtimeInfo;
    const { connectionType } = debugTargetData;
    const brandShorterName = L10N.getStr("brandShorterName");

    return connectionType === CONNECTION_TYPES.THIS_FIREFOX
      ? L10N.getFormatStr(
          "toolbox.debugTargetInfo.runtimeLabel.thisRuntime",
          brandShorterName,
          version
        )
      : L10N.getFormatStr(
          "toolbox.debugTargetInfo.runtimeLabel",
          name,
          version
        );
  }

  getAssetsForConnectionType() {
    const { connectionType } = this.props.debugTargetData;

    switch (connectionType) {
      case CONNECTION_TYPES.USB:
        return {
          image: "chrome://devtools/skin/images/aboutdebugging-usb-icon.svg",
          l10nId: "toolbox.debugTargetInfo.connection.usb",
        };
      case CONNECTION_TYPES.NETWORK:
        return {
          image: "chrome://devtools/skin/images/aboutdebugging-globe-icon.svg",
          l10nId: "toolbox.debugTargetInfo.connection.network",
        };
      default:
        return {};
    }
  }

  getAssetsForDebugDescriptorType() {
    const { descriptorType } = this.props.debugTargetData;

    // TODO: https://bugzilla.mozilla.org/show_bug.cgi?id=1520723
    //       Show actual favicon (currently toolbox.target.activeTab.favicon
    //       is unpopulated)
    const favicon = "chrome://devtools/skin/images/globe.svg";

    switch (descriptorType) {
      case DESCRIPTOR_TYPES.EXTENSION:
        return {
          image: "chrome://devtools/skin/images/debugging-addons.svg",
          l10nId: "toolbox.debugTargetInfo.targetType.extension",
        };
      case DESCRIPTOR_TYPES.PROCESS:
        return {
          image: "chrome://devtools/skin/images/settings.svg",
          l10nId: "toolbox.debugTargetInfo.targetType.process",
        };
      case DESCRIPTOR_TYPES.TAB:
        return {
          image: favicon,
          l10nId: "toolbox.debugTargetInfo.targetType.tab",
        };
      case DESCRIPTOR_TYPES.WORKER:
        return {
          image: "chrome://devtools/skin/images/debugging-workers.svg",
          l10nId: "toolbox.debugTargetInfo.targetType.worker",
        };
      default:
        return {};
    }
  }

  onChange({ target }) {
    this.setState({ urlValue: target.value });
  }

  onFocus({ target }) {
    target.select();
  }

  onSubmit(event) {
    event.preventDefault();
    let url = this.state.urlValue;

    if (!url || !url.length) {
      return;
    }

    try {
      // Get the URL from the fixup service:
      const flags = Services.uriFixup.FIXUP_FLAG_FIX_SCHEME_TYPOS;
      const uriInfo = Services.uriFixup.getFixupURIInfo(url, flags);
      url = uriInfo.fixedURI.spec;
    } catch (ex) {
      // The getFixupURIInfo service will throw an error if a malformed URI is
      // produced from the input.
      console.error(ex);
    }

    this.props.toolbox.target.navigateTo({ url });
  }

  shallRenderConnection() {
    const { connectionType } = this.props.debugTargetData;
    const renderableTypes = [CONNECTION_TYPES.USB, CONNECTION_TYPES.NETWORK];

    return renderableTypes.includes(connectionType);
  }

  renderConnection() {
    const { connectionType } = this.props.debugTargetData;
    const { image, l10nId } = this.getAssetsForConnectionType();

    return dom.span(
      {
        className: "iconized-label qa-connection-info",
      },
      dom.img({ src: image, alt: `${connectionType} icon` }),
      this.props.L10N.getStr(l10nId)
    );
  }

  renderRuntime() {
    if (
      !this.props.debugTargetData.runtimeInfo ||
      (this.props.debugTargetData.connectionType ===
        CONNECTION_TYPES.THIS_FIREFOX &&
        this.props.debugTargetData.descriptorType ===
          DESCRIPTOR_TYPES.EXTENSION)
    ) {
      // Skip the runtime render if no runtimeInfo is available.
      // Runtime info is retrieved from the remote-client-manager, which might not be
      // setup if about:devtools-toolbox was not opened from about:debugging.
      //
      // Also skip the runtime if we are debugging firefox itself, mainly to save some space.
      return null;
    }

    const { icon, deviceName } = this.props.debugTargetData.runtimeInfo;

    return dom.span(
      {
        className: "iconized-label qa-runtime-info",
      },
      dom.img({ src: icon, className: "channel-icon qa-runtime-icon" }),
      dom.b({ className: "devtools-ellipsis-text" }, this.getRuntimeText()),
      dom.span({ className: "devtools-ellipsis-text" }, deviceName)
    );
  }

  renderTargetTitle() {
    const title = this.props.toolbox.target.name;

    const { image, l10nId } = this.getAssetsForDebugDescriptorType();

    return dom.span(
      {
        className: "iconized-label debug-target-title",
      },
      dom.img({ src: image, alt: this.props.L10N.getStr(l10nId) }),
      title
        ? dom.b({ className: "devtools-ellipsis-text qa-target-title" }, title)
        : null
    );
  }

  renderTargetURI() {
    const url = this.props.toolbox.target.url;
    const { descriptorType } = this.props.debugTargetData;
    const isURLEditable = descriptorType === DESCRIPTOR_TYPES.TAB;

    return dom.span(
      {
        key: url,
        className: "debug-target-url",
      },
      isURLEditable
        ? this.renderTargetInput(url)
        : dom.span(
            { className: "debug-target-url-readonly devtools-ellipsis-text" },
            url
          )
    );
  }

  renderTargetInput(url) {
    return dom.form(
      {
        className: "debug-target-url-form",
        onSubmit: this.onSubmit,
      },
      dom.input({
        className: "devtools-textinput debug-target-url-input",
        onChange: this.onChange,
        onFocus: this.onFocus,
        defaultValue: url,
      })
    );
  }

  renderAlwaysOnTopButton() {
    // This is only displayed for local web extension debugging
    const { descriptorType, connectionType } = this.props.debugTargetData;
    const isLocalWebExtension =
      descriptorType === DESCRIPTOR_TYPES.EXTENSION &&
      connectionType === CONNECTION_TYPES.THIS_FIREFOX;
    if (!isLocalWebExtension) {
      return [];
    }

    const checked = this.props.alwaysOnTop;
    const toolboxFocused = this.props.focusedState;
    return [
      Localized(
        {
          id: checked
            ? "toolbox-always-on-top-enabled2"
            : "toolbox-always-on-top-disabled2",
          attrs: { title: true },
        },
        dom.button({
          className:
            `toolbox-always-on-top` +
            (checked ? " checked" : "") +
            (toolboxFocused ? " toolbox-is-focused" : ""),
          onClick: this.props.toggleAlwaysOnTop,
        })
      ),
    ];
  }

  renderNavigationButton(detail) {
    const { L10N } = this.props;

    return dom.button(
      {
        className: `iconized-label navigation-button ${detail.className}`,
        onClick: detail.onClick,
        title: L10N.getStr(detail.l10nId),
      },
      dom.img({
        src: detail.icon,
        alt: L10N.getStr(detail.l10nId),
      })
    );
  }

  renderNavigation() {
    const { debugTargetData } = this.props;
    const { descriptorType } = debugTargetData;

    if (
      descriptorType !== DESCRIPTOR_TYPES.TAB &&
      descriptorType !== DESCRIPTOR_TYPES.EXTENSION
    ) {
      return null;
    }

    const items = [];

    // There is little value in exposing back/forward for WebExtensions
    if (
      this.props.toolbox.target.getTrait("navigation") &&
      descriptorType === DESCRIPTOR_TYPES.TAB
    ) {
      items.push(
        this.renderNavigationButton({
          className: "qa-back-button",
          icon: "chrome://browser/skin/back.svg",
          l10nId: "toolbox.debugTargetInfo.back",
          onClick: () => this.props.toolbox.target.goBack(),
        }),
        this.renderNavigationButton({
          className: "qa-forward-button",
          icon: "chrome://browser/skin/forward.svg",
          l10nId: "toolbox.debugTargetInfo.forward",
          onClick: () => this.props.toolbox.target.goForward(),
        })
      );
    }

    items.push(
      this.renderNavigationButton({
        className: "qa-reload-button",
        icon: "chrome://global/skin/icons/reload.svg",
        l10nId: "toolbox.debugTargetInfo.reload",
        onClick: () =>
          this.props.toolbox.commands.targetCommand.reloadTopLevelTarget(),
      })
    );

    return dom.div(
      {
        className: "debug-target-navigation",
      },
      ...items
    );
  }

  render() {
    return dom.header(
      {
        className: "debug-target-info qa-debug-target-info",
      },
      this.shallRenderConnection() ? this.renderConnection() : null,
      this.renderRuntime(),
      this.renderTargetTitle(),
      this.renderNavigation(),
      this.renderTargetURI(),
      ...this.renderAlwaysOnTopButton()
    );
  }
}

module.exports = DebugTargetInfo;
