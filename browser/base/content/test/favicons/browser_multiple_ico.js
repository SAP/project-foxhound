/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const TEST_ROOT =
  "http://mochi.test:8888/browser/browser/base/content/test/favicons/";

const PAGE_URL = TEST_ROOT + "file_multiple_ico.html";
// An ICO file with three BMP images
const ICO_WITH_BMP_URL = TEST_ROOT + "file_multiple.ico";
// An ICO file with three PNG images (with the same colors/sizes as the file above)
// The encoding differs slightly depending on the zlib implementation.
const ICO_WITH_PNG_DATA_URL = AppConstants.USE_LIBZ_RS
  ? `data:image/x-icon;base64,AAABAAMAAAAAAAEAIABNAAAANgAAAAAAAAABACAATAAAAIMAAAAAAAAAAQAgAEwAAADPAAAAiVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYPj/n4GBgYERxgAAKAUD/zojOmwAAAAASUVORK5CYIKJUE5HDQoaCgAAAA1JSERSAAAABAAAAAQIBgAAAKnxnn4AAAATSURBVAhbY2T4z/ifAQkwki4AADxfCAHpZAkkAAAAAElFTkSuQmCCiVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVQYV2P8x8DwnwEPYBwZCgAYdw/xpf5XXwAAAABJRU5ErkJggg==`
  : `data:image/x-icon;base64,AAABAAMAAAAAAAEAIABLAAAANgAAAAAAAAABACAATAAAAIEAAAAAAAAAAQAgAEwAAADNAAAAiVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVQIW2NkYPj/nwEIGGEMACgFA/+JPWuRAAAAAElFTkSuQmCCiVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAE0lEQVQIW2Nk+M/4nwEJMJIuAAA8XwgB6WQJJAAAAABJRU5ErkJggolQTkcNChoKAAAADUlIRFIAAAAIAAAACAgGAAAAxA++iwAAABNJREFUGFdj/MfA8J8BD2AcGQoAGHcP8aX+V18AAAAASUVORK5CYII=`;

add_task(async function () {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: PAGE_URL },
    async browser => {
      await waitForFavicon(browser, ICO_WITH_BMP_URL);
      is(
        browser.mIconURL,
        ICO_WITH_PNG_DATA_URL,
        "Got PNG ICO with correct image data"
      );
    }
  );
});
