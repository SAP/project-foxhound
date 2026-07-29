/*
 * Test for HDR PNG encoding (16-bit + cICP) in ImageLib
 */

// PNG signature + IHDR chunk layout:
// Bytes 0-7: PNG signature
// Bytes 8-11: IHDR chunk length (always 13)
// Bytes 12-15: "IHDR"
// Bytes 16-19: width (4 bytes big-endian)
// Bytes 20-23: height (4 bytes big-endian)
// Byte 24: bit depth
// Byte 25: color type

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const WIDTH = 5;
const HEIGHT = 4;

function strideForFormat(format) {
  if (format == Ci.imgIEncoder.INPUT_FORMAT_R10G10B10A2) {
    return WIDTH * 4;
  }
  return WIDTH * 8;
}

function getPngBytes(encoder) {
  var rawStream = encoder.QueryInterface(Ci.nsIInputStream);
  var stream = Cc["@mozilla.org/binaryinputstream;1"].createInstance();
  stream.QueryInterface(Ci.nsIBinaryInputStream);
  stream.setInputStream(rawStream);
  return stream.readByteArray(stream.available());
}

function verifyPngSignature(bytes) {
  for (var i = 0; i < PNG_SIG.length; i++) {
    Assert.equal(bytes[i], PNG_SIG[i], "PNG signature byte " + i);
  }
}

function getPngBitDepth(bytes) {
  return bytes[24];
}

function getPngColorType(bytes) {
  return bytes[25];
}

// Find a chunk by its 4-byte type name. Returns the offset of the chunk data,
// or -1 if not found.
function findPngChunk(bytes, name) {
  var offset = 8; // skip PNG signature
  while (offset < bytes.length) {
    var len =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];
    var type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );
    if (type == name) {
      return offset + 8; // start of chunk data
    }
    // skip: 4 (length) + 4 (type) + len (data) + 4 (CRC)
    offset += 12 + len;
  }
  return -1;
}

// 5x4 test image with 10 distinct colors and mixed alpha:
// Row 0 (opaque):     red,   green,  blue,   orange,  purple
// Row 1 (opaque):     white, gray,   cyan,   yellow,  lime
// Row 2 (alpha ~1/3): red,   green,  blue,   orange,  purple
// Row 3 (alpha ~2/3): white, gray,   cyan,   yellow,  lime

// RGB triples as fractions, 5 per row.
var COLORS_ROW0 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0.5, 0],
  [0.5, 0, 0.5],
];
var COLORS_ROW1 = [
  [1, 1, 1],
  [0.5, 0.5, 0.5],
  [0, 1, 1],
  [1, 1, 0],
  [0.5, 1, 0],
];

function setPixelU16(pixels, index, r, g, b, a) {
  pixels[index * 4 + 0] = r;
  pixels[index * 4 + 1] = g;
  pixels[index * 4 + 2] = b;
  pixels[index * 4 + 3] = a;
}

function fillU16Row(pixels, rowStart, colors, alpha, max) {
  for (var i = 0; i < colors.length; i++) {
    setPixelU16(
      pixels,
      rowStart + i,
      Math.round(colors[i][0] * max),
      Math.round(colors[i][1] * max),
      Math.round(colors[i][2] * max),
      alpha
    );
  }
}

function makeU16TestPixels() {
  var pixels = new Uint16Array(WIDTH * HEIGHT * 4);
  fillU16Row(pixels, 0, COLORS_ROW0, 65535, 65535);
  fillU16Row(pixels, 5, COLORS_ROW1, 65535, 65535);
  fillU16Row(pixels, 10, COLORS_ROW0, 21845, 65535); // alpha ~1/3 -> 85 in 8-bit
  fillU16Row(pixels, 15, COLORS_ROW1, 43690, 65535); // alpha ~2/3 -> 170 in 8-bit
  return new Uint8Array(pixels.buffer);
}

function makeU10TestPixels() {
  var pixels = new Uint16Array(WIDTH * HEIGHT * 4);
  fillU16Row(pixels, 0, COLORS_ROW0, 1023, 1023);
  fillU16Row(pixels, 5, COLORS_ROW1, 1023, 1023);
  fillU16Row(pixels, 10, COLORS_ROW0, 341, 1023); // 341/1023 ~1/3
  fillU16Row(pixels, 15, COLORS_ROW1, 682, 1023); // 682/1023 ~2/3
  return new Uint8Array(pixels.buffer);
}

function makeU12TestPixels() {
  var pixels = new Uint16Array(WIDTH * HEIGHT * 4);
  fillU16Row(pixels, 0, COLORS_ROW0, 4095, 4095);
  fillU16Row(pixels, 5, COLORS_ROW1, 4095, 4095);
  fillU16Row(pixels, 10, COLORS_ROW0, 1365, 4095); // 1365/4095 ~1/3
  fillU16Row(pixels, 15, COLORS_ROW1, 2730, 4095); // 2730/4095 ~2/3
  return new Uint8Array(pixels.buffer);
}

