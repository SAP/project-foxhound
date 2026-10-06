/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that closing a pip window while holding down shift will not pause the
 * video, nor focus the originating video's window.
 */
add_task(async function test_pip_close_with_shortcut() {
  let win1 = await BrowserTestUtils.openNewBrowserWindow();
  let win2 = await BrowserTestUtils.openNewBrowserWindow();
  let videoID = "with-controls";
  let pipTab = await BrowserTestUtils.openNewForegroundTab(
    win1.gBrowser,
    TEST_PAGE
  );

  let browser = pipTab.linkedBrowser;
  let pipWin = await triggerPictureInPicture(browser, videoID);
  Assert.ok(pipWin, "Got Picture-in-Picture window.");
  let focus = BrowserTestUtils.waitForEvent(win2, "focus", true);
  win2.focus();
  await focus;

  let pipClosed = BrowserTestUtils.domWindowClosed(pipWin);
  let closeButton = pipWin.document.getElementById("close");
  let oldFocus = win1.focus;
  win1.focus = () => {
    Assert.ok(false, "Window is not supposed to be focused on");
  };
  EventUtils.synthesizeMouseAtCenter(closeButton, { shiftKey: true }, pipWin);
  await pipClosed;

  // with a shift + click, we should still stay in win1
  Assert.ok(true, "Window did not get focus");

  win1.focus = oldFocus;

  // the video should still be playing
  !isVideoPaused(browser, videoID);

  // close windows
  await BrowserTestUtils.closeWindow(win1);
  await BrowserTestUtils.closeWindow(win2);
});
