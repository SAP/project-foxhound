/**
 * After a top-level or iframe navigation, the new document starts with
 * fresh AudioSession state: the previous document's override no longer
 * contributes to `MediaController.effectiveAudioSessionType`.
 */
"use strict";

const DOC_AUDIBLE_URL =
  "https://example.com/browser/dom/media/mediacontrol/tests/browser/file_audiosessiontype_audible.html";
const DOC_NEXT_URL = DOC_AUDIBLE_URL + "?doc2";
const IFRAME_URL =
  "https://example.org/browser/dom/media/mediacontrol/tests/browser/file_audiosessiontype_iframe.html";
const IFRAME_NEXT_URL = IFRAME_URL + "?next";
const VIDEO_ID = "audible_video";
const IFRAME_VIDEO_ID = "iframe_video";

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

add_task(async function test_top_nav_starts_with_fresh_state() {
  for (const override of OVERRIDES) {
    info(`open Doc1 and play the video`);
    const tab = await createLoadedTabWrapper(DOC_AUDIBLE_URL, {
      needCheck: false,
    });
    let controller = tab.linkedBrowser.browsingContext.mediaController;
    await playMedia(tab, VIDEO_ID);
    await waitForEffectiveAudioSessionType(controller, "playback");

    info(`set audiosession.type='${override}'`);
    await setContentAudioSessionType(tab.linkedBrowser, override);
    await waitForEffectiveAudioSessionType(controller, override);

    info(`navigate to a new page`);
    BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, DOC_NEXT_URL);
    await BrowserTestUtils.browserLoaded(
      tab.linkedBrowser,
      false,
      DOC_NEXT_URL
    );
    controller = tab.linkedBrowser.browsingContext.mediaController;

    info(`fresh document should have default type`);
    await waitForEffectiveAudioSessionType(controller, "auto");
    is(
      controller.effectiveAudioSessionType,
      "auto",
      `Doc2 starts with fresh state; '${override}' did not survive`
    );

    await tab.close();
  }
});

add_task(async function test_iframe_nav_starts_with_fresh_state() {
  info(`open the top-level page (no main-frame video)`);
  const tab = await createLoadedTabWrapper(DOC_AUDIBLE_URL, {
    needCheck: false,
  });
  const controller = tab.linkedBrowser.browsingContext.mediaController;

  info(`inject a cross-origin iframe`);
  await SpecialPowers.spawn(tab.linkedBrowser, [IFRAME_URL], async url => {
    const iframe = content.document.createElement("iframe");
    iframe.id = "audiosession-iframe";
    iframe.src = url;
    content.document.body.appendChild(iframe);
    await new Promise(r => (iframe.onload = r));
  });

  for (let i = 0; i < OVERRIDES.length; i++) {
    const override = OVERRIDES[i];
    const iframeBC = tab.linkedBrowser.browsingContext.children[0];
    await SpecialPowers.spawn(iframeBC, [IFRAME_VIDEO_ID], async id => {
      const video = content.document.getElementById(id);
      await video.play();
    });

    info(`iframe set '${override}'`);
    await SpecialPowers.spawn(iframeBC, [override], type => {
      content.wrappedJSObject.setIframeAudioSessionType(type);
    });
    await waitForEffectiveAudioSessionType(controller, override);

    info(`navigate iframe to a fresh document`);
    const nextUrl = `${IFRAME_NEXT_URL}=${i}`;
    await SpecialPowers.spawn(tab.linkedBrowser, [nextUrl], async url => {
      const iframe = content.document.getElementById("audiosession-iframe");
      const loaded = new Promise(r => (iframe.onload = r));
      iframe.src = url;
      await loaded;
    });

    info(`session type should be reset`);
    await waitForEffectiveAudioSessionType(controller, "auto");
    is(
      controller.effectiveAudioSessionType,
      "auto",
      `iframe nav after override '${override}' starts fresh`
    );
  }

  await tab.close();
});
