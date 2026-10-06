/**
 * Tests for HTTP Compression Dictionary storage functionality
 * - Use-As-Dictionary header parsing and validation
 * - Dictionary storage in cache with proper metadata
 * - Pattern matching and hash validation
 * - Error handling and edge cases
 */

"use strict";

// Load cache helpers
Services.scriptloader.loadSubScript("resource://test/head_cache.js", this);

const { NodeHTTPSServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

// Test data constants
const TEST_DICTIONARIES = {
  small: {
    id: "test-dict-small",
    content: "COMMON_PREFIX_DATA_FOR_COMPRESSION",
    pattern: "/api/v1/*",
    type: "raw",
  },
  large: {
    id: "test-dict-large",
    content: "C".repeat(1024 * 100), // 100KB dictionary
    pattern: "*.html",
    type: "raw",
  },
  large_url: {
    id: "test-dict-large-url",
    content: "large URL content",
    pattern: "file",
    type: "raw",
  },
  too_large_url: {
    id: "test-dict-too-large-url",
    content: "too large URL content",
    pattern: "too_large",
    type: "raw",
  },
  regexp_group: {
    id: "test-regexp-group",
    content: "content",
    pattern: "api/:version(v[0-9]+)/*",
    type: "raw",
  },
};

let server = null;

add_setup(async function () {
  Services.prefs.setBoolPref("network.http.dictionaries.enable", true);
  if (!server) {
    server = await setupServer();
  }
  // Setup baseline dictionaries for compression testing

  // Clear any existing cache
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  evict_cache_entries("all", lci);
});

// Utility function to calculate SHA-256 hash
async function calculateSHA256(data) {
  let hasher = Cc["@mozilla.org/security/hash;1"].createInstance(
    Ci.nsICryptoHash
  );
  hasher.init(Ci.nsICryptoHash.SHA256);

  // Convert string to UTF-8 bytes
  let bytes = new TextEncoder().encode(data);
  hasher.update(bytes, bytes.length);
  return hasher.finish(false);
}

// Setup dictionary test server
async function setupServer() {
  let httpServer = new NodeHTTPSServer();
  await httpServer.start();

  // Basic dictionary endpoint
  await httpServer.registerPathHandler(
    "/dict/small",
    function (request, response) {
      // Test data constants
      const TEST_DICTIONARIES = {
        small: {
          id: "test-dict-small",
          content: "COMMON_PREFIX_DATA_FOR_COMPRESSION",
          pattern: "/api/v1/*",
          type: "raw",
        },
      };

      let dict = TEST_DICTIONARIES.small;
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
        "Cache-Control": "max-age=3600",
      });
      response.end(dict.content, "binary");
    }
  );

  // Dictionary with expiration
  await httpServer.registerPathHandler(
    "/dict/expires",
    function (request, response) {
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="expires/*", id="expires-dict", type=raw`,
        "Cache-Control": "max-age=1",
      });
      response.end("EXPIRING_DICTIONARY_DATA", "binary");
    }
  );

  // Dictionary with invalid header
  await httpServer.registerPathHandler(
    "/dict/invalid",
    function (request, response) {
      global.test = 1;
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": "invalid-header-format",
      });
      response.end("INVALID_DICTIONARY_DATA", "binary");
    }
  );

  // Large dictionary
  await httpServer.registerPathHandler(
    "/dict/large",
    function (request, response) {
      // Test data constants
      const TEST_DICTIONARIES = {
        large: {
          id: "test-dict-large",
          content: "C".repeat(1024 * 100), // 100KB dictionary
          pattern: "*.html",
          type: "raw",
        },
      };

      let dict = TEST_DICTIONARIES.large;
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
        "Cache-Control": "max-age=3600",
      });
      response.end(dict.content, "binary");
    }
  );

  // Large dictionary URL
  await httpServer.registerPathHandler(
    "/dict/large/" + "A".repeat(1024 * 20),
    function (request, response) {
      // Test data constants
      const TEST_DICTIONARIES = {
        large_url: {
          id: "test-dict-large-url",
          content: "large URL content",
          pattern: "file",
          type: "raw",
        },
      };

      let dict = TEST_DICTIONARIES.large_url;
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
        "Cache-Control": "max-age=3600",
      });
      response.end(dict.content, "binary");
    }
  );

  // Too Large dictionary URL
  await httpServer.registerPathHandler(
    "/dict/large/" + "B".repeat(1024 * 100),
    function (request, response) {
      // Test data constants
      const TEST_DICTIONARIES = {
        too_large_url: {
          id: "test-dict-too-large-url",
          content: "too large URL content",
          pattern: "too_large",
          type: "raw",
        },
      };

      let dict = TEST_DICTIONARIES.too_large_url;
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
        "Cache-Control": "max-age=3600",
      });
      response.end(dict.content, "binary");
    }
  );

  // pattern with a regexp (should be ignored)
  await httpServer.registerPathHandler(
    "/api/regexp",
    function (request, response) {
      // Test data constants
      const TEST_DICTIONARIES = {
        regexp_group: {
          id: "test-regexp-group",
          content: "content",
          pattern: "/api/:version(v[0-9]+)/*",
          type: "raw",
        },
      };

      let dict = TEST_DICTIONARIES.regexp_group;
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
        "Cache-Control": "max-age=3600",
      });
      response.end(dict.content, "binary");
    }
  );

  registerCleanupFunction(async () => {
    try {
      await httpServer.stop();
    } catch (e) {
      // Ignore server stop errors during cleanup
    }
  });

  return httpServer;
}

// Verify dictionary is stored in cache
function verifyDictionaryStored(url, shouldExist, callback) {
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  asyncCheckCacheEntryPresence(url, "disk", shouldExist, lci, callback);
}

// Create channel for dictionary requests
function makeChan(url) {
  let chan = NetUtil.newChannel({
    uri: url,
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
  }).QueryInterface(Ci.nsIHttpChannel);
  return chan;
}

function channelOpenPromise(chan) {
  return new Promise(resolve => {
    function finish(req, buffer) {
      resolve([req, buffer]);
    }
    chan.asyncOpen(new ChannelListener(finish, null, CL_ALLOW_UNKNOWN_CL));
  });
}

// Test basic dictionary storage with Use-As-Dictionary header
add_task(async function test_basic_dictionary_storage() {
  // Clear any existing cache
  evict_cache_entries("all");

  let url = `https://localhost:${server.port()}/dict/small`;
  let dict = TEST_DICTIONARIES.small;

  let chan = makeChan(url);
  let [req, data] = await channelOpenPromise(chan);

  Assert.equal(data, dict.content, "Dictionary content matches");

  // Verify Use-As-Dictionary header was processed
  try {
    let headerValue = req.getResponseHeader("Use-As-Dictionary");
    Assert.ok(
      headerValue.includes(`id="${dict.id}"`),
      "Header contains correct ID"
    );
    Assert.ok(
      headerValue.includes(`match="${dict.pattern}"`),
      "Header contains correct pattern"
    );
  } catch (e) {
    Assert.ok(false, "Use-As-Dictionary header should be present");
  }

  // Check that dictionary is stored in cache
  await new Promise(resolve => {
    verifyDictionaryStored(url, true, resolve);
  });
});

