/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_ROOT = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content/",
  "https://example.com/"
);
const TEST_PAGE = TEST_ROOT + "get_user_media.html";

const PREF_GUM_DELAY = "privacy.webrtc.preview.testGumDelayMs";

/**
 * Test that stopping preview while gUM is pending doesn't leak the stream.
 * See Bug 2007284.
 */
add_task(async function test_stop_preview_during_pending_gum() {
  const GUM_DELAY_MS = 500;
  await SpecialPowers.pushPrefEnv({
    set: [
      [PREF_PERMISSION_FAKE, true],
      [PREF_AUDIO_LOOPBACK, ""],
      [PREF_VIDEO_LOOPBACK, ""],
      [PREF_FAKE_STREAMS, true],
      [PREF_FOCUS_SOURCE, false],
      [PREF_GUM_DELAY, GUM_DELAY_MS],
    ],
  });

  await BrowserTestUtils.withNewTab(TEST_PAGE, async () => {
    let promise = promisePopupNotificationShown("webRTC-shareDevices");
    let observerPromise = expectObserverCalled("getUserMedia:request");

    await promiseRequestDevice(true, true);
    await promise;
    await observerPromise;

    let webRTCPreviewEl = document.getElementById("webRTC-preview");
    ok(BrowserTestUtils.isVisible(webRTCPreviewEl), "preview is visible");

    let videoEl = webRTCPreviewEl.shadowRoot.querySelector("video");
    ok(videoEl, "video element exists");

    let loadingIndicator =
      webRTCPreviewEl.shadowRoot.querySelector("#loading-indicator");
    let showPreviewButton = webRTCPreviewEl.shadowRoot.querySelector(
      "#show-preview-button"
    );
    let stopPreviewButton = webRTCPreviewEl.shadowRoot.querySelector(
      "#stop-preview-button"
    );

    let completePromise = BrowserTestUtils.waitForEvent(
      webRTCPreviewEl,
      "test-preview-complete"
    );

    info("Start the preview (gUM will be delayed)");
    showPreviewButton.click();

    info("Wait for gUM to be called (loading indicator visible)");
    await BrowserTestUtils.waitForCondition(
      () => BrowserTestUtils.isVisible(loadingIndicator),
      "loading indicator should be visible"
    );

    info("Stop the preview while gUM is still pending");
    stopPreviewButton.click();

    info("Wait for the delayed gUM to complete");
    let event = await completePromise;
    is(event.detail.result, "aborted", "preview was aborted");

    is(
      videoEl.srcObject,
      null,
      "video srcObject should still be null after aborted gUM completes"
    );
    ok(videoEl.paused, "video should be paused");

    info("Close permission prompt");
    observerPromise = expectObserverCalled("getUserMedia:response:deny");
    activateSecondaryAction(kActionDeny);
    await observerPromise;
  });
});

/**
 * Test that closing the popup (disconnecting the element) while gUM is pending
 * doesn't leak the stream. See Bug 2007284.
 */
add_task(async function test_close_popup_during_pending_gum() {
  const GUM_DELAY_MS = 500;
  await SpecialPowers.pushPrefEnv({
    set: [
      [PREF_PERMISSION_FAKE, true],
      [PREF_AUDIO_LOOPBACK, ""],
      [PREF_VIDEO_LOOPBACK, ""],
      [PREF_FAKE_STREAMS, true],
      [PREF_FOCUS_SOURCE, false],
      [PREF_GUM_DELAY, GUM_DELAY_MS],
    ],
  });

  await BrowserTestUtils.withNewTab(TEST_PAGE, async () => {
    let promise = promisePopupNotificationShown("webRTC-shareDevices");
    let observerPromise = expectObserverCalled("getUserMedia:request");

    await promiseRequestDevice(true, true);
    await promise;
    await observerPromise;

    let webRTCPreviewEl = document.getElementById("webRTC-preview");
    ok(BrowserTestUtils.isVisible(webRTCPreviewEl), "preview is visible");

    let videoEl = webRTCPreviewEl.shadowRoot.querySelector("video");

    let loadingIndicator =
      webRTCPreviewEl.shadowRoot.querySelector("#loading-indicator");
    let showPreviewButton = webRTCPreviewEl.shadowRoot.querySelector(
      "#show-preview-button"
    );

    let completePromise = BrowserTestUtils.waitForEvent(
      webRTCPreviewEl,
      "test-preview-complete"
    );

    info("Start the preview (gUM will be delayed)");
    showPreviewButton.click();

    info("Wait for gUM to be called (loading indicator visible)");
    await BrowserTestUtils.waitForCondition(
      () => BrowserTestUtils.isVisible(loadingIndicator),
      "loading indicator should be visible"
    );

    info("Close the popup while gUM is still pending");
    observerPromise = expectObserverCalled("getUserMedia:response:deny");
    activateSecondaryAction(kActionDeny);
    await observerPromise;

    info("Wait for the delayed gUM to complete");
    let event = await completePromise;
    is(event.detail.result, "aborted", "preview was aborted");

    is(
      videoEl.srcObject,
      null,
      "video srcObject should still be null after aborted gUM completes"
    );
  });
});
