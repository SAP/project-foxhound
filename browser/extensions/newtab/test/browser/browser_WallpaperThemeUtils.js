/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { calculateTheme } = ChromeUtils.importESModule(
  "resource://newtab/lib/Wallpapers/WallpaperThemeUtils.mjs"
);

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
  // 2x2: two white, two black
  const rgba = [
    255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255,
  ];
  const blob = await blobFromRGBA(rgba);
  const theme = await calculateTheme(window, blob);
  Assert.equal(theme, "light");
});

add_task(async function test_calculateTheme_all_black_pixels() {
  const rgba = [0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255];
  const blob = await blobFromRGBA(rgba);
  const theme = await calculateTheme(window, blob);
  Assert.equal(theme, "dark");
});

add_task(async function test_calculateTheme_transparent_pixels_ignored() {
  // 2x2: one white opaque, three fully transparent — average should equal white = light
  const rgba = [255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const blob = await blobFromRGBA(rgba);
  const theme = await calculateTheme(window, blob);
  Assert.equal(theme, "light");
});
