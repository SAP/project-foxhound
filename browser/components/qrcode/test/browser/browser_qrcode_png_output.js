/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { QRCodeGenerator } = ChromeUtils.importESModule(
  "moz-src:///browser/components/qrcode/QRCodeGenerator.sys.mjs"
);
const { QRCodeWorker } = ChromeUtils.importESModule(
  "moz-src:///browser/components/qrcode/QRCodeWorker.sys.mjs"
);

const CELL_SIZE = 20;
const MARGIN = 4 * CELL_SIZE;
const DOT_RADIUS_FACTOR = 0.4;
const FINDER_SIZE = 7;
const MIN_LOGO_MODULE_SPAN = 6;
const TEST_URL = "https://mozilla.org";
const LONG_TEST_URL =
  "https://www.cnet.com/home/kitchen-and-household/keep-these-7-devices-far-away-from-extension-cords-or-power-strips/?utm_source=firefox-newtab-en-us";
// Exceeds M-level capacity at version 40, forcing fallback to L (no logo).
const TOO_LONG_FOR_M_LEVEL_URL = "https://example.com/?" + "a".repeat(2400);

// Alignment-pattern centers per QR version (ISO/IEC 18004 Table E.1),
// indexed by version - 1.
const ALIGNMENT_POSITION_TABLE = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

// Marks every QR function module: finders, separators, timing, alignment,
// format and version info.
function getFunctionModuleMask(dotCount) {
  const version = (dotCount - 17) / 4;
  const mask = Array.from({ length: dotCount }, () =>
    Array(dotCount).fill(false)
  );
  const mark = (row, col) => {
    if (row >= 0 && row < dotCount && col >= 0 && col < dotCount) {
      mask[row][col] = true;
    }
  };

  // Finder patterns (top-left, top-right, bottom-left) plus 1-module separators.
  for (const [startRow, startCol] of [
    [0, 0],
    [0, dotCount - FINDER_SIZE],
    [dotCount - FINDER_SIZE, 0],
  ]) {
    for (let rowOffset = -1; rowOffset <= FINDER_SIZE; rowOffset++) {
      for (let colOffset = -1; colOffset <= FINDER_SIZE; colOffset++) {
        mark(startRow + rowOffset, startCol + colOffset);
      }
    }
  }

  // Timing patterns on row/column 6, between the finder zones.
  for (
    let index = FINDER_SIZE + 1;
    index < dotCount - (FINDER_SIZE + 1);
    index++
  ) {
    mark(index, FINDER_SIZE - 1);
    mark(FINDER_SIZE - 1, index);
  }

  // Alignment patterns: 5×5 squares centered on each (row, col) pair, skipping
  // any whose center falls inside a finder pattern.
  const alignmentPositions = ALIGNMENT_POSITION_TABLE[version - 1] ?? [];
  for (const row of alignmentPositions) {
    for (const col of alignmentPositions) {
      if (mask[row][col]) {
        continue;
      }
      for (let rowOffset = -2; rowOffset <= 2; rowOffset++) {
        for (let colOffset = -2; colOffset <= 2; colOffset++) {
          mark(row + rowOffset, col + colOffset);
        }
      }
    }
  }

  // Format information: 15-bit strips on row/column 8 alongside each finder.
  for (let i = 0; i <= FINDER_SIZE + 1; i++) {
    mark(FINDER_SIZE + 1, i);
    mark(i, FINDER_SIZE + 1);
    mark(FINDER_SIZE + 1, dotCount - 1 - i);
    mark(dotCount - 1 - i, FINDER_SIZE + 1);
  }

  // Version information: two 6×3 blocks for version 7+.
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        mark(i, dotCount - 11 + j);
        mark(dotCount - 11 + j, i);
      }
    }
  }

  return mask;
}

