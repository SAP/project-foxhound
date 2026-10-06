/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function pip_moves_away_for_fullscreen() {
  const [tab, chromePiP] = await newTabWithPiP();

  const { availLeft, availTop, availHeight, availWidth } = chromePiP.screen;

  // move PiP to where the fullscreen warning would be
  const destPos = { x: availLeft + availWidth / 2, y: availTop };
  await movePiP(chromePiP, destPos);

  info("Enter fullscreen");
  const fullScreenEntered = BrowserTestUtils.waitForEvent(window, "fullscreen");
  window.fullScreen = true;
  await fullScreenEntered;
  ok(true, "Got fullscreen event");

  await TestUtils.waitForCondition(
    () => chromePiP.screenY > availTop + availHeight / 3,
    `Waiting for window to move down`
  );

  // Cleanup.
  const fullScreenExit = BrowserTestUtils.waitForEvent(window, "fullscreen");
  window.fullScreen = false;
  await fullScreenExit;
  await BrowserTestUtils.closeWindow(chromePiP);
  BrowserTestUtils.removeTab(tab);
});
