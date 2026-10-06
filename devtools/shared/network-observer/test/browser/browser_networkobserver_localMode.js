/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const LOCAL_FOLDER = "local-mode";

const TEST_ORIGIN = "firefox.localhost";
const TEST_URL = `https://${TEST_ORIGIN}/`;
const TEST_FOLDER_URL = `${TEST_URL}folder/`;
const TEST_FOLDER_PAGE_URL = `${TEST_FOLDER_URL}test.html`;
const TEST_404_URL = `${TEST_URL}404`;

const TEST_UNICODE_ORIGIN = "ʂ.com";
const TEST_UNICODE_URL = `https://${TEST_UNICODE_ORIGIN}/`;

add_task(async function testLocalMode() {
  await addTab("about:blank");

  const tabBrowserId = gBrowser.selectedBrowser.browserId;
  const networkObserver = new NetworkObserver({
    ignoreChannelFunction: channel =>
      // Only intercept requests related to the first opened tab
      channel.loadInfo.browsingContext.browserId != tabBrowserId,
    onNetworkEvent: event => {
      info("received a network event");
      return createNetworkEventOwner(event);
    },
  });

  const folder = getChromeDir(getResolvedURI(gTestPath));
  folder.append(LOCAL_FOLDER);
  info(" Set Local Mode to " + folder.path + "\n");
  networkObserver.setLocalModeMappings({
    [TEST_ORIGIN]: folder.path,
    [TEST_UNICODE_ORIGIN]: folder.path,
  });

  await loadURL(gBrowser.selectedBrowser, TEST_URL);

  info(
    "Assert that the correct local file content is displayed for the mapping's home page"
  );
  await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [TEST_URL],
    async pageUrl => {
      is(
        content.document.contentType,
        "text/html",
        "Ensure the index.html fallback html page is served with the right mime type"
      );
      is(
        content.document.querySelector("h1").textContent,
        "Hello local mode!",
        "The content of the HTML is the local file content"
      );
      is(
        content.location.href,
        pageUrl,
        "The location of the page is the test url"
      );
    }
  );

  await loadURL(gBrowser.selectedBrowser, TEST_FOLDER_URL);

  const loaded = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
  info(
    "Assert that the correct local file content is displayed for the mapping's folder"
  );
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    is(
      content.document.contentType,
      "text/html",
      "the html file is served with the right mime type"
    );
    const linkToHtmlFile = content.document.querySelector("a");
    is(
      linkToHtmlFile.textContent,
      "test.html",
      "The link is for the folder unique file"
    );
    info("Navigate via a <a> link");
    linkToHtmlFile.click();
  });
  info("Wait for click on the link to navigate to the new test page");
  await loaded;

  info(
    "Assert that the correct local file content is displayed for the mapping's opened link"
  );
  await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [TEST_FOLDER_PAGE_URL],
    async pageUrl => {
      is(
        content.document.querySelector("h1").textContent,
        "Test in a sub folder",
        "The content of the HTML is the local file content"
      );
      is(
        content.location.href,
        pageUrl,
        "The location of the page is the test in sub folder url"
      );
    }
  );

  await loadURL(gBrowser.selectedBrowser, TEST_404_URL);
  info(
    "Assert that the 404 page shows when there is no local file found for the mapping"
  );
  await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [TEST_404_URL],
    async pageUrl => {
      is(
        content.browsingContext.docShell.currentDocumentChannel.responseStatus,
        404,
        "The page has a 404 HTTP Response code"
      );
      is(
        content.document.querySelector("p").textContent,
        "No local file for: /404",
        "The content of the HTML is the 404 error page"
      );
      is(
        content.location.href,
        pageUrl,
        "The location of the page is the 404 url"
      );
    }
  );

  info("Assert that we can also load local mapping via a unicode origin");
  await loadURL(gBrowser.selectedBrowser, TEST_UNICODE_URL);
  await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [TEST_UNICODE_ORIGIN],
    async mappingOrigin => {
      is(
        content.document.querySelector("h1").textContent,
        "Hello local mode!",
        "The content of the HTML is the local file content"
      );
      is(
        content.location.host,
        // The location's host is ascii and so using "punycode" encoding
        new URL("https://" + mappingOrigin).host,
        "The location of the page is the test url"
      );
    }
  );

  info(
    "Open a new tab without network interception and assert that the mappings aren't working"
  );
  const secondTab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: TEST_URL,
    waitForLoad: false,
  });
  await BrowserTestUtils.waitForErrorPage(gBrowser.selectedBrowser);
  Assert.stringContains(
    gBrowser.selectedBrowser.documentURI.spec,
    "about:neterror"
  );

  BrowserTestUtils.removeTab(secondTab);
});
