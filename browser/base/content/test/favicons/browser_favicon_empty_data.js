/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ImageTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/ImageTestUtils.sys.mjs"
);

const TEST_ROOT =
  "http://mochi.test:8888/browser/browser/base/content/test/favicons/";

const PAGE_URL = TEST_ROOT + "blank.html";
const ICON_URL = TEST_ROOT + "file_bug970276_favicon1.ico";
const ICON_DATAURI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABx0lEQVQ4T6WSMWsbQRCFP4EEKqTCBAwJpFkV+QGbStUh0igolVAjUohgzpUrBQ5cyFiFYCEuU/hQ4cJVVCblFfcDsj8gzZUJXGMEVwouzGrvYqGEBPJgudnZeW/e7F6D/0SjjjxWq1W5Xq85yTLQmvF4TL/fJwiCo1pBndxut+VgMABruQUsoIHYx4KbND0Scpu7u/vy7GzGu93OkYTwDLjScG3hO5AoRZ7nFEVxLNBsNkv5ikDVXZSshR/ACI2ZKKy1RFnG+SPnDSEvl0sWiwUfdztCf3DNvnPohaq8iMtYUz9OoyzLstvt8qIouNWg7b6gIghE7Km/E1kCqTFK/XLw5PLyoPuVjwUvgW+dDsPhkE+bjcs5J1rjHPR6PfdsIiBLCG8eiYjgZx+/iiIekgRtrRNxDpIkYTQa8b4oHEkOxKoQBVXui7+XkyjCJIZQh3sHrVaLdrvNTVEczC6k16enPM9z1GSCUgplEmJtubi4ZzZ726jvQP62eRAcWBeBc2/bGHPw/hXqZBRFZWIMX/3e3bwG86DIsuy3ZEF9kKZpOZ/PCa11Y1Tdxfpms/m7QAURSoPAxR86HabTKXEcH9VV+OPBv+In4P+u1zGvpjQAAAAASUVORK5CYII=";

const EMPTY_PAGE_URL = TEST_ROOT + "file_favicon_empty.html";
const EMPTY_ICON_URL = "about:blank";

add_task(async function () {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: PAGE_URL },
    async browser => {
      let iconBox = gBrowser
        .getTabForBrowser(browser)
        .querySelector(".tab-icon-image");
      await addContentLinkForIconUrl(ICON_URL, browser);
      await ImageTestUtils.assertEqualImage(
        window,
        browser.mIconURL,
        ICON_DATAURI,
        "Favicon is correctly set."
      );

      // Give some time to ensure the icon is rendered.
      /* eslint-disable mozilla/no-arbitrary-setTimeout */
      await new Promise(resolve => setTimeout(resolve, 200));
      let firstIconShotDataURL = TestUtils.screenshotArea(iconBox, window);

      let browserLoaded = BrowserTestUtils.browserLoaded(
        browser,
        false,
        EMPTY_PAGE_URL
      );
      BrowserTestUtils.startLoadingURIString(browser, EMPTY_PAGE_URL);
      let iconChanged = waitForFavicon(browser, EMPTY_ICON_URL);
      await Promise.all([browserLoaded, iconChanged]);
      Assert.equal(browser.mIconURL, EMPTY_ICON_URL, "Favicon was changed.");

      // Give some time to ensure the icon is rendered.
      /* eslint-disable mozilla/no-arbitrary-setTimeout */
      await new Promise(resolve => setTimeout(resolve, 200));
      let secondIconShotDataURL = TestUtils.screenshotArea(iconBox, window);

      Assert.notEqual(
        firstIconShotDataURL,
        secondIconShotDataURL,
        "Check the first icon didn't persist as the second one is invalid"
      );
    }
  );
});

async function addContentLinkForIconUrl(url, browser) {
  let iconChanged = waitForFavicon(browser, url);
  info("Adding <link> to: " + url);
  await ContentTask.spawn(browser, url, href => {
    let doc = content.document;
    let head = doc.head;
    let link = doc.createElement("link");
    link.rel = "icon";
    link.href = href;
    link.type = "image/png";
    head.appendChild(link);
  });
  info("Awaiting icon change event for:" + url);
  await iconChanged;
}
