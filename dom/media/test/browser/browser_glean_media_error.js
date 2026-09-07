"use strict";

/**
 * This test is used to ensure that Glean probe 'media::error' and
 * 'mediaPlayback::decodeError` can be recorded correctly.
 */

const testCases = [
  // Will fail on reading metadata
  {
    fileName: "bogus.wav",
    mediaError: {
      key: "not_supported_error",
      category: "non_encrypted",
    },
  },
  {
    fileName: "404.webm",
    mediaError: {
      key: "not_supported_error",
      category: "non_encrypted",
    },
  },
  // Failed with the key system
  {
    fileName: "404.mp4",
    mediaError: {
      key: "not_supported_error",
      category: "encrypted",
      key_system: "org.w3.clearkey",
    },
  },
  // Failed during decoding
  {
    fileName: "decode_error_vp9.webm",
    mediaError: {
      key: "decode_error",
      category: "non_encrypted",
    },
    decodeError: {
      codec: "video_vp9",
      error: "decode_err",
      probe: "unencryptedSwDecodeError",
    },
  },
];

add_task(async function testGleanMediaErrorProbe() {
  const tab = await openTab();
  for (let test of testCases) {
    // always reset FOG to clean up all previous probes
    Services.fog.testResetFOG();

    info(`running test for '${test.fileName}'`);
    await PlayMediaAndWaitForError(tab, test);

    info(`waiting until glean probe is ready on the parent process`);
    await Services.fog.testFlushAllChildren();

    info(`checking the collected results for '${test.fileName}'`);
    await CheckMediaErrorProbe(test.mediaError);
    if (test.decodeError !== undefined) {
      await CheckDecodeErrorProbe(test.decodeError);
    }
  }
  BrowserTestUtils.removeTab(tab);
});

// Following are helper functions
async function PlayMediaAndWaitForError(tab, testInfo) {
  await SpecialPowers.spawn(tab.linkedBrowser, [testInfo], async testInfo => {
    const video = content.document.createElement("video");
    if (testInfo.mediaError.key_system) {
      let keySystemAccess = await content.navigator.requestMediaKeySystemAccess(
        testInfo.mediaError.key_system,
        [{ "": [{ "": "" }] }]
      );
      let mediaKeys = await keySystemAccess.createMediaKeys();
      await video.setMediaKeys(mediaKeys);
    }
    video.src = testInfo.fileName;
    video.play();
    info(`waiting for an error`);
    ok(
      await new Promise(r => (video.onerror = r)).then(
        _ => true,
        _ => false
      ),
      "Got a media error"
    );
  });
}

async function CheckMediaErrorProbe(expected) {
  const count = Glean.media.error
    .get(expected.key, expected.category)
    .testGetValue();
  Assert.greater(
    count,
    0,
    `media.error[${expected.key},${expected.category}] was recorded`
  );
}

async function CheckDecodeErrorProbe(expected) {
  const count = Glean.mediaPlayback[expected.probe]
    .get(expected.codec, expected.error)
    .testGetValue();
  Assert.greater(
    count,
    0,
    `media.playback.${expected.probe}[${expected.codec},${expected.error}] was recorded`
  );
}