// Bit layout per uint32: 0bAARRRRRRRRRRGGGGGGGGGGBBBBBBBBBB
function packR10G10B10A2(r, g, b, a) {
  return (
    (b & 0x3ff) | ((g & 0x3ff) << 10) | ((r & 0x3ff) << 20) | ((a & 0x3) << 30)
  );
}

function fillR10G10B10A2Row(pixels, rowStart, colors, alpha) {
  for (var i = 0; i < colors.length; i++) {
    pixels[rowStart + i] = packR10G10B10A2(
      Math.round(colors[i][0] * 1023),
      Math.round(colors[i][1] * 1023),
      Math.round(colors[i][2] * 1023),
      alpha
    );
  }
}

function makeR10G10B10A2TestPixels() {
  var pixels = new Uint32Array(WIDTH * HEIGHT);
  fillR10G10B10A2Row(pixels, 0, COLORS_ROW0, 3);
  fillR10G10B10A2Row(pixels, 5, COLORS_ROW1, 3);
  fillR10G10B10A2Row(pixels, 10, COLORS_ROW0, 1); // 1/3
  fillR10G10B10A2Row(pixels, 15, COLORS_ROW1, 2); // 2/3
  return new Uint8Array(pixels.buffer);
}

// float16 constants: 0=0x0000, 0.5=0x3800, 1.0=0x3C00
// Use a lookup table to avoid float equality comparisons.
var F16_VALUES = {
  0: 0x0000,
  5: 0x3800, // 0.5
  10: 0x3c00, // 1.0
};
// ~1/3 and ~2/3 as float16 bit patterns
var F16_ALPHA_THIRD = 0x3555;
var F16_ALPHA_TWOTHIRDS = 0x3955;

function fracToF16(frac10) {
  var val = F16_VALUES[frac10];
  if (val !== undefined) {
    return val;
  }
  throw new Error("unexpected fraction " + frac10);
}

function fillF16Row(pixels, rowStart, colors, alphaF16) {
  for (var i = 0; i < colors.length; i++) {
    var idx = (rowStart + i) * 4;
    // Colors use fractions 0, 0.5, 1.0 encoded as integers 0, 5, 10
    // to avoid float equality issues.
    pixels[idx + 0] = fracToF16(Math.round(colors[i][0] * 10));
    pixels[idx + 1] = fracToF16(Math.round(colors[i][1] * 10));
    pixels[idx + 2] = fracToF16(Math.round(colors[i][2] * 10));
    pixels[idx + 3] = alphaF16;
  }
}

function makeF16TestPixels() {
  var pixels = new Uint16Array(WIDTH * HEIGHT * 4);
  fillF16Row(pixels, 0, COLORS_ROW0, 0x3c00); // alpha = 1.0
  fillF16Row(pixels, 5, COLORS_ROW1, 0x3c00); // alpha = 1.0
  fillF16Row(pixels, 10, COLORS_ROW0, F16_ALPHA_THIRD); // alpha ~1/3
  fillF16Row(pixels, 15, COLORS_ROW1, F16_ALPHA_TWOTHIRDS); // alpha ~2/3
  return new Uint8Array(pixels.buffer);
}

// Encode pixels and verify the PNG structure.
function encodeAndVerify(pixels, format, options, expectedColorType) {
  var encoder = Cc[
    "@mozilla.org/image/encoder;2?type=image/png"
  ].createInstance(Ci.imgIEncoder);

  encoder.initFromData(
    pixels,
    pixels.length,
    WIDTH,
    HEIGHT,
    strideForFormat(format),
    format,
    options,
    null
  );

  var bytes = getPngBytes(encoder);
  verifyPngSignature(bytes);
  Assert.equal(getPngBitDepth(bytes), 16, "bit depth should be 16");
  Assert.equal(getPngColorType(bytes), expectedColorType, "color type");
  return bytes;
}

// Encode, decode, and verify the decoded image dimensions.
function encodeDecodeVerify(pixels, format) {
  var encoder = Cc[
    "@mozilla.org/image/encoder;2?type=image/png"
  ].createInstance(Ci.imgIEncoder);

  encoder.initFromData(
    pixels,
    pixels.length,
    WIDTH,
    HEIGHT,
    strideForFormat(format),
    format,
    "",
    null
  );

  var pngBytes = getPngBytes(encoder);
  var imgTools = Cc["@mozilla.org/image/tools;1"].getService(Ci.imgITools);
  var container = imgTools.decodeImageFromArrayBuffer(
    new Uint8Array(pngBytes).buffer,
    "image/png"
  );
  Assert.equal(container.width, WIDTH, "decoded width");
  Assert.equal(container.height, HEIGHT, "decoded height");
}

