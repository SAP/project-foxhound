/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * When a date on the calendar is clicked, datetime picker should keep be open and set
 * value to the input box.
 */
add_task(async function test_datetimepicker_date_clicked() {
  // Toggle a pref to allow a time picker to be shown
  await SpecialPowers.pushPrefEnv({
    set: [["dom.forms.datetime.timepicker", true]],
  });
  info("When a calendar day is clicked, value is set and picker stays open");
  const inputValue = "2016-12-15T06:00";
  const firstDayOnCalendar = "2016-11-27T06:00";

  await helper.openPicker(
    `data:text/html, <input id="datetime" type="datetime-local" value="${inputValue}">`
  );

  let browser = helper.tab.linkedBrowser;
  Assert.equal(helper.panel.state, "open", "Panel should be opened");

  // Click the first item (top-left corner) of the calendar
  let promise = BrowserTestUtils.waitForContentEvent(browser, "input");
  helper.click(helper.getElement(DAYS_VIEW).querySelector("td"));
  await promise;

  let value = await SpecialPowers.spawn(browser, [], () => {
    return content.document.querySelector("input").value;
  });

  Assert.equal(value, firstDayOnCalendar);

  // Panel should stay open for possible time input
  Assert.equal(helper.panel.state, "open", "Panel should be opened");

  await helper.tearDown();
});

/**
 * When a time is picked, datetime picker should keep be open and set value to the input box.
 */
add_task(async function test_datetimepicker_time_clicked() {
  info("When a time is picked, value is set and picker stays open");
  const inputValue = "2016-12-15T06:00";
  const oneHourEarlier = "2016-12-15T05:00";

  await helper.openPicker(
    `data:text/html, <input id="datetime" type="datetime-local" value="${inputValue}">`
  );

  let browser = helper.tab.linkedBrowser;
  Assert.equal(helper.panel.state, "open", "Panel should be opened");

  // Click the first item (top-left corner) of the time section
  let promise = BrowserTestUtils.waitForContentEvent(browser, "input");
  helper.click(
    helper.getElement(TIMEPICKER).querySelector(".spinner-container .prev")
  );
  await promise;

  let value = await SpecialPowers.spawn(browser, [], () => {
    return content.document.querySelector("input").value;
  });

  Assert.equal(value, oneHourEarlier);

  // Panel should stay open for possible date input
  Assert.equal(helper.panel.state, "open", "Panel should be opened");

  await helper.tearDown();
});

/**
 * The time picker has the correct options enabled based on the selected date at the min attribute.
 */
add_task(async function test_datetimepicker_min_time() {
  info(
    "The time picker has the correct options enabled based on the selected date at the min attribute"
  );
  const inputValue = "2001-01-01T23:59";
  const minValue = "2001-01-01T23:55";

  await helper.openPicker(
    `data:text/html, <input id="datetime" type="datetime-local" value="${inputValue}" min="${minValue}">`
  );

  Assert.equal(helper.panel.state, "open", "Panel should be opened");

  const hours = helper.getSpinnerOptions(SPINNER_HOUR);
  const minutes = helper.getSpinnerOptions(SPINNER_MIN);

  Assert.deepEqual(
    hours,
    ["11"],
    "The valid hours are available in the picker"
  );

  Assert.deepEqual(
    minutes,
    ["55", "56", "57", "58", "59"],
    "The valid minutes are available in the picker"
  );

  await helper.tearDown();
});

/**
 * The time picker has the correct options enabled based on the selected date at the max attribute.
 */
add_task(async function test_datetimepicker_max_time() {
  info(
    "The time picker has the correct options enabled based on the selected date at the max attribute"
  );
  const inputValue = "2001-01-01T00:00";
  const maxValue = "2001-01-01T00:05";

  await helper.openPicker(
    `data:text/html, <input id="datetime" type="datetime-local" value="${inputValue}" max="${maxValue}">`
  );

  Assert.equal(helper.panel.state, "open", "Panel should be opened");

  const hours = helper.getSpinnerOptions(SPINNER_HOUR);
  const minutes = helper.getSpinnerOptions(SPINNER_MIN);

  Assert.deepEqual(
    hours,
    ["12"],
    "The valid hours are available in the picker"
  );

  Assert.deepEqual(
    minutes,
    ["0", "1", "2", "3", "4", "5"],
    "The valid minutes are available in the picker"
  );

  await helper.tearDown();
});

/**
 * The time picker has the correct options enabled based on the selected date between the min and max attribute.
 */
add_task(async function test_datetimepicker_minmax_time() {
  info(
    "The time picker has the correct options enabled based on the selected date between the min and max attribute"
  );
  const inputValue = "2001-01-02T00:00";
  const minValue = "2001-01-01T12:00";
  const maxValue = "2001-01-03T06:00";

  await helper.openPicker(
    `data:text/html, <input id="datetime" type="datetime-local" value="${inputValue}" min="${minValue}" max="${maxValue}">`
  );

  Assert.equal(helper.panel.state, "open", "Panel should be opened");

  const hours = helper.getSpinnerOptions(SPINNER_HOUR);
  const minutes = helper.getSpinnerOptions(SPINNER_MIN);

  Assert.equal(hours.length, 12, "The valid hours are available in the picker");

  Assert.equal(
    minutes.length,
    60,
    "The valid minutes are available in the picker"
  );

  await helper.tearDown();
});
