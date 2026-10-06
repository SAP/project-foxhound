/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that the PiP window remains open if the source video is removed
 * and immediately re-inserted into the DOM (e.g. during a framework re-render).
 *
 * @param {boolean} mirror
 *   If true, applies a scaleX(-1) transform to the source video to verify it
 *   persists after rescue.
 */
async function doTest(mirror) {
  const videoID = "with-controls";
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);
  const browser = tab.linkedBrowser;

  info("Play the video.");
  await SpecialPowers.spawn(
    browser,
    [{ videoID, mirror }],
    async ({ videoID, mirror }) => {
      let video = content.document.getElementById(videoID);
      if (mirror) {
        video.style.transform = "scaleX(-1)";
      }
      await video.play();
    }
  );

  const pipWin = await triggerPictureInPicture(browser, videoID);
  Assert.ok(pipWin, "Got Picture-in-Picture window.");
  const pipBrowser = pipWin.document.getElementById("browser");
  await SpecialPowers.spawn(pipBrowser, [], async () => {
    await ContentTaskUtils.waitForCondition(
      () => content.document.getElementById("playervideo"),
      "Player video element appears in PiP content"
    );
  });

  if (mirror) {
    const transform = await SpecialPowers.spawn(pipBrowser, [], async () => {
      const pipVideo = content.document.getElementById("playervideo");
      return pipVideo.style.transform;
    });
    Assert.equal(
      transform,
      "scaleX(-1)",
      "PiP video should initially be mirrored"
    );
  }

  info("Simulate DOM Swap (Remove + Insert).");
  await SpecialPowers.spawn(browser, [videoID], async videoID => {
    const video = content.document.getElementById(videoID);
    const { parentNode, nextSibling } = video;
    video.remove();
    parentNode.insertBefore(video, nextSibling);
  });

  await TestUtils.waitForTick();
  ok(!pipWin.closed, "PiP window should still be open after DOM swap");
  await assertVideoIsBeingCloned(browser, "#" + videoID);
  if (mirror) {
    const transform = await SpecialPowers.spawn(pipBrowser, [], async () => {
      const pipVideo = content.document.getElementById("playervideo");
      return pipVideo.style.transform;
    });
    Assert.equal(
      transform,
      "scaleX(-1)",
      "PiP video should remain mirrored after rescue"
    );
  }

  await BrowserTestUtils.closeWindow(pipWin);
  BrowserTestUtils.removeTab(tab);
}

add_task(async function test_video_reparenting() {
  await doTest(false);
});

add_task(async function test_mirrored_video_reparenting() {
  await doTest(true);
});