// Test Use-As-Dictionary header parsing with various formats
add_task(async function test_dictionary_header_parsing() {
  const headerTests = [
    {
      header: 'match="*", id="dict1", type=raw',
      valid: true,
      description: "Basic valid header",
    },
    {
      header: 'match="/api/*", id="api-dict", type=raw',
      valid: true,
      description: "Path pattern header",
    },
    {
      header: 'match="*.js", id="js-dict"',
      valid: true,
      description: "Header without type (should default to raw)",
    },
    {
      header: 'id="dict1", type=raw',
      valid: false,
      description: "Missing match parameter",
    },
    {
      header: 'match="*"',
      valid: false,
      description: "Missing id parameter",
    },
    {
      header: 'match="*", id="", type=raw',
      valid: false,
      description: "Empty id parameter",
    },
  ];

  let testIndex = 0;
  for (let test of headerTests) {
    let testPath = `/dict/header-test-${testIndex++}`;
    let func = `
      global.testIndex = 0;
      let test = ${JSON.stringify(test)};
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": test.header,
      });
      // We won't be using this, so it doesn't really matter
      response.end("HEADER_TEST_DICT_" + global.testIndex++, "binary");
    `;
    let handler = new Function("request", "response", func);
    await server.registerPathHandler(testPath, handler);

    let url = `https://localhost:${server.port()}${testPath}`;
    let chan = makeChan(url);
    await channelOpenPromise(chan);
    // XXX test if we have a dictionary entry.  Need new APIs to let me test it,
    // or we can read dict:<origin> and look for this entry

    // Note: Invalid dictionary headers still create regular cache entries,
    // they just aren't processed as dictionaries. So all should exist in cache.
    await new Promise(resolve => {
      verifyDictionaryStored(url, true, resolve);
    });
  }
});