async function renderToSamplingCanvas(url) {
  const dataURI = await QRCodeGenerator.generateQRCode(url);

  const img = document.createElementNS("http://www.w3.org/1999/xhtml", "img");
  await new Promise(resolve => {
    img.onload = resolve;
    img.src = dataURI;
  });

  const canvas = document.createElementNS(
    "http://www.w3.org/1999/xhtml",
    "canvas"
  );
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    dataURI,
    getPixel(x, y) {
      const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
      return { r: d[0], g: d[1], b: d[2] };
    },
  };
}

const isNearBlack = ({ r, g, b }) => r < 30 && g < 30 && b < 30;
const isNearWhite = ({ r, g, b }) => r > 200 && g > 200 && b > 200;

async function loadReferenceDataURI(filename) {
  const bytes = await IOUtils.read(getTestFilePath(filename));
  return `data:image/png;base64,${bytes.toBase64()}`;
}

async function getImagePixels(dataURI) {
  const img = document.createElementNS("http://www.w3.org/1999/xhtml", "img");
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("Image failed to load from data URI"));
    img.src = dataURI;
  });
  const canvas = document.createElementNS(
    "http://www.w3.org/1999/xhtml",
    "canvas"
  );
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d").drawImage(img, 0, 0);
  return canvas
    .getContext("2d")
    .getImageData(0, 0, canvas.width, canvas.height);
}

async function assertImagesMatch(actualDataURI, expectedDataURI, message) {
  const [actual, expected] = await Promise.all([
    getImagePixels(actualDataURI),
    getImagePixels(expectedDataURI),
  ]);
  Assert.equal(actual.width, expected.width, `${message}: width mismatch`);
  Assert.equal(actual.height, expected.height, `${message}: height mismatch`);
  let mismatchCount = 0;
  for (let i = 0; i < actual.data.length; i += 4) {
    if (
      actual.data[i] !== expected.data[i] ||
      actual.data[i + 1] !== expected.data[i + 1] ||
      actual.data[i + 2] !== expected.data[i + 2]
    ) {
      mismatchCount++;
    }
  }
  Assert.equal(mismatchCount, 0, message);
}

add_task(async function test_qrcode_png_dimensions_and_background() {
  const { width, height, getPixel } = await renderToSamplingCanvas(TEST_URL);

  Assert.equal(width, height, "QR code should be square");
  Assert.strictEqual(
    (width - 2 * MARGIN) % CELL_SIZE,
    0,
    "Canvas width should fit the module grid exactly"
  );

  Assert.ok(isNearWhite(getPixel(0, 0)), "Top-left corner should be white");
  Assert.ok(
    isNearWhite(getPixel(width - 1, 0)),
    "Top-right corner should be white"
  );
  Assert.ok(
    isNearWhite(getPixel(0, height - 1)),
    "Bottom-left corner should be white"
  );
  Assert.ok(
    isNearWhite(getPixel(width - 1, height - 1)),
    "Bottom-right corner should be white"
  );
});

add_task(async function test_qrcode_png_no_logo() {
  const worker = new QRCodeWorker();
  let dataURI;
  try {
    dataURI = await worker.generateFullQRCode(TEST_URL, false);
  } finally {
    await worker.terminate();
  }
  const refDataURI = await loadReferenceDataURI("reference-qr-no-logo.png");
  await assertImagesMatch(
    dataURI,
    refDataURI,
    "Logo-free QR code should match reference image"
  );
});

