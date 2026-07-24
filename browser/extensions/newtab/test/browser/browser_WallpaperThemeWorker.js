/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  BasePromiseWorker: "resource://gre/modules/PromiseWorker.sys.mjs",
});

const WORKER_URL = "resource://newtab/lib/Wallpapers/WallpaperTheme.worker.mjs";

async function blobFromRGBA(rgba) {
  const canvas = new OffscreenCanvas(2, 2);
  const context = canvas.getContext("2d");
  // create image data we can place in the canvas that matches the rgba arg
  const imgData = new ImageData(new Uint8ClampedArray(rgba), 2, 2);
  context.putImageData(imgData, 0, 0);
  // return a real blob that the worker can use
  return canvas.convertToBlob();
}

add_task(async function test_calculateTheme_white_and_black_pixels() {
  const worker = new BasePromiseWorker(WORKER_URL, { type: "module" });

  // 2x2: two white, two black
  const rgba = [
    255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255,
  ];
  const fakeBlob = await blobFromRGBA(rgba);

  const theme = await worker.post("calculateTheme", [fakeBlob]);
  Assert.equal(theme, "light");

  worker.terminate();
});

add_task(async function test_calculateTheme_all_black_pixels() {
  const worker = new BasePromiseWorker(WORKER_URL, { type: "module" });

  const rgba = [0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255];
  const fakeBlob = await blobFromRGBA(rgba);

  const theme = await worker.post("calculateTheme", [fakeBlob]);
  Assert.equal(theme, "dark");

  worker.terminate();
});
