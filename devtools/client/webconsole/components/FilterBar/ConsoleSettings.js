/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// React & Redux
const {
  Component,
} = require("resource://devtools/client/shared/vendor/react.js");
const {
  createFactory,
} = require("resource://devtools/client/shared/vendor/react.js");
const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.js");

const actions = require("resource://devtools/client/webconsole/actions/index.js");
const {
  l10n,
} = require("resource://devtools/client/webconsole/utils/messages.js");

// Additional Components
const MenuButton = createFactory(
  require("resource://devtools/client/shared/components/menu/MenuButton.js")
);

loader.lazyGetter(this, "MenuItem", function() {
  return createFactory(
    require("resource://devtools/client/shared/components/menu/MenuItem.js")
  );
});

loader.lazyGetter(this, "MenuList", function() {
  return createFactory(
    require("resource://devtools/client/shared/components/menu/MenuList.js")
  );
});

class ConsoleSettings extends Component {
  static get propTypes() {
    return {
      dispatch: PropTypes.func.isRequired,
      eagerEvaluation: PropTypes.bool.isRequired,
      groupWarnings: PropTypes.bool.isRequired,
      persistLogs: PropTypes.bool.isRequired,
      timestampsVisible: PropTypes.bool.isRequired,
      webConsoleUI: PropTypes.object.isRequired,
      autocomplete: PropTypes.bool.isRequired,
      enableNetworkMonitoring: PropTypes.bool.isRequired,
    };
  }

  renderMenuItems() {
    const {
      dispatch,
      eagerEvaluation,
      groupWarnings,
      persistLogs,
      timestampsVisible,
      autocomplete,
      webConsoleUI,
      enableNetworkMonitoring,
    } = this.props;

    const items = [];

    if (
      !webConsoleUI.isBrowserConsole &&
      !webConsoleUI.isBrowserToolboxConsole
    ) {
      // Persist Logs
      items.push(
        MenuItem({
          key: "webconsole-console-settings-menu-item-persistent-logs",
          checked: persistLogs,
          className:
            "menu-item webconsole-console-settings-menu-item-persistentLogs",
          label: l10n.getStr(
            "webconsole.console.settings.menu.item.enablePersistentLogs.label"
          ),
          tooltip: l10n.getStr(
            "webconsole.console.settings.menu.item.enablePersistentLogs.tooltip"
          ),
          onClick: () => dispatch(actions.persistToggle()),
        })
      );
    }

    if (webConsoleUI.isBrowserConsole || webConsoleUI.isBrowserToolboxConsole) {
      // Enable network monitoring
      items.push(
        MenuItem({
          key:
            "webconsole-console-settings-menu-item-enable-network-monitoring",
          checked: enableNetworkMonitoring,
          className:
            "menu-item webconsole-console-settings-menu-item-enableNetworkMonitoring",
          label: l10n.getStr("browserconsole.enableNetworkMonitoring.label"),
          tooltip: l10n.getStr(
            "browserconsole.enableNetworkMonitoring.tooltip"
          ),
          onClick: () => dispatch(actions.networkMonitoringToggle()),
        })
      );
    }

    // Timestamps
    items.push(
      MenuItem({
        key: "webconsole-console-settings-menu-item-timestamps",
        checked: timestampsVisible,
        className: "menu-item webconsole-console-settings-menu-item-timestamps",
        label: l10n.getStr(
          "webconsole.console.settings.menu.item.timestamps.label"
        ),
        tooltip: l10n.getStr(
          "webconsole.console.settings.menu.item.timestamps.tooltip"
        ),
        onClick: () => dispatch(actions.timestampsToggle()),
      })
    );

    // Warning Groups
    items.push(
      MenuItem({
        key: "webconsole-console-settings-menu-item-warning-groups",
        checked: groupWarnings,
        className:
          "menu-item webconsole-console-settings-menu-item-warning-groups",
        label: l10n.getStr(
          "webconsole.console.settings.menu.item.warningGroups.label"
        ),
        tooltip: l10n.getStr(
          "webconsole.console.settings.menu.item.warningGroups.tooltip"
        ),
        onClick: () => dispatch(actions.warningGroupsToggle()),
      })
    );

    // autocomplete
    items.push(
      MenuItem({
        key: "webconsole-console-settings-menu-item-autocomplete",
        checked: autocomplete,
        className:
          "menu-item webconsole-console-settings-menu-item-autocomplete",
        label: l10n.getStr(
          "webconsole.console.settings.menu.item.autocomplete.label"
        ),
        tooltip: l10n.getStr(
          "webconsole.console.settings.menu.item.autocomplete.tooltip"
        ),
        onClick: () => dispatch(actions.autocompleteToggle()),
      })
    );

    // Eager Evaluation
    items.push(
      MenuItem({
        key: "webconsole-console-settings-menu-item-eager-evaluation",
        checked: eagerEvaluation,
        className:
          "menu-item webconsole-console-settings-menu-item-eager-evaluation",
        label: l10n.getStr(
          "webconsole.console.settings.menu.item.instantEvaluation.label"
        ),
        tooltip: l10n.getStr(
          "webconsole.console.settings.menu.item.instantEvaluation.tooltip"
        ),
        onClick: () => dispatch(actions.eagerEvaluationToggle()),
      })
    );

    return MenuList({ id: "webconsole-console-settings-menu-list" }, items);
  }

  render() {
    const { webConsoleUI } = this.props;
    const doc = webConsoleUI.document;
    const { toolbox } = webConsoleUI.wrapper;

    return MenuButton(
      {
        menuId: "webconsole-console-settings-menu-button",
        toolboxDoc: toolbox ? toolbox.doc : doc,
        className: "devtools-button webconsole-console-settings-menu-button",
        title: l10n.getStr("webconsole.console.settings.menu.button.tooltip"),
      },
      // We pass the children in a function so we don't require the MenuItem and MenuList
      // components until we need to display them (i.e. when the button is clicked).
      () => this.renderMenuItems()
    );
  }
}

module.exports = ConsoleSettings;
