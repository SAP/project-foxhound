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