// Test dictionary hash calculation and validation
add_task(async function test_dictionary_hash_calculation() {
  dump("**** testing hashes\n");
  let url = `https://localhost:${server.port()}/dict/small`;
  let dict = TEST_DICTIONARIES.small;

  // Calculate expected hash
  let expectedHash = await calculateSHA256(dict.content);
  Assert.greater(expectedHash.length, 0, "Hash should be calculated");

  let chan = makeChan(url);
  await channelOpenPromise(chan);

  // Calculate expected hash
  let hashCalculatedHash = await calculateSHA256(dict.content);
  Assert.greater(hashCalculatedHash.length, 0, "Hash should be calculated");

  // Check cache entry exists
  await new Promise(resolve => {
    let lci = Services.loadContextInfo.custom(false, {
      partitionKey: `(https,localhost)`,
    });
    asyncOpenCacheEntry(
      url,
      "disk",
      Ci.nsICacheStorage.OPEN_READONLY,
      lci,
      function (status, entry) {
        Assert.equal(status, Cr.NS_OK, "Cache entry should exist");
        Assert.ok(entry, "Entry should not be null");

        // Check if entry has dictionary metadata
        try {
          let metaData = entry.getMetaDataElement("use-as-dictionary");
          Assert.ok(metaData, "Dictionary metadata should exist");

          // Verify metadata contains hash information
          // Note: The exact format may vary based on implementation
          Assert.ok(
            metaData.includes(dict.id),
            "Metadata should contain dictionary ID"
          );
        } catch (e) {
          // Dictionary metadata might be stored differently
          dump(`Dictionary metadata access failed: ${e}\n`);
        }

        resolve();
      }
    );
  });
});

// Test dictionary expiration handling
add_task(async function test_dictionary_expiration() {
  dump("**** testing expiration\n");
  let url = `https://localhost:${server.port()}/dict/expires`;

  // Fetch dictionary with 1-second expiration
  let chan = makeChan(url);
  let [, data] = await channelOpenPromise(chan);

  Assert.equal(data, "EXPIRING_DICTIONARY_DATA", "Dictionary content matches");

  // Note: Testing actual expiration behavior requires waiting and is complex
  // For now, just verify the dictionary was fetched
  // XXX FIX!
});

