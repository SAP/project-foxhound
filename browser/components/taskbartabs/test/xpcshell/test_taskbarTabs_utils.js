/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  MockRegistrar: "resource://testing-common/MockRegistrar.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
  TaskbarTabsUtils: "resource:///modules/taskbartabs/TaskbarTabsUtils.sys.mjs",
});

const kPngFile = do_get_file("favicon-normal16.png");
const kPngUri = Services.io.newFileURI(kPngFile);
const kSvgFile = do_get_file("icon.svg");
const kSvgUri = Services.io.newFileURI(kSvgFile);

let gOriginalFavicons = Cc["@mozilla.org/browser/favicon-service;1"].getService(
  Ci.nsIFaviconService
);
let gMockFaviconService = {
  QueryInterface: ChromeUtils.generateQI(["nsIFaviconService"]),
  getFaviconForPage() {
    ok(false, "Called without being stubbed out!");
    throw new Error("Called without being stubbed out!");
  },
  get defaultFavicon() {
    return gOriginalFavicons.defaultFavicon;
  },
};

MockRegistrar.register(
  "@mozilla.org/browser/favicon-service;1",
  gMockFaviconService
);

/**
 * Encodes an image container to a PNG. This can be used to compare two raster
 * images from JavaScript; here, it's used to make sure the default favicon is
 * correct.
 *
 * @param {imgIContainer} aImage
 *        The image to encode.
 * @returns {string}
 *        The encoded image to use for comparisons.
 */
function encodePNG(aImage) {
  if (aImage === null) {
    // imgTools.encodeImage segfaults if given null.
    return null;
  }

  const istream = Cc["@mozilla.org/image/tools;1"]
    .getService(Ci.imgITools)
    .encodeImage(aImage, "image/png");
  const size = istream.available();

  // Use a binary input stream to grab the bytes.
  const bis = Cc["@mozilla.org/binaryinputstream;1"].createInstance(
    Ci.nsIBinaryInputStream
  );
  bis.setInputStream(istream);

  const bytes = bis.readBytes(size);
  if (size != bytes.length) {
    throw new Error("Didn't read expected number of bytes");
  }

  return bytes;
}

add_task(async function test_imageFromLocalURI_nonuri() {
  await rejects(
    TaskbarTabsUtils._imageFromLocalURI("this is a string :)"),
    /Invalid argument, `aUri` should be instance of `nsIURI`/,
    "Fails with the correct error message"
  );
});

add_task(async function test_imageFromLocalURI_nonlocal() {
  let exampleUrl = Services.io.newURI("https://example.com");
  await rejects(
    TaskbarTabsUtils._imageFromLocalURI(exampleUrl),
    /Attempting to create an image from a non-local URI/,
    "Fails with the correct error message"
  );
});

add_task(async function test_imageFromLocalURI_raster() {
  let img = await TaskbarTabsUtils._imageFromLocalURI(kPngUri);

  // Comparing image content is difficult, so just check the dimensions.
  // file-normal16.png is 16x16.
  equal(img.width, 16, "Image should be 16 pixels wide");
  equal(img.height, 16, "Image should be 16 pixels tall");
});

add_task(async function test_imageFromLocalURI_vector() {
  // I don't think there's a nice way to compare vector images, so for now just
  // check that the dimensions match; use manual testing to check the actual
  // content. Note that the image is NOT scaled, as that's done by
  // createWindowsIcon, so it should be 16x16.
  let img = await TaskbarTabsUtils._imageFromLocalURI(kSvgUri);

  equal(img.width, 16, "Image should be 16 pixels wide");
  equal(img.height, 16, "Image should be 16 pixels tall");
});

add_task(async function test_getFaviconUri() {
  let sandbox = sinon.createSandbox();
  sinon.resetHistory();

  sandbox.stub(gMockFaviconService, "getFaviconForPage").callsFake(async () => {
    return { dataURI: kPngUri, mimeType: "image/png" };
  });

  let exampleUrl = Services.io.newURI("https://example.com");
  equal(
    await TaskbarTabsUtils.getFaviconUri(exampleUrl),
    kPngUri,
    "getFaviconUri returns the favicon from the favicon service"
  );
  equal(
    gMockFaviconService.getFaviconForPage.callCount,
    1,
    "The favicon service was requested only once"
  );
  equal(
    gMockFaviconService.getFaviconForPage.firstCall.args[0].spec,
    exampleUrl.spec,
    "The correct URI was given to the favicon service"
  );

  sandbox.restore();
});

add_task(async function test_getDefaultIcon() {
  let defaultFavicon = gOriginalFavicons.defaultFavicon;
  equal(
    encodePNG(await TaskbarTabsUtils.getDefaultIcon()),
    encodePNG(await TaskbarTabsUtils._imageFromLocalURI(defaultFavicon)),
    "getDefaultIcon is equivalent to _imageFromLocalURI(Favicons.defaultFavicon)"
  );
});
