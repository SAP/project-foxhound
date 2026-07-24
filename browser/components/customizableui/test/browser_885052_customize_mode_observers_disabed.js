/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function promiseButtonCheckedState(button, expectedCheckedState) {
  return BrowserTestUtils.waitForMutationCondition(
    button,
    {
      attributes: true,
      attributeFilter: ["checked"],
    },
    () => button.checked === expectedCheckedState
  ).then(() => info("Button checked state now correct."));
}

function promiseSizemodeChange(expectedSizeMode) {
  return BrowserTestUtils.waitForEvent(window, "sizemodechange", false, () => {
    let sizemode = document.documentElement.getAttribute("sizemode");
    info(`Sizemode changed to ${sizemode}. Expected: ${expectedSizeMode}`);
    return (
      document.documentElement.getAttribute("sizemode") === expectedSizeMode
    );
  }).then(() => info("Sizemode changed to " + expectedSizeMode + "."));
}

// Observers should be disabled when in customization mode.
add_task(async function () {
  CustomizableUI.addWidgetToArea(
    "fullscreen-button",
    CustomizableUI.AREA_FIXED_OVERFLOW_PANEL
  );

  await waitForOverflowButtonShown();

  // Show the panel so it isn't hidden and has bindings applied etc.:
  await document.getElementById("nav-bar").overflowable.show();

  // Hide it again.
  document.getElementById("widget-overflow").hidePopup();

  let fullscreenButton = document.getElementById("fullscreen-button");
  ok(
    !fullscreenButton.checked,
    "Fullscreen button should not be checked when not in fullscreen."
  );
  let oldSizemode = document.documentElement.getAttribute("sizemode");
  Assert.notEqual(
    oldSizemode,
    "fullscreen",
    "Should not be in fullscreen sizemode before we enter fullscreen."
  );

  let sizemodeChangePromise = promiseSizemodeChange("fullscreen");
  BrowserCommands.fullScreen();
  await Promise.all([
    promiseButtonCheckedState(fullscreenButton, true),
    sizemodeChangePromise,
  ]);

  ok(
    fullscreenButton.checked,
    "Fullscreen button should be checked when in fullscreen."
  );

  await startCustomizing();

  let fullscreenButtonWrapper = document.getElementById(
    "wrapper-fullscreen-button"
  );
  ok(
    fullscreenButtonWrapper.hasAttribute("itemobserves"),
    "Observer should be moved to wrapper"
  );
  fullscreenButton = document.getElementById("fullscreen-button");
  ok(
    !fullscreenButton.hasAttribute("observes"),
    "Observer should be removed from button"
  );
  ok(
    !fullscreenButton.checked,
    "Fullscreen button should no longer be checked during customization mode"
  );

  await endCustomizing();

  sizemodeChangePromise = promiseSizemodeChange(oldSizemode);
  BrowserCommands.fullScreen();
  await Promise.all([
    promiseButtonCheckedState(fullscreenButton, false),
    sizemodeChangePromise,
  ]);
  ok(
    !fullscreenButton.checked,
    "Fullscreen button should not be checked when not in fullscreen."
  );
  CustomizableUI.reset();
});
