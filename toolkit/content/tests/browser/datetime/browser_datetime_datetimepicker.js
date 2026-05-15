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
