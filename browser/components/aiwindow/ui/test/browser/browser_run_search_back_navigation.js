/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { RunSearch } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Tools.sys.mjs"
);

const PAGE_1 = "https://example.com/";
const SERP_URL = "https://example.org/";
const PAGE_3 = "https://example.net/";

function makeFakeConversation() {
  return {
    securityProperties: {
      setPrivateData() {},
      setUntrustedInput() {},
    },
    addSeenUrls() {},
  };
}

async function driveRunSearch(browser) {
  const sb = sinon.createSandbox();
  sb.stub(AIWindow, "performSearch").callsFake(async (_query, win) => {
    BrowserTestUtils.startLoadingURIString(
      win.gBrowser.selectedBrowser,
      SERP_URL
    );
  });
  try {
    await RunSearch.runSearch(
      { query: "test query" },
      browser.browsingContext,
      makeFakeConversation()
    );
  } finally {
    sb.restore();
  }
}

add_task(async function test_runSearch_marks_serp_entry_as_interacted() {
  await BrowserTestUtils.withNewTab(PAGE_1, async browser => {
    await driveRunSearch(browser);

    const sh = browser.browsingContext.sessionHistory;
    const serp = sh.getEntryAtIndex(sh.index);

    Assert.equal(serp.URI.spec, SERP_URL, "Current entry should be the SERP");
    Assert.ok(
      serp.hasUserInteraction,
      "Assistant-initiated SERP entry should have hasUserInteraction set"
    );
  });
});

add_task(async function test_back_lands_on_serp_not_skipping_past_it() {
  await BrowserTestUtils.withNewTab(PAGE_1, async browser => {
    await driveRunSearch(browser);

    const onPage3 = BrowserTestUtils.browserLoaded(browser, false, PAGE_3);
    BrowserTestUtils.startLoadingURIString(browser, PAGE_3);
    await onPage3;

    const onSerp = BrowserTestUtils.waitForLocationChange(gBrowser, SERP_URL);
    gBrowser.goBack(true);
    await onSerp;

    Assert.equal(
      browser.currentURI.spec,
      SERP_URL,
      "Back from PAGE_3 should land on the SERP rather than skip past it"
    );
  });
});
