/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_ROOT = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content/",
  "https://example.com/"
);
const TEST_PAGE = TEST_ROOT + "get_user_media.html";

/**
 * Run a preview test with the given options.
 *
 * @param {object} options
 * @param {boolean} options.requestCamera - Whether to request camera
 * @param {boolean} options.requestMicrophone - Whether to request microphone
 * @param {boolean} options.expectCameraPreview - Whether to expect camera
 * preview to be shown.
 * @param {boolean} [options.withUserActivation=false] - Whether to simulate
 * user activation when requesting media.
 * @returns {Promise<void>} A promise that resolves when the test is complete.
 */
async function runPreviewTest({
  requestCamera,
  requestMicrophone,
  expectCameraPreview,
  withUserActivation = false,
}) {
  await SpecialPowers.pushPrefEnv({
    set: [
      [PREF_PERMISSION_FAKE, true],
      [PREF_AUDIO_LOOPBACK, ""],
      [PREF_VIDEO_LOOPBACK, ""],
      [PREF_FAKE_STREAMS, true],
      [PREF_FOCUS_SOURCE, false],
    ],
  });

  await BrowserTestUtils.withNewTab(TEST_PAGE, async () => {
    let promise = promisePopupNotificationShown("webRTC-shareDevices");
    let observerPromise = expectObserverCalled("getUserMedia:request");

    await promiseRequestDevice(
      requestMicrophone,
      requestCamera,
      undefined,
      false,
      undefined,
      false,
      withUserActivation
    );
    await promise;
    await observerPromise;

    let videoEmptiedPromise;
    let videoEl;

    let webRTCPreviewEl = document.getElementById("webRTC-preview");
    if (expectCameraPreview) {
      ok(BrowserTestUtils.isVisible(webRTCPreviewEl), "preview is visible");

      // The video element where the preview will be played in.
      videoEl = webRTCPreviewEl.shadowRoot.querySelector("video");
      ok(videoEl, "video element is visible");

      // Wait for the preview video to start, either automatically or after
      // button click.
      let videoPlayPromise = BrowserTestUtils.waitForEvent(videoEl, "play");

      // The button that starts the preview.
      let showPreviewButton = webRTCPreviewEl.shadowRoot.querySelector(
        "#show-preview-button"
      );
      // The button that stops the preview.
      let stopPreviewButton = webRTCPreviewEl.shadowRoot.querySelector(
        "#stop-preview-button"
      );

      if (withUserActivation) {
        info(
          "Video preview should start automatically since we requested camera with user activation."
        );
      } else {
        info(
          "No auto preview because we don't have user activation. Start the preview manually."
        );

        ok(
          BrowserTestUtils.isVisible(showPreviewButton),
          "show preview button is visible"
        );

        ok(
          !BrowserTestUtils.isVisible(stopPreviewButton),
          "stop preview button is not visible"
        );

        info(
          "Check the preview is not playing when the permission prompt is shown"
        );
        ok(videoEl.paused, "video is not playing");
        is(videoEl.srcObject, null, "video srcObject is null");

        info("Start the preview");
        showPreviewButton.click();
      }

      info("Wait for the preview video to start playing.");
      await videoPlayPromise;

      ok(!videoEl.paused, "video is playing");
      ok(videoEl.srcObject, "video srcObject is not null");

      ok(
        !BrowserTestUtils.isVisible(showPreviewButton),
        "show preview button is not visible"
      );
      ok(
        BrowserTestUtils.isVisible(stopPreviewButton),
        "stop preview button is visible"
      );

      info("Stop the preview");
      videoEmptiedPromise = BrowserTestUtils.waitForEvent(videoEl, "emptied");
      stopPreviewButton.click();
      await videoEmptiedPromise;

      ok(videoEl.paused, "video is paused");
      is(videoEl.srcObject, null, "video srcObject is null");

      info(
        "Start the preview again then close the permission prompt to ensure the preview is properly cleaned up."
      );
      videoPlayPromise = BrowserTestUtils.waitForEvent(videoEl, "play");
      showPreviewButton.click();
      await videoPlayPromise;

      ok(!videoEl.paused, "video is playing");
      ok(videoEl.srcObject, "video srcObject is not null");

      videoEmptiedPromise = BrowserTestUtils.waitForEvent(videoEl, "emptied");
    } else {
      // expectCameraPreview is false, so the preview should not be visible
      ok(
        webRTCPreviewEl == null || !BrowserTestUtils.isVisible(webRTCPreviewEl),
        "preview is not visible"
      );
    }

    info("Close permission prompt");
    observerPromise = expectObserverCalled("getUserMedia:response:deny");
    activateSecondaryAction(kActionDeny);
    await observerPromise;

    if (expectCameraPreview) {
      await videoEmptiedPromise;
      ok(videoEl.paused, "video is paused");
      is(videoEl.srcObject, null, "video srcObject is null");
    }
  });
}

add_task(async function test_camera_preview_camera_only() {
  await runPreviewTest({
    requestCamera: true,
    requestMicrophone: false,
    expectCameraPreview: true,
  });
});

add_task(async function test_camera_preview_camera_only_preview_autostart() {
  await runPreviewTest({
    requestCamera: true,
    requestMicrophone: false,
    expectCameraPreview: true,
    withUserActivation: true,
  });
});

add_task(async function test_camera_preview_camera_and_microphone() {
  await runPreviewTest({
    requestCamera: true,
    requestMicrophone: true,
    expectCameraPreview: true,
  });
});

add_task(async function test_no_camera_preview_for_only_microphone() {
  await runPreviewTest({
    requestCamera: false,
    requestMicrophone: true,
    expectCameraPreview: false,
  });
});
