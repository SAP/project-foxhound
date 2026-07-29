/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

ChromeUtils.defineESModuleGetters(this, {
  Downloads: "resource://gre/modules/Downloads.sys.mjs",
});

const TEST_PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);

function doLoad(url, forceMediaDocument, contentFn) {
  return BrowserTestUtils.withNewTab({ gBrowser }, async function (browser) {
    browser.loadURI(Services.io.newURI(url), {
      triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
      forceMediaDocument,
    });

    await BrowserTestUtils.browserLoaded(browser, false, url);

    await SpecialPowers.spawn(browser, [], contentFn);
  });
}

add_task(async function test_img_png() {
  await doLoad(TEST_PATH + "file_media_header.sjs?imagePNG", "image", () => {
    // The image was successfully displayed inline, which means
    // we sent the right Accept header and ignored the Content-Disposition.
    let img = content.document.querySelector("img");
    is(img.width, 1, "PNG width");
    is(img.height, 1, "PNG height");
  });
});

add_task(async function test_img_svg() {
  await doLoad(
    TEST_PATH + "file_media_header.sjs?imageSVG",
    "image",
    async () => {
      let img = content.document.querySelector("img");

      // Work around for intermittent failures.
      for (let i = 0; i < 10; i++) {
        if (img.width === 100) {
          break;
        }

        // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
        await new Promise(resolve => content.setTimeout(resolve, 100));
      }

      is(img.width, 100, "SVG width");
      is(img.height, 100, "SVG height");
    }
  );
});

add_task(async function test_video() {
  await doLoad(TEST_PATH + "file_media_header.sjs?videoWebM", "video", () => {
    let video = content.document.querySelector("video");
    ok(video, "Video element exists");
    is(video.autoplay, false, "video does not autoplay");
  });
});

// Regression test for bug 2011081: forceMediaDocument with an
// application/octet-stream response must not trigger a download.
add_task(async function test_img_octet_stream_no_download() {
  let downloadList = await Downloads.getList(Downloads.ALL);
  let downloadAdded = false;
  let downloadView = {
    onDownloadAdded() {
      downloadAdded = true;
    },
  };
  await downloadList.addView(downloadView);
  registerCleanupFunction(async () => {
    await downloadList.removeView(downloadView);
  });

  await BrowserTestUtils.withNewTab({ gBrowser }, async function (browser) {
    let url = TEST_PATH + "file_media_header.sjs?imageOctetStream";
    browser.loadURI(Services.io.newURI(url), {
      triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
      forceMediaDocument: "image",
    });

    await BrowserTestUtils.browserStopped(browser);

    ok(!downloadAdded, "No download triggered for application/octet-stream");
  });
});
