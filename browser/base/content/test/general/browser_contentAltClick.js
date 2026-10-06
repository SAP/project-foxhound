/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Test for Bug 1109146.
 * The tests opens a new tab and alt + clicks to download files
 * and confirms those files are on the download list.
 *
 * The difference between this and the test "browser_contentAreaClick.js" is that
 * the code path in e10s uses the ClickHandler actor instead of browser.js::contentAreaClick() util.
 */
"use strict";

ChromeUtils.defineESModuleGetters(this, {
  Downloads: "resource://gre/modules/Downloads.sys.mjs",
});

function setup() {
  Services.prefs.setBoolPref("browser.altClickSave", true);

  let testPage =
    "data:text/html," +
    '<p><a id="commonlink" href="http://mochi.test/moz/?commonlink">Common link</a></p>' +
    '<p><math id="deprecated_mathlink" xmlns="http://www.w3.org/1998/Math/MathML" href="http://mochi.test/moz/?deprecated_mathlink"><mtext>Deprecated MathML Link</mtext></math></p>' +
    '<p><svg id="svgxlink" xmlns="http://www.w3.org/2000/svg" width="100px" height="50px" version="1.1"><a xlink:type="simple" xlink:href="http://mochi.test/moz/?svgxlink"><text transform="translate(10, 25)">SVG XLink</text></a></svg></p><br>' +
    '<p><svg id="invalidsvgxlink" xmlns="http://www.w3.org/2000/svg" width="100px" height="50px" version="1.1"><a xlink:type="simple" xlink:href="http://make:invalid/"><text transform="translate(10, 25)">Invalid SVG XLink</text></a></svg></p><br>' +
    '<span id="host"></span><script>document.getElementById("host").attachShadow({mode: "closed"}).appendChild(document.getElementById("commonlink").cloneNode(true));</script>' +
    '<p><math xmlns="http://www.w3.org/1998/Math/MathML"><a id="mathlink" href="http://mochi.test/moz/?mathlink"><mtext>MathML Link</mtext></a></math></p>' +
    '<p><svg id="svglink" xmlns="http://www.w3.org/2000/svg" width="100px" height="50px" version="1.1"><a href="http://mochi.test/moz/?svglink"><text transform="translate(10, 25)">SVG Link</text></a></svg></p><br>' +
    '<p><a href="http://mochi.test/moz/?ancestor_of_invalidmathlink"><math><a id="descendant_invalidmathlink" xmlns="http://www.w3.org/1998/Math/MathML" href="http://make:invalid/"><mtext>Descendant Invalid MathML Link</mtext></a></math></a></p><br>' +
    '<p><math><a href="http://mochi.test/moz/?ancestor_of_invalidcommonlink"><mtext><a id="descendant_invalidcommonlink" xmlns="http://www.w3.org/1999/xhtml" href="http://make:invalid/">Descendant Invalid Common Link</a></mtext></a></math></p><br>' +
    '<p><a href="http://mochi.test/moz/?ancestor_of_mathlink"><math><a id="descendant_mathlink" xmlns="http://www.w3.org/1998/Math/MathML" href="http://mochi.test/moz/?descendant_mathlink"><mtext>Descendant MathML Link</mtext></a></math></a></p><br>' +
    '<p><a href="http://mochi.test/moz/?ancestor_of_svglink"><svg id="descendant_svglink" xmlns="http://www.w3.org/2000/svg" width="100px" height="50px" version="1.1"><a href="http://mochi.test/moz/?descendant_svglink"><text transform="translate(10, 25)">Descendant SVG Link</text></a></svg></a></p><br>' +
    '<p><math><a id="ancestor_of_commonlink" href="http://mochi.test/moz/"><mtext><a id="descendant_commonlink" xmlns="http://www.w3.org/1999/xhtml" href="http://mochi.test/moz/?descendant_commonlink">Descendant Common Link</a></mtext></math></a></p><br>' +
    '<p><a id="invalidcommonlink" href="http://make:invalid/">Invalid Common link</a></p>' +
    '<iframe id="frame" src="https://test2.example.com:443/browser/browser/base/content/test/general/file_with_link_to_http.html"></iframe>';

  return BrowserTestUtils.openNewForegroundTab(gBrowser, testPage);
}

