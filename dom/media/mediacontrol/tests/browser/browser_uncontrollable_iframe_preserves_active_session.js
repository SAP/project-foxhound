/**
 * Test that an audible source outside the media-control lifecycle running in
 * a cross-origin iframe does not displace the top-level page's active media
 * session.
 *
 * The top-level page on example.com plays an HTMLMediaElement and declares a
 * named MediaSession so its session becomes the active in-tab session.
 * Pausing the parent media silences the lifecycle participant but keeps the
 * session active. A cross-origin example.org iframe then starts an audible
 * source that does not participate in the media-control lifecycle. The same
 * scenario is exercised once per source kind (Web Audio oscillator and Web
 * Speech fake-synth utterance).
 */

const PARENT_URL =
  "https://example.com/browser/dom/media/mediacontrol/tests/browser/file_named_media_session.html";
const PARENT_VIDEO_ID = "parent_video";
const METADATA = {
  title: "Parent Named Session",
  artist: "Parent Named Session",
  album: "Parent Named Session",
  artwork: [{ src: "parent.png", sizes: "128x128", type: "image/png" }],
};

const SOURCES = [
  {
    id: "webaudio",
    iframeUrl:
      "https://example.org/browser/dom/media/mediacontrol/tests/browser/file_audiocontext_iframe.html",
    startInIframe: iframeBC =>
      SpecialPowers.spawn(iframeBC, [], async () => {
        await content.wrappedJSObject.waitForAudioContextState("running");
      }),
  },
  {
    id: "webspeech",
    iframeUrl:
      "https://example.org/browser/dom/media/mediacontrol/tests/browser/file_speech_iframe.html",
    startInIframe: iframeBC =>
      SpecialPowers.spawn(iframeBC, [], async () => {
        await content.wrappedJSObject.startSpeech();
      }),
  },
];

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["media.autoplay.default", 0],
      ["media.autoplay.blocking_policy", 0],
      ["media.mediacontrol.testingevents.enabled", true],
      ["media.webspeech.synth.enabled", true],
    ],
  });
});

for (const source of SOURCES) {
  const taskName = `test_${source.id}_iframe_preserves_active_session`;
  add_task(
    {
      async [taskName]() {
        await runActiveSessionStabilityTest(source);
      },
    }[taskName]
  );
}

async function runActiveSessionStabilityTest(source) {
  info(`open the parent page`);
  const tab = await createLoadedTabWrapper(PARENT_URL);
  const controller = tab.linkedBrowser.browsingContext.mediaController;

  info(`start the parent's controllable media`);
  await playMedia(tab, PARENT_VIDEO_ID);

  info(`set metadata in the main frame`);
  await setNamedMediaSession(tab, METADATA);

  info(`active in-tab metadata should be the parent's named session`);
  isCurrentMetadataEqualTo(METADATA);

  info(`pause the parent media and wait for audiblechange`);
  const audibleChangeOnPause = new Promise(
    r => (controller.onaudiblechange = r)
  );
  await pauseMedia(tab, PARENT_VIDEO_ID);
  await audibleChangeOnPause;

  info(`active metadata is unchanged after pausing the parent media`);
  isCurrentMetadataEqualTo(METADATA);

  info(`inject a cross-origin ${source.id} iframe`);
  const audibleChangeOnIframe = new Promise(
    r => (controller.onaudiblechange = r)
  );
  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [source.iframeUrl],
    async url => {
      await content.wrappedJSObject.appendCrossOriginIframe(url);
    }
  );

  info(`wait until the iframe's audible source is running`);
  const iframeBC = tab.linkedBrowser.browsingContext.children[0];
  await source.startInIframe(iframeBC);
  await audibleChangeOnIframe;

  info(`active metadata is unchanged after the audible iframe appears`);
  isCurrentMetadataEqualTo(METADATA);

  await tab.close();
}

function setNamedMediaSession(tab, metadata) {
  const controller = tab.linkedBrowser.browsingContext.mediaController;
  const metadatachange = new Promise(r => (controller.onmetadatachange = r));
  return Promise.all([
    metadatachange,
    SpecialPowers.spawn(tab.linkedBrowser, [metadata], data => {
      content.navigator.mediaSession.metadata = new content.MediaMetadata(data);
    }),
  ]);
}
