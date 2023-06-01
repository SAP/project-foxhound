/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  connect,
} = require("resource://devtools/client/shared/vendor/react-redux.js");
const {
  createFactory,
  PureComponent,
} = require("resource://devtools/client/shared/vendor/react.js");
const dom = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.js");

const FluentReact = require("resource://devtools/client/shared/vendor/fluent-react.js");
const Localized = createFactory(FluentReact.Localized);

const CompatibilityWarning = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/CompatibilityWarning.js")
);
const DebugTargetPane = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/debugtarget/DebugTargetPane.js")
);
const ExtensionDetail = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/debugtarget/ExtensionDetail.js")
);
const InspectAction = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/debugtarget/InspectAction.js")
);
const ProfilerDialog = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/ProfilerDialog.js")
);
const RuntimeActions = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/RuntimeActions.js")
);
const RuntimeInfo = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/RuntimeInfo.js")
);
const ServiceWorkerAction = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/debugtarget/ServiceWorkerAction.js")
);
const ServiceWorkerAdditionalActions = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/debugtarget/ServiceWorkerAdditionalActions.js")
);
const ServiceWorkersWarning = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/ServiceWorkersWarning.js")
);
const ProcessDetail = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/debugtarget/ProcessDetail.js")
);
const TabAction = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/debugtarget/TabAction.js")
);
const TabDetail = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/debugtarget/TabDetail.js")
);
const TemporaryExtensionAdditionalActions = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/debugtarget/TemporaryExtensionAdditionalActions.js")
);
const TemporaryExtensionDetail = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/debugtarget/TemporaryExtensionDetail.js")
);
const TemporaryExtensionInstallSection = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/debugtarget/TemporaryExtensionInstallSection.js")
);
const WorkerDetail = createFactory(
  require("resource://devtools/client/aboutdebugging/src/components/debugtarget/WorkerDetail.js")
);

const Actions = require("resource://devtools/client/aboutdebugging/src/actions/index.js");
const {
  DEBUG_TARGETS,
  DEBUG_TARGET_PANE,
  PAGE_TYPES,
} = require("resource://devtools/client/aboutdebugging/src/constants.js");
const Types = require("resource://devtools/client/aboutdebugging/src/types/index.js");

const {
  getCurrentRuntimeDetails,
} = require("resource://devtools/client/aboutdebugging/src/modules/runtimes-state-helper.js");
const {
  isSupportedDebugTargetPane,
  supportsTemporaryExtensionInstaller,
  supportsTemporaryExtensionAdditionalActions,
} = require("resource://devtools/client/aboutdebugging/src/modules/debug-target-support.js");

class RuntimePage extends PureComponent {
  static get propTypes() {
    return {
      collapsibilities: Types.collapsibilities.isRequired,
      dispatch: PropTypes.func.isRequired,
      installedExtensions: PropTypes.arrayOf(PropTypes.object).isRequired,
      otherWorkers: PropTypes.arrayOf(PropTypes.object).isRequired,
      runtimeDetails: Types.runtimeDetails,
      runtimeId: PropTypes.string.isRequired,
      processes: PropTypes.arrayOf(PropTypes.object).isRequired,
      serviceWorkers: PropTypes.arrayOf(PropTypes.object).isRequired,
      sharedWorkers: PropTypes.arrayOf(PropTypes.object).isRequired,
      showProfilerDialog: PropTypes.bool.isRequired,
      tabs: PropTypes.arrayOf(PropTypes.object).isRequired,
      temporaryExtensions: PropTypes.arrayOf(PropTypes.object).isRequired,
      temporaryInstallError: PropTypes.object,
    };
  }

  // TODO: avoid the use of this method
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1774507
  UNSAFE_componentWillMount() {
    const { dispatch, runtimeId } = this.props;
    dispatch(Actions.selectPage(PAGE_TYPES.RUNTIME, runtimeId));
  }

  getIconByType(type) {
    switch (type) {
      case DEBUG_TARGETS.EXTENSION:
        return "chrome://devtools/skin/images/debugging-addons.svg";
      case DEBUG_TARGETS.PROCESS:
        return "chrome://devtools/skin/images/aboutdebugging-process-icon.svg";
      case DEBUG_TARGETS.TAB:
        return "chrome://devtools/skin/images/debugging-tabs.svg";
      case DEBUG_TARGETS.WORKER:
        return "chrome://devtools/skin/images/debugging-workers.svg";
    }

    throw new Error(`Unsupported type [${type}]`);
  }

  renderDebugTargetPane({
    actionComponent,
    additionalActionsComponent,
    children,
    detailComponent,
    icon,
    localizationId,
    name,
    paneKey,
    targets,
  }) {
    const { collapsibilities, dispatch, runtimeDetails } = this.props;

    if (!isSupportedDebugTargetPane(runtimeDetails.info.type, paneKey)) {
      return null;
    }

    return Localized(
      {
        id: localizationId,
        attrs: { name: true },
      },
      DebugTargetPane(
        {
          actionComponent,
          additionalActionsComponent,
          collapsibilityKey: paneKey,
          detailComponent,
          dispatch,
          icon,
          isCollapsed: collapsibilities.get(paneKey),
          name,
          targets,
        },
        children
      )
    );
  }

