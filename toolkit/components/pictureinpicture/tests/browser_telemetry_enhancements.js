/* Any copyright is dedicated to the Public Domain.
  http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PAGE_LONG = TEST_ROOT + "test-video-selection.html";

const videoID = "with-controls";

add_task(async function testCreateAndCloseButtonTelemetry() {
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: TEST_PAGE,
    },
    async browser => {
      Services.fog.testResetFOG();

      await ensureVideosReady(browser);

      let pipWin = await triggerPictureInPicture(browser, videoID);
      ok(pipWin, "Got Picture-in-Picture window.");

      let ev = Glean.pictureinpicture.createPlayer.testGetValue();
      Assert.equal(ev.length, 1);
      Assert.equal(ev[0].extra.ccEnabled, "false");
      Assert.equal(ev[0].extra.webVTTSubtitles, "false");

      let pipClosed = BrowserTestUtils.domWindowClosed(pipWin);
      let closeButton = pipWin.document.getElementById("close");
      EventUtils.synthesizeMouseAtCenter(closeButton, {}, pipWin);
      await pipClosed;

      ev = Glean.pictureinpicture.closedMethodCloseButton.testGetValue();
      Assert.equal(ev.length, 1);

      // There is a delay between pipClosed and the "unload" event firing.
      // Even though pictureinpicture.window_open_duration is recorded to on
      // parent, wait for an IPC flush to give the "unload" time to propagate.
      await Services.fog.testFlushAllChildren();
      Assert.greater(
        Glean.pictureinpicture.windowOpenDuration.testGetValue().sum,
        0
      );
    }
  );
});

add_task(async function textTextTracksAndUnpipTelemetry() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "media.videocontrols.picture-in-picture.display-text-tracks.enabled",
        true,
      ],
    ],
  });

  await BrowserTestUtils.withNewTab(
    {
      url: TEST_PAGE_WITH_WEBVTT,
      gBrowser,
    },
    async browser => {
      Services.fog.testResetFOG();

      await ensureVideosReady(browser);

      let pipWin = await triggerPictureInPicture(browser, videoID);
      ok(pipWin, "Got Picture-in-Picture window.");

      let ev = Glean.pictureinpicture.createPlayer.testGetValue();
      Assert.equal(ev.length, 1);
      Assert.equal(ev[0].extra.ccEnabled, "true");
      Assert.equal(ev[0].extra.webVTTSubtitles, "true");

      let pipClosed = BrowserTestUtils.domWindowClosed(pipWin);
      let unpipButton = pipWin.document.getElementById("unpip");
      EventUtils.synthesizeMouseAtCenter(unpipButton, {}, pipWin);
      await pipClosed;

      ev = Glean.pictureinpicture.closedMethodUnpip.testGetValue();
      Assert.equal(ev.length, 1);
    }
  );
});

add_task(async function test_fullscreen_events() {
  await BrowserTestUtils.withNewTab(
    {
      url: TEST_PAGE,
      gBrowser,
    },
    async browser => {
      Services.telemetry.clearEvents();

      await ensureVideosReady(browser);

      let pipWin = await triggerPictureInPicture(browser, videoID);
      ok(pipWin, "Got Picture-in-Picture window.");

      let fullscreenBtn = pipWin.document.getElementById("fullscreen");

      await promiseFullscreenEntered(pipWin, () => {
        fullscreenBtn.click();
      });

      await promiseFullscreenExited(pipWin, () => {
        fullscreenBtn.click();
      });

      let ev = Glean.pictureinpicture.fullscreenPlayer.testGetValue();
      Assert.equal(ev.length, 2);
      Assert.ok("enter" in ev[0].extra);
      Assert.ok("enter" in ev[1].extra);

      await ensureMessageAndClosePiP(browser, videoID, pipWin, false);
    }
  );
});
