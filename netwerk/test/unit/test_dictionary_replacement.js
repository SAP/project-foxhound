/**
 * Tests for HTTP Compression Dictionary replacement functionality
 * - Verify that when a dictionary resource is reloaded without Use-As-Dictionary,
 *   the dictionary metadata is properly removed
 * - Test that Available-Dictionary header is no longer sent for matching resources
 *   after dictionary is replaced with non-dictionary content
 *
 * This tests the fix for the race condition in DictionaryOriginReader::OnCacheEntryAvailable
 * where mEntry was not set for existing origins loaded from disk.
 */

"use strict";

// Load cache helpers
Services.scriptloader.loadSubScript("resource://test/head_cache.js", this);

const { NodeHTTPSServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

const DICTIONARY_CONTENT = "DICTIONARY_CONTENT_FOR_COMPRESSION_TEST_DATA";
const REPLACEMENT_CONTENT = "REPLACED_CONTENT_WITHOUT_DICTIONARY_HEADER";

let server = null;

add_setup(async function () {
  Services.prefs.setBoolPref("network.http.dictionaries.enable", true);

  server = new NodeHTTPSServer();
  await server.start();

  // Clear any existing cache
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  evict_cache_entries("all", lci);

  registerCleanupFunction(async () => {
    try {
      await server.stop();
    } catch (e) {
      // Ignore server stop errors during cleanup
    }
  });
});

function makeChan(url, bypassCache = false) {
  let chan = NetUtil.newChannel({
    uri: url,
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
  }).QueryInterface(Ci.nsIHttpChannel);

  if (bypassCache) {
    chan.loadFlags |= Ci.nsIRequest.LOAD_BYPASS_CACHE;
  }

  return chan;
}

function channelOpenPromise(chan, intermittentFail = false) {
  return new Promise(resolve => {
    function finish(req, buffer) {
      resolve([req, buffer]);
    }
    if (intermittentFail) {
      chan.asyncOpen(
        new SimpleChannelListener(finish, null, CL_ALLOW_UNKNOWN_CL)
      );
    } else {
      chan.asyncOpen(new ChannelListener(finish, null, CL_ALLOW_UNKNOWN_CL));
    }
  });
}

function verifyDictionaryStored(url, shouldExist) {
  return new Promise(resolve => {
    let lci = Services.loadContextInfo.custom(false, {
      partitionKey: `(https,localhost)`,
    });
    asyncCheckCacheEntryPresence(url, "disk", shouldExist, lci, resolve);
  });
}

function syncCache() {
  return new Promise(resolve => {
    syncWithCacheIOThread(resolve, true);
  });
}

// Clear in-memory DictionaryCache and purge cache entries from memory.
// This forces dictionary origin entries to be reloaded from disk on next access,
// triggering DictionaryOriginReader::OnCacheEntryAvailable.
async function clearDictionaryCacheAndPurgeMemory() {
  // Clear the DictionaryCache in-memory hashmap
  let testingInterface = Services.cache2.QueryInterface(Ci.nsICacheTesting);
  testingInterface.clearDictionaryCacheMemory();

  // Force GC to release references to cache entries.  Probably not strictly needed
  gc();
}

/**
 * Test that replacing a dictionary resource with non-dictionary content
 * properly removes the dictionary metadata.
 *
 * Steps:
 * 1. Load a resource with Use-As-Dictionary header (creates dictionary entry)
 * 2. Verify Available-Dictionary is sent for matching resources
 * 3. Force-reload the dictionary resource WITHOUT Use-As-Dictionary
 * 4. Verify Available-Dictionary is NO LONGER sent for matching resources
 */
add_task(async function test_dictionary_replacement_removes_metadata() {
  // Track Available-Dictionary headers received by server
  let receivedAvailableDictionary = null;

  // Register dictionary endpoint that returns dictionary content
  await server.registerPathHandler(
    "/dict/resource",
    function (request, response) {
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": 'match="/matching/*", id="test-dict", type=raw',
        "Cache-Control": "max-age=3600",
      });
      response.end("DICTIONARY_CONTENT_FOR_COMPRESSION_TEST_DATA", "binary");
    }
  );

  // Register matching resource endpoint
  await server.registerPathHandler(
    "/matching/test",
    function (request, response) {
      // Store the Available-Dictionary header value in global for later retrieval
      global.lastAvailableDictionary =
        request.headers["available-dictionary"] || null;
      response.writeHead(200, {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
      });
      response.end("CONTENT_THAT_SHOULD_MATCH_DICTIONARY", "binary");
    }
  );

  dump("**** Step 1: Load dictionary resource with Use-As-Dictionary\n");

  let dictUrl = `https://localhost:${server.port()}/dict/resource`;
  let chan = makeChan(dictUrl);
  let [, data] = await channelOpenPromise(chan);

  Assert.equal(data, DICTIONARY_CONTENT, "Dictionary content should match");

  // Verify dictionary is stored in cache
  await verifyDictionaryStored(dictUrl, true);

  // Sync to ensure everything is written to disk
  await syncCache();

  dump("**** Step 1.5: Clear in-memory caches to force reload from disk\n");

  // Clear in-memory DictionaryCache and purge cache entries from memory.
  // This forces dictionary entries to be reloaded from disk via
  // DictionaryOriginReader::OnCacheEntryAvailable, which is the code path
  // with the bug we're testing.
  await clearDictionaryCacheAndPurgeMemory();

  dump(
    "**** Step 2: Verify Available-Dictionary is sent for matching resource\n"
  );

  let matchingUrl = `https://localhost:${server.port()}/matching/test`;
  chan = makeChan(matchingUrl);
  await channelOpenPromise(chan);

  // Get the Available-Dictionary value from the server
  receivedAvailableDictionary = await server.execute(
    "global.lastAvailableDictionary"
  );

  Assert.notStrictEqual(
    receivedAvailableDictionary,
    null,
    "Available-Dictionary header should be sent for matching resource"
  );
  Assert.ok(
    receivedAvailableDictionary.includes(":"),
    "Available-Dictionary should contain a hash"
  );

  dump(`**** Received Available-Dictionary: ${receivedAvailableDictionary}\n`);

  dump(
    "**** Step 3: Force-reload dictionary resource WITHOUT Use-As-Dictionary\n"
  );

  // Re-register the dictionary endpoint to return content WITHOUT Use-As-Dictionary
  await server.registerPathHandler(
    "/dict/resource",
    function (request, response) {
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "max-age=3600",
        // No Use-As-Dictionary header!
      });
      response.end("REPLACED_CONTENT_WITHOUT_DICTIONARY_HEADER", "binary");
    }
  );

  chan = makeChan(dictUrl, true /* bypassCache */);
  [, data] = await channelOpenPromise(chan);

  Assert.equal(data, REPLACEMENT_CONTENT, "Replacement content should match");

  // Sync to ensure cache operations complete
  await syncCache();

  dump("**** Step 4: Verify Available-Dictionary is NOT sent anymore\n");

  // Reset the server's stored value
  await server.execute("global.lastAvailableDictionary = null");

  // Now request the matching resource again
  chan = makeChan(matchingUrl);
  await channelOpenPromise(chan);

  receivedAvailableDictionary = await server.execute(
    "global.lastAvailableDictionary"
  );

  Assert.equal(
    receivedAvailableDictionary,
    null,
    "Available-Dictionary header should NOT be sent after dictionary is replaced"
  );

  dump("**** Test passed: Dictionary metadata was properly removed\n");
});

/**
 * Test the same scenario but with gzip-compressed replacement content.
 * This simulates the real-world case where a server might return
 * compressed content without Use-As-Dictionary.
 */
add_task(async function test_dictionary_replacement_with_compressed_content() {
  dump("**** Clear cache and start fresh\n");
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  evict_cache_entries("all", lci);

  // Also clear in-memory DictionaryCache to start fresh
  let testingInterface = Services.cache2.QueryInterface(Ci.nsICacheTesting);
  testingInterface.clearDictionaryCacheMemory();

  await syncCache();

  let receivedAvailableDictionary = null;

  // Register dictionary endpoint
  await server.registerPathHandler(
    "/dict/compressed",
    function (request, response) {
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary":
          'match="/compressed-match/*", id="compressed-dict", type=raw',
        "Cache-Control": "max-age=3600",
      });
      response.end("DICTIONARY_FOR_COMPRESSED_TEST", "binary");
    }
  );

  // Register matching resource endpoint
  await server.registerPathHandler(
    "/compressed-match/test",
    function (request, response) {
      global.lastCompressedAvailDict =
        request.headers["available-dictionary"] || null;
      response.writeHead(200, {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
      });
      response.end("MATCHING_CONTENT", "binary");
    }
  );

  dump("**** Step 1: Load dictionary resource with Use-As-Dictionary\n");

  let dictUrl = `https://localhost:${server.port()}/dict/compressed`;
  let chan = makeChan(dictUrl);
  let [, data] = await channelOpenPromise(chan);

  Assert.equal(
    data,
    "DICTIONARY_FOR_COMPRESSED_TEST",
    "Dictionary content should match"
  );
  await verifyDictionaryStored(dictUrl, true);
  await syncCache();

  dump("**** Step 1.5: Clear in-memory caches to force reload from disk\n");
  await clearDictionaryCacheAndPurgeMemory();

  dump("**** Step 2: Verify Available-Dictionary is sent\n");

  let matchingUrl = `https://localhost:${server.port()}/compressed-match/test`;
  chan = makeChan(matchingUrl);
  await channelOpenPromise(chan);

  receivedAvailableDictionary = await server.execute(
    "global.lastCompressedAvailDict"
  );
  Assert.notStrictEqual(
    receivedAvailableDictionary,
    null,
    "Available-Dictionary should be sent initially"
  );

  dump(
    "**** Step 3: Force-reload with gzip-compressed content (no Use-As-Dictionary)\n"
  );

  // Re-register to return gzip-compressed content without Use-As-Dictionary
  await server.registerPathHandler(
    "/dict/compressed",
    function (request, response) {
      // Gzip-compressed version of "GZIP_COMPRESSED_REPLACEMENT"
      // Using Node.js zlib in the handler
      const zlib = require("zlib");
      const compressed = zlib.gzipSync("GZIP_COMPRESSED_REPLACEMENT");

      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "gzip",
        "Cache-Control": "max-age=3600",
        // No Use-As-Dictionary header!
      });
      response.end(compressed);
    }
  );

  chan = makeChan(dictUrl, true /* bypassCache */);
  [, data] = await channelOpenPromise(chan);

  // Content should be decompressed by the channel
  Assert.equal(
    data,
    "GZIP_COMPRESSED_REPLACEMENT",
    "Decompressed replacement content should match"
  );

  dump("**** Step 4: Verify Available-Dictionary is NOT sent anymore\n");

  await server.execute("global.lastCompressedAvailDict = null");
  chan = makeChan(matchingUrl);
  await channelOpenPromise(chan);

  receivedAvailableDictionary = await server.execute(
    "global.lastCompressedAvailDict"
  );

  Assert.equal(
    receivedAvailableDictionary,
    null,
    "Available-Dictionary should NOT be sent after dictionary replaced with compressed content"
  );

  dump(
    "**** Test passed: Dictionary metadata removed even with compressed replacement\n"
  );
});

