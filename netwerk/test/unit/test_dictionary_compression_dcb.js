/**
 * Tests for HTTP Compression Dictionary Brotli (dcb) compression functionality
 * - Dictionary-based Brotli compression and decompression
 * - Content integrity verification with dcb encoding
 * - Available-Dictionary header integration for compression
 * - Error handling for missing/invalid dictionaries
 * - Compression window size limits and edge cases
 */

"use strict";

// Load cache helpers
Services.scriptloader.loadSubScript("resource://test/head_cache.js", this);

const { NodeHTTPSServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

// Test dictionaries optimized for compression testing
// Since we're not actually brotli-encoding, all decodes will yield 15 bytes
const DCB_TEST_DICTIONARIES = {
  html_common: {
    id: "html-dict",
    content:
      '<html><head><title>Common HTML Template</title></head><body><div class="container"><p>',
    expected_length: 15,
    pattern: "*.html",
    type: "raw",
  },
  html_common_no_dictionary: {
    id: "html-dict",
    content:
      '<html><head><title>Common HTML Template</title></head><body><div class="container"><p>',
    expected_length: 196,
    pattern: "*.html",
    type: "raw",
  },
  api_json: {
    id: "api-dict",
    content:
      '{"status":"success","data":{"id":null,"name":"","created_at":"","updated_at":""},"message":"","errors":[]}',
    expected_length: 15,
    pattern: "/api/*",
    type: "raw",
  },
  api_v1: {
    id: "longer-match-dict",
    content:
      '{"status":"success","data":{"id":null,"name":"","created_at":"","updated_at":""},"message":"","errors":[]}',
    expected_length: 15,
    pattern: "/api/v1/*",
    type: "raw",
  },
  js_common: {
    id: "js-dict",
    content:
      "function(){return this;};var=function();const=function();let=function();",
    expected_length: 15,
    pattern: "*.js",
    type: "raw",
  },
  large_dict: {
    id: "large-dict",
    content: "REPEATED_PATTERN_".repeat(1000), // ~1.5MB dictionary
    expected_length: 15,
    pattern: "/large/*",
    type: "raw",
  },
};

// Test content designed to compress well with dictionaries
const DCB_TEST_CONTENT = {
  html_page:
    '<html><head><title>Test Page</title></head><body><div class="container"><p>This is test content that should compress well with the HTML dictionary.</p><p>More content here.</p></div></body></html>',

  api_response:
    '{"status":"success","data":{"id":12345,"name":"Test User","created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-02T12:00:00Z"},"message":"User retrieved successfully","errors":[]}',

  api_v1:
    '{"status":"success","data":{"id":12345,"name":"Test User","created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-02T12:00:00Z"},"message":"User retrieved successfully","errors":[]}',

  js_code:
    'function testFunction(){return this.value;};var result=function(){console.log("test");};const API_URL=function(){return "https://api.example.com";};let userData=function(){return {id:1,name:"test"};}',

  large_content: "REPEATED_PATTERN_DATA_CHUNK_".repeat(50000), // Content that will compress well with large dictionary

  jpeg: "ARBITRARY_DATA_".repeat(1000),
};

let server = null;
let requestLog = []; // Track requests for verification

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
    // CL_EXPECT_GZIP is needed if we're transferring compressed data; else it asserts content-length
    // equals the data length.  (We could also not send content-length)
    chan.asyncOpen(
      new ChannelListener(
        finish,
        null,
        CL_ALLOW_UNKNOWN_CL | CL_IGNORE_DELAYS | CL_EXPECT_GZIP
      )
    );
  });
}

