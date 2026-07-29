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
 * Test that the time spinners open with an accessible markup
 */
add_task(async function test_time_spinner_markup() {
  info("Test that the time picker opens with an accessible markup");

  await helper.openPicker(`data:text/html, <input type="time">`);

  Assert.equal(helper.panel.state, "open", "Panel should be opened");
  Assert.equal(
    helper.getElement(DIALOG_TIME_PICKER).getAttribute("role"),
    "dialog",
    "Timepicker dialog has an appropriate ARIA role"
  );
  Assert.ok(
    helper.getElement(DIALOG_TIME_PICKER).getAttribute("aria-modal"),
    "Timepicker dialog is a modal"
  );

  info("Test that spinners open with an accessible markup");

  // Hour (HH):
  const spinnerHour = helper.getElement(SPINNER_HOUR);
  const spinnerHourPrev = helper.getElement(BTN_PREV_HOUR);
  const spinnerHourNext = helper.getElement(BTN_NEXT_HOUR);
  // Minute (MM):
  const spinnerMin = helper.getElement(SPINNER_MIN);
  const spinnerMinPrev = helper.getElement(BTN_PREV_MIN);
  const spinnerMinNext = helper.getElement(BTN_NEXT_MIN);
  // Time of the day (AM/PM):
  const spinnerTime = helper.getElement(SPINNER_TIME);
  const spinnerTimePrev = helper.getElement(BTN_PREV_TIME);
  const spinnerTimeNext = helper.getElement(BTN_NEXT_TIME);

  const spinners = [spinnerHour, spinnerMin, spinnerTime];
  const prevBtns = [spinnerHourPrev, spinnerMinPrev, spinnerTimePrev];
  const nextBtns = [spinnerHourNext, spinnerMinNext, spinnerTimeNext];

  // Check spinner controls:
  for (const el of spinners) {
    Assert.equal(
      el.getAttribute("role"),
      "spinbutton",
      `Spinner control ${el.id} is a spinbutton`
    );
    Assert.equal(
      el.getAttribute("tabindex"),
      "0",
      `Spinner control ${el.id} is included in the focus order`
    );
    Assert.ok(
      /* "12" is a min value for Hour spinners */
      ["0", "12"].includes(el.getAttribute("aria-valuemin")),
      `Spinner control ${el.id} has a min value set`
    );
    Assert.ok(
      /* "0" and "12" are the only values for Time of the day spinners */
      ["11", "23", "59", "12"].includes(el.getAttribute("aria-valuemax")),
      `Spinner control ${el.id} has a max value set`
    );

    testAttribute(el, "aria-valuenow");
    testAttribute(el, "aria-valuetext");
    testAttribute(el, "aria-label");

    let visibleEls = el.querySelectorAll(":scope > :not([aria-hidden])");
    Assert.equal(
      visibleEls.length,
      0,
      "There should be no children of the spinner without aria-hidden"
    );

    await testReducedMotionProp(el, "scroll-behavior", "smooth", "auto");
  }

  // Check Previous/Next buttons:
  for (const btnGroup of [prevBtns, nextBtns]) {
    for (const btn of btnGroup) {
      Assert.equal(
        btn.tagName,
        "button",
        `Spinner's ${btn.id} control is a button`
      );

      testAttribute(btn, "aria-label");
    }
  }

  await helper.tearDown();
});

/**
 * Test that time input field has a picker button
 * with an accessible markup with the time picker enabled
 */
add_task(async function test_picker_button_markup_time() {
  info(
    "Test that type=time input field has a picker button with an accessible markup with the time picker enabled"
  );

  await helper.openPicker("data:text/html, <input type='time'>");
  let browser = helper.tab.linkedBrowser;

  Assert.equal(helper.panel.state, "open", "Panel is visible");

  let closed = helper.promisePickerClosed();

  await testPickerBtnAttribute("aria-expanded", "true");
  await testPickerBtnAttribute("aria-label", null, true);
  await testPickerBtnAttribute("data-l10n-id", "datetime-time");

  await SpecialPowers.spawn(browser, [], () => {
    const input = content.document.querySelector("input");
    const shadowRoot = SpecialPowers.wrap(input).openOrClosedShadowRoot;
    const pickerBtn = shadowRoot.getElementById("picker-button");

    Assert.equal(pickerBtn.tagName, "BUTTON", "Picker control is a button");
    Assert.ok(
      ContentTaskUtils.isVisible(pickerBtn),
      "The picker button is visible"
    );

    pickerBtn.click();
  });

  await closed;

  Assert.equal(
    helper.panel.state,
    "closed",
    "Panel should be closed on click on the picker button"
  );

  await testPickerBtnAttribute("aria-expanded", "false");

  await helper.tearDown();
});