/**
 * Test that multiple sequential replacements work correctly.
 * Dictionary -> Non-dictionary -> Dictionary -> Non-dictionary
 */
add_task(async function test_dictionary_multiple_replacements() {
  dump("**** Clear cache and start fresh\n");
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  evict_cache_entries("all", lci);

  // Also clear in-memory DictionaryCache to start fresh
  let testingInterface = Services.cache2.QueryInterface(Ci.nsICacheTesting);
  testingInterface.clearDictionaryCacheMemory();

  await syncCache();

  let receivedAvailableDictionary = null;

  // Register matching resource endpoint
  await server.registerPathHandler(
    "/multi-match/test",
    function (request, response) {
      global.lastMultiAvailDict =
        request.headers["available-dictionary"] || null;
      response.writeHead(200, {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
      });
      response.end("MULTI_MATCHING_CONTENT", "binary");
    }
  );

  let dictUrl = `https://localhost:${server.port()}/dict/multi`;
  let matchingUrl = `https://localhost:${server.port()}/multi-match/test`;

  // === First: Load as dictionary ===
  dump("**** Load as dictionary (first time)\n");
  await server.registerPathHandler("/dict/multi", function (request, response) {
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Use-As-Dictionary":
        'match="/multi-match/*", id="multi-dict-1", type=raw',
      "Cache-Control": "max-age=3600",
    });
    response.end("DICTIONARY_CONTENT_V1", "binary");
  });

  let chan = makeChan(dictUrl);
  await channelOpenPromise(chan);
  await syncCache();

  // Clear in-memory caches to force reload from disk
  await clearDictionaryCacheAndPurgeMemory();

  chan = makeChan(matchingUrl);
  await channelOpenPromise(chan);
  receivedAvailableDictionary = await server.execute(
    "global.lastMultiAvailDict"
  );
  Assert.notStrictEqual(
    receivedAvailableDictionary,
    null,
    "Available-Dictionary should be sent (first dictionary)"
  );

  // === Second: Replace with non-dictionary ===
  dump("**** Replace with non-dictionary\n");
  await server.registerPathHandler("/dict/multi", function (request, response) {
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "max-age=3600",
    });
    response.end("NON_DICTIONARY_CONTENT", "binary");
  });

  chan = makeChan(dictUrl, true);
  await channelOpenPromise(chan);
  await syncCache();
  await new Promise(resolve => do_timeout(200, resolve));

  await server.execute("global.lastMultiAvailDict = null");
  chan = makeChan(matchingUrl);
  await channelOpenPromise(chan);
  receivedAvailableDictionary = await server.execute(
    "global.lastMultiAvailDict"
  );
  Assert.equal(
    receivedAvailableDictionary,
    null,
    "Available-Dictionary should NOT be sent (after first replacement)"
  );

  // === Third: Load as dictionary again ===
  dump("**** Load as dictionary (second time)\n");
  await server.registerPathHandler("/dict/multi", function (request, response) {
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Use-As-Dictionary":
        'match="/multi-match/*", id="multi-dict-2", type=raw',
      "Cache-Control": "max-age=3600",
    });
    response.end("DICTIONARY_CONTENT_V2", "binary");
  });

  chan = makeChan(dictUrl, true);
  await channelOpenPromise(chan);
  await syncCache();

  // Clear in-memory caches to force reload from disk
  await clearDictionaryCacheAndPurgeMemory();

  chan = makeChan(matchingUrl);
  await channelOpenPromise(chan);
  receivedAvailableDictionary = await server.execute(
    "global.lastMultiAvailDict"
  );
  Assert.notStrictEqual(
    receivedAvailableDictionary,
    null,
    "Available-Dictionary should be sent (second dictionary)"
  );

  // === Fourth: Replace with non-dictionary again ===
  dump("**** Replace with non-dictionary again\n");
  await server.registerPathHandler("/dict/multi", function (request, response) {
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "max-age=3600",
    });
    response.end("NON_DICTIONARY_CONTENT_V2", "binary");
  });

  chan = makeChan(dictUrl, true);
  await channelOpenPromise(chan);
  await syncCache();
  await new Promise(resolve => do_timeout(200, resolve));

  await server.execute("global.lastMultiAvailDict = null");
  chan = makeChan(matchingUrl);
  await channelOpenPromise(chan);
  receivedAvailableDictionary = await server.execute(
    "global.lastMultiAvailDict"
  );
  Assert.equal(
    receivedAvailableDictionary,
    null,
    "Available-Dictionary should NOT be sent (after second replacement)"
  );

  dump("**** Test passed: Multiple replacements work correctly\n");
});

