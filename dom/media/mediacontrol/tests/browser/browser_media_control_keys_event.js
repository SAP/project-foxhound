const PAGE =
  "https://example.com/browser/dom/media/mediacontrol/tests/browser/file_non_autoplay.html";
const testVideoId = "video";

/**
 * This test is used to generate platform-independent media control keys event
 * and see if media can be controlled correctly and current we only support
 * `play`, `pause`, `playPause` and `stop` events.
 */
add_task(async function setupTestingPref() {
  await SpecialPowers.pushPrefEnv({
    set: [["media.mediacontrol.testingevents.enabled", true]],
  });
});

add_task(async function testPlayPauseAndStop() {
  info(`open page and start media`);
  const tab = await createLoadedTabWrapper(PAGE);
  await playMedia(tab, testVideoId);

  info(`pressing 'pause' key`);
  MediaControlService.generateMediaControlKey("pause");
  await checkOrWaitUntilMediaStoppedPlaying(tab, testVideoId);

  info(`pressing 'play' key`);
  MediaControlService.generateMediaControlKey("play");
  await checkOrWaitUntilMediaStartedPlaying(tab, testVideoId);

  info(`pressing 'stop' key`);
  MediaControlService.generateMediaControlKey("stop");
  await checkOrWaitUntilMediaStoppedPlaying(tab, testVideoId);

  info(`Has stopped controlling media, pressing 'play' won't resume it`);
  MediaControlService.generateMediaControlKey("play");
  await checkOrWaitUntilMediaStoppedPlaying(tab, testVideoId);

  info(`remove tab`);
  await tab.close();
});

add_task(async function testPlayPause() {
  info(`open page and start media`);
  const tab = await createLoadedTabWrapper(PAGE);
  await playMedia(tab, testVideoId);

  info(`pressing 'playPause' key, media should stop`);
  MediaControlService.generateMediaControlKey("playpause");
  await Promise.all([
    new Promise(r => (tab.controller.onplaybackstatechange = r)),
    checkOrWaitUntilMediaStoppedPlaying(tab, testVideoId),
  ]);

  info(`pressing 'playPause' key, media should start`);
  MediaControlService.generateMediaControlKey("playpause");
  await Promise.all([
    new Promise(r => (tab.controller.onplaybackstatechange = r)),
    checkOrWaitUntilMediaStartedPlaying(tab, testVideoId),
  ]);

  info(`remove tab`);
  await tab.close();
});

add_task(async function testSetVolume() {
  info(`open page and start media`);
  const tab = await createLoadedTabWrapper(PAGE);
  await playMedia(tab, testVideoId);

  info(`pressing 'setvolume' key with volume 0.5`);
  MediaControlService.generateMediaControlKey("setvolume", 0.5);

  await SpecialPowers.spawn(tab.linkedBrowser, [testVideoId], async Id => {
    const video = content.document.getElementById(Id);
    await new Promise(r => {
      if (video.volume === 0.5) {
        r();
      } else {
        video.addEventListener("volumechange", r, { once: true });
      }
    });
    is(video.volume, 0.5, "Volume should be 0.5");
  });

  info(`pressing 'setvolume' key with volume -0.5`);
  MediaControlService.generateMediaControlKey("setvolume", -0.5);

  await SpecialPowers.spawn(tab.linkedBrowser, [testVideoId], async Id => {
    const video = content.document.getElementById(Id);
    await new Promise(r => content.window.setTimeout(r, 100));
    is(
      video.volume,
      0.0,
      "Volume should be 0.0 (clamped because setvolume < 0.0)"
    );
  });

  info(`pressing 'setvolume' key with volume 1.5`);
  MediaControlService.generateMediaControlKey("setvolume", 1.5);

  await SpecialPowers.spawn(tab.linkedBrowser, [testVideoId], async Id => {
    const video = content.document.getElementById(Id);
    await new Promise(r => content.window.setTimeout(r, 100));
    is(
      video.volume,
      1.0,
      "Volume should be 1.0 (clamped because setvolume > 1.0)"
    );
  });

  info(`pressing 'setvolume' key with volume 0.0`);
  MediaControlService.generateMediaControlKey("setvolume", 0.0);

  await SpecialPowers.spawn(tab.linkedBrowser, [testVideoId], async Id => {
    const video = content.document.getElementById(Id);
    await new Promise(r => {
      if (video.volume === 0.0) {
        r();
      } else {
        video.addEventListener("volumechange", r, { once: true });
      }
    });
    is(video.volume, 0.0, "Volume should be 0.0");
  });

  info(`remove tab`);
  await tab.close();
});

add_task(async function testMute() {
  info(`open page and start media`);
  const tab = await createLoadedTabWrapper(PAGE);
  await playMedia(tab, testVideoId);

  info(`pressing 'mute' key`);
  MediaControlService.generateMediaControlKey("mute");

  await SpecialPowers.spawn(tab.linkedBrowser, [testVideoId], async Id => {
    const video = content.document.getElementById(Id);
    await new Promise(r => {
      if (video.muted) {
        r();
      } else {
        video.addEventListener("volumechange", r, { once: true });
      }
    });
    is(video.muted, true, "Media should be muted");
  });

  info(`pressing 'unmute' key`);
  MediaControlService.generateMediaControlKey("unmute");

  await SpecialPowers.spawn(tab.linkedBrowser, [testVideoId], async Id => {
    const video = content.document.getElementById(Id);
    await new Promise(r => {
      if (!video.muted) {
        r();
      } else {
        video.addEventListener("volumechange", r, { once: true });
      }
    });
    is(video.muted, false, "Media should be unmuted");
  });

  info(`remove tab`);
  await tab.close();
});