function run_test() {
  dump("test R10G10B10A2...\n");
  encodeAndVerify(
    makeR10G10B10A2TestPixels(),
    Ci.imgIEncoder.INPUT_FORMAT_R10G10B10A2,
    "",
    6
  );
  dump("test U10 RGBA...\n");
  encodeAndVerify(
    makeU10TestPixels(),
    Ci.imgIEncoder.INPUT_FORMAT_RGBA_U10,
    "",
    6
  );
  dump("test U12 RGBA...\n");
  encodeAndVerify(
    makeU12TestPixels(),
    Ci.imgIEncoder.INPUT_FORMAT_RGBA_U12,
    "",
    6
  );
  dump("test U16 RGBA...\n");
  encodeAndVerify(
    makeU16TestPixels(),
    Ci.imgIEncoder.INPUT_FORMAT_RGBA_U16,
    "",
    6
  );
  dump("test F16 RGBA...\n");
  encodeAndVerify(
    makeF16TestPixels(),
    Ci.imgIEncoder.INPUT_FORMAT_RGBA_F16,
    "",
    6
  );
  dump("test R10G10B10A2 RGB (no transparency)...\n");
  encodeAndVerify(
    makeR10G10B10A2TestPixels(),
    Ci.imgIEncoder.INPUT_FORMAT_R10G10B10A2,
    "transparency=none",
    2
  );
  dump("test U10 RGB (no transparency)...\n");
  encodeAndVerify(
    makeU10TestPixels(),
    Ci.imgIEncoder.INPUT_FORMAT_RGBA_U10,
    "transparency=none",
    2
  );
  dump("test U12 RGB (no transparency)...\n");
  encodeAndVerify(
    makeU12TestPixels(),
    Ci.imgIEncoder.INPUT_FORMAT_RGBA_U12,
    "transparency=none",
    2
  );
  dump("test U16 RGB (no transparency)...\n");
  encodeAndVerify(
    makeU16TestPixels(),
    Ci.imgIEncoder.INPUT_FORMAT_RGBA_U16,
    "transparency=none",
    2
  );
  dump("test F16 RGB (no transparency)...\n");
  encodeAndVerify(
    makeF16TestPixels(),
    Ci.imgIEncoder.INPUT_FORMAT_RGBA_F16,
    "transparency=none",
    2
  );
  dump("test cICP chunk...\n");
  test_cicp_chunk();
  dump("test setColorSpaceInfo on all encoders...\n");
  test_setColorSpaceInfo_on_all_encoders();
  dump("test R10G10B10A2 roundtrip decode...\n");
  encodeDecodeVerify(
    makeR10G10B10A2TestPixels(),
    Ci.imgIEncoder.INPUT_FORMAT_R10G10B10A2
  );
  dump("test U10 roundtrip decode...\n");
  encodeDecodeVerify(makeU10TestPixels(), Ci.imgIEncoder.INPUT_FORMAT_RGBA_U10);
  dump("test U12 roundtrip decode...\n");
  encodeDecodeVerify(makeU12TestPixels(), Ci.imgIEncoder.INPUT_FORMAT_RGBA_U12);
  dump("test U16 roundtrip decode...\n");
  encodeDecodeVerify(makeU16TestPixels(), Ci.imgIEncoder.INPUT_FORMAT_RGBA_U16);
  dump("test F16 roundtrip decode...\n");
  encodeDecodeVerify(makeF16TestPixels(), Ci.imgIEncoder.INPUT_FORMAT_RGBA_F16);
}

function test_cicp_chunk() {
  dump("test_cicp_chunk\n");
  var encoder = Cc[
    "@mozilla.org/image/encoder;2?type=image/png"
  ].createInstance(Ci.imgIEncoder);

  encoder.setColorSpaceInfo(
    Ci.imgIEncoder.CP_BT2020,
    Ci.imgIEncoder.TC_SMPTE2084,
    Ci.imgIEncoder.MC_IDENTITY,
    true
  );

  var pixels = makeU16TestPixels();
  encoder.initFromData(
    pixels,
    pixels.length,
    WIDTH,
    HEIGHT,
    strideForFormat(Ci.imgIEncoder.INPUT_FORMAT_RGBA_U16),
    Ci.imgIEncoder.INPUT_FORMAT_RGBA_U16,
    "",
    null
  );

  var bytes = getPngBytes(encoder);
  verifyPngSignature(bytes);

  // Find the cICP chunk.
  var cicpOffset = findPngChunk(bytes, "cICP");
  Assert.notEqual(cicpOffset, -1, "cICP chunk should be present");

  // cICP chunk is 4 bytes: primaries, transfer, matrix, full_range
  Assert.equal(bytes[cicpOffset], 9, "primaries should be BT.2020 (9)");
  Assert.equal(
    bytes[cicpOffset + 1],
    16,
    "transfer should be SMPTE2084/PQ (16)"
  );
  Assert.equal(bytes[cicpOffset + 2], 0, "matrix should be Identity (0)");
  Assert.equal(bytes[cicpOffset + 3], 1, "full range should be 1");
}

function test_setColorSpaceInfo_on_all_encoders() {
  dump("test_setColorSpaceInfo_on_all_encoders\n");
  var types = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/bmp",
    "image/vnd.microsoft.icon",
  ];
  for (var type of types) {
    var encoder = Cc[
      "@mozilla.org/image/encoder;2?type=" + type
    ].createInstance(Ci.imgIEncoder);
    // Should not throw on any encoder.
    encoder.setColorSpaceInfo(
      Ci.imgIEncoder.CP_BT709,
      Ci.imgIEncoder.TC_SRGB,
      Ci.imgIEncoder.MC_IDENTITY,
      true
    );
  }
}