/**
 * Test that hash mismatch during dictionary load causes the request to fail
 * and the corrupted dictionary entry to be removed.
 *
 * Steps:
 * 1. Load a resource with Use-As-Dictionary header (creates dictionary entry)
 * 2. Verify Available-Dictionary is sent for matching resources
 * 3. Corrupt the hash using the testing API
 * 4. Clear memory cache to force reload from disk
 * 5. Request a matching resource - dictionary prefetch should fail
 * 6. Verify the dictionary entry was removed (Available-Dictionary no longer sent)
 */
add_task(async function test_dictionary_hash_mismatch() {
  dump("**** Clear cache and start fresh\n");
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  evict_cache_entries("all", lci);

  let testingInterface = Services.cache2.QueryInterface(Ci.nsICacheTesting);
  testingInterface.clearDictionaryCacheMemory();

  await syncCache();

  let receivedAvailableDictionary = null;

  // Register dictionary endpoint
  await server.registerPathHandler(
    "/dict/hash-test",
    function (request, response) {
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary":
          'match="/hash-match/*", id="hash-test-dict", type=raw',
        "Cache-Control": "max-age=3600",
      });
      response.end("DICTIONARY_FOR_HASH_TEST", "binary");
    }
  );

  // Register matching resource endpoint
  await server.registerPathHandler(
    "/hash-match/test",
    function (request, response) {
      global.lastHashTestAvailDict =
        request.headers["available-dictionary"] || null;
      response.writeHead(200, {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
      });
      response.end("HASH_MATCHING_CONTENT", "binary");
    }
  );

  dump("**** Step 1: Load dictionary resource with Use-As-Dictionary\n");

  let dictUrl = `https://localhost:${server.port()}/dict/hash-test`;
  let chan = makeChan(dictUrl);
  let [, data] = await channelOpenPromise(chan);

  Assert.equal(
    data,
    "DICTIONARY_FOR_HASH_TEST",
    "Dictionary content should match"
  );
  await verifyDictionaryStored(dictUrl, true);
  await syncCache();

  dump("**** Step 2: Verify Available-Dictionary is sent\n");

  let matchingUrl = `https://localhost:${server.port()}/hash-match/test`;
  chan = makeChan(matchingUrl);
  await channelOpenPromise(chan);

  receivedAvailableDictionary = await server.execute(
    "global.lastHashTestAvailDict"
  );
  Assert.notStrictEqual(
    receivedAvailableDictionary,
    null,
    "Available-Dictionary should be sent initially"
  );

  dump("**** Step 3: Corrupt the dictionary hash\n");

  testingInterface.corruptDictionaryHash(dictUrl);

  dump("**** Step 4: Clear dictionary data to force reload from disk\n");

  // Clear dictionary data while keeping the corrupted hash.
  // When next prefetch happens, data will be reloaded and compared
  // against the corrupted hash, causing a mismatch.
  testingInterface.clearDictionaryDataForTesting(dictUrl);

  dump(
    "**** Step 5: Request matching resource - should fail due to hash mismatch\n"
  );

  await server.execute("global.lastHashTestAvailDict = null");

  // The request for the matching resource will try to prefetch the dictionary,
  // which will fail due to hash mismatch. The channel should be cancelled.
  chan = makeChan(matchingUrl);
  try {
    await channelOpenPromise(chan, true); // intermittent failure
  } catch (e) {
    dump(`**** Request failed with: ${e}\n`);
  }

  // Note: The request may or may not fail depending on timing. The important
  // thing is that the dictionary entry should be removed.

  dump("**** Step 6: Verify dictionary entry was removed\n");

  // Wait a bit for the removal to complete
  await syncCache();

  await server.execute("global.lastHashTestAvailDict = null");
  chan = makeChan(matchingUrl);
  await channelOpenPromise(chan);

  receivedAvailableDictionary = await server.execute(
    "global.lastHashTestAvailDict"
  );
  Assert.equal(
    receivedAvailableDictionary,
    null,
    "Available-Dictionary should NOT be sent after dictionary was removed due to hash mismatch"
  );

  dump("**** Test passed: Hash mismatch properly handled\n");
});

// Cleanup
add_task(async function cleanup() {
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  evict_cache_entries("all", lci);
  dump("**** All dictionary replacement tests completed\n");
});
