/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that closing with unpip leaves the video playing but the close button
 * will pause the video.
 */
add_task(async () => {
  for (let videoID of ["with-controls", "no-controls"]) {
    info(`Testing ${videoID} case.`);

    let playVideo = () => {
      return SpecialPowers.spawn(browser, [videoID], async videoID => {
        return content.document.getElementById(videoID).play();
      });
    };

    let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);
    let browser = tab.linkedBrowser;
    await playVideo();

    // Try the unpip button.
    let pipWin = await triggerPictureInPicture(browser, videoID);
    ok(pipWin, "Got Picture-in-Picture window.");
    ok(!(await isVideoPaused(browser, videoID)), "The video is not paused");

    let pipClosed = BrowserTestUtils.domWindowClosed(pipWin);
    let unpipButton = pipWin.document.getElementById("unpip");
    EventUtils.synthesizeMouseAtCenter(unpipButton, {}, pipWin);
    await pipClosed;
    ok(!(await isVideoPaused(browser, videoID)), "The video is not paused");

    // Try the close button.
    pipWin = await triggerPictureInPicture(browser, videoID);
    ok(pipWin, "Got Picture-in-Picture window.");
    ok(!(await isVideoPaused(browser, videoID)), "The video is not paused");

    pipClosed = BrowserTestUtils.domWindowClosed(pipWin);
    let closeButton = pipWin.document.getElementById("close");
    EventUtils.synthesizeMouseAtCenter(closeButton, {}, pipWin);
    await pipClosed;
    ok(await isVideoPaused(browser, videoID), "The video is paused");

    BrowserTestUtils.removeTab(tab);
  }
});

/**
 * Tests that closing the PiP window while the originating tab is in a Split
 * View keeps the video active.
 */
add_task(async function test_close_pip_in_split_view() {
  const videoID = "with-controls";
  const tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);
  const tab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );
  const videoBrowser = tab1.linkedBrowser;
  gBrowser.addTabSplitView([tab1, tab2]);

  // Trigger Picture-in-Picture from Tab 1.
  await SpecialPowers.spawn(videoBrowser, [videoID], async videoID => {
    const video = content.document.getElementById(videoID);
    video.play();
  });
  const pipWin = await triggerPictureInPicture(videoBrowser, videoID);
  Assert.ok(pipWin, "Got Picture-in-Picture window.");

  // Select Tab 2.
  gBrowser.selectedTab = tab2;
  Assert.notEqual(
    gBrowser.selectedBrowser,
    videoBrowser,
    "The video browser should not be the selected browser."
  );
  Assert.ok(
    videoBrowser.docShellIsActive,
    "The video browser should still be active because it is visible in Split View."
  );

  // Close the PiP window.
  const pipClosed = BrowserTestUtils.domWindowClosed(pipWin);
  const closeButton = pipWin.document.getElementById("close");
  EventUtils.synthesizeMouseAtCenter(closeButton, {}, pipWin);
  await pipClosed;
  Assert.ok(
    videoBrowser.docShellIsActive,
    "The video browser should remain active after closing PiP."
  );

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});