add_task(async function test_qrcode_png_embed_logo_pref() {
  const refDataURI = await loadReferenceDataURI("reference-qr-no-logo.png");

  await SpecialPowers.pushPrefEnv({
    set: [["browser.shareqrcode.embed_logo", false]],
  });
  await assertImagesMatch(
    await QRCodeGenerator.generateQRCode(TEST_URL),
    refDataURI,
    "browser.shareqrcode.embed_logo=false should omit the logo"
  );
  await SpecialPowers.popPrefEnv();

  const worker = new QRCodeWorker();
  let placement;
  try {
    const { dotCount } = await worker.generateQRMatrix(TEST_URL);
    placement = await worker.getLogoPlacement(dotCount, MARGIN);
  } finally {
    await worker.terminate();
  }

  // When embedding a logo, we clear the QR code dots ("modules") below where
  // it'll go so they aren't half-shown and instead are just white. Sample for
  // non-white pixels in the inner 30% of the logo to ensure we're getting the
  // embedded logo.
  await SpecialPowers.pushPrefEnv({
    set: [["browser.shareqrcode.embed_logo", true]],
  });
  const { getPixel } = await renderToSamplingCanvas(TEST_URL);
  await SpecialPowers.popPrefEnv();

  const sampleRadius = placement.logoSize * 0.3;
  const steps = 5;
  let nonWhitePixels = 0;
  for (let dy = -steps; dy <= steps; dy++) {
    for (let dx = -steps; dx <= steps; dx++) {
      const x = placement.centerX + (dx / steps) * sampleRadius;
      const y = placement.centerY + (dy / steps) * sampleRadius;
      if (!isNearWhite(getPixel(x, y))) {
        nonWhitePixels++;
      }
    }
  }
  Assert.greater(
    nonWhitePixels,
    0,
    "browser.shareqrcode.embed_logo=true should embed the logo at the center"
  );
});

add_task(async function test_qrcode_png_logo_clear_zone() {
  // Only assert on modules that would have rendered dark without the clear zone,
  // so the suppression check is relevant.
  const worker = new QRCodeWorker();
  let matrix, dotCount, placement;
  try {
    ({ matrix, dotCount } = await worker.generateQRMatrix(TEST_URL));
    placement = await worker.getLogoPlacement(dotCount, MARGIN);
  } finally {
    await worker.terminate();
  }

  Assert.ok(placement.showLogo, "Baseline QR code should still render a logo");
  Assert.greaterOrEqual(
    placement.logoSize,
    MIN_LOGO_MODULE_SPAN * CELL_SIZE,
    "Rendered logo should not shrink below the minimum viable size"
  );

  const suppressedModules = [];
  for (let row = 0; row < dotCount; row++) {
    for (let col = 0; col < dotCount; col++) {
      if (!matrix[row][col]) {
        continue;
      }
      const dotX = MARGIN + (col + 0.5) * CELL_SIZE;
      const dotY = MARGIN + (row + 0.5) * CELL_SIZE;
      const offsetX = dotX - placement.centerX;
      const offsetY = dotY - placement.centerY;
      if (
        placement.showLogo &&
        Math.hypot(offsetX, offsetY) <
          placement.clearRadius + CELL_SIZE * DOT_RADIUS_FACTOR
      ) {
        suppressedModules.push({ dotX, dotY });
      }
    }
  }

  Assert.greater(
    suppressedModules.length,
    0,
    "Raw QR matrix must have dark modules inside the clear zone so suppression assertions are meaningful"
  );

  const { getPixel } = await renderToSamplingCanvas(TEST_URL);
  for (const { dotX, dotY } of suppressedModules) {
    Assert.ok(
      !isNearBlack(getPixel(dotX, dotY)),
      `Suppressed dot at (${Math.round(dotX)}, ${Math.round(dotY)}) should not render as a dark dot`
    );
  }
});

