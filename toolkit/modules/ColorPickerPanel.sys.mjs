/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { InputPickerPanelCommon } from "./InputPickerPanelCommon.sys.mjs";

/** @import {OpenPickerInfo} from "./InputPickerPanelCommon.sys.mjs" */

const COLOR_PICKER_WIDTH = "215px";
const COLOR_PICKER_HEIGHT = "170px";

export class ColorPickerPanel extends InputPickerPanelCommon {
  constructor(element) {
    super(element, "chrome://global/content/colorpicker.html");
  }

  /**
   * Picker window initialization function called when opening the picker
   *
   * @param {string} type The input element type
   * @returns {OpenPickerInfo}
   */
  openPickerImpl(type) {
    return {
      type,
      width: COLOR_PICKER_WIDTH,
      height: COLOR_PICKER_HEIGHT,
    };
  }

  /**
   * Popup frame initialization function called when the picker window is loaded
   *
   * @param {string} _type The picker type
   * @param {object} detail The argument from the child actor's openPickerImpl
   * @returns An argument object to pass to the popup frame
   */
  initPickerImpl(_type, detail) {
    if (
      Services.prefs.getBoolPref("dom.forms.html_color_picker.testing", false)
    ) {
      this.handleMessage({
        data: {
          name: "PickerPopupChanged",
          detail: { rgb: [0.1, 0.2, 0.3, 1] },
        },
      });
      this.handleMessage({ data: { name: "ClosePopup" } });
    }

    return {
      value: detail.value,
    };
  }

  /**
   * Input element state updater function called when the picker value is changed
   *
   * @param {string} _type
   * @param {object} pickerState
   */
  sendPickerValueChangedImpl(_type, pickerState) {
    return {
      rgb: pickerState.rgb,
    };
  }
}
