/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let SVG_PATH_URI =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content/",
    "http://mochi.test:8888/"
  ) + "file_light_dark.svg";

function getImageData(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = path;
    image.addEventListener("load", () => {
      const { width, height } = image;

      const canvas = new OffscreenCanvas(width, height);

      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    });
    image.addEventListener("error", () => {
      info("Got error");
      reject();
    });
  });
}

add_task(async function svg_light() {
  let params = new URLSearchParams({
    url: SVG_PATH_URI,
    colorScheme: "light",
  });
  const { data } = await getImageData("moz-remote-image://?" + params);

  is(data[0], 255, "red");
  is(data[1], 255, "green");
  is(data[2], 0, "blue");
});

add_task(async function svg_dark() {
  let params = new URLSearchParams({
    url: SVG_PATH_URI,
    colorScheme: "dark",
  });
  const { data } = await getImageData("moz-remote-image://?" + params);

  is(data[0], 0, "red");
  is(data[1], 0, "green");
  is(data[2], 255, "blue");
});
