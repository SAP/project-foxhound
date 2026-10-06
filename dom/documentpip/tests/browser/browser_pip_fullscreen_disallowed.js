/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function check_chrome_window_of_pip_cannot_fullscreen() {
  const [tab, chromePiP] = await newTabWithPiP();

  // Sanity check: VK_F11 will set window.fullScreen via View:Fullscreen command
  const fullScreenEntered = BrowserTestUtils.waitForEvent(window, "fullscreen");
  window.fullScreen = true;
  ok(window.fullScreen, "FS works as expected on window");
  await fullScreenEntered;
  ok(true, "Got fullscreen event");

  const fullScreenExited = BrowserTestUtils.waitForEvent(window, "fullscreen");
  window.fullScreen = false;
  ok(!window.fullScreen, "FS works as expected on window");
  await fullScreenExited;
  ok(true, "Got fullscreen event");

  // Check PiP cannot be fullscreened by chrome
  is(
    chromePiP.location.href,
    "chrome://browser/content/browser.xhtml",
    "Got the chrome window of the PiP"
  );
  chromePiP.fullScreen = true;
  ok(!chromePiP.fullScreen, "Didn't enter fullscreen on PiP");

  // Cleanup.
  await BrowserTestUtils.closeWindow(chromePiP);
  BrowserTestUtils.removeTab(tab);
});
