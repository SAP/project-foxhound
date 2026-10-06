/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ObliviousHTTP } = ChromeUtils.importESModule(
  "resource://gre/modules/ObliviousHTTP.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);
const { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);

let gHttpServer;

const TEST_CONTENT_TYPE = "image/jpeg";
const TEST_CONTENT_CHARSET = "UTF-8";
const TEST_CONTENT_TYPE_HEADER = `${TEST_CONTENT_TYPE};charset=${TEST_CONTENT_CHARSET}`;

/**
 * Waits for an nsICacheEntry to exist for urlString in the anonymous load
 * context with > 0 data size.
 *
 * @param {string} urlString
 *   The string of the URL to check for.
 * @returns {Promise<undefined>}
 */
async function waitForCacheEntry(urlString) {
  const lci = Services.loadContextInfo.anonymous;
  const storage = Services.cache2.diskCacheStorage(lci);
  const uri = Services.io.newURI(urlString);

  await TestUtils.waitForCondition(() => {
    try {
      return storage.exists(uri, "");
    } catch (e) {
      return false;
    }
  });

  let entry = await new Promise((resolve, reject) => {
    storage.asyncOpenURI(uri, "", Ci.nsICacheStorage.OPEN_READONLY, {
      onCacheEntryCheck: () => Ci.nsICacheEntryOpenCallback.ENTRY_WANTED,
      onCacheEntryAvailable: (foundEntry, isNew, status) => {
        if (Components.isSuccessCode(status)) {
          resolve(foundEntry);
        } else {
          reject(new Error(`Cache entry operation failed: ${status}`));
        }
      },
    });
  });

  await TestUtils.waitForCondition(() => {
    try {
      return entry.dataSize > 0;
    } catch (e) {
      return false;
    }
  });
}

add_setup(async function () {
  // Start HTTP server for cache testing
  gHttpServer = new HttpServer();
  gHttpServer.start(-1);

  // Set OHTTP preferences for testing
  Services.prefs.setCharPref(
    "browser.newtabpage.activity-stream.discoverystream.ohttp.configURL",
    "https://example.com/ohttp-config"
  );
  Services.prefs.setCharPref(
    "browser.newtabpage.activity-stream.discoverystream.ohttp.relayURL",
    "https://example.com/ohttp-relay"
  );

  registerCleanupFunction(async () => {
    await new Promise(resolve => gHttpServer.stop(resolve));
    Services.prefs.clearUserPref(
      "browser.newtabpage.activity-stream.discoverystream.ohttp.configURL"
    );
    Services.prefs.clearUserPref(
      "browser.newtabpage.activity-stream.discoverystream.ohttp.relayURL"
    );
  });
});

/**
 * Test that OHTTP responses populate the cache and subsequent requests use cache.
 */
add_task(async function test_ohttp_populates_cache_and_cache_hit() {
  const sandbox = sinon.createSandbox();

  try {
    MockOHTTPService.reset();

    // Stub ObliviousHTTP.getOHTTPConfig to avoid network requests
    sandbox
      .stub(ObliviousHTTP, "getOHTTPConfig")
      .resolves(new Uint8Array([1, 2, 3, 4]));

    const imageURL = "https://example.com/test-cache-population.jpg";
    const testURI = createTestOHTTPResourceURI(imageURL);

    // First request - should go via OHTTP and populate cache
    MockOHTTPService.shouldUseContentTypeHeader = TEST_CONTENT_TYPE_HEADER;
    const firstChannel = createTestChannel(testURI);

    let firstRequestData = "";
    await new Promise(resolve => {
      const listener = createDataCollectingListener((data, success) => {
        Assert.ok(success, "First request should succeed");
        firstRequestData = data;
        resolve();
      });

      firstChannel.asyncOpen(listener);
    });

    // Verify OHTTP service was called for first request
    Assert.ok(
      MockOHTTPService.channelCreated,
      "Should call OHTTP service for cache miss"
    );
    Assert.equal(
      MockOHTTPService.totalChannels,
      1,
      "Should make one OHTTP request"
    );
    Assert.greater(
      firstRequestData.length,
      0,
      "Should receive data from OHTTP"
    );

    // Reset mock service state for second request
    MockOHTTPService.channelCreated = false;

    await waitForCacheEntry(imageURL);
    Assert.ok(true, "Found cache entry.");

    // Second request - should hit cache without calling OHTTP
    const secondChannel = createTestChannel(testURI);

    let secondRequestData = "";
    let cacheHit = false;
    await new Promise(resolve => {
      const listener = createDataCollectingListener((data, success) => {
        Assert.ok(success, "Second request should succeed");
        secondRequestData = data;
        cacheHit = true;
        resolve();
      });

      secondChannel.asyncOpen(listener);
    });

    // Verify cache hit behavior
    Assert.ok(cacheHit, "Second request should succeed from cache");
    Assert.equal(
      secondChannel.contentType,
      TEST_CONTENT_TYPE,
      "Got the right content type from the cache"
    );
    Assert.equal(
      secondChannel.contentCharset,
      TEST_CONTENT_CHARSET,
      "Got the right content charset from the cache"
    );
    Assert.ok(
      !MockOHTTPService.channelCreated,
      "Should not call OHTTP service for cache hit"
    );
    Assert.equal(
      MockOHTTPService.totalChannels,
      1,
      "Should still be only one OHTTP request"
    );
    Assert.equal(
      firstRequestData,
      secondRequestData,
      "Cache hit should return same data as original request"
    );
  } finally {
    sandbox.restore();
  }
});

/**
 * Test OHTTP fallback when cache miss occurs.
 */
add_task(async function test_ohttp_fallback_on_cache_miss() {
  const sandbox = sinon.createSandbox();

  try {
    // Reset mock service state
    MockOHTTPService.reset();

    // Stub ObliviousHTTP.getOHTTPConfig to avoid network requests
    sandbox
      .stub(ObliviousHTTP, "getOHTTPConfig")
      .resolves(new Uint8Array([1, 2, 3, 4]));

    // Use a URL that won't be in cache
    const uncachedImageURL = `https://localhost:${gHttpServer.identity.primaryPort}/uncached-image.jpg`;
    const testURI = createTestOHTTPResourceURI(uncachedImageURL);
    const channel = createTestChannel(testURI);

    let loadCompleted = false;
    let receivedData = false;
    await new Promise(resolve => {
      const listener = createCompletionListener((success, hasData) => {
        loadCompleted = success;
        receivedData = hasData;
        resolve();
      });

      channel.asyncOpen(listener);
    });

    // Verify that the mock OHTTP service was called
    Assert.ok(
      MockOHTTPService.channelCreated,
      "Should call OHTTP service when cache miss occurs"
    );
    Assert.ok(loadCompleted, "Should load successfully via mocked OHTTP");
    Assert.ok(receivedData, "Should receive data via mocked OHTTP");

    // Verify the correct URLs were passed to the OHTTP service
    Assert.equal(
      MockOHTTPService.lastTargetURI.spec,
      uncachedImageURL,
      "Should request correct target URL via OHTTP"
    );
    Assert.equal(
      MockOHTTPService.lastRelayURI.spec,
      "https://example.com/ohttp-relay",
      "Should use correct relay URL"
    );
  } finally {
    sandbox.restore();
  }
});
