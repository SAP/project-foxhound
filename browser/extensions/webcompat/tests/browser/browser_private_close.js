"use strict";

const CACHE_TEST_PAGE = `${TEST_ROOT}image_cache.html`;
const HTTPS_ROOT = TEST_ROOT.replace(/http:/, "https:");
const CACHE_TEST_IMAGE = `${HTTPS_ROOT}image_cache.png`;

add_task(async function test_private_window_closed() {
  await WebCompatExtension.shimsReady();

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: CACHE_TEST_PAGE,
    waitForLoad: true,
  });

  const contentType = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [CACHE_TEST_IMAGE],
    async image => {
      const imageCache = Cc["@mozilla.org/image/tools;1"]
        .getService(Ci.imgITools)
        .getImgCacheForDocument(content.document);
      const imageURI = Services.io.newURI(image);
      const props = imageCache.findEntryProperties(imageURI, content.document);

      return props.get("type", Ci.nsISupportsCString).data;
    }
  );

  is(contentType, "image/png");

  const privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  // Closing a private window triggers
  // browser.trackingProtection.onPrivateSessionEnd.
  //
  // This shouldn't unnecessarily clear the image cache.
  await BrowserTestUtils.closeWindow(privateWin);

  const contentType2 = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [CACHE_TEST_IMAGE],
    async image => {
      const imageCache = Cc["@mozilla.org/image/tools;1"]
        .getService(Ci.imgITools)
        .getImgCacheForDocument(content.document);
      const imageURI = Services.io.newURI(image);
      const props = imageCache.findEntryProperties(imageURI, content.document);

      return props.get("type", Ci.nsISupportsCString).data;
    }
  );

  is(contentType2, "image/png");

  await BrowserTestUtils.removeTab(tab);
});
