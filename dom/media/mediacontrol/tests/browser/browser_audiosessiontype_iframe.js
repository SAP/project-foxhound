/**
 * A cross-origin iframe setting `navigator.audioSession.type` must reach the
 * top-level tab's MediaController, and the resulting effective type for the
 * tab must match the spec selection over both the main frame and the iframe.
 *
 * Setup: main frame plays a Playback video, iframe plays an audible video.
 *   - Iframe sets an exclusive override (playback / play-and-record /
 *     transient-solo) -> iframe is the most-recent audible exclusive BC, so
 *     selection picks the iframe's override.
 *   - Iframe sets a non-exclusive override (transient / ambient) -> iframe
 *     drops out of spec selection; main frame's Playback still wins.
 */
"use strict";

const TOP_URL =
  "https://example.com/browser/dom/media/mediacontrol/tests/browser/file_audiosessiontype_audible.html";
const IFRAME_URL =
  "https://example.org/browser/dom/media/mediacontrol/tests/browser/file_audiosessiontype_iframe.html";
const TOP_VIDEO_ID = "audible_video";
const IFRAME_VIDEO_ID = "iframe_video";

const EXCLUSIVE_OVERRIDES = ["playback", "play-and-record", "transient-solo"];
const NON_EXCLUSIVE_OVERRIDES = ["transient", "ambient"];

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

async function setIframeOverride(iframeBC, type) {
  await SpecialPowers.spawn(iframeBC, [type], async t => {
    content.wrappedJSObject.setIframeAudioSessionType(t);
  });
}

add_task(async function test_iframe_override_drives_effective_type() {
  info(`open the top-level page and start a controllable video`);
  const tab = await createLoadedTabWrapper(TOP_URL);
  const controller = tab.linkedBrowser.browsingContext.mediaController;
  await playMedia(tab, TOP_VIDEO_ID);
  await waitForEffectiveAudioSessionType(controller, "playback");

  info(`inject a cross-origin iframe and start its audible video`);
  await SpecialPowers.spawn(tab.linkedBrowser, [IFRAME_URL], async url => {
    const iframe = content.document.createElement("iframe");
    iframe.src = url;
    content.document.body.appendChild(iframe);
    await new Promise(r => (iframe.onload = r));
  });
  const iframeBC = tab.linkedBrowser.browsingContext.children[0];
  await SpecialPowers.spawn(iframeBC, [IFRAME_VIDEO_ID], async id => {
    const video = content.document.getElementById(id);
    await video.play();
  });

  for (const override of EXCLUSIVE_OVERRIDES) {
    info(`iframe sets '${override}'; selection should pick the iframe`);
    await setIframeOverride(iframeBC, override);
    await waitForEffectiveAudioSessionType(controller, override);
    is(
      controller.effectiveAudioSessionType,
      override,
      `iframe override '${override}' drives the tab's effective type`
    );
  }

  for (const override of NON_EXCLUSIVE_OVERRIDES) {
    info(
      `iframe sets '${override}'; non-exclusive iframe override loses to main frame's Playback`
    );
    await setIframeOverride(iframeBC, override);
    await waitForEffectiveAudioSessionType(controller, "playback");
    is(
      controller.effectiveAudioSessionType,
      "playback",
      `iframe override '${override}' does not displace main frame's exclusive Playback`
    );
  }

  await tab.close();
});
