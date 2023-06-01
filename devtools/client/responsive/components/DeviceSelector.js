/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  createFactory,
  PureComponent,
} = require("resource://devtools/client/shared/vendor/react.js");
const dom = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const { hr } = dom;
const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.js");

const {
  getStr,
} = require("resource://devtools/client/responsive/utils/l10n.js");
const {
  parseUserAgent,
} = require("resource://devtools/client/responsive/utils/ua.js");
const Types = require("resource://devtools/client/responsive/types.js");

const MenuButton = createFactory(
  require("resource://devtools/client/shared/components/menu/MenuButton.js")
);

loader.lazyGetter(this, "MenuItem", () => {
  const menuItemClass = require("resource://devtools/client/shared/components/menu/MenuItem.js");
  const menuItem = createFactory(menuItemClass);
  menuItem.DUMMY_ICON = menuItemClass.DUMMY_ICON;
  return menuItem;
});

loader.lazyGetter(this, "MenuList", () => {
  return createFactory(
    require("resource://devtools/client/shared/components/menu/MenuList.js")
  );
});

class DeviceSelector extends PureComponent {
  static get propTypes() {
    return {
      devices: PropTypes.shape(Types.devices).isRequired,
      onChangeDevice: PropTypes.func.isRequired,
      onUpdateDeviceModal: PropTypes.func.isRequired,
      selectedDevice: PropTypes.string.isRequired,
      viewportId: PropTypes.number.isRequired,
    };
  }

  getMenuProps(device) {
    if (!device) {
      return { icon: null, label: null, tooltip: null };
    }

    const { browser, os } = parseUserAgent(device.userAgent);
    let label = device.name;
    if (os) {
      label += ` ${os.name}`;
      if (os.version) {
        label += ` ${os.version}`;
      }
    }

    let icon = null;
    let tooltip = label;
    if (browser) {
      icon = `chrome://devtools/skin/images/browsers/${browser.name.toLowerCase()}.svg`;
      tooltip += ` ${browser.name} ${browser.version}`;
    }

    return { icon, label, tooltip };
  }

  getSelectedDevice() {
    const { devices, selectedDevice } = this.props;

    if (!selectedDevice) {
      return null;
    }

    for (const type of devices.types) {
      for (const device of devices[type]) {
        if (selectedDevice === device.name) {
          return device;
        }
      }
    }

    return null;
  }

  renderMenuList() {
    const {
      devices,
      onChangeDevice,
      onUpdateDeviceModal,
      selectedDevice,
      viewportId,
    } = this.props;

    const menuItems = [];

    for (const type of devices.types) {
      for (const device of devices[type]) {
        if (device.displayed) {
          const { icon, label, tooltip } = this.getMenuProps(device);

          menuItems.push(
            MenuItem({
              key: label,
              className: "device-selector-item",
              checked: selectedDevice === device.name,
              label,
              icon: icon || MenuItem.DUMMY_ICON,
              tooltip,
              onClick: () => onChangeDevice(viewportId, device, type),
            })
          );
        }
      }
    }

    menuItems.sort(function(a, b) {
      return a.props.label.localeCompare(b.props.label);
    });

    if (menuItems.length) {
      menuItems.push(hr({ key: "separator" }));
    }

    menuItems.push(
      MenuItem({
        key: "edit-device",
        label: getStr("responsive.editDeviceList2"),
        onClick: () => onUpdateDeviceModal(true, viewportId),
      })
    );

    return MenuList({}, menuItems);
  }

  render() {
    const { devices } = this.props;
    const selectedDevice = this.getSelectedDevice();
    let { icon, label, tooltip } = this.getMenuProps(selectedDevice);

    if (!selectedDevice) {
      label = getStr("responsive.responsiveMode");
    }

    // MenuButton is expected to be used in the toolbox document usually,
    // but since RDM's frame also loads theme-switching.js, we can create
    // MenuButtons (& HTMLTooltips) in the RDM frame document.
    const toolboxDoc = window.document;

    return MenuButton(
      {
        id: "device-selector",
        menuId: "device-selector-menu",
        toolboxDoc,
        className: "devtools-button devtools-dropdown-button",
        label,
        icon,
        title: tooltip,
        disabled: devices.listState !== Types.loadableState.LOADED,
      },
      () => this.renderMenuList()
    );
  }
}

module.exports = DeviceSelector;
