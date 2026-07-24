/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { InputPickerPanelCommon } from "./InputPickerPanelCommon.sys.mjs";

/** @import {OpenPickerInfo} from "./InputPickerPanelCommon.sys.mjs" */

const TIME_PICKER_WIDTH = "13em";
const TIME_PICKER_HEIGHT = "22em";
const DATE_PICKER_WIDTH = "24em";
const DATE_PICKER_HEIGHT = "27em";
const DATETIME_PICKER_WIDTH = "40em";
const DATETIME_PICKER_HEIGHT = "27em";

export class DateTimePickerPanel extends InputPickerPanelCommon {
  constructor(element) {
    super(element, "chrome://global/content/datetimepicker.xhtml");
  }

  /**
   * Picker window initialization function called when opening the picker
   *
   * @param {string} type The input element type
   * @returns {OpenPickerInfo}
   */
  openPickerImpl(type) {
    if (
      type == "datetime-local" &&
      !Services.prefs.getBoolPref("dom.forms.datetime.timepicker")
    ) {
      type = "date";
    }
    switch (type) {
      case "time": {
        return {
          type,
          width: TIME_PICKER_WIDTH,
          height: TIME_PICKER_HEIGHT,
        };
      }
      case "date": {
        return {
          type,
          width: DATE_PICKER_WIDTH,
          height: DATE_PICKER_HEIGHT,
        };
      }
      case "datetime-local": {
        return {
          type,
          width: DATETIME_PICKER_WIDTH,
          height: DATETIME_PICKER_HEIGHT,
        };
      }
    }
    throw new Error(`Unexpected type ${type}`);
  }

  /**
   * Popup frame initialization function called when the picker window is loaded
   *
   * @param {string} type The picker type
   * @param {object} detail The argument from the child actor's openPickerImpl
   * @returns An argument object to pass to the popup frame
   */
  initPickerImpl(type, detail) {
    let locale = new Services.intl.Locale(
      Services.locale.webExposedLocales[0],
      {
        calendar: "gregory",
      }
    ).toString();

    // Workaround for bug 1418061, while we wait for resolution of
    // http://bugs.icu-project.org/trac/ticket/13592: drop the PT region code,
    // because it results in "abbreviated" day names that are too long;
    // the region-less "pt" locale has shorter forms that are better here.
    locale = locale.replace(/^pt-PT/i, "pt");

    const dir = Services.locale.isAppLocaleRTL ? "rtl" : "ltr";

    const { year, month, day, hour, minute } = detail.value;
    const flattenDetail = {
      type,
      year,
      // Month value from input box starts from 1 instead of 0
      month: month == undefined ? undefined : month - 1,
      day,
      hour,
      minute,
      locale,
      dir,
      format: detail.format || "12",
      min: detail.min,
      max: detail.max,
      step: detail.step,
      stepBase: detail.stepBase,
    };

    if (type !== "time") {
      const { firstDayOfWeek, weekends } = this.getCalendarInfo(locale);

      const monthDisplayNames = new Services.intl.DisplayNames(locale, {
        type: "month",
        style: "short",
        calendar: "gregory",
      });
      const monthStrings = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
        monthNumber => monthDisplayNames.of(monthNumber)
      );

      const weekdayDisplayNames = new Services.intl.DisplayNames(locale, {
        type: "weekday",
        style: "abbreviated",
        calendar: "gregory",
      });
      const weekdayStrings = [
        // Weekdays starting Sunday (7) to Saturday (6).
        7, 1, 2, 3, 4, 5, 6,
      ].map(weekday => weekdayDisplayNames.of(weekday));
      Object.assign(flattenDetail, {
        firstDayOfWeek,
        weekends,
        monthStrings,
        weekdayStrings,
      });
    }
    return flattenDetail;
  }

  /**
   * Input element state updater function called when the picker value is changed
   *
   * @param {string} type
   * @param {object} pickerState
   */
  sendPickerValueChangedImpl(type, pickerState) {
    let { year, month, day, hour, minute } = pickerState;
    if (month !== undefined) {
      // Month value from input box starts from 1 instead of 0
      month += 1;
    }
    switch (type) {
      case "time": {
        return { hour, minute };
      }
      case "date": {
        return { year, month, day };
      }
      case "datetime-local": {
        return { year, month, day, hour, minute };
      }
    }
    throw new Error(`Unexpected type ${type}`);
  }

  getCalendarInfo(locale) {
    const calendarInfo = Services.intl.getCalendarInfo(locale);

    // Day of week from calendarInfo starts from 1 as Monday to 7 as Sunday,
    // so they need to be mapped to JavaScript convention with 0 as Sunday
    // and 6 as Saturday
    function toDateWeekday(day) {
      return day === 7 ? 0 : day;
    }

    let firstDayOfWeek = toDateWeekday(calendarInfo.firstDayOfWeek),
      weekend = calendarInfo.weekend;

    let weekends = weekend.map(toDateWeekday);

    return {
      firstDayOfWeek,
      weekends,
    };
  }
}
