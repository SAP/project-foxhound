/**
 * This test is used to ensure that touch in point can activate document and
 * allow autoplay, but touch scroll can't activate document.
 */
/* eslint-disable mozilla/no-arbitrary-setTimeout */
"use strict";

const PAGE = GetTestWebBasedURL("file_nonAutoplayAudio.html");

function checkMediaPlayingState(isPlaying) {
  let audio = content.document.getElementById("testAudio");
  if (!audio) {
    ok(false, "can't get the audio element!");
  }

  is(!audio.paused, isPlaying, "media playing state is correct.");
}

async function callMediaPlay(shouldStartPlaying) {
  let audio = content.document.getElementById("testAudio");
  if (!audio) {
    ok(false, "can't get the audio element!");
  }

  info(`call media.play().`);
  let playPromise = new Promise((resolve, reject) => {
    audio.play().then(() => {
      audio.isPlayStarted = true;
      resolve();
    });
    content.setTimeout(() => {
      if (audio.isPlayStarted) {
        return;
      }
      reject();
    }, 3000);
  });

  let isStartPlaying = await playPromise.then(
    () => true,
    () => false
  );
  is(
    isStartPlaying,
    shouldStartPlaying,
    "media is " + (isStartPlaying ? "" : "not ") + "playing."
  );
}

async function synthesizeTouchScroll(browser) {
  const promise = SpecialPowers.spawn(browser, [], () => {
    return new Promise(resolve => {
      content.document.addEventListener(
        "touchend",
        () => {
          resolve();
        },
        { once: true }
      );
    });
  });
  // Ensure the event listener is registered before we synthesize touch events.
  await SpecialPowers.spawn(browser, [], () => {});

  let currentY = 50;
  EventUtils.synthesizeTouch(browser, 10, currentY, {
    type: "touchstart",
    asyncEnabled: true,
  });
  for (let i = 0; i < 20; i++) {
    EventUtils.synthesizeTouch(browser, 10, currentY, {
      type: "touchmove",
      asyncEnabled: true,
    });
    currentY -= 1;
  }
  EventUtils.synthesizeTouch(browser, 10, currentY, {
    type: "touchend",
    asyncEnabled: true,
  });
  await promise;
}

add_task(async function setup_test_preference() {
  return SpecialPowers.pushPrefEnv({
    set: [
      ["media.autoplay.default", SpecialPowers.Ci.nsIAutoplay.BLOCKED],
      ["media.autoplay.blocking_policy", 0],
    ],
  });
});

add_task(async function testTouchScroll() {
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: PAGE,
    },
    async browser => {
      info(`- media should not start playing -`);
      await SpecialPowers.spawn(browser, [false], checkMediaPlayingState);

      info(`- simulate touch scroll which should not activate document -`);
      await synthesizeTouchScroll(browser);
      await SpecialPowers.spawn(browser, [false], callMediaPlay);

      await SpecialPowers.spawn(browser, [], () => {
        content.document.addEventListener(
          "touchmove",
          e => {
            e.preventDefault();
          },
          { once: true, passive: false }
        );
      });
      info(
        `- simulate touch actions without causing scroll which should activate document -`
      );
      //await EventUtils.synthesizeTouch(browser, 0, 0, { asyncEnabled: true });
      await synthesizeTouchScroll(browser);
      await SpecialPowers.spawn(browser, [true], callMediaPlay);
    }
  );
});