async function clean_up() {
  // Remove downloads.
  let downloadList = await Downloads.getList(Downloads.ALL);
  let downloads = await downloadList.getAll();
  for (let download of downloads) {
    await downloadList.remove(download);
    await download.finalize(true);
  }
  // Remove download history.
  await PlacesUtils.history.clear();

  Services.prefs.clearUserPref("browser.altClickSave");
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  });
});

add_task(async function test_alt_click() {
  await setup();

  let downloadList = await Downloads.getList(Downloads.ALL);
  let downloads = [];
  let downloadView;
  // When 1 download has been attempted then resolve the promise.
  let finishedAllDownloads = new Promise(resolve => {
    downloadView = {
      onDownloadAdded(aDownload) {
        downloads.push(aDownload);
        resolve();
      },
    };
  });
  await downloadList.addView(downloadView);
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#commonlink",
    { altKey: true },
    gBrowser.selectedBrowser
  );

  // Wait for all downloads to be added to the download list.
  await finishedAllDownloads;
  await downloadList.removeView(downloadView);

  is(downloads.length, 1, "1 downloads");
  is(
    downloads[0].source.url,
    "http://mochi.test/moz/?commonlink",
    "Downloaded #commonlink element"
  );

  await clean_up();
});

add_task(async function test_alt_click_shadow_dom() {
  await setup();

  let downloadList = await Downloads.getList(Downloads.ALL);
  let downloads = [];
  let downloadView;
  // When 1 download has been attempted then resolve the promise.
  let finishedAllDownloads = new Promise(resolve => {
    downloadView = {
      onDownloadAdded(aDownload) {
        downloads.push(aDownload);
        resolve();
      },
    };
  });
  await downloadList.addView(downloadView);
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#host",
    { altKey: true },
    gBrowser.selectedBrowser
  );

  // Wait for all downloads to be added to the download list.
  await finishedAllDownloads;
  await downloadList.removeView(downloadView);

  is(downloads.length, 1, "1 downloads");
  is(
    downloads[0].source.url,
    "http://mochi.test/moz/?commonlink",
    "Downloaded #commonlink element in shadow DOM."
  );

  await clean_up();
});

add_task(async function test_alt_click_on_xlinks() {
  await setup();

  const deprecatedMathMLhrefDisabled = Services.prefs.getBoolPref(
    "mathml.href_link_on_non_anchor_element.disabled"
  );
  let downloadList = await Downloads.getList(Downloads.ALL);
  let downloads = [];
  let downloadView;
  // When all downloads have been attempted then resolve the promise.
  let expectedDownloadCount = 3;
  if (!deprecatedMathMLhrefDisabled) {
    expectedDownloadCount++;
  }

  let finishedAllDownloads = new Promise(resolve => {
    downloadView = {
      onDownloadAdded(aDownload) {
        downloads.push(aDownload);
        if (downloads.length == expectedDownloadCount) {
          resolve();
        }
      },
    };
  });
  await downloadList.addView(downloadView);
  // Click an invalid link, this should neither throw nor trigger a download.
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#invalidcommonlink",
    { altKey: true },
    gBrowser.selectedBrowser
  );
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#invalidsvgxlink",
    { altKey: true },
    gBrowser.selectedBrowser
  );
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#svgxlink",
    { altKey: true },
    gBrowser.selectedBrowser
  );
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#mathlink",
    { altKey: true },
    gBrowser.selectedBrowser
  );
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#svglink",
    { altKey: true },
    gBrowser.selectedBrowser
  );
  if (!deprecatedMathMLhrefDisabled) {
    await BrowserTestUtils.synthesizeMouseAtCenter(
      "#deprecated_mathlink",
      { altKey: true },
      gBrowser.selectedBrowser
    );
  }

  // Wait for all downloads to be added to the download list.
  await finishedAllDownloads;
  await downloadList.removeView(downloadView);

  is(
    downloads.length,
    expectedDownloadCount,
    `${expectedDownloadCount} downloads`
  );
  is(
    downloads[0].source.url,
    "http://mochi.test/moz/?svgxlink",
    "Downloaded #svgxlink element"
  );
  is(
    downloads[1].source.url,
    "http://mochi.test/moz/?mathlink",
    "Downloaded #mathlink element"
  );
  is(
    downloads[2].source.url,
    "http://mochi.test/moz/?svglink",
    "Downloaded #svglink element"
  );
  if (!deprecatedMathMLhrefDisabled) {
    is(
      downloads[3].source.url,
      "http://mochi.test/moz/?deprecated_mathlink",
      "Downloaded #deprecated_mathlink element"
    );
  }

  await clean_up();
});