// Setup DCB test server with dictionaries and compressed content endpoints
async function setupDCBTestServer() {
  let httpServer = new NodeHTTPSServer();
  await httpServer.start();

  // Dictionary endpoints - store dictionaries for later compression use
  await httpServer.registerPathHandler(
    "/dict/html",
    function (request, response) {
      const DCB_TEST_DICTIONARIES = {
        html_common: {
          id: "html-dict",
          content:
            '<html><head><title>Common HTML Template</title></head><body><div class="container"><p>',
          pattern: "*.html",
          type: "raw",
        },
      };
      let dict = DCB_TEST_DICTIONARIES.html_common;
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
        "Cache-Control": "max-age=3600",
      });
      response.end(dict.content, "binary");
    }
  );

  await httpServer.registerPathHandler(
    "/dict/api",
    function (request, response) {
      const DCB_TEST_DICTIONARIES = {
        api_json: {
          id: "api-dict",
          content:
            '{"status":"success","data":{"id":null,"name":"","created_at":"","updated_at":""},"message":"","errors":[]}',
          pattern: "/api/*",
          type: "raw",
        },
      };
      let dict = DCB_TEST_DICTIONARIES.api_json;
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
        "Cache-Control": "max-age=3600",
      });
      response.end(dict.content, "binary");
    }
  );

  await httpServer.registerPathHandler(
    "/dict/js",
    function (request, response) {
      const DCB_TEST_DICTIONARIES = {
        js_common: {
          id: "js-dict",
          content:
            "function(){return this;};var=function();const=function();let=function();",
          pattern: "*.js",
          type: "raw",
        },
      };
      let dict = DCB_TEST_DICTIONARIES.js_common;
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
        "Cache-Control": "max-age=3600",
      });
      response.end(dict.content, "binary");
    }
  );

  await httpServer.registerPathHandler(
    "/dict/large",
    function (request, response) {
      const DCB_TEST_DICTIONARIES = {
        large_dict: {
          id: "large-dict",
          content: "REPEATED_PATTERN_".repeat(1000), // ~1.5MB dictionary
          pattern: "/large/*",
          type: "raw",
        },
      };
      let dict = DCB_TEST_DICTIONARIES.large_dict;
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
        "Cache-Control": "max-age=3600",
      });
      response.end(dict.content, "binary");
    }
  );

  // Basic dictionary with valid Use-As-Dictionary header
  await httpServer.registerPathHandler(
    "/dict/basic",
    function (request, response) {
      const TEST_DICTIONARIES = {
        basic: {
          id: "basic-dict",
          content: "BASIC_DICTIONARY_DATA",
          pattern: "/api/*",
          type: "raw",
        },
      };
      let dict = TEST_DICTIONARIES.basic;
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
        "Cache-Control": "max-age=3600",
      });
      response.end(dict.content, "binary");
    }
  );

  // Dictionary with longer match value
  await httpServer.registerPathHandler(
    "/dict/longer",
    function (request, response) {
      const TEST_DICTIONARIES = {
        specific: {
          id: "longer-match-dict",
          content:
            '{"status":"success","data":{"id":null,"name":"","created_at":"","updated_at":""},"message":"","errors":[]}',
          pattern: "/api/v1/*",
          type: "raw",
        },
      };
      let dict = TEST_DICTIONARIES.specific;
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

async function sync_to_server() {
  if (server.processId) {
    await server.execute(`global.requestLog = ${JSON.stringify(requestLog)};`);
  } else {
    dump("Server not running?\n");
  }
}

async function sync_from_server() {
  if (server.processId) {
    dump(`*** requestLog: ${JSON.stringify(requestLog)}\n`);
    requestLog = await server.execute(`global.requestLog`);
  } else {
    dump("Server not running? (from)\n");
  }
}

// Calculate expected SHA-256 hash for dictionary content
async function calculateDictionaryHash(content) {
  const encoded = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return btoa(String.fromCharCode(...new Uint8Array(digest))); // base64
}

// Verify dcb decompression result
function verifyDCBResponse(channel, data, dictionary) {
  // XXX verify decoded content once we use real Brotli encoding
  Assert.equal(data.length, dictionary.expected_length);

  try {
    // Note: since we remove dcb encoding in the parent process, we can't see
    // it in Content-Encoding here
    var contentEncoding;
    channel.getOriginalResponseHeader("Content-Encoding", {
      visitHeader: function visitOrg(aName, aValue) {
        contentEncoding = aValue;
      },
    });
    Assert.equal;
    if (contentEncoding === "dcb") {
      return true;
    }
  } catch (e) {
    // Content-Encoding header not present or not dcb
  }
  return false;
}

// Setup dcb-aware server endpoint
async function registerDCBEndpoint(
  httpServer,
  path,
  dictionary,
  content,
  shouldCompress = true
) {
  // We have to put all values and functions referenced in the handler into
  // this string which will be turned into a function for the handler, because
  // NodeHTTPSServer handlers can't access items in the local or global scopes of the
  // containing file
  let func = `
    let path = "${path}";
    let dictionary = ${JSON.stringify(dictionary)};
    let content = '${content}';
    let shouldCompress = ${shouldCompress};
    
    let availableDict = "";
    let hasDictHeader = false;
    
    // Get content type based on file path
    function getContentTypeForPath(path) {
      if (path.endsWith('.html')) return 'text/html; charset=utf-8';
      if (path.endsWith('.js')) return 'application/javascript';
      if (path.includes('/api/')) return 'application/json';
      return 'text/plain; charset=utf-8';
    }

    // Calculate compression ratio
    function calculateCompressionRatio(original, compressed) {
      if (typeof original === 'string') original = original.length;
      if (typeof compressed === 'string') compressed = compressed.length;
      return original / compressed;
    }

    // Simulate dcb compression (for server responses)
    function simulateDCBCompression(content, dictionary) {
      // Note: Real implementation would use actual Brotli compression
      // For testing, we simulate with compression markers and realistic size reduction
      let simulatedCompressedSize = Math.floor(content.length * 0.4); // Simulate 60% savings
      // This needs to be something that the brotli decoder will correctly read, even though this
      // will produce the wrong output
      let compressedData = "\x21\x38\x00\x04COMPRESSED_DATA\x03";
      
      return {
        compressedData: "\xff\x44\x43\x42" + "12345678901234567890123456789012" + compressedData,
        originalSize: content.length,
        compressedSize: compressedData.length + 36,
        compressionRatio: calculateCompressionRatio(content.length, simulatedCompressedSize + 36)
      };
    }

    if (request.headers && request.headers['available-dictionary']) {
      availableDict = request.headers['available-dictionary'];
      hasDictHeader = true;
    } else {
      shouldCompress = false;
    }
    
    // Log the request for analysis
    global.requestLog[global.requestLog.length] = {
      path: path,
      hasAvailableDict: hasDictHeader,
      availableDict: availableDict,
      method: request.method
    };
    
    if (shouldCompress && hasDictHeader && availableDict.includes(dictionary.hash)) {
      // Simulate dcb compression
      let compressed = simulateDCBCompression(content, dictionary);
      response.writeHead(200, {
        "Content-Encoding": "dcb",
        "Content-Type": getContentTypeForPath(path),
        "Content-Length": compressed.compressedSize.toString(),
      });
      
      // In a real implementation, this would be actual compressed brotli data
      // For testing, we simulate the compressed response

      // Note: these aren't real dictionaries; we've prepended a dummy header
      // to pass the requirements for a Brotli dictionary - 4 byte magic number
      // plus 32 bytes of hash (which we don't currently check, nor does Brotli).
      response.end(compressed.compressedData, "binary");
    } else {
      // Serve uncompressed
      response.writeHead(200, {
        "Content-Type": getContentTypeForPath(path),
        "Content-Length": content.length,
      });
      response.end(content, "binary");
    }
  `;
  let handler = new Function("request", "response", func);
  return httpServer.registerPathHandler(path, handler);
}

// Verify dictionary is stored in cache (reused from previous tests)
function verifyDictionaryStored(url, shouldExist, callback) {
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  asyncCheckCacheEntryPresence(url, "disk", shouldExist, lci, callback);
}

async function setupDicts() {
  requestLog = [];
  await sync_to_server();

  // Store all test dictionaries and calculate their hashes
  const dictPaths = [
    "/dict/html",
    "/dict/api",
    "/dict/js",
    "/dict/large",
    "/dict/longer",
  ];
  const dictKeys = [
    "html_common",
    "api_json",
    "js_common",
    "large_dict",
    "api_v1",
  ];

  for (let i = 0; i < dictPaths.length; i++) {
    let path = dictPaths[i];
    let dictKey = dictKeys[i];
    let url = `${server.origin()}${path}`;
    dump(
      `registering dictionary ${path} for match pattern ${DCB_TEST_DICTIONARIES[dictKey].pattern}\n`
    );

    let chan = makeChan(url);
    let [, data] = await channelOpenPromise(chan);
    // Calculate and store hash for later use
    DCB_TEST_DICTIONARIES[dictKey].hash =
      ":" +
      (await calculateDictionaryHash(DCB_TEST_DICTIONARIES[dictKey].content)) +
      ":";

    // Verify dictionary content matches
    Assert.equal(
      data,
      DCB_TEST_DICTIONARIES[dictKey].content,
      `Dictionary content matches`
    );

    // Verify dictionary was stored
    await new Promise(resolve => {
      verifyDictionaryStored(url, true, resolve);
    });
  }

  dump(`**** DCB test setup complete. Dictionaries stored with hashes.\n`);
}

add_setup(async function () {
  Services.prefs.setBoolPref("network.http.dictionaries.enable", true);
  if (!server) {
    server = await setupDCBTestServer();
  }
  // Setup baseline dictionaries for compression testing

  // Clear any existing cache
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  evict_cache_entries("all", lci);

  await setupDicts();
});

// Test basic dictionary-compressed Brotli functionality
add_task(async function test_basic_dcb_compression() {
  dump("**** test_basic_dcb_compression\n");
  requestLog = [];
  await sync_to_server();

  // Setup DCB endpoint for HTML content
  let dict = DCB_TEST_DICTIONARIES.html_common;
  let content = DCB_TEST_CONTENT.html_page;
  await registerDCBEndpoint(server, "/dict/test.html", dict, content, true);

  let url = `${server.origin()}/dict/test.html`;
  let chan = makeChan(url);
  let [request, data] = await channelOpenPromise(chan);

  // Check if DCB compression was used
  let usedDCB = verifyDCBResponse(
    request.QueryInterface(Ci.nsIHttpChannel),
    data,
    dict
  );
  Assert.ok(usedDCB, "DCB compression should be used");
});

// Test correct use of URLPattern baseurl
add_task(async function test_baseurl() {
  dump("**** test_baseurl\n");
  requestLog = [];
  await sync_to_server();

  // Setup DCB endpoint for HTML content
  let dict = DCB_TEST_DICTIONARIES.html_common;
  let content = DCB_TEST_CONTENT.html_page;
  await registerDCBEndpoint(server, "/test.html", dict, content, true);

  let url = `${server.origin()}/test.html`;
  let chan = makeChan(url);
  let [request, data] = await channelOpenPromise(chan);

  Assert.greater(
    data.length,
    0,
    "Should still receive content without dictionary in use"
  );
  // Check if DCB compression was used (should be false)
  Assert.ok(
    !verifyDCBResponse(
      request.QueryInterface(Ci.nsIHttpChannel),
      data,
      DCB_TEST_DICTIONARIES.html_common_no_dictionary
    ),
    "DCB compression should not be used with the wrong path"
  );
});

// Test correct dictionary selection for dcb compression
add_task(async function test_dcb_dictionary_selection() {
  requestLog = [];
  await sync_to_server();

  dump("**** Testing DCB dictionary selection\n");

  // Test specific pattern matching for dictionary selection
  let htmlDict = DCB_TEST_DICTIONARIES.html_common;
  let apiDict = DCB_TEST_DICTIONARIES.api_json;

  // Register endpoints that should match different dictionaries
  await registerDCBEndpoint(
    server,
    "/dict/specific-test.html",
    htmlDict,
    DCB_TEST_CONTENT.html_page,
    true
  );
  await registerDCBEndpoint(
    server,
    "/api/specific-test",
    apiDict,
    DCB_TEST_CONTENT.api_response,
    true
  );

  // Test HTML dictionary selection
  let htmlUrl = `${server.origin()}/dict/specific-test.html`;
  let htmlChan = makeChan(htmlUrl);
  let [, htmlData] = await channelOpenPromise(htmlChan);

  Assert.greater(
    htmlData.length,
    0,
    "HTML dictionary selection test should have content"
  );

  // Check if correct dictionary was used
  await sync_from_server();
  let htmlLogEntry = requestLog.find(
    entry => entry.path === "/dict/specific-test.html"
  );
  Assert.ok(
    htmlLogEntry && htmlLogEntry.hasAvailableDict,
    "Dictionary selection test: HTML endpoint received Available-Dictionary header"
  );

  // Test API dictionary selection
  let apiUrl = `${server.origin()}/api/specific-test`;
  let apiChan = makeChan(apiUrl);
  let [, apiData] = await channelOpenPromise(apiChan);

  Assert.greater(
    apiData.length,
    0,
    "API dictionary selection test should have content"
  );

  // Check if correct dictionary was used
  await sync_from_server();
  let apiLogEntry = requestLog.find(
    entry => entry.path === "/api/specific-test"
  );
  Assert.ok(
    apiLogEntry && apiLogEntry.hasAvailableDict,
    "Dictionary selection test: API endpoint received Available-Dictionary header"
  );
});

// Test behavior when dictionary is missing/unavailable
add_task(async function test_dcb_missing_dictionary() {
  requestLog = [];
  await sync_to_server();

  dump("**** Testing DCB missing dictionary\n");

  // Create a fake dictionary that won't be found
  let fakeDict = {
    id: "missing-dict",
    hash: "fake_hash_that_does_not_exist",
    content: "This dictionary was not stored",
    expected_length: DCB_TEST_CONTENT.jpeg.length,
  };

  // *.jpeg Doesn't match any of the patterns in DCB_TEST_DICTIONARIES
  await registerDCBEndpoint(
    server,
    "/missing-dict-test.jpeg",
    fakeDict,
    DCB_TEST_CONTENT.jpeg,
    false
  );

  let url = `${server.origin()}/missing-dict-test.jpeg`;
  let chan = makeChan(url);
  let [request, data] = await channelOpenPromise(chan);

  // Should get uncompressed content when dictionary is missing
  Assert.greater(
    data.length,
    0,
    "Missing dictionary test should still return content"
  );

  // Verify no dcb compression was applied
  let usedDCB = verifyDCBResponse(
    request.QueryInterface(Ci.nsIHttpChannel),
    data,
    fakeDict
  );
  Assert.ok(!usedDCB, "We should not get DCB encoding for a fake item");
});

// Test IETF spec compliance for dcb encoding
add_task(async function test_dcb_header_compliance() {
  requestLog = [];
  await sync_to_server();

  dump("**** Testing DCB header compliance\n");

  let dict = DCB_TEST_DICTIONARIES.api_json;
  await registerDCBEndpoint(
    server,
    "/api/compliance-test",
    dict,
    DCB_TEST_CONTENT.api_response,
    true
  );

  let url = `${server.origin()}/api/compliance-test`;
  let chan = makeChan(url);
  let [request, data] = await channelOpenPromise(chan);

  Assert.greater(data.length, 0, "IETF compliance test should have content");

  let httpChannel = request.QueryInterface(Ci.nsIHttpChannel);

  // Verify proper Content-Type preservation
  try {
    let contentType = httpChannel.getResponseHeader("Content-Type");
    Assert.ok(
      contentType.includes("application/json"),
      "Content-Type should be preserved through compression"
    );
  } catch (e) {
    Assert.ok(false, "Content-Type header should be present");
  }

  // Check for proper dcb handling
  await sync_from_server();
  let logEntry = requestLog.find(
    entry => entry.path === "/api/compliance-test"
  );
  Assert.ok(
    logEntry && logEntry.hasAvailableDict,
    "Must have available-dictionary in header compliance"
  );
  // Verify Available-Dictionary follows IETF Structured Field Byte-Sequence format
  // According to RFC 8941, byte sequences are enclosed in colons: :base64data:
  let availableDict = logEntry.availableDict;
  Assert.ok(
    availableDict.startsWith(":"),
    "Available-Dictionary should start with ':' (IETF Structured Field Byte-Sequence format)"
  );
  Assert.ok(
    availableDict.endsWith(":"),
    "Available-Dictionary should end with ':' (IETF Structured Field Byte-Sequence format)"
  );
  Assert.greater(
    availableDict.length,
    2,
    "Available-Dictionary should contain base64 data between colons"
  );

  // Extract the base64 content between the colons
  let base64Content = availableDict.slice(1, -1);
  Assert.greater(
    base64Content.length,
    0,
    "Available-Dictionary should have base64 content"
  );

  // Basic validation that it looks like base64 (contains valid base64 characters)
  let base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  Assert.ok(
    base64Regex.test(base64Content),
    "Available-Dictionary content should be valid base64"
  );

  dump(`**** IETF compliance test: Available-Dictionary = ${availableDict}\n`);
});

// Test that DCB compression stops working after dictionary cache eviction
add_task(async function test_dcb_compression_after_cache_eviction() {
  requestLog = [];
  await sync_to_server();

  dump("**** Testing DCB compression after cache eviction\n");

  // Use a specific dictionary for this test
  let dict = DCB_TEST_DICTIONARIES.html_common;
  let dict2 = DCB_TEST_DICTIONARIES.html_common_no_dictionary;
  let testContent = DCB_TEST_CONTENT.html_page;
  let testPath = "/dict/cache-eviction-test.html";
  let dictUrl = `${server.origin()}/dict/html`;
  let contentUrl = `${server.origin()}${testPath}`;

  // Step 1: Ensure dictionary is in cache by fetching it
  dump("**** Step 1: Loading dictionary into cache\n");
  let dictChan = makeChan(dictUrl);
  let [, dictData] = await channelOpenPromise(dictChan);
  Assert.equal(dictData, dict.content, "Dictionary loaded successfully");

  // Verify dictionary is cached
  await new Promise(resolve => {
    verifyDictionaryStored(dictUrl, true, () => {
      resolve();
    });
  });

  // Step 2: Set up DCB endpoint and test compression works
  dump("**** Step 2: Testing DCB compression with cached dictionary\n");
  await registerDCBEndpoint(server, testPath, dict, testContent, true);

  // Clear request log before testing
  requestLog = [];
  await sync_to_server();

  let chan1 = makeChan(contentUrl);
  let [req1, data1] = await channelOpenPromise(chan1);

  Assert.greater(data1.length, 0, "Should receive content before eviction");

  // Check if DCB compression was used (should be true with cached dictionary)
  let usedDCB1 = verifyDCBResponse(
    req1.QueryInterface(Ci.nsIHttpChannel),
    data1,
    dict
  );
  Assert.ok(usedDCB1, "DCB compression should be used");

  // Step 3: Evict the dictionary from cache
  dump("**** Step 3: Evicting dictionary from cache\n");

  // Evict the dictionary cache entry
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  evict_cache_entries("all", lci);
  // Force cache sync to ensure everything is written
  await new Promise(resolve => {
    syncWithCacheIOThread(resolve, true);
  });

  dump("**** Step 3.5: verify no longer cache\n");
  // Verify dictionary is no longer cached
  await new Promise(resolve => {
    verifyDictionaryStored(dictUrl, false, () => {
      resolve();
    });
  });

  // Step 4: Test that compression no longer works after eviction
  dump("**** Step 4: Testing DCB compression after dictionary eviction\n");

  let chan2 = makeChan(contentUrl);
  let [req2, data2] = await channelOpenPromise(chan2);

  Assert.greater(
    data2.length,
    0,
    "Should still receive content after eviction"
  );
  // Check if DCB compression was used (should be false without cached dictionary)
  Assert.ok(
    !verifyDCBResponse(req2.QueryInterface(Ci.nsIHttpChannel), data2, dict2),
    "DCB compression should not be used without dictionary"
  );

  // XXX We can only check this if we actually brotli-compress the data
  // Content should still be delivered in both cases, just not compressed in the second case
  //Assert.equal(data1.length, data2.length,
  //  "Content length should be the same whether compressed or not (in our test simulation)");

  dump("**** Cache eviction test completed successfully\n");
});

// Test HTTP redirect (302) with dictionary-compressed content
add_task(async function test_dcb_with_http_redirect() {
  await setupDicts();

  dump("**** Testing HTTP redirect (302) with dictionary-compressed content\n");

  let dict = DCB_TEST_DICTIONARIES.html_common;
  let content = DCB_TEST_CONTENT.html_page;
  await registerDCBEndpoint(server, "/dict/test.html", dict, content, true);
  let originalPath = "/redirect/original";
  let finalPath = "/dict/test.html";
  let originalUrl = `${server.origin()}${originalPath}`;
  let finalUrl = `${server.origin()}${finalPath}`;

  // Step 1: Set up redirect handler that returns 302 to final URL
  let redirectFunc = `
    let finalPath = "${finalPath}";
    
    // Log the request for analysis
    global.requestLog[global.requestLog.length] = {
      path: "${originalPath}",
      method: request.method,
      redirectTo: finalPath,
      hasAvailableDict: !!request.headers['available-dictionary'],
      availableDict: request.headers['available-dictionary'] || null
    };
    
    response.writeHead(302, {
      "Location": finalPath,
      "Cache-Control": "no-cache"
    });
    response.end("Redirecting...");
  `;
  let redirectHandler = new Function("request", "response", redirectFunc);
  await server.registerPathHandler(originalPath, redirectHandler);

  // Step 2: Set up final endpoint with DCB compression capability
  await registerDCBEndpoint(server, finalPath, dict, content, true);

  // Clear request log before testing
  requestLog = [];
  await sync_to_server();

  // Step 3: Request the original URL that redirects to potentially DCB-compressed content
  let chan = makeChan(originalUrl);
  let [req, data] = await channelOpenPromise(chan);

  // Step 4: Verify redirect worked correctly
  let finalUri = req.QueryInterface(Ci.nsIHttpChannel).URI.spec;
  Assert.equal(
    finalUri,
    finalUrl,
    "Final URI should match the redirected URL after 302 redirect"
  );

  // Verify we received some content
  Assert.greater(data.length, 0, "Should receive content after redirect");

  // Step 5: Check request log to verify both requests were logged
  await sync_from_server();

  // Should have two entries: redirect request and final request
  let redirectEntry = requestLog.find(entry => entry.path === originalPath);
  let finalEntry = requestLog.find(entry => entry.path === finalPath);

  Assert.ok(redirectEntry, "Redirect request should be logged");
  Assert.ok(finalEntry, "Final request should be logged");

  // Step 6: Verify Available-Dictionary header handling
  // Note: The redirect request may or may not have Available-Dictionary header depending on implementation
  // The important thing is that the final request has it
  if (redirectEntry.hasAvailableDict) {
    dump(`**** Redirect request includes Available-Dictionary header\n`);
  } else {
    dump(
      `**** Redirect request does not include Available-Dictionary header (expected)\n`
    );
  }

  // Note: With redirects, Available-Dictionary headers may not be preserved
  Assert.ok(
    finalEntry.hasAvailableDict,
    "Final request includes Available-Dictionary header"
  );

  // Available-Dictionary header should contain the dictionary hash for final request
  Assert.ok(
    finalEntry.availableDict.includes(dict.hash),
    "Final request Available-Dictionary should contain correct dictionary hash"
  );

  // Step 7: Check if DCB compression was applied
  Assert.ok(
    verifyDCBResponse(req.QueryInterface(Ci.nsIHttpChannel), data, dict),
    "DCB compression successfully applied after redirect"
  );
});

// Test invalid Use-As-Dictionary headers - missing match parameter
add_task(async function test_use_as_dictionary_invalid_missing_match() {
  // Invalid dictionary headers
  await server.registerPathHandler(
    "/dict/invalid-missing-match",
    function (request, response) {
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `id="missing-match-dict", type=raw`,
        "Cache-Control": "max-age=3600",
      });
      response.end("INVALID_MISSING_MATCH_DATA", "binary");
    }
  );
  let url = `${server.origin()}/dict/invalid-missing-match`;
  let chan = makeChan(url);
  let [req, data] = await channelOpenPromise(chan);
  // Verify dictionary content matches
  Assert.equal(
    data,
    "INVALID_MISSING_MATCH_DATA",
    "Set up missing match dictionary"
  );

  let dict = DCB_TEST_DICTIONARIES.html_common_no_dictionary;
  let content = DCB_TEST_CONTENT.html_page;
  await registerDCBEndpoint(
    server,
    "/invalid/missing-match",
    dict,
    content,
    true
  );

  url = `https://localhost:${server.port()}/invalid/missing-match`;

  chan = makeChan(url);
  [req, data] = await channelOpenPromise(chan);

  Assert.equal(data, content, "Content received");

  // Verify invalid header was not processed as dictionary
  Assert.ok(
    !verifyDCBResponse(req.QueryInterface(Ci.nsIHttpChannel), data, dict),
    "DCB compression should not be used when dictionary has no match="
  );

  // Invalid dictionary should not be processed as dictionary
  dump("**** Missing match parameter test complete\n");
});

