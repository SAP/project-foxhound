/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { InputPickerParentCommon } from "./InputPickerParentCommon.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  DateTimePickerPanel: "moz-src:///toolkit/modules/DateTimePickerPanel.sys.mjs",
});

export class DateTimePickerParent extends InputPickerParentCommon {
  constructor() {
    super("DateTimePicker");
  }

  /**
   * A picker creator function called when showing a picker
   *
   * @param {XULElement} panel A panel element
   * @returns A panel object that manages the element
   */
  createPickerImpl(panel) {
    return new lazy.DateTimePickerPanel(panel);
  }
}
