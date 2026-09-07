/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const FIRST_TIME_PIP_TOGGLE_STYLES = {
  rootID: "pictureInPictureToggle",
  stages: {
    hoverVideo: {
      opacities: {
        ".pip-wrapper": DEFAULT_TOGGLE_OPACITY,
      },
      hidden: [],
    },

    hoverToggle: {
      opacities: {
        ".pip-wrapper": 1.0,
      },
      hidden: [],
    },
  },
};

/**
 * This function will open the PiP window by clicking the toggle
 * and then close the PiP window
 *
 * @param browser The current browser
 * @param videoID The video element id
 */
async function openAndClosePipWithToggle(browser, videoID) {
  await SimpleTest.promiseFocus(browser);
  await ensureVideosReady(browser);

  await prepareForToggleClick(browser, videoID);

  // Clear all data
  Services.fog.testResetFOG();

  // Hover the mouse over the video to reveal the toggle, which is necessary
  // if we want to click on the toggle.
  await BrowserTestUtils.synthesizeMouseAtCenter(
    `#${videoID}`,
    {
      type: "mousemove",
    },
    browser
  );
  await BrowserTestUtils.synthesizeMouseAtCenter(
    `#${videoID}`,
    {
      type: "mouseover",
    },
    browser
  );

  info("Waiting for toggle to become visible");
  await toggleOpacityReachesThreshold(
    browser,
    videoID,
    "hoverVideo",
    FIRST_TIME_PIP_TOGGLE_STYLES
  );

  let toggleClientRect = await getToggleClientRect(browser, videoID);

  // The toggle center, because of how it slides out, is actually outside
  // of the bounds of a click event. For now, we move the mouse in by a
  // hard-coded 15 pixels along the x and y axis to achieve the hover.
  let toggleLeft = toggleClientRect.left + 15;
  let toggleTop = toggleClientRect.top + 15;

  info("Clicking on toggle, and expecting a Picture-in-Picture window to open");
  // We need to wait for the window to have completed loading before we
  // can close it as the document's type required by closeWindow may not
  // be available.
  let domWindowOpened = BrowserTestUtils.domWindowOpenedAndLoaded(null);

  await BrowserTestUtils.synthesizeMouseAtPoint(
    toggleLeft,
    toggleTop,
    {
      type: "mousedown",
    },
    browser
  );

  await BrowserTestUtils.synthesizeMouseAtPoint(
    1,
    1,
    {
      type: "mouseup",
    },
    browser
  );

  let win = await domWindowOpened;
  ok(win, "A Picture-in-Picture window opened.");

  await SpecialPowers.spawn(browser, [videoID], async videoID => {
    let video = content.document.getElementById(videoID);
    await ContentTaskUtils.waitForCondition(() => {
      return video.isCloningElementVisually;
    }, "Video is being cloned visually.");
  });

  await BrowserTestUtils.closeWindow(win);
  await assertSawClickEventOnly(browser);

  await BrowserTestUtils.synthesizeMouseAtPoint(1, 1, {}, browser);
  await assertSawMouseEvents(browser, true);
}

/**
 * This function will open the PiP window by with the context menu
 *
 * @param browser The current browser
 * @param videoID The video element id
 */
async function openAndClosePipWithContextMenu(browser, videoID) {
  await SimpleTest.promiseFocus(browser);
  await ensureVideosReady(browser);

  let menu = document.getElementById("contentAreaContextMenu");
  let popupshown = BrowserTestUtils.waitForPopupEvent(menu, "shown");

  await BrowserTestUtils.synthesizeMouseAtCenter(
    `#${videoID}`,
    {
      type: "contextmenu",
    },
    browser
  );

  await popupshown;
  let isContextMenuOpen = menu.state === "showing" || menu.state === "open";
  ok(isContextMenuOpen, "Context menu is open");

  let domWindowOpened = BrowserTestUtils.domWindowOpenedAndLoaded(null);

  // clear content events
  Services.fog.testResetFOG();

  let hidden = BrowserTestUtils.waitForPopupEvent(menu, "hidden");
  menu.activateItem(menu.querySelector("#context-video-pictureinpicture"));
  await hidden;

  let win = await domWindowOpened;
  ok(win, "A Picture-in-Picture window opened.");

  await SpecialPowers.spawn(browser, [videoID], async videoID => {
    let video = content.document.getElementById(videoID);
    await ContentTaskUtils.waitForCondition(() => {
      return video.isCloningElementVisually;
    }, "Video is being cloned visually.");
  });

  await BrowserTestUtils.closeWindow(win);
}

add_task(async function test_eventTelemetry() {
  Services.fog.testResetFOG();
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: TEST_PAGE,
    },
    async browser => {
      let videoID = "no-controls";

      const PIP_PREF =
        "media.videocontrols.picture-in-picture.video-toggle.has-used";
      await SpecialPowers.pushPrefEnv({
        set: [[PIP_PREF, false]],
      });

      // open with context menu for first time
      await openAndClosePipWithContextMenu(browser, videoID);

      await Services.fog.testFlushAllChildren();
      let ev = Glean.pictureinpicture.openedMethodContextMenu.testGetValue();
      Assert.equal(ev.length, 1);
      Assert.equal(ev[0].extra.firstTimeToggle, "true");

      // open with toggle for first time
      await SpecialPowers.pushPrefEnv({
        set: [[PIP_PREF, false]],
      });

      await openAndClosePipWithToggle(browser, videoID);

      await Services.fog.testFlushAllChildren();
      ev = Glean.pictureinpicture.sawToggleToggle.testGetValue();
      Assert.equal(ev.length, 1);
      Assert.equal(ev[0].extra.firstTime, "true");
      ev = Glean.pictureinpicture.openedMethodToggle.testGetValue();
      Assert.equal(ev.length, 1);
      Assert.equal(ev[0].extra.firstTimeToggle, "true");

      // open with toggle for not first time
      await openAndClosePipWithToggle(browser, videoID);

      await Services.fog.testFlushAllChildren();
      ev = Glean.pictureinpicture.sawToggleToggle.testGetValue();
      Assert.equal(ev.length, 1);
      Assert.equal(ev[0].extra.firstTime, "false");
      ev = Glean.pictureinpicture.openedMethodToggle.testGetValue();
      Assert.equal(ev.length, 1);
      Assert.equal(ev[0].extra.firstTimeToggle, "false");

      // open with context menu for not first time
      await openAndClosePipWithContextMenu(browser, videoID);

      await Services.fog.testFlushAllChildren();
      ev = Glean.pictureinpicture.openedMethodContextMenu.testGetValue();
      Assert.equal(ev.length, 1);
      Assert.equal(ev[0].extra.firstTimeToggle, "false");
    }
  );
});