add_task(async function test_alt_click_on_nested_links() {
  await setup();

  let downloadList = await Downloads.getList(Downloads.ALL);
  let downloads = [];
  let downloadView;
  // When all downloads have been attempted then resolve the promise.
  const expectedDownloadCount = 5;
  let finishedAllDownloads = new Promise(resolve => {
    downloadView = {
      onDownloadAdded(aDownload) {
        downloads.push(aDownload);
        if (downloads.length == expectedDownloadCount) {
          resolve();
        }
      },
    };
  });
  await downloadList.addView(downloadView);
  // Clicking invalid links should hit the ancestor instead.
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#descendant_invalidmathlink",
    { altKey: true },
    gBrowser.selectedBrowser
  );
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#descendant_invalidcommonlink",
    { altKey: true },
    gBrowser.selectedBrowser
  );
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#descendant_mathlink",
    { altKey: true },
    gBrowser.selectedBrowser
  );
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#descendant_svglink",
    { altKey: true },
    gBrowser.selectedBrowser
  );
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#descendant_commonlink",
    { altKey: true },
    gBrowser.selectedBrowser
  );

  // Wait for all downloads to be added to the download list.
  await finishedAllDownloads;
  await downloadList.removeView(downloadView);

  is(
    downloads.length,
    expectedDownloadCount,
    `${expectedDownloadCount} downloads`
  );
  is(
    downloads[0].source.url,
    "http://mochi.test/moz/?ancestor_of_invalidmathlink",
    "Downloaded #ancestor_of_invalidmathlink element"
  );
  is(
    downloads[1].source.url,
    "http://mochi.test/moz/?ancestor_of_invalidcommonlink",
    "Downloaded #ancestor_of_invalidcommonlink element"
  );
  is(
    downloads[2].source.url,
    "http://mochi.test/moz/?descendant_mathlink",
    "Downloaded #descendant_mathlink element"
  );
  is(
    downloads[3].source.url,
    "http://mochi.test/moz/?descendant_svglink",
    "Downloaded #descendant_svglink element"
  );
  is(
    downloads[4].source.url,
    "http://mochi.test/moz/?descendant_commonlink",
    "Downloaded #descendant_commonlink element"
  );

  await clean_up();
});

// Alt+Click a link in a frame from another domain as the outer document.
add_task(async function test_alt_click_in_frame() {
  await setup();

  let downloadList = await Downloads.getList(Downloads.ALL);
  let downloads = [];
  let downloadView;
  // When the download has been attempted, resolve the promise.
  let finishedAllDownloads = new Promise(resolve => {
    downloadView = {
      onDownloadAdded(aDownload) {
        downloads.push(aDownload);
        resolve();
      },
    };
  });

  await downloadList.addView(downloadView);
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#linkToExample",
    { altKey: true },
    gBrowser.selectedBrowser.browsingContext.children[0]
  );

  // Wait for all downloads to be added to the download list.
  await finishedAllDownloads;
  await downloadList.removeView(downloadView);

  is(downloads.length, 1, "1 downloads");
  is(
    downloads[0].source.url,
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://example.org/",
    "Downloaded link in iframe."
  );

  await clean_up();
});
