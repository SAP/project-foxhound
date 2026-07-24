/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { InputPickerChildCommon } from "./InputPickerChildCommon.sys.mjs";

export class DateTimePickerChild extends InputPickerChildCommon {
  constructor() {
    super("DateTimePicker");
  }

  /**
   * Cleanup function called when picker is closed.
   *
   * @param {HTMLInputElement} inputElement
   */
  closeImpl(inputElement) {
    let dateTimeBoxElement = inputElement.dateTimeBoxElement;
    if (!dateTimeBoxElement) {
      return;
    }

    // dateTimeBoxElement is within UA Widget Shadow DOM.
    // An event dispatch to it can't be accessed by document.
    let win = inputElement.ownerGlobal;
    dateTimeBoxElement.dispatchEvent(
      new win.CustomEvent("MozSetDateTimePickerState", { detail: false })
    );
  }

  getTimePickerPref() {
    return Services.prefs.getBoolPref("dom.forms.datetime.timepicker");
  }

  /**
   * Element updater function called when the picker value is changed.
   *
   * @param {ReceiveMessageArgument} aMessage
   * @param {HTMLInputElement} inputElement
   */
  pickerValueChangedImpl(aMessage, inputElement) {
    let dateTimeBoxElement = inputElement.dateTimeBoxElement;
    if (!dateTimeBoxElement) {
      return;
    }

    let win = inputElement.ownerGlobal;

    // dateTimeBoxElement is within UA Widget Shadow DOM.
    // An event dispatch to it can't be accessed by document.
    dateTimeBoxElement.dispatchEvent(
      new win.CustomEvent("MozPickerValueChanged", {
        detail: Cu.cloneInto(aMessage.data, win),
      })
    );
  }

  /**
   * Picker initialization function called when opening the picker
   *
   * @param {HTMLInputElement} inputElement
   * @returns An argument object to pass to the picker panel, or undefined to stop.
   */
  openPickerImpl(inputElement) {
    // Time picker is disabled when preffed off
    if (inputElement.type == "time" && !this.getTimePickerPref()) {
      return undefined;
    }

    let dateTimeBoxElement = inputElement.dateTimeBoxElement;
    if (!dateTimeBoxElement) {
      throw new Error("How do we get this event without a UA Widget?");
    }

    // dateTimeBoxElement is within UA Widget Shadow DOM.
    // An event dispatch to it can't be accessed by document, because
    // the event is not composed.
    let win = inputElement.ownerGlobal;
    dateTimeBoxElement.dispatchEvent(
      new win.CustomEvent("MozSetDateTimePickerState", { detail: true })
    );

    let value = inputElement.getDateTimeInputBoxValue();
    return {
      // Pass partial value if it's available, otherwise pass input
      // element's value.
      value: Object.keys(value).length ? value : inputElement.value,
      min: inputElement.getMinimum(),
      max: inputElement.getMaximum(),
      step: inputElement.getStep(),
      stepBase: inputElement.getStepBase(),
    };
  }
}
