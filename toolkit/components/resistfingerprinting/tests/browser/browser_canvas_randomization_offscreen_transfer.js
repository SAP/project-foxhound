/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const emptyPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty.html";

/**
 * Testing canvas randomization for a canvas whose control has been transferred
 * to an OffscreenCanvas via transferControlToOffscreen(). Both toDataURL() and
 * toBlob() should produce consistently randomized output, and the two methods
 * should agree with each other (same key, same noise).
 */

async function extractCanvasData() {
  const W = 64;
  const H = 64;

  let canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  document.body.appendChild(canvas);

  let offscreen = canvas.transferControlToOffscreen();

  let workerCode = `
    self.onmessage = function(e) {
      var c = e.data.canvas;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#EE2222';
      ctx.fillRect(0, 0, ${W}, ${H});
      ctx.fillStyle = '#2222EE';
      ctx.fillRect(20, 20, ${W - 20}, ${H - 20});
      ctx.fillStyle = '#22EE22';
      ctx.fillRect(40, 40, ${W - 40}, ${H - 40});
      self.postMessage('done');
    };
  `;

  let worker = new Worker(
    URL.createObjectURL(new Blob([workerCode], { type: "text/javascript" }))
  );

  await new Promise(resolve => {
    worker.onmessage = () => resolve();
    worker.postMessage({ canvas: offscreen }, [offscreen]);
  });

  await new Promise(r => requestAnimationFrame(r));

  // toDataURL readback
  let dataUrl = canvas.toDataURL("image/png");
  let img = new Image();
  await new Promise((ok, fail) => {
    img.onload = ok;
    img.onerror = fail;
    img.src = dataUrl;
  });
  let tmpA = document.createElement("canvas");
  tmpA.width = W;
  tmpA.height = H;
  tmpA.getContext("2d", { willReadFrequently: true }).drawImage(img, 0, 0);
  let dataUrlPixels = Array.from(
    tmpA.getContext("2d").getImageData(0, 0, W, H).data
  );

  // toBlob readback
  let blob = await new Promise((ok, fail) => {
    canvas.toBlob(
      b => (b ? ok(b) : fail(new Error("toBlob null"))),
      "image/png"
    );
  });
  let bmp = await createImageBitmap(blob);
  let tmpB = document.createElement("canvas");
  tmpB.width = W;
  tmpB.height = H;
  tmpB.getContext("2d", { willReadFrequently: true }).drawImage(bmp, 0, 0);
  let blobPixels = Array.from(
    tmpB.getContext("2d").getImageData(0, 0, W, H).data
  );

  worker.terminate();

  return [dataUrlPixels, blobPixels];
}

async function getPixelsFromTransferredCanvas(browser) {
  let code = extractCanvasData.toString();
  return SpecialPowers.spawn(browser, [code], async code => {
    return content.eval(`(${code})()`);
  });
}

let originalData;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.baselineFingerprintingProtection", false],
      ["privacy.fingerprintingProtection", false],
      ["privacy.resistFingerprinting", false],
    ],
  });

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, emptyPage);
  let [dataUrlPixels] = await getPixelsFromTransferredCanvas(tab.linkedBrowser);
  originalData = new Uint8Array(dataUrlPixels);

  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

async function runTest(enabled) {
  let RFPOverrides = enabled
    ? "+CanvasRandomization,-EfficientCanvasRandomization"
    : "-CanvasRandomization,-EfficientCanvasRandomization";
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.baselineFingerprintingProtection", false],
      ["privacy.fingerprintingProtection", true],
      ["privacy.fingerprintingProtection.pbmode", true],
      ["privacy.fingerprintingProtection.overrides", RFPOverrides],
      ["privacy.resistFingerprinting", false],
    ],
  });

  let privateWindow = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  const tab = await BrowserTestUtils.openNewForegroundTab(
    privateWindow.gBrowser,
    emptyPage
  );
  let [dataUrlPixels, blobPixels] = await getPixelsFromTransferredCanvas(
    tab.linkedBrowser
  );

  let dataUrlArr = new Uint8Array(dataUrlPixels);
  let blobArr = new Uint8Array(blobPixels);

  let name = "transferControlToOffscreen canvas";

  if (enabled) {
    ok(
      isDataRandomizedFuzzy(name + " toDataURL", dataUrlArr, originalData),
      `${name}: toDataURL() should have randomized pixels when CanvasRandomization is enabled.`
    );
    ok(
      isDataRandomizedFuzzy(name + " toBlob", blobArr, originalData),
      `${name}: toBlob() should have randomized pixels when CanvasRandomization is enabled.`
    );

    // toDataURL and toBlob must agree: same canvas key => same noise.
    let diffBits = countDifferencesInUint8Arrays(dataUrlArr, blobArr);
    info(
      `${name}: toDataURL vs toBlob difference: ${diffBits} bits (should be 0).`
    );
    is(
      diffBits,
      0,
      `${name}: toDataURL() and toBlob() must produce identical randomized output.`
    );
  } else {
    ok(
      !isDataRandomizedFuzzy(name + " toDataURL", dataUrlArr, originalData),
      `${name}: toDataURL() should return unmodified pixels when CanvasRandomization is disabled.`
    );
    ok(
      !isDataRandomizedFuzzy(name + " toBlob", blobArr, originalData),
      `${name}: toBlob() should return unmodified pixels when CanvasRandomization is disabled.`
    );
  }

  BrowserTestUtils.removeTab(tab);
  await BrowserTestUtils.closeWindow(privateWindow);
  await SpecialPowers.popPrefEnv();
}

add_task(async function run_tests_with_randomization_enabled() {
  await runTest(true);
});

add_task(async function run_tests_with_randomization_disabled() {
  await runTest(false);
});
