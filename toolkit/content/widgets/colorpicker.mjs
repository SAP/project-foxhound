/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-nocheck Do this after migration from devtools

import { ColorPickerCommon } from "./colorpicker-common.mjs";

class ColorPicker extends ColorPickerCommon {
  onChange() {
    window.postMessage(
      {
        name: "PickerPopupChanged",
        detail: { rgb: this.rgbFloat },
      },
      "*"
    );
  }
}

let picker = new ColorPicker(document.body);
window.addEventListener("message", ev => {
  switch (ev.data.name) {
    case "PickerInit": {
      let { value } = ev.data.detail;
      const specifiedAlpha = !Number.isNaN(value.alpha);
      picker.rgbFloat = [
        value.component1,
        value.component2,
        value.component3,
        specifiedAlpha ? value.alpha : 1,
      ];
      if (specifiedAlpha) {
        picker.enableAlphaPicker();
      }
      picker.show();
    }
  }
});

window.addEventListener("keydown", ev => {
  if (["Enter", "Escape", " "].includes(ev.key)) {
    window.postMessage(
      {
        name: "ClosePopup",
        detail: ev.key === "Escape",
      },
      "*"
    );
  }
});