  renderTemporaryExtensionInstallSection() {
    const runtimeType = this.props.runtimeDetails.info.type;
    if (
      !isSupportedDebugTargetPane(
        runtimeType,
        DEBUG_TARGET_PANE.TEMPORARY_EXTENSION
      ) ||
      !supportsTemporaryExtensionInstaller(runtimeType)
    ) {
      return null;
    }

    const { dispatch, temporaryInstallError } = this.props;
    return TemporaryExtensionInstallSection({
      dispatch,
      temporaryInstallError,
    });
  }

  render() {
    const {
      dispatch,
      installedExtensions,
      otherWorkers,
      processes,
      runtimeDetails,
      runtimeId,
      serviceWorkers,
      sharedWorkers,
      showProfilerDialog,
      tabs,
      temporaryExtensions,
    } = this.props;

    if (!runtimeDetails) {
      // runtimeInfo can be null when the selectPage action navigates from a runtime A
      // to a runtime B (between unwatchRuntime and watchRuntime).
      return null;
    }

    const { compatibilityReport } = runtimeDetails;

    return dom.article(
      {
        className: "page qa-runtime-page",
      },
      RuntimeInfo({ ...runtimeDetails.info, runtimeId, dispatch }),
      RuntimeActions({ dispatch, runtimeId, runtimeDetails }),
      runtimeDetails.serviceWorkersAvailable ? null : ServiceWorkersWarning(),
      CompatibilityWarning({ compatibilityReport }),
      this.renderDebugTargetPane({
        actionComponent: TabAction,
        detailComponent: TabDetail,
        icon: this.getIconByType(DEBUG_TARGETS.TAB),
        localizationId: "about-debugging-runtime-tabs",
        name: "Tabs",
        paneKey: DEBUG_TARGET_PANE.TAB,
        targets: tabs,
      }),
      this.renderDebugTargetPane({
        actionComponent: InspectAction,
        additionalActionsComponent: supportsTemporaryExtensionAdditionalActions(
          runtimeDetails.info.type
        )
          ? TemporaryExtensionAdditionalActions
          : null,
        children: this.renderTemporaryExtensionInstallSection(),
        detailComponent: TemporaryExtensionDetail,
        icon: this.getIconByType(DEBUG_TARGETS.EXTENSION),
        localizationId: "about-debugging-runtime-temporary-extensions",
        name: "Temporary Extensions",
        paneKey: DEBUG_TARGET_PANE.TEMPORARY_EXTENSION,
        targets: temporaryExtensions,
      }),
      this.renderDebugTargetPane({
        actionComponent: InspectAction,
        detailComponent: ExtensionDetail,
        icon: this.getIconByType(DEBUG_TARGETS.EXTENSION),
        localizationId: "about-debugging-runtime-extensions",
        name: "Extensions",
        paneKey: DEBUG_TARGET_PANE.INSTALLED_EXTENSION,
        targets: installedExtensions,
      }),
      this.renderDebugTargetPane({
        actionComponent: ServiceWorkerAction,
        additionalActionsComponent: ServiceWorkerAdditionalActions,
        detailComponent: WorkerDetail,
        icon: this.getIconByType(DEBUG_TARGETS.WORKER),
        localizationId: "about-debugging-runtime-service-workers",
        name: "Service Workers",
        paneKey: DEBUG_TARGET_PANE.SERVICE_WORKER,
        targets: serviceWorkers,
      }),
      this.renderDebugTargetPane({
        actionComponent: InspectAction,
        detailComponent: WorkerDetail,
        icon: this.getIconByType(DEBUG_TARGETS.WORKER),
        localizationId: "about-debugging-runtime-shared-workers",
        name: "Shared Workers",
        paneKey: DEBUG_TARGET_PANE.SHARED_WORKER,
        targets: sharedWorkers,
      }),
      this.renderDebugTargetPane({
        actionComponent: InspectAction,
        detailComponent: WorkerDetail,
        icon: this.getIconByType(DEBUG_TARGETS.WORKER),
        localizationId: "about-debugging-runtime-other-workers",
        name: "Other Workers",
        paneKey: DEBUG_TARGET_PANE.OTHER_WORKER,
        targets: otherWorkers,
      }),
      this.renderDebugTargetPane({
        actionComponent: InspectAction,
        detailComponent: ProcessDetail,
        icon: this.getIconByType(DEBUG_TARGETS.PROCESS),
        localizationId: "about-debugging-runtime-processes",
        name: "Processes",
        paneKey: DEBUG_TARGET_PANE.PROCESSES,
        targets: processes,
      }),

      showProfilerDialog ? ProfilerDialog({ dispatch, runtimeDetails }) : null
    );
  }
}

const mapStateToProps = state => {
  return {
    collapsibilities: state.ui.debugTargetCollapsibilities,
    installedExtensions: state.debugTargets.installedExtensions,
    processes: state.debugTargets.processes,
    otherWorkers: state.debugTargets.otherWorkers,
    runtimeDetails: getCurrentRuntimeDetails(state.runtimes),
    serviceWorkers: state.debugTargets.serviceWorkers,
    sharedWorkers: state.debugTargets.sharedWorkers,
    showProfilerDialog: state.ui.showProfilerDialog,
    tabs: state.debugTargets.tabs,
    temporaryExtensions: state.debugTargets.temporaryExtensions,
    temporaryInstallError: state.ui.temporaryInstallError,
  };
};

module.exports = connect(mapStateToProps)(RuntimePage);
