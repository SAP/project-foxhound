/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

add_setup(async function setPrefsReducedMotion() {
  // Set "prefers-reduced-motion" media to "reduce"
  // to avoid intermittent scroll failures (1803612, 1803687)
  await SpecialPowers.pushPrefEnv({
    set: [["ui.prefersReducedMotion", 1]],
  });
  Assert.ok(
    matchMedia("(prefers-reduced-motion: reduce)").matches,
    "The reduce motion mode is active"
  );

  // TODO: Remove pref setting when the time picker is enabled (bug 1726107)
  // Set "dom.forms.datetime.timepicker" in config to "true"
  await SpecialPowers.pushPrefEnv({
    set: [["dom.forms.datetime.timepicker", true]],
  });
});

/**
 * Ensure the datetime panel closes on Escape key.
 */
add_task(async function test_datetime_panel_escape() {
  info("Ensure time spinners follow arrow key bindings appropriately.");

  const inputValue = "01:01";

  await helper.openPicker(
    `data:text/html, <input type="time" value="${inputValue}">`
  );

  Assert.equal(helper.panel.state, "open", "Panel should be opened");
  let closed = helper.promisePickerClosed();

  info("Testing general keyboard navigation");

  // Close the picker with keyboard:
  EventUtils.synthesizeKey("KEY_Escape", {});

  await closed;

  Assert.equal(
    helper.panel.state,
    "closed",
    "Panel should be closed on Escape"
  );

  await helper.tearDown();
});

/**
 * Ensure time spinners follow main key bindings appropriately.
 */
add_task(async function test_time_spinner_keyboard() {
  info("Ensure time spinners follow arrow key bindings appropriately.");

  const inputValue = "01:01";

  await helper.openPicker(
    `data:text/html, <input type="time" value="${inputValue}">`
  );

  Assert.equal(helper.panel.state, "open", "Panel should be opened");

  // Hour (HH):
  const spinnerHour = helper.getElement(SPINNER_HOUR);
  // Minute (MM):
  const spinnerMin = helper.getElement(SPINNER_MIN);
  // Time of the day (AM/PM):
  const spinnerTime = helper.getElement(SPINNER_TIME);

  Assert.ok(
    spinnerHour.matches(":focus"),
    `The keyboard focus is placed on the Hour spinner`
  );
  Assert.equal(
    spinnerHour.getAttribute("aria-valuenow"),
    "1",
    "The hour spinner is ready"
  );
  Assert.equal(
    spinnerMin.getAttribute("aria-valuenow"),
    "1",
    "The minute spinner is ready"
  );
  Assert.equal(
    spinnerTime.getAttribute("aria-valuenow"),
    "0" /** AM */,
    "The time of the day spinner is ready"
  );

  info("Testing Up Arrow key behavior of the Hour Spinner");

  // Change the hour value from 1 to 0/12:
  EventUtils.synthesizeKey("KEY_ArrowUp", {});

  await BrowserTestUtils.waitForMutationCondition(
    spinnerHour,
    { attributes: "ariaValueNow" },
    () => {
      return spinnerHour.ariaValueNow == "0";
    },
    `Should change to 0, instead got ${
      helper.getElement(SPINNER_HOUR).ariaValueNow
    }`
  );

  Assert.equal(
    spinnerHour.getAttribute("aria-valuenow"),
    "0",
    "Up Arrow selects the previous hour"
  );
  Assert.equal(
    spinnerMin.getAttribute("aria-valuenow"),
    "1",
    "Up Arrow on an hour spinner does not update the minute spinner"
  );
  Assert.equal(
    spinnerTime.getAttribute("aria-valuenow"),
    "0" /** AM */,
    "Up Arrow on an hour spinner does not update the time of the day spinner"
  );

  info("Testing Down Arrow key behavior of the Minute Spinner");

  // Move focus to the MM section of the time input:
  EventUtils.synthesizeKey("KEY_Tab", {});

  Assert.ok(
    spinnerMin.matches(":focus"),
    `The keyboard focus is placed on the minute spinner`
  );

  // Change the hour value from 1 to 2:
  EventUtils.synthesizeKey("KEY_ArrowDown", {});

  await BrowserTestUtils.waitForMutationCondition(
    spinnerMin,
    { attributes: "ariaValueNow" },
    () => {
      return spinnerMin.ariaValueNow == "2";
    },
    `Should change to 2, instead got ${
      helper.getElement(SPINNER_MIN).ariaValueNow
    }`
  );

  Assert.equal(
    spinnerHour.getAttribute("aria-valuenow"),
    "0",
    "Down Arrow on a minute spinner does not update the hour spinner"
  );
  Assert.equal(
    spinnerMin.getAttribute("aria-valuenow"),
    "2",
    "Down Arrow selects the next minute"
  );
  Assert.equal(
    spinnerTime.getAttribute("aria-valuenow"),
    "0" /** AM */,
    "Down Arrow on a minute spinner does not update the time of the day spinner"
  );

  info("Testing Down Arrow key behavior of the Time of the day Spinner");

  // Move focus to the AM/PM section of the time input:
  EventUtils.synthesizeKey("KEY_ArrowRight", {});

  Assert.ok(
    spinnerTime.matches(":focus"),
    `The keyboard focus is placed on the AM/PM spinner`
  );

  // Change the hour value from 0/AM to 12/PM:
  EventUtils.synthesizeKey("KEY_ArrowDown", {});

  await BrowserTestUtils.waitForMutationCondition(
    spinnerTime,
    { attributes: "ariaValueNow" },
    () => {
      return spinnerTime.ariaValueNow == "12";
    },
    `Should change to 12, instead got ${
      helper.getElement(SPINNER_TIME).ariaValueNow
    }`
  );

  // Wait for the hour spinner to update as well, since changing AM/PM affects it
  await BrowserTestUtils.waitForMutationCondition(
    spinnerHour,
    { attributes: "ariaValueNow" },
    () => {
      return spinnerHour.ariaValueNow == "12";
    },
    `Hour should change to 12, instead got ${
      helper.getElement(SPINNER_HOUR).ariaValueNow
    }`
  );

  Assert.equal(
    spinnerHour.getAttribute("aria-valuenow"),
    "12" /** was 0 in AM */,
    "Down Arrow on a time of the day spinner updates the hour spinner within 24 hr"
  );
  Assert.equal(
    spinnerTime.getAttribute("aria-valuenow"),
    "12" /** PM */,
    "Down Arrow on a time of the day selects the PM in the spinner"
  );

  info("Testing Space/Enter key behavior of the panel");

  let closed = helper.promisePickerClosed();

  // Confirm the selection and close the panel on Space/Enter
  EventUtils.synthesizeKey("KEY_Enter", {});

  await closed;

  Assert.equal(helper.panel.state, "closed", "Panel should be closed on Enter");

  await helper.tearDown();
});
