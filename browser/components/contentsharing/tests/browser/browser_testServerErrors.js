/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_ServerErrors() {
  await withContentSharingMockServer(async server => {
    let shareResult = makeShareResult({
      share: {
        type: "tabs",
        title: "1 Tabs",
        links: [{ url: "https://example.com", title: "Example" }],
      },
    });

    shareResult = await ContentSharingUtils.createShareableLink(shareResult);

    Assert.equal(shareResult.url, server.mockShareURL, "Got share url");

    // Set the response status to something that can be retried
    server.reset();
    server.mockResponseStatus = 503;
    server.mockResponse = {};
    await Services.fog.testFlushAllChildren();
    Services.fog.testResetFOG();

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

    Assert.equal(server.requests.length, 5, "Server received 5 requests");

    let gleanData = Glean.collectionShare.error.testGetValue();
    Assert.equal(
      gleanData.length,
      5,
      "Should have the expected number of events"
    );
    Assert.equal(
      gleanData[0].extra.status_code,
      "503",
      "Should have expected status code"
    );

    // Set the response status to something that cannot be retried
    server.reset();
    server.mockResponseStatus = 401;
    server.mockResponse = {};
    await Services.fog.testFlushAllChildren();
    Services.fog.testResetFOG();

    shareResult = makeShareResult({
      share: {
        type: "tabs",
        title: "1 Tabs",
        links: [{ url: "https://example.com", title: "Example" }],
      },
    });
    await ContentSharingUtils.createShareableLink(shareResult);
    Assert.equal(server.requests.length, 1, "Server received one request");
    gleanData = Glean.collectionShare.error.testGetValue();
    Assert.equal(
      gleanData.length,
      1,
      "Should have the expected number of events"
    );
    Assert.equal(
      gleanData[0].extra.status_code,
      "401",
      "Should have expected status code"
    );

    // Set the response status to something that can be retried
    server.reset();
    server.mockResponseStatus = 503;
    server.mockResponse = {};
    await Services.fog.testFlushAllChildren();
    Services.fog.testResetFOG();

    shareResult = makeShareResult({
      share: {
        type: "tabs",
        title: "1 Tabs",
        links: [{ url: "https://example.com", title: "Example" }],
      },
    });
    let promise = ContentSharingUtils.createShareableLink(shareResult);
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(r => setTimeout(r, 100));

    server.mockResponseStatus = 201;
    server.mockResponse = { url: server.mockShareURL };

    shareResult = await promise;
    Assert.equal(shareResult.url, server.mockShareURL, "Got share url");
    Assert.greater(
      server.requests.length,
      1,
      "Server received more than one request"
    );
    gleanData = Glean.collectionShare.error.testGetValue();
    Assert.equal(
      gleanData.length,
      1,
      "Should have the expected number of events"
    );
    Assert.equal(
      gleanData[0].extra.status_code,
      "503",
      "Should have expected status code"
    );

    await Services.fog.testFlushAllChildren();
    Services.fog.testResetFOG();
  });
});