// Test invalid Use-As-Dictionary headers - empty id parameter
add_task(async function test_use_as_dictionary_invalid_empty_id() {
  await server.registerPathHandler(
    "/dict/invalid-empty-id",
    function (request, response) {
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="/invalid/*", id="", type=raw`,
        "Cache-Control": "max-age=3600",
      });
      response.end("INVALID_EMPTY_ID_DATA", "binary");
    }
  );
  let url = `${server.origin()}/dict/invalid-empty-id`;
  let chan = makeChan(url);
  let [req, data] = await channelOpenPromise(chan);
  // Verify dictionary content matches
  Assert.equal(data, "INVALID_EMPTY_ID_DATA", "Set up empty id dictionary");

  let dict = DCB_TEST_DICTIONARIES.html_common_no_dictionary;
  let content = DCB_TEST_CONTENT.html_page;
  await registerDCBEndpoint(server, "/invalid/empty-id", dict, content, true);

  url = `https://localhost:${server.port()}/invalid/empty-id`;

  chan = makeChan(url);
  [req, data] = await channelOpenPromise(chan);

  Assert.equal(data, content, "non-compressed content received");

  Assert.ok(
    !verifyDCBResponse(req.QueryInterface(Ci.nsIHttpChannel), data, dict),
    "DCB compression should not be used with dictionary with empty id"
  );
  dump("**** Empty id parameter test complete\n");
});

// Test Available-Dictionary request header generation
add_task(async function test_available_dictionary_header_generation() {
  let url = `https://localhost:${server.port()}/api/test`;
  requestLog = [];
  await sync_to_server();

  // Calculate expected hash for basic dictionary
  let expectedHashB64 = await calculateDictionaryHash(
    DCB_TEST_DICTIONARIES.api_json.content
  );

  // Setup DCB endpoint for HTML content
  let dict = DCB_TEST_DICTIONARIES.html_common;
  let content = DCB_TEST_CONTENT.api_response;
  await registerDCBEndpoint(server, "/api/test", dict, content, true);

  let chan = makeChan(url);
  let [, data] = await channelOpenPromise(chan);

  Assert.equal(data, DCB_TEST_CONTENT.api_response, "Resource content matches");

  // Check request log to see if Available-Dictionary header was sent
  await sync_from_server();
  let logEntry = requestLog.find(entry => entry.path === "/api/test");
  Assert.ok(
    logEntry && logEntry.availableDict != null,
    "Available-Dictionary header should be present"
  );
  if (logEntry && logEntry.availableDict != null) {
    // Verify IETF Structured Field Byte-Sequence format
    Assert.ok(
      logEntry.availableDict.startsWith(":"),
      "Available-Dictionary should start with ':' (IETF Structured Field format)"
    );
    Assert.ok(
      logEntry.availableDict.endsWith(":"),
      "Available-Dictionary should end with ':' (IETF Structured Field format)"
    );

    // Verify base64 content
    let base64Content = logEntry.availableDict.slice(1, -1);
    let base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    Assert.ok(
      base64Regex.test(base64Content),
      "Available-Dictionary content should be valid base64"
    );
    Assert.equal(
      logEntry.availableDict,
      ":" + expectedHashB64 + ":",
      "Available-Dictionary has the right hash"
    );
  }
  dump("**** Available-Dictionary generation test complete\n");
});

// Test Available-Dictionary header for specific pattern matching
add_task(async function test_available_dictionary_specific_patterns() {
  let url = `https://localhost:${server.port()}/api/v1/test`;
  requestLog = [];
  await sync_to_server();

  let dict = DCB_TEST_DICTIONARIES.api_v1;
  let content = DCB_TEST_CONTENT.api_v1;
  await registerDCBEndpoint(server, "/api/v1/test", dict, content, true);

  let chan = makeChan(url);
  await channelOpenPromise(chan);

  // Check for Available-Dictionary header
  await sync_from_server();
  let logEntry = requestLog.find(entry => entry.path === "/api/v1/test");
  Assert.ok(
    logEntry && logEntry.availableDict != null,
    "Available-Dictionary header should be present for /api/v1/*"
  );

  if (logEntry && logEntry.availableDict != null) {
    // Should match both /api/v1/* (longer-dict) and /api/* (basic-dict) patterns
    // It should always use the longer match, which would be /api/v1/*
    Assert.equal(
      logEntry.availableDict,
      DCB_TEST_DICTIONARIES.api_v1.hash,
      "Longer match pattern for a dictionary should be used"
    );
  }
  dump("**** Specific pattern matching test complete\n");
});

// Test Available-Dictionary header absence for no matching patterns
add_task(async function test_available_dictionary_no_match() {
  let url = `https://localhost:${server.port()}/nomatch/test`;
  requestLog = [];
  await sync_to_server();

  let dict = DCB_TEST_DICTIONARIES.html_common;
  let content = "NO MATCH TEST DATA";
  await registerDCBEndpoint(server, "/nomatch/test", dict, content, true);

  let chan = makeChan(url);
  let [, data] = await channelOpenPromise(chan);

  Assert.equal(data, "NO MATCH TEST DATA", "No match content received");

  // Check that no Available-Dictionary header was sent
  await sync_from_server();
  let logEntry = requestLog.find(entry => entry.path === "/nomatch/test");
  Assert.ok(logEntry, "Request should be logged");

  if (logEntry) {
    Assert.equal(
      logEntry.availableDict,
      "",
      "Available-Dictionary should be null for no match"
    );
  }
  dump("**** No match test complete\n");
});

// Cleanup
add_task(async function cleanup() {
  // Clear cache
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  evict_cache_entries("all", lci);
  dump("**** DCB compression tests completed.\n");
});
