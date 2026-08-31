/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_Server410Response() {
  await withContentSharingMockServer(async server => {
    Assert.ok(
      Services.prefs.getBoolPref("browser.contentsharing.enabled"),
      "Feature is enabled"
    );
    Assert.notEqual(
      Services.prefs.getStringPref("browser.contentsharing.server.url", ""),
      "",
      "Server URL is set"
    );

    let shareResult = makeShareResult({
      share: {
        type: "tabs",
        title: "1 Tabs",
        links: [{ url: "https://example.com", title: "Example" }],
      },
    });

    shareResult = await ContentSharingUtils.createShareableLink(shareResult);

    Assert.equal(shareResult.url, server.mockShareURL, "Got share url");

    // Now set the response to 410
    server.reset();
    server.mockResponseStatus = 410;
    server.mockResponse = {};

    shareResult = makeShareResult({
      share: {
        type: "tabs",
        title: "1 Tabs",
        links: [{ url: "https://example.com", title: "Example" }],
      },
    });

    shareResult = await ContentSharingUtils.createShareableLink(shareResult);
    Assert.strictEqual(
      shareResult.url,
      null,
      "The server never returned a valid response"
    );

    Assert.equal(server.requests.length, 1, "Server received 1 requests");

    Assert.ok(
      !Services.prefs.getBoolPref("browser.contentsharing.enabled"),
      "Feature is disabled"
    );
    Assert.equal(
      Services.prefs.getStringPref("browser.contentsharing.server.url", ""),
      "",
      "Server URL is unset"
    );
  });
});
