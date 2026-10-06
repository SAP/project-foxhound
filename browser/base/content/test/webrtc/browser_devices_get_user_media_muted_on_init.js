/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test that when a MediaStreamTrack is created while globally muted and
 * off_while_disabled is false, audio flows after unmute.
 *
 * This test creates two tabs. The first one does a regular gUM, just to get the
 * global indicator. Then global muting is enabled. Then the second tab does a
 * gUM, and muting is disabled globally. At that point audio should flow.
 */

const TEST_ROOT = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content/",
  "https://example.com/"
);
const TEST_PAGE = TEST_ROOT + "get_user_media.html";

const MUTE_TOPICS = ["getUserMedia:muteAudio", "getUserMedia:unmuteAudio"];

add_setup(async function () {
  let prefs = [
    [PREF_PERMISSION_FAKE, true],
    [PREF_AUDIO_LOOPBACK, ""],
    [PREF_VIDEO_LOOPBACK, ""],
    [PREF_FAKE_STREAMS, true],
    [PREF_FOCUS_SOURCE, false],
    ["privacy.webrtc.globalMuteToggles", true],
    ["media.getusermedia.microphone.off_while_disabled.enabled", false],
  ];
  await SpecialPowers.pushPrefEnv({ set: prefs });
});

function expectMicrophoneMuteState(browser, isMuted) {
  let topic = isMuted ? "getUserMedia:muteAudio" : "getUserMedia:unmuteAudio";
  return BrowserTestUtils.contentTopicObserved(browser.browsingContext, topic);
}

/**
 * Check if audio is flowing in a stream by analyzing with Web Audio API.
 * Returns true if audio is detected at the test frequency (1000 Hz).
 */
async function checkAudioFlowing(browser) {
  return SpecialPowers.spawn(browser, [], async function () {
    const stream = content.wrappedJSObject.gStreams?.[0];
    if (!stream) {
      throw new Error("No stream available");
    }

    const audioContext = new content.AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    source.connect(analyser);

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const testFreq = 1000; // Fake audio device generates 1000 Hz tone
    const binIndex = Math.round(
      (testFreq * analyser.fftSize) / audioContext.sampleRate
    );

    // Wait up to 5 seconds for audio to be detected
    const startTime = Date.now();
    while (Date.now() - startTime < 5000) {
      analyser.getByteFrequencyData(frequencyData);
      if (frequencyData[binIndex] > 100) {
        audioContext.close();
        return true;
      }
      await new Promise(r => content.setTimeout(r, 100));
    }

    audioContext.close();
    return false;
  });
}

/**
 * Test that audio flows after unmute when device was initialized while muted
 * with off_while_disabled=false.
 */
add_task(async function test_audio_muted_on_init() {
  // First tab: establish sharing to get the indicator with mute toggle
  let tab1 = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    url: TEST_PAGE,
  });
  let browser1 = tab1.linkedBrowser;

  let indicatorPromise = promiseIndicatorWindow();

  info("Sharing microphone in first tab to get indicator");
  await shareDevices(browser1, false /* camera */, true /* microphone */);

  let indicator = await indicatorPromise;
  let doc = indicator.document;

  let microphoneMute = doc.getElementById("microphone-mute-toggle");
  Assert.ok(
    !microphoneMute.checked,
    "Microphone toggle should not start checked."
  );

  await BrowserTestUtils.startObservingTopics(
    browser1.browsingContext,
    MUTE_TOPICS
  );

  info("Muting microphone globally via indicator toggle");
  let microphoneMuted = expectMicrophoneMuteState(browser1, true);
  microphoneMute.click();
  await microphoneMuted;
  info("Microphone successfully muted globally.");

  Assert.ok(microphoneMute.checked, "Microphone toggle should now be checked.");

  // Second tab: getUserMedia while globally muted
  info("Opening second tab while globally muted");
  let tab2 = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    url: TEST_PAGE,
  });
  let browser2 = tab2.linkedBrowser;

  await BrowserTestUtils.startObservingTopics(
    browser2.browsingContext,
    MUTE_TOPICS
  );

  info("Calling getUserMedia in second tab while globally muted");
  let microphoneMuted2 = expectMicrophoneMuteState(browser2, true);
  await shareDevices(browser2, false /* camera */, true /* microphone */);
  await microphoneMuted2;
  info("Second tab's microphone is muted as expected.");

  info("Unmuting microphone globally");
  let microphoneUnmuted = Promise.all([
    expectMicrophoneMuteState(browser1, false),
    expectMicrophoneMuteState(browser2, false),
  ]);
  microphoneMute.click();
  await microphoneUnmuted;
  info("Microphone successfully unmuted globally.");

  info("Checking if audio is flowing in second tab after unmute");
  let audioFlowing = await checkAudioFlowing(browser2);
  Assert.ok(audioFlowing, "Audio should be flowing after unmute");

  await BrowserTestUtils.stopObservingTopics(
    browser1.browsingContext,
    MUTE_TOPICS
  );

  await BrowserTestUtils.stopObservingTopics(
    browser2.browsingContext,
    MUTE_TOPICS
  );

  BrowserTestUtils.removeTab(tab2);
  BrowserTestUtils.removeTab(tab1);
});
