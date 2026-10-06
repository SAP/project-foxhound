/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals AdjustableTitle */

const { ContextualIdentityService } = ChromeUtils.importESModule(
  "resource://gre/modules/ContextualIdentityService.sys.mjs"
);

function setTitle() {
  let params = window.arguments[0] || {};
  let winElem = document.documentElement;
  if (params.userContextId) {
    document.l10n.setAttributes(winElem, "containers-window-update-settings3", {
      name: params.identity.name,
    });
  } else {
    document.l10n.setAttributes(winElem, "containers-window-new3");
  }
}
setTitle();

let loadedResolvers = Promise.withResolvers();
document.mozSubdialogReady = loadedResolvers.promise;

class ContainerDialog {
  constructor() {
    let params = window.arguments[0] || {};
    this.userContextId = params.userContextId || null;
    this.identity = params.identity || {
      name: "",
      icon: ContextualIdentityService.containerIcons[0],
      color: ContextualIdentityService.containerColors[0],
    };

    this._dialog = document.querySelector("dialog");
    this._form = document.getElementById("containerForm");
    this._name = document.getElementById("name");

    this._name.value = this.identity.name;
    this._form.addEventListener("input", () => this.validate());
    document.addEventListener("dialogaccept", () => this.onAccept());
  }

  init() {
    this._buildSwatches(
      document.getElementById("colorSwatches"),
      this.identity.color,
      ContextualIdentityService.containerColors,
      color => `identity-icon-circle identity-color-${color}`,
      color => ContextualIdentityService.getContainerColorLabel(color)
    );
    this._buildSwatches(
      document.getElementById("iconSwatches"),
      this.identity.icon,
      ContextualIdentityService.containerIcons,
      icon => `identity-icon-${icon}`,
      icon => ContextualIdentityService.getContainerIconLabel(icon)
    );
    this.validate();
  }

  _buildSwatches(picker, selected, values, iconClass, getLabel) {
    for (let value of values) {
      let title = getLabel(value);

      let item = document.createElement("moz-visual-picker-item");
      item.className = "swatch";
      item.value = value;
      item.ariaLabel = title;
      item.title = title;

      let icon = document.createElement("span");
      icon.className = `userContext-icon ${iconClass(value)}`;

      item.append(icon);
      picker.append(item);
    }

    picker.value = selected;
  }

  validate() {
    let nameValid = !!this._name.value.trim();
    this._dialog.getButton("accept").disabled = !nameValid;
  }

  onAccept() {
    let formData = new FormData(this._form);
    let name = formData.get("name").trim();
    let color = formData.get("color");
    let icon = formData.get("icon");

    if (!ContextualIdentityService.getContainerColorCode(color)) {
      throw new Error("Internal error. The color value doesn't match.");
    }
    if (!ContextualIdentityService.getContainerIconURL(icon)) {
      throw new Error("Internal error. The icon value doesn't match.");
    }

    if (this.userContextId) {
      ContextualIdentityService.update(this.userContextId, name, icon, color);
    } else {
      ContextualIdentityService.create(name, icon, color);
    }
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    AdjustableTitle.hide();
    let dialog = new ContainerDialog();
    await dialog.init();
  } finally {
    loadedResolvers.resolve();
  }
});
