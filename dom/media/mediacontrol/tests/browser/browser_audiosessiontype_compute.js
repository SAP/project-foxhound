/**
 * Without any user-set override, MediaController.effectiveAudioSessionType
 * should reflect the spec selection over the tab's audible sources:
 *
 *   HTMLMediaElement contributes `Playback`     (exclusive).
 *   Web Speech       contributes `Transient`    (not exclusive).
 *   AudioContext     contributes `Ambient`      (not exclusive).
 *
 * Scenarios (start with a lower-priority source, override with a
 * higher-priority source, stop the higher one to observe the fallback):
 *   1. Start an AudioContext (Ambient)       -> Ambient.
 *   2. Add Web Speech (Transient)            -> Transient wins the
 *                                                non-exclusive fallback.
 *   3. Play the <video> (Playback, exclusive)-> Playback wins selection.
 *   4. Stop the <video>                      -> selection releases;
 *                                                fallback returns to
 *                                                Transient.
 *   5. Cancel Web Speech                     -> fallback returns to Ambient.
 */
"use strict";

const PAGE =
  "https://example.com/browser/dom/media/mediacontrol/tests/browser/file_audiosessiontype_audible.html";
const VIDEO_ID = "audible_video";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.audio_session.enabled", true],
      ["media.autoplay.default", 0],
      ["media.autoplay.blocking_policy", 0],
      ["media.mediacontrol.testingevents.enabled", true],
      ["media.webspeech.synth.test", true],
    ],
  });
});

add_task(async function test_priority_walk_no_override() {
  info(`open the page`);
  const tab = await createLoadedTabWrapper(PAGE, { needCheck: false });
  const controller = tab.linkedBrowser.browsingContext.mediaController;

  info(`start an AudioContext oscillator (Ambient)`);
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    content.ac = new content.AudioContext();
    const osc = content.ac.createOscillator();
    osc.connect(content.ac.destination);
    osc.start();
    if (content.ac.state !== "running") {
      await content.ac.resume();
    }
  });
  await waitForEffectiveAudioSessionType(controller, "ambient");
  is(controller.effectiveAudioSessionType, "ambient", "ambient alone");

  info(`add Web Speech (Transient); fallback picks Transient over Ambient`);
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    await content.wrappedJSObject.startSpeech();
  });
  await waitForEffectiveAudioSessionType(controller, "transient");
  is(
    controller.effectiveAudioSessionType,
    "transient",
    "transient beats ambient in the non-exclusive fallback"
  );

  info(`play <video> (Playback, exclusive); selection picks it`);
  await playMedia(tab, VIDEO_ID);
  await waitForEffectiveAudioSessionType(controller, "playback");
  is(
    controller.effectiveAudioSessionType,
    "playback",
    "exclusive Playback wins selection"
  );

  info(`stop the <video>; fallback returns to Transient`);
  await pauseMedia(tab, VIDEO_ID);
  await waitForEffectiveAudioSessionType(controller, "transient");
  is(
    controller.effectiveAudioSessionType,
    "transient",
    "fallback drops to transient once Playback is gone"
  );

  info(`cancel Web Speech; fallback returns to Ambient`);
  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    content.wrappedJSObject.cancelSpeech();
  });
  await waitForEffectiveAudioSessionType(controller, "ambient");
  is(
    controller.effectiveAudioSessionType,
    "ambient",
    "fallback drops to ambient once Transient is gone"
  );

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    await content.ac.close();
  });

  await tab.close();
});