add_task(async function test_qrcode_png_logo_is_rendered() {
  const worker = new QRCodeWorker();
  let placement;
  try {
    const { dotCount } = await worker.generateQRMatrix(TEST_URL);
    placement = await worker.getLogoPlacement(dotCount, MARGIN);
  } finally {
    await worker.terminate();
  }

  Assert.ok(placement.showLogo, "Test URL should render a logo");

  const { getPixel } = await renderToSamplingCanvas(TEST_URL);

  // Sample inside the logo: the clear zone is white when no logo paints, so any
  // rendered logo leaves non-white pixels here. 0.3 stays inside the circular
  // artwork. Sampling near 0.5 risks the transparent corners of the bounding box.
  const sampleRadius = placement.logoSize * 0.3;
  const steps = 5;
  let nonWhitePixels = 0;
  for (let dy = -steps; dy <= steps; dy++) {
    for (let dx = -steps; dx <= steps; dx++) {
      const x = placement.centerX + (dx / steps) * sampleRadius;
      const y = placement.centerY + (dy / steps) * sampleRadius;
      if (!isNearWhite(getPixel(x, y))) {
        nonWhitePixels++;
      }
    }
  }

  Assert.greater(
    nonWhitePixels,
    0,
    "Logo area should contain non-white pixels; all-white means the logo failed to render"
  );
});

add_task(async function test_qrcode_png_logo_is_centered() {
  // Logo must sit at the canvas center for every URL length; earlier revisions
  // shifted it to dodge the central alignment pattern.
  for (const url of [TEST_URL, LONG_TEST_URL]) {
    const worker = new QRCodeWorker();
    let dotCount, placement;
    try {
      ({ dotCount } = await worker.generateQRMatrix(url));
      placement = await worker.getLogoPlacement(dotCount, MARGIN);
    } finally {
      await worker.terminate();
    }

    Assert.ok(placement.showLogo, `url=${url}: logo should render`);

    const canvasSize = dotCount * CELL_SIZE + 2 * MARGIN;
    Assert.equal(
      placement.centerX,
      canvasSize / 2,
      `url=${url}: logo centerX must equal canvas center`
    );
    Assert.equal(
      placement.centerY,
      canvasSize / 2,
      `url=${url}: logo centerY must equal canvas center`
    );
  }
});

add_task(async function test_qrcode_png_long_url_clears_center() {
  // At versions with a central alignment pattern the logo paints over it.
  // Every dark module under the clear radius must render white; M-level EC
  // recovers the lost data.
  const worker = new QRCodeWorker();
  let matrix, dotCount, placement;
  try {
    ({ matrix, dotCount } = await worker.generateQRMatrix(LONG_TEST_URL));
    placement = await worker.getLogoPlacement(dotCount, MARGIN);
  } finally {
    await worker.terminate();
  }

  const { getPixel } = await renderToSamplingCanvas(LONG_TEST_URL);
  const suppressionLimit =
    placement.clearRadius + CELL_SIZE * DOT_RADIUS_FACTOR;
  let suppressedDarkModules = 0;
  for (let row = 0; row < dotCount; row++) {
    for (let col = 0; col < dotCount; col++) {
      if (!matrix[row][col]) {
        continue;
      }
      const dotX = MARGIN + (col + 0.5) * CELL_SIZE;
      const dotY = MARGIN + (row + 0.5) * CELL_SIZE;
      if (
        Math.hypot(dotX - placement.centerX, dotY - placement.centerY) >=
        suppressionLimit
      ) {
        continue;
      }
      suppressedDarkModules++;
      Assert.ok(
        !isNearBlack(getPixel(dotX, dotY)),
        `Module under logo at (${row},${col}) must be cleared`
      );
    }
  }
  Assert.greater(
    suppressedDarkModules,
    0,
    "Sanity check: the URL must produce at least one dark module under the logo"
  );
});

