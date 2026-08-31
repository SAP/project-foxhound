/**
 * A user-set audioSession override on a browsing context should be reflected
 * in `MediaController.effectiveAudioSessionType`.
 */
"use strict";

const AUDIBLE_URL =
  "https://example.com/browser/dom/media/mediacontrol/tests/browser/file_audiosessiontype_audible.html";
const BLANK_URL = "about:blank";
const VIDEO_ID = "audible_video";

const OVERRIDES = [
  "playback",
  "play-and-record",
  "transient-solo",
  "transient",
  "ambient",
];

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.audio_session.enabled", true],
      ["media.autoplay.default", 0],
      ["media.autoplay.blocking_policy", 0],
      ["media.mediacontrol.testingevents.enabled", true],
    ],
  });
});

// With a single audible controllable source, every override propagates and
// `auto` reset falls back to the source-derived type.
add_task(async function test_override_iterates_all_types() {
  const tab = await createLoadedTabWrapper(AUDIBLE_URL);
  const controller = tab.linkedBrowser.browsingContext.mediaController;
  await playMedia(tab, VIDEO_ID);
  await waitForEffectiveAudioSessionType(controller, "playback");

  for (const override of OVERRIDES) {
    info(`set audioSession.type = '${override}'`);
    await setContentAudioSessionType(tab.linkedBrowser, override);
    await waitForEffectiveAudioSessionType(controller, override);
    is(
      controller.effectiveAudioSessionType,
      override,
      `override '${override}' drives the surface`
    );

    info(`'auto' falls back to the source-derived Playback`);
    await setContentAudioSessionType(tab.linkedBrowser, "auto");
    await waitForEffectiveAudioSessionType(controller, "playback");
    is(
      controller.effectiveAudioSessionType,
      "playback",
      `auto-reset after '${override}' restores the source-derived type`
    );
  }

  await tab.close();
});

// An uncontrollable-only audible BC also propagates an override.
add_task(async function test_uncontrollable_only_bc_drives_type() {
  const tab = await createLoadedTabWrapper(BLANK_URL, {
    needCheck: false,
  });
  const controller = tab.linkedBrowser.browsingContext.mediaController;

  info(`start an oscillator-driven AudioContext (uncontrollable)`);
  const audibleChange = new Promise(r => (controller.onaudiblechange = r));
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    content.ac = new content.AudioContext();
    const osc = content.ac.createOscillator();
    osc.connect(content.ac.destination);
    osc.start();
    if (content.ac.state !== "running") {
      await content.ac.resume();
    }
  });
  await audibleChange;

  await setContentAudioSessionType(tab.linkedBrowser, "playback");
  await waitForEffectiveAudioSessionType(controller, "playback");
  is(
    controller.effectiveAudioSessionType,
    "playback",
    "uncontrollable-only BC still drives effectiveAudioSessionType"
  );

  await tab.close();
});

// An override stored on a BC that is not yet audible takes effect once the
// BC becomes audible.
add_task(async function test_override_before_play_applies_when_audible() {
  const tab = await createLoadedTabWrapper(AUDIBLE_URL);
  const controller = tab.linkedBrowser.browsingContext.mediaController;

  info(`set the override while the BC has no audible source`);
  await setContentAudioSessionType(tab.linkedBrowser, "playback");
  is(
    controller.effectiveAudioSessionType,
    "auto",
    "no audible BC yet; reader returns auto"
  );

  info(`start the media; the stored override now applies`);
  await playMedia(tab, VIDEO_ID);
  await waitForEffectiveAudioSessionType(controller, "playback");
  is(
    controller.effectiveAudioSessionType,
    "playback",
    "stored override applies once the BC becomes audible"
  );

  await tab.close();
});