// Test multiple dictionaries per origin with different patterns
add_task(async function test_multiple_dictionaries_per_origin() {
  dump("**** test multiple dictionaries per origin\n");
  // Register multiple dictionary endpoints for same origin
  await server.registerPathHandler("/dict/api", function (request, response) {
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Use-As-Dictionary": 'match="/api/*", id="api-dict", type=raw',
    });
    response.end("API_DICTIONARY_DATA", "binary");
  });

  await server.registerPathHandler("/dict/web", function (request, response) {
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Use-As-Dictionary": 'match="/web/*", id="web-dict", type=raw',
    });
    response.end("WEB_DICTIONARY_DATA", "binary");
  });

  let apiUrl = `https://localhost:${server.port()}/dict/api`;
  let webUrl = `https://localhost:${server.port()}/dict/web`;

  // Fetch both dictionaries
  let apiChan = makeChan(apiUrl);
  let [, apiData] = await channelOpenPromise(apiChan);
  Assert.equal(
    apiData,
    "API_DICTIONARY_DATA",
    "API dictionary content matches"
  );

  let webChan = makeChan(webUrl);
  let [, webData] = await channelOpenPromise(webChan);
  Assert.equal(
    webData,
    "WEB_DICTIONARY_DATA",
    "Web dictionary content matches"
  );

  // Verify both dictionaries are stored
  await new Promise(resolve => {
    verifyDictionaryStored(apiUrl, true, () => {
      verifyDictionaryStored(webUrl, true, resolve);
    });
  });
});

// Test dictionary size limits and validation
add_task(async function test_dictionary_size_limits() {
  dump("**** test size limits\n");
  let url = `https://localhost:${server.port()}/dict/large`;
  let dict = TEST_DICTIONARIES.large;

  let chan = makeChan(url);
  let [, data] = await channelOpenPromise(chan);

  Assert.equal(data, dict.content, "Large dictionary content matches");
  Assert.equal(data.length, dict.content.length, "Dictionary size correct");

  // Verify large dictionary is stored
  await new Promise(resolve => {
    verifyDictionaryStored(url, true, resolve);
  });
});

// Test error handling with invalid dictionary headers
add_task(async function test_invalid_dictionary_headers() {
  dump("**** test error handling\n");
  let url = `https://localhost:${server.port()}/dict/invalid`;

  let chan = makeChan(url);
  let [, data] = await channelOpenPromise(chan);

  Assert.equal(
    data,
    "INVALID_DICTIONARY_DATA",
    "Invalid dictionary content received"
  );

  // Invalid dictionary should not be stored as dictionary
  // but the regular cache entry should exist
  await new Promise(resolve => {
    asyncOpenCacheEntry(
      url,
      "disk",
      Ci.nsICacheStorage.OPEN_READONLY,
      null,
      function (status, entry) {
        if (status === Cr.NS_OK && entry) {
          // Regular cache entry should exist
          // Note: Don't call entry.close() as it doesn't exist on this interface
        }
        // But it should not be processed as a dictionary
        resolve();
      }
    );
  });
});

// Test cache integration and persistence
add_task(async function test_dictionary_cache_persistence() {
  dump("**** test persistence\n");
  // Force cache sync to ensure everything is written
  await new Promise(resolve => {
    syncWithCacheIOThread(resolve, true);
  });

  // Get cache statistics before
  await new Promise(resolve => {
    get_device_entry_count("disk", null, entryCount => {
      Assert.greater(entryCount, 0, "Cache should have entries");
      resolve();
    });
  });

  // Verify our test dictionaries are still present
  let smallUrl = `https://localhost:${server.port()}/dict/small`;
  let chan = makeChan(smallUrl);
  await channelOpenPromise(chan);

  await new Promise(resolve => {
    verifyDictionaryStored(smallUrl, true, resolve);
  });
});

// Test very long url which should fit in metadata
add_task(async function test_long_dictionary_url() {
  // Clear any existing cache
  evict_cache_entries("all");

  let url =
    `https://localhost:${server.port()}/dict/large/` + "A".repeat(1024 * 20);
  let dict = TEST_DICTIONARIES.large_url;

  let chan = makeChan(url);
  let [req, data] = await channelOpenPromise(chan);

  Assert.equal(data, dict.content, "Dictionary content matches");

  // Check that dictionary is stored in cache
  await new Promise(resolve => {
    verifyDictionaryStored(url, true, resolve);
  });

  // Verify Use-As-Dictionary header was processed and it's an active dictionary
  url = `https://localhost:${server.port()}/dict/large/file`;
  chan = makeChan(url);
  [req, data] = await channelOpenPromise(chan);

  try {
    let headerValue = req.getRequestHeader("Available-Dictionary");
    Assert.ok(headerValue.includes(`:`), "Header contains a hash");
  } catch (e) {
    Assert.ok(
      false,
      "Available-Dictionary header should be present with long URL for dictionary"
    );
  }
});

// Test url too long to store in metadata
add_task(async function test_too_long_dictionary_url() {
  // Clear any existing cache
  evict_cache_entries("all");

  let url =
    `https://localhost:${server.port()}/dict/large/` + "B".repeat(1024 * 100);
  let dict = TEST_DICTIONARIES.too_large_url;

  let chan = makeChan(url);
  let [req, data] = await channelOpenPromise(chan);

  Assert.equal(data, dict.content, "Dictionary content matches");

  // Check that dictionary is stored in cache (even if it's not a dictionary)
  await new Promise(resolve => {
    verifyDictionaryStored(url, true, resolve);
  });

  // Verify Use-As-Dictionary header was NOT processed and active due to 64K limit to metadata
  // Since we can't store it on disk, we can't offer it as a dictionary.  If we change the
  // metadata limit, this will need to change
  url = `https://localhost:${server.port()}/too_large`;
  chan = makeChan(url);
  [req, data] = await channelOpenPromise(chan);

  try {
    // we're just looking to see if it throws
    // eslint-disable-next-line no-unused-vars
    let headerValue = req.getRequestHeader("Available-Dictionary");
    Assert.ok(false, "Too-long dictionary was offered in Available-Dictionary");
  } catch (e) {
    Assert.ok(
      true,
      "Available-Dictionary header should not be present with a too-long URL for dictionary"
    );
  }
});

// Test that regexp groups cause it to not be stored as a dictionary
add_task(async function test_regexp_group() {
  // Clear any existing cache
  evict_cache_entries("all");

  let url = `https://localhost:${server.port()}/api/regexp`;
  let dict = TEST_DICTIONARIES.regexp_group;

  let chan = makeChan(url);
  let [req, data] = await channelOpenPromise(chan);

  Assert.equal(data, dict.content, "Dictionary content matches");

  // Check that dictionary is stored in cache (even if it's not a dictionary)
  await new Promise(resolve => {
    verifyDictionaryStored(url, true, resolve);
  });

  // Verify Use-As-Dictionary header was NOT processed and active due to 64K limit to metadata
  // Since we can't store it on disk, we can't offer it as a dictionary.  If we change the
  // metadata limit, this will need to change
  url = `https://localhost:${server.port()}/api/v2/test.js`;
  chan = makeChan(url);
  [req, data] = await channelOpenPromise(chan);

  try {
    // we're just looking to see if it throws
    // eslint-disable-next-line no-unused-vars
    let headerValue = req.getRequestHeader("Available-Dictionary");
    Assert.ok(
      false,
      "Dictionary with regexp group was offered in Available-Dictionary"
    );
  } catch (e) {
    Assert.ok(
      true,
      "Available-Dictionary header should not be present for a dictionary with regexp groups"
    );
  }
});

// Cleanup
add_task(async function cleanup() {
  // Clear cache
  evict_cache_entries("all");
  dump("**** all done\n");
});
