/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { InputPickerParentCommon } from "./InputPickerParentCommon.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  ColorPickerPanel: "moz-src:///toolkit/modules/ColorPickerPanel.sys.mjs",
});

export class ColorPickerParent extends InputPickerParentCommon {
  constructor() {
    super("ColorPicker");
  }

  /**
   * A picker creator function called when showing a picker
   *
   * @param {XULElement} panel A panel element
   * @returns A panel object that manages the element
   */
  createPickerImpl(panel) {
    return new lazy.ColorPickerPanel(panel);
  }
}
