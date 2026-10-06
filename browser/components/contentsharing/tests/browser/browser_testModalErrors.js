/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_tooManyLinks() {
  await withContentSharingMockServer(async server => {
    let tabs = Array.from({ length: 33 }, (_, i) => {
      return BrowserTestUtils.addTab(gBrowser, `https://example.com?${i}`);
    });

    await Promise.all(
      tabs.map(async t => {
        await BrowserTestUtils.browserLoaded(t.linkedBrowser);
      })
    );

    await ContentSharingUtils.handleShareTabs(tabs);

    Assert.equal(
      server.requests.length,
      1,
      "Server received exactly one request"
    );

    const body = server.requests[0].body;

    await assertContentSharingModal(window, {
      share: body,
      error: null,
      warning: WARNINGS.TOO_MANY_LINKS,
      url: server.mockResponse.url,
      isSchemaValid: true,
      isSignedIn: true,
    });

    Assert.equal(body.type, "tabs", "Share type is 'tabs'");
    Assert.equal(
      body.title,
      "30 tabs",
      "Title reflects tab count for tab shares"
    );
    Assert.equal(body.links.length, 30, "Share contains 30 links");
    Assert.equal(
      body.links[0].url,
      tabs[0].linkedBrowser.currentURI.displaySpec,
      "First link URL matches tab 1"
    );
    Assert.equal(
      body.links[1].url,
      tabs[1].linkedBrowser.currentURI.displaySpec,
      "Second link URL matches tab 2"
    );

    gBrowser.removeTabs(tabs);
  });
});

add_task(async function test_invalidSchemaGlean() {
  await withContentSharingMockServer(async () => {
    let tabs = [
      BrowserTestUtils.addTab(gBrowser, "about:blank"),
      BrowserTestUtils.addTab(gBrowser, "about:blank"),
    ];

    await Services.fog.testFlushAllChildren();
    Services.fog.testResetFOG();

    await ContentSharingUtils.handleShareTabs(tabs);

    await Services.fog.testFlushAllChildren();
    let gleanData = Glean.collectionShare.error.testGetValue();
    Assert.equal(gleanData.length, 1, "Should have one error event");
    Assert.equal(
      gleanData[0].extra.error_type,
      ERRORS.INVALID_SCHEMA,
      "Should have invalid schema error type"
    );

    window.gDialogBox.dialog.close();
    gBrowser.removeTabs(tabs);
  });
});

add_task(async function test_genericError() {
  await withContentSharingMockServer(async server => {
    let tabs = [
      BrowserTestUtils.addTab(gBrowser, "https://example.com"),
      BrowserTestUtils.addTab(gBrowser, "https://example.com?1"),
    ];

    await Promise.all(
      tabs.map(async t => {
        await BrowserTestUtils.browserLoaded(t.linkedBrowser);
      })
    );

    // Set the response status to something that will give an error
    server.reset();
    server.mockResponseStatus = 503;
    server.mockResponse = {};

    await ContentSharingUtils.handleShareTabs(tabs);

    Assert.equal(
      server.requests.length,
      5,
      "Server received exactly 5 requests"
    );

    const body = server.requests[0].body;

    await assertContentSharingModal(window, {
      share: body,
      error: ERRORS.GENERIC,
      warning: null,
      url: null,
      isSchemaValid: true,
      isSignedIn: true,
    });

    Assert.equal(body.type, "tabs", "Share type is 'tabs'");
    Assert.equal(
      body.title,
      "2 tabs",
      "Title reflects tab count for tab shares"
    );
    Assert.equal(body.links.length, 2, "Share contains 2 links");
    Assert.equal(
      body.links[0].url,
      tabs[0].linkedBrowser.currentURI.displaySpec,
      "First link URL matches tab 1"
    );
    Assert.equal(
      body.links[1].url,
      tabs[1].linkedBrowser.currentURI.displaySpec,
      "Second link URL matches tab 2"
    );

    gBrowser.removeTabs(tabs);
  });
});
