/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { ImageTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/ImageTestUtils.sys.mjs"
);

const TEST_ROOT =
  "http://mochi.test:8888/browser/browser/base/content/test/favicons/";

const PAGE_URL = TEST_ROOT + "file_favicon_svg.html";
const SVG_URL = TEST_ROOT + "file_favicon.svg";

const SVG_DATA_URL = `data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8c3R5bGU+CiAgICA6cm9vdCB7IGNvbG9yLXNjaGVtZTogbGlnaHQgZGFyazsgfQogICAgcmVjdCB7IGZpbGw6IGxpZ2h0LWRhcmsoZ3JlZW4sIGJsdWUpOyB9CiAgPC9zdHlsZT4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgLz4KPC9zdmc+Cg==`;

const LIGHT_PNG_GREEN = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHElEQVQ4T2NkaGD4z0ABYBw1YNSAUQPAYBgYAACDTRgBSE6IpwAAAABJRU5ErkJggg==`;
const DARK_PNG_BLUE = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGklEQVR42mNkYPj/n4ECwDhqwKgBowYMFwMAhfQf8VdPb2UAAAAASUVORK5CYII= `;

async function testIconImage(browser, tabIconImg, dark) {
  let expectedParams = new URLSearchParams({
    url: SVG_DATA_URL,
    colorScheme: dark ? "dark" : "light",
    contentParentId:
      browser.browsingContext.currentWindowGlobal.contentParentId,
    width: 16,
    height: 16,
  });

  is(
    tabIconImg.src,
    "moz-remote-image://?" + expectedParams,
    "Image was loaded with the right moz-remote-image: URL"
  );

  if (!tabIconImg.complete) {
    info("Awaiting tab-icon-image load");
    await new Promise(resolve =>
      tabIconImg.addEventListener("load", resolve, { once: true })
    );
  }

  let screenshotDataURL = TestUtils.screenshotArea(tabIconImg, window);
  await ImageTestUtils.assertEqualImage(
    window,
    screenshotDataURL,
    dark ? DARK_PNG_BLUE : LIGHT_PNG_GREEN,
    `Got ${dark ? "blue" : "green"} favicon`
  );
}

add_task(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.tabs.remoteSVGIconDecoding", true],
      ["ui.systemUsesDarkTheme", 0],
    ],
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: PAGE_URL, waitForLoad: false },
    async browser => {
      await waitForFavicon(browser, SVG_URL);
      is(browser.mIconURL, SVG_DATA_URL, "Got the SVG data URL");

      let tabIconImg = gBrowser
        .getTabForBrowser(browser)
        .querySelector(".tab-icon-image");

      await testIconImage(browser, tabIconImg, false);

      info("Switching to dark mode");

      let prefersColorSchemeChange = new Promise(resolve =>
        window
          .matchMedia("(prefers-color-scheme: dark)")
          .addEventListener("change", resolve, { once: true })
      );

      await SpecialPowers.pushPrefEnv({
        set: [["ui.systemUsesDarkTheme", 1]],
      });

      info("Waiting for prefers-color-scheme change");
      await prefersColorSchemeChange;

      await testIconImage(browser, tabIconImg, true);
    }
  );
});
