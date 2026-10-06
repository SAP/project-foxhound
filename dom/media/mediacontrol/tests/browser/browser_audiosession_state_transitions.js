/**
 * `audioSession.state` reflects whether the page is currently producing
 * audio, and `statechange` events fire on every transition. Verified across
 * each audible source the spec recognises, and across iframe scenarios
 * (both same-origin and cross-origin) where a sibling page opts into an
 * exclusive type.
 */
"use strict";

const TOP_URL = GetTestWebBasedURL("file_audiosessiontype_audible.html");
const TOP_VIDEO_ID = "audible_video";
const IFRAME_VIDEO_ID = "iframe_video";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.audio_session.enabled", true],
      ["dom.audio_session.state_enabled", true],
      ["media.mediacontrol.testingevents.enabled", true],
      ["media.webspeech.synth.test", true],
    ],
  });
});

// `audioSession.state` cycles `inactive` -> `active` -> `inactive` as the
// page starts and stops producing audio, for every audible source type.
add_task(async function test_state_follows_audibility() {
  for (const source of SOURCES) {
    info(`source: ${source.name}`);
    const tab = await createLoadedTabWrapper(TOP_URL, { needCheck: false });
    const topBrowser = tab.linkedBrowser;

    is(
      await getAudioSessionState(topBrowser),
      "inactive",
      `${source.name}: initial state is inactive`
    );

    await source.start(tab);
    await waitForAudioSessionState(topBrowser, "active");

    await source.stop(tab);
    await waitForAudioSessionState(topBrowser, "inactive");

    await tab.close();
  }
});

// When an iframe (same-origin or cross-origin) sets an exclusive
// `audioSession.type` while the top-level page is also producing audible
// audio, the top-level page's `audioSession.state` flips to `inactive`
// only if its own session was exclusive. A non-exclusive top-level
// session keeps its `active` state — per spec §5.4 step 5.3 the cascade
// loop aborts for sessions whose computed type is not exclusive
// (https://w3c.github.io/audio-session/#update-all-audiosession-states).
add_task(async function test_state_after_iframe_takes_exclusive_slot() {
  for (const source of SOURCES) {
    for (const iframe of IFRAME_VARIANTS) {
      info(`top-level: ${source.name}, iframe: ${iframe.name}`);
      const tab = await createLoadedTabWrapper(TOP_URL, { needCheck: false });
      const topBrowser = tab.linkedBrowser;
      const controller = topBrowser.browsingContext.mediaController;

      await source.start(tab);
      await waitForAudioSessionState(topBrowser, "active");

      info(`inject a ${iframe.name} iframe playing an audible video`);
      const iframeUrl = GetTestWebBasedURL(
        "file_audiosessiontype_iframe.html",
        {
          crossOrigin: iframe.crossOrigin,
        }
      );
      await SpecialPowers.spawn(topBrowser, [iframeUrl], async url => {
        const iframeEl = content.document.createElement("iframe");
        iframeEl.src = url;
        content.document.body.appendChild(iframeEl);
        await new Promise(r => (iframeEl.onload = r));
      });
      const iframeBC = topBrowser.browsingContext.children[0];
      await SpecialPowers.spawn(iframeBC, [IFRAME_VIDEO_ID], async id => {
        const video = content.document.getElementById(id);
        await video.play();
      });
      await waitForAudioSessionState(iframeBC, "active");

      // Any exclusive type (`playback`, `play-and-record`, `transient-solo`)
      // triggers the same §5.4 cascade. We pick `transient-solo` because it
      // is distinct from `playback`, the default for the iframe's video
      // source, so the effective-type transition makes the override visible.
      info(`iframe opts into transient-solo`);
      await Promise.all([
        waitForEffectiveAudioSessionType(controller, "transient-solo"),
        SpecialPowers.spawn(iframeBC, ["transient-solo"], async t => {
          content.wrappedJSObject.setIframeAudioSessionType(t);
        }),
      ]);

      if (source.exclusive) {
        await waitForAudioSessionState(topBrowser, "inactive");
      }
      is(
        await getAudioSessionState(topBrowser),
        source.exclusive ? "inactive" : "active",
        `${source.name}/${iframe.name}: top-level audioSession.state after iframe override`
      );
      is(
        await getAudioSessionState(iframeBC),
        "active",
        `${source.name}/${iframe.name}: iframe audioSession.state remains active`
      );

      await tab.close();
    }
  }
});

// below are helper functions.

const SOURCES = [
  {
    name: "HTMLMediaElement",
    exclusive: true,
    start: tab => playMedia(tab, TOP_VIDEO_ID),
    stop: tab => pauseMedia(tab, TOP_VIDEO_ID),
  },
  {
    name: "Web Audio",
    exclusive: false,
    start: tab =>
      SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
        content.ac = new content.AudioContext();
        const osc = content.ac.createOscillator();
        osc.connect(content.ac.destination);
        osc.start();
        if (content.ac.state !== "running") {
          await content.ac.resume();
        }
      }),
    stop: tab =>
      SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
        await content.ac.close();
      }),
  },
  {
    name: "Web Speech",
    exclusive: false,
    start: tab =>
      SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
        await content.wrappedJSObject.startSpeech();
      }),
    stop: tab =>
      SpecialPowers.spawn(tab.linkedBrowser, [], () => {
        content.wrappedJSObject.cancelSpeech();
      }),
  },
];

const IFRAME_VARIANTS = [
  { name: "same-origin", crossOrigin: false },
  { name: "cross-origin", crossOrigin: true },
];

function getAudioSessionState(browser) {
  return SpecialPowers.spawn(browser, [], () => {
    return content.navigator.audioSession.state;
  });
}

async function waitForAudioSessionState(browser, expected) {
  await SpecialPowers.spawn(browser, [expected], async expected => {
    const session = content.navigator.audioSession;
    if (session.state === expected) {
      return;
    }
    await new Promise(resolve => {
      const listener = () => {
        if (session.state === expected) {
          session.removeEventListener("statechange", listener);
          resolve();
        }
      };
      session.addEventListener("statechange", listener);
    });
  });
}
