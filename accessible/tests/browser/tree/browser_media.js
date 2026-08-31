/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* import-globals-from ../../mochitest/role.js */
loadScripts({ name: "role.js", dir: MOCHITESTS_DIR });

/**
 * Test the accessibility tree for video elements with captions.
 */
addAccessibleTask(
  `
<video id="video" controls>
</video>
  `,
  async function testVideoCaptions(browser, docAcc) {
    const videoAcc = findAccessibleChildByID(docAcc, "video");
    let ready = waitForEvent(
      EVENT_SHOW,
      evt => evt.accessible.name == "test caption"
    );
    await invokeContentTask(browser, [], () => {
      const video = content.document.getElementById("video");
      video.src =
        "https://example.com/tests/dom/media/test/shorter_audio_than_video_3s.webm";
      const track = video.addTextTrack("captions");
      track.mode = "showing";
      track.addCue(new content.VTTCue(0, 3, "test caption"));
      video.currentTime = 1;
    });
    await ready;
    testAccessibleTree(videoAcc, {
      role: ROLE_GROUPING,
      interfaces: [nsIAccessibleHyperText],
      children: [
        {
          // start/stop button
          role: ROLE_PUSHBUTTON,
          name: "Play",
          children: [],
        },
        {
          // buffer bar
          role: ROLE_STATUSBAR,
          children: [
            {
              role: ROLE_TEXT_LEAF,
              name: "Loading:",
            },
            {
              role: ROLE_TEXT_LEAF,
              name: " ",
            },
            {
              role: ROLE_TEXT_LEAF,
              // The name is the percentage buffered; e.g. "0%", "100%".
              // We can't check it here because it might be different
              // depending on browser caching.
            },
          ],
        },
        {
          // slider of progress bar
          role: ROLE_SLIDER,
          name: "Position",
          value: "0:01 / 0:03",
          children: [],
        },
        {
          // mute button
          role: ROLE_PUSHBUTTON,
          name: "Mute",
          children: [],
        },
        {
          // slider of volume bar
          role: ROLE_SLIDER,
          children: [],
          name: "Volume",
        },
        {
          role: ROLE_PUSHBUTTON,
          name: "Closed Captions",
          children: [],
        },
        {
          role: ROLE_PUSHBUTTON,
          name: "Full Screen",
          children: [],
        },
        {
          // Poster image
          role: ROLE_GRAPHIC,
          children: [],
        },
        {
          // Caption
          role: ROLE_TEXT_LEAF,
          name: "test caption",
        },
      ],
    });
  }
);