/**
 * Test that time input field does not include a picker button
 * with the time picker disabled
 */
add_task(async function test_picker_button_markup_time_picker_off() {
  info(
    "Test that type=time input field does not include a picker button with the time picker disabled"
  );

  // Toggle off the time picker pref
  await SpecialPowers.pushPrefEnv({
    set: [["dom.forms.datetime.timepicker", false]],
  });

  let testTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "data:text/html, <input type='time'>"
  );

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    const input = content.document.querySelector("input");
    const shadowRoot = SpecialPowers.wrap(input).openOrClosedShadowRoot;
    const pickerBtn = shadowRoot.getElementById("picker-button");

    Assert.ok(
      ContentTaskUtils.isHidden(pickerBtn),
      "The Calendar control within a type=time input field is programmatically hidden with the time picker disabled"
    );
  });

  await SpecialPowers.popPrefEnv();
  BrowserTestUtils.removeTab(testTab);
});

/**
 * Test that the time picker enables the correct values when the valid range wraps midnight
 */
add_task(async function test_timepicker_wrap_midnight() {
  info(
    "Test that the time picker enables the correct values when the valid range wraps midnight"
  );
  const maxValue = "01:00";
  const minValue = "23:00";
  const inputValue = "00:00";

  await helper.openPicker(
    `data:text/html, <input type='time' value="${inputValue}" max="${maxValue}" min="${minValue}">`
  );

  let hours = helper.getSpinnerOptions(SPINNER_HOUR);
  const dayPeriods = helper.getSpinnerOptions(SPINNER_TIME);

  Assert.deepEqual(
    hours,
    ["12", "1"],
    "The valid AM hours are available in the picker"
  );

  Assert.deepEqual(
    dayPeriods,
    ["AM", "PM"],
    "The valid day periods are available in the picker"
  );

  // Move focus to the day period spinner and select PM
  EventUtils.synthesizeKey("KEY_Tab", {});
  EventUtils.synthesizeKey("KEY_Tab", {});
  EventUtils.synthesizeKey("KEY_ArrowDown", {});

  const spinnerTime = helper.getElement(SPINNER_TIME);
  await BrowserTestUtils.waitForMutationCondition(
    spinnerTime,
    { attributeFilter: ["aria-valuenow"] },
    () => {
      return spinnerTime.ariaValueNow == "12";
    },
    `Should change to 12, instead got ${spinnerTime.ariaValueNow}`
  );

  hours = helper.getSpinnerOptions(SPINNER_HOUR);

  Assert.deepEqual(
    hours,
    ["11"],
    "The valid PM hours are available in the picker"
  );

  await helper.tearDown();
});

/**
 * Test that the time picker selects the minimum valid value when opened with an invalid value.
 */
add_task(async function test_timepicker_select_min_valid_when_invalid() {
  info(
    "Test that the time picker selects the minimum valid value when opened with an invalid value"
  );
  const minValue = "02:30";
  const inputValue = "00:10";

  await helper.openPicker(
    `data:text/html, <input type='time' value="${inputValue}" min="${minValue}">`
  );

  const spinnerHour = helper.getElement(SPINNER_HOUR);
  const spinnerMin = helper.getElement(SPINNER_MIN);

  Assert.equal(
    spinnerHour.ariaValueNow,
    "2",
    "The minimum valid hour is selected in the picker"
  );

  Assert.equal(
    spinnerMin.ariaValueNow,
    "30",
    "The minimum valid minute is selected in the picker"
  );

  await helper.tearDown();
});
