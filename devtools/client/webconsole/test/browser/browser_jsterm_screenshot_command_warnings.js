/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Test that screenshot command leads to the proper warning and error messages in the
// console when necessary.

"use strict";
const STRINGS_URI = "devtools/shared/locales/screenshot.properties";
const L10N = new LocalizationHelper(STRINGS_URI);

// The test times out on slow platforms (e.g. linux ccov)
requestLongerTimeout(2);

const { MAX_CAPTURE_DIMENSION, MAX_CAPTURE_AREA } = ChromeUtils.importESModule(
  "moz-src:///browser/components/screenshots/ScreenshotsUtils.sys.mjs"
);

// Calculate test dimensions that will trigger area cropping.
// Using the same algorithm as ScreenshotsUtils.cropScreenshotRectIfNeeded:
// 1. Clamp width to MAX_CAPTURE_DIMENSION
// 2. Clamp height to MAX_CAPTURE_DIMENSION
// 3. If area still exceeds MAX_CAPTURE_AREA, crop height to Math.floor(MAX_CAPTURE_AREA / width)
const maxSquareDimension = Math.floor(Math.sqrt(MAX_CAPTURE_AREA));
const squareDimensionTooLarge = maxSquareDimension + 50;
// After cropping, height will be: Math.floor(MAX_CAPTURE_AREA / squareDimensionTooLarge)
const expectedCroppedHeight = Math.floor(
  MAX_CAPTURE_AREA / squareDimensionTooLarge
);

const TEST_URI_HORIZONTAL = `data:text/html;charset=utf8,<!DOCTYPE html>
   <style>
     body { margin:0; }
    .big-dim { width:${MAX_CAPTURE_DIMENSION + 1}px; height:10px; }
   </style>
  <div class="big-dim"></div>`;
const TEST_URI_VERTICAL = `data:text/html;charset=utf8,<!DOCTYPE html>
   <style>
     body { margin:0; }
    .big-dim-vert { width:10px; height:${MAX_CAPTURE_DIMENSION + 1}px; }
   </style>
  <div class="big-dim-vert"></div>`;
const TEST_URI_AREA = `data:text/html;charset=utf8,<!DOCTYPE html>
   <style>
     body { margin:0; }
    .big-area { width:${squareDimensionTooLarge}px; height:${squareDimensionTooLarge}px; }
   </style>
  <div class="big-area"></div>`;

add_task(async function test_dimension_truncation_horizontal() {
  info("Check that screenshots get truncated for width dimension limits");

  await addTab(TEST_URI_HORIZONTAL);
  const hud = await openConsole();
  ok(hud, "web console opened for horizontal dimension");

  const onMessages = waitForMessagesByType({
    hud,
    messages: [
      { text: L10N.getStr("screenshotCopied"), typeSelector: ".console-api" },
      {
        text: L10N.getFormatStr(
          "screenshotTruncationWarning",
          MAX_CAPTURE_DIMENSION,
          10
        ),
        typeSelector: ".console-api",
      },
    ],
  });

  execute(hud, ":screenshot --clipboard --selector .big-dim --dpr 1");
  await onMessages;

  const { width, height } = await getImageSizeFromClipboard();
  is(
    width,
    MAX_CAPTURE_DIMENSION,
    `The resulting image is ${MAX_CAPTURE_DIMENSION}px wide`
  );
  is(height, 10, `The resulting image is 10px high`);
});

add_task(async function test_dimension_truncation_vertical() {
  info("Check that screenshots get truncated for height dimension limits");

  await addTab(TEST_URI_VERTICAL);
  const hud = await openConsole();
  ok(hud, "web console opened for vertical dimension");

  const onMessages = waitForMessagesByType({
    hud,
    messages: [
      { text: L10N.getStr("screenshotCopied"), typeSelector: ".console-api" },
      {
        text: L10N.getFormatStr(
          "screenshotTruncationWarning",
          10,
          MAX_CAPTURE_DIMENSION
        ),
        typeSelector: ".console-api",
      },
    ],
  });

  execute(hud, ":screenshot --clipboard --selector .big-dim-vert --dpr 1");
  await onMessages;

  const { width, height } = await getImageSizeFromClipboard();
  is(width, 10, `The resulting image is 10px wide`);
  is(
    height,
    MAX_CAPTURE_DIMENSION,
    `The resulting image is ${MAX_CAPTURE_DIMENSION}px high`
  );
});

add_task(async function test_area_truncation() {
  info("Check that screenshots get truncated for area limits");

  await addTab(TEST_URI_AREA);
  const hud = await openConsole();
  ok(hud, "web console opened for area");

  const onMessages = waitForMessagesByType({
    hud,
    messages: [
      {
        text: L10N.getFormatStr(
          "screenshotTruncationWarning",
          squareDimensionTooLarge,
          expectedCroppedHeight
        ),
        typeSelector: ".console-api",
      },
    ],
  });

  const onDownload = waitUntilDownload();
  execute(hud, ":screenshot --selector .big-area --dpr 1");
  const filePath = await onDownload;
  const messages = await onMessages;
  is(messages.length, 1, "Received one area truncation warning");

  const fullText = messages[0].node.textContent;
  const match = fullText.match(/cut off to (\d+)×(\d+)/);
  ok(match, "Got width and height from truncation message");

  const width = parseInt(match[1], 10);
  const height = parseInt(match[2], 10);

  is(
    width,
    squareDimensionTooLarge,
    `Width is ${squareDimensionTooLarge} (unchanged, < MAX_CAPTURE_DIMENSION)`
  );
  is(
    height,
    expectedCroppedHeight,
    `Height is cropped to ${expectedCroppedHeight} to fit within MAX_CAPTURE_AREA`
  );
  Assert.lessOrEqual(
    width * height,
    MAX_CAPTURE_AREA,
    `The resulting image area (${width}×${height}) is <= ${MAX_CAPTURE_AREA}`
  );
  await IOUtils.remove(filePath);
});

add_task(async function test_dpr_warning() {
  info("Check that DPR is reduced to 1 after failure");

  await addTab(TEST_URI_AREA);
  const hud = await openConsole();
  ok(hud, "web console opened for DPR warning");

  const onMessages = waitForMessagesByType({
    hud,
    messages: [
      {
        text: L10N.getStr("screenshotDPRDecreasedWarning"),
        typeSelector: ".console-api",
      },
    ],
  });
  const onDownload = waitUntilDownload();
  execute(hud, ":screenshot --selector .big-area --dpr 1000");
  const filePath = await onDownload;
  const messages = await onMessages;
  is(messages.length, 1, "Received one DPR warning");

  await IOUtils.remove(filePath);
});