// Loss must stay within M-level's ~15% EC budget (ISO/IEC 18004 §6.5.1).
// We assert two things:
//   1. Every module outside the logo footprint matches the source (function
//      modules aren't EC-protected, so any corruption breaks decoding).
//   2. Mismatches among non-function modules stay under 15%; restricting the
//      denominator keeps quiet-zone whites from diluting the metric.
// The central alignment pattern (versions 2+) is intentionally cleared under
// the logo; corner finders provide orientation for a flat-screen scan.
add_task(async function test_qrcode_png_loss_within_ec_budget() {
  const urls = [TEST_URL, LONG_TEST_URL];

  for (const url of urls) {
    const worker = new QRCodeWorker();
    let matrix, dotCount, placement;
    try {
      ({ matrix, dotCount } = await worker.generateQRMatrix(url));
      placement = await worker.getLogoPlacement(dotCount, MARGIN);
    } finally {
      await worker.terminate();
    }

    const { getPixel } = await renderToSamplingCanvas(url);
    const functionMask = getFunctionModuleMask(dotCount);
    const suppressionLimit =
      placement.clearRadius + CELL_SIZE * DOT_RADIUS_FACTOR;

    let dataModuleCount = 0;
    let clearedDataModules = 0;

    for (let row = 0; row < dotCount; row++) {
      for (let col = 0; col < dotCount; col++) {
        const dotX = MARGIN + (col + 0.5) * CELL_SIZE;
        const dotY = MARGIN + (row + 0.5) * CELL_SIZE;
        const isFunctionModule = functionMask[row][col];

        if (!isFunctionModule) {
          dataModuleCount++;
        }

        if (isNearBlack(getPixel(dotX, dotY)) === matrix[row][col]) {
          continue;
        }

        const underLogo =
          Math.hypot(dotX - placement.centerX, dotY - placement.centerY) <
          suppressionLimit;
        Assert.ok(
          underLogo,
          `url="${url}" module at (${row},${col}) outside the logo footprint must render correctly`
        );

        if (!isFunctionModule) {
          clearedDataModules++;
        }
      }
    }

    Assert.greater(
      clearedDataModules,
      0,
      `url="${url}" expected the logo to clear at least one dark data module (otherwise the budget check is meaningless)`
    );

    const dataLossFraction = clearedDataModules / dataModuleCount;
    Assert.less(
      dataLossFraction,
      0.15,
      `url="${url}" cleared ${(dataLossFraction * 100).toFixed(1)}% of data modules; must be under 15% for M-level error correction`
    );
  }
});

add_task(async function test_qrcode_png_long_url_omits_logo() {
  // URLs too long for M-level fall back to L and omit the logo. Compare against
  // the no-logo reference image.
  const dataURI = await QRCodeGenerator.generateQRCode(
    TOO_LONG_FOR_M_LEVEL_URL
  );
  const refDataURI = await loadReferenceDataURI(
    "reference-long-url-no-logo.png"
  );
  await assertImagesMatch(
    dataURI,
    refDataURI,
    "Long URL QR code should match reference image (no logo overlay)"
  );
});

add_task(async function test_qrcode_png_save_bytes() {
  const { dataURI, width } = await renderToSamplingCanvas(TEST_URL);

  const DATA_PREFIX = "data:image/png;base64,";
  Assert.ok(dataURI.startsWith(DATA_PREFIX), "Data URI should be a PNG");

  // Decode exactly as the dialog's save/copy path does.
  const bytes = Uint8Array.fromBase64(dataURI.slice(DATA_PREFIX.length));

  // Verify PNG magic header.
  const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < PNG_MAGIC.length; i++) {
    Assert.equal(bytes[i], PNG_MAGIC[i], `PNG magic byte ${i} should match`);
  }

  // First chunk must be IHDR.
  const IHDR = [0x49, 0x48, 0x44, 0x52];
  for (let i = 0; i < IHDR.length; i++) {
    Assert.equal(
      bytes[12 + i],
      IHDR[i],
      `IHDR chunk type byte ${i} should match`
    );
  }

  // Width and height are big-endian uint32s at bytes 16 and 20.
  const view = new DataView(bytes.buffer);
  const pngWidth = view.getUint32(16, false);
  const pngHeight = view.getUint32(20, false);

  Assert.equal(pngWidth, width, "PNG width in IHDR should match canvas width");
  Assert.equal(pngWidth, pngHeight, "Saved PNG should be square");
  Assert.strictEqual(
    (pngWidth - 2 * MARGIN) % CELL_SIZE,
    0,
    "Saved PNG width should fit the module grid"
  );
});
