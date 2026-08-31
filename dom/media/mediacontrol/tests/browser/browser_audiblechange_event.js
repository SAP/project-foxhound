// Verify that the MediaController onaudiblechange event fires when different
// types of audio sources (HTMLMediaElement, Web Audio, Web Speech) start and
// stop producing sound in a tab.

const PAGE =
  "https://example.com/browser/dom/media/mediacontrol/tests/browser/file_non_autoplay.html";

const testVideoId = "video";

add_task(async function setupTestingPref() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["media.mediacontrol.testingevents.enabled", true],
      ["dom.audiocontext.testing", true],
      ["media.webspeech.synth.enabled", true],
    ],
  });
});

/**
 * Assert that onaudiblechange fires in the expected sequence:
 *   1. call startFn() -> controller becomes audible
 *   2. call stopFn()  -> controller becomes inaudible
 */
async function testAudibleChangeSequence(tab, startFn, stopFn) {
  const controller = tab.linkedBrowser.browsingContext.mediaController;
  ok(!controller.isAudible, "controller starts inaudible");

  const audiblePromise = new Promise(resolve => {
    controller.addEventListener("audiblechange", resolve, { once: true });
  });
  await startFn();
  await audiblePromise;
  ok(true, "controller became audible after source starts");

  const inaudiblePromise = new Promise(resolve => {
    if (!controller.isAudible) {
      resolve();
      return;
    }
    controller.addEventListener("audiblechange", function handler() {
      if (!controller.isAudible) {
        controller.removeEventListener("audiblechange", handler);
        resolve();
      }
    });
  });
  await stopFn();
  await inaudiblePromise;
  ok(!controller.isAudible, "controller is inaudible after source stops");
}

add_task(async function testAudibleChangeEventFiredForMediaElement() {
  info("open media page");
  const tab = await createLoadedTabWrapper(PAGE);

  await testAudibleChangeSequence(
    tab,
    () =>
      SpecialPowers.spawn(tab.linkedBrowser, [testVideoId], async id => {
        await content.document.getElementById(id).play();
      }),
    () =>
      SpecialPowers.spawn(tab.linkedBrowser, [testVideoId], async id => {
        content.document.getElementById(id).pause();
      })
  );

  await tab.close();
});

add_task(async function testAudibleChangeEventFiredForWebAudio() {
  info("open a tab");
  const tab = await createLoadedTabWrapper(PAGE, { needCheck: false });

  await testAudibleChangeSequence(
    tab,
    () =>
      SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
        content.ac = new content.AudioContext();
        const oscillator = content.ac.createOscillator();
        oscillator.connect(content.ac.destination);
        oscillator.start();
        if (content.ac.state !== "running") {
          await content.ac.resume();
        }
      }),
    () =>
      SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
        await content.ac.close();
      })
  );

  await tab.close();
});

add_task(async function testAudibleChangeEventFiredForWebSpeech() {
  info("open a tab");
  const tab = await createLoadedTabWrapper(PAGE, { needCheck: false });

  await testAudibleChangeSequence(
    tab,
    () =>
      SpecialPowers.spawn(tab.linkedBrowser, [], () => {
        const utterance = new content.SpeechSynthesisUtterance("audible test");
        // Pin to the test fake-synth voice that fires "start" but never
        // auto-fires "end" (eSuppressEnd in nsFakeSynthServices.cpp). This
        // keeps the utterance reliably audible across all platforms — the
        // default voices on some CI runners either fire start+end back-to-back
        // (FakeSynth's default) or never fire start at all.
        utterance.lang = "it-IT-noend";
        content.speechSynthesis.speak(utterance);
      }),
    () =>
      SpecialPowers.spawn(tab.linkedBrowser, [], () => {
        content.speechSynthesis.cancel();
      })
  );

  await tab.close();
});
