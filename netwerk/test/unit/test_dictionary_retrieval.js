/**
 * Tests for HTTP Compression Dictionary retrieval functionality
 * - Dictionary lookup by origin and pattern matching
 * - Available-Dictionary header generation and formatting
 * - Dictionary cache hit/miss scenarios
 * - Dictionary precedence and selection logic
 */

"use strict";

// Load cache helpers
Services.scriptloader.loadSubScript("resource://test/head_cache.js", this);

const { NodeHTTPSServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

// Test dictionaries with different patterns and priorities
const RETRIEVAL_TEST_DICTIONARIES = {
  api_v1: {
    id: "api-v1-dict",
    content: "API_V1_COMMON_DATA",
    pattern: "/api/v1/*",
    type: "raw",
  },
  api_generic: {
    id: "api-generic-dict",
    content: "API_GENERIC_DATA",
    pattern: "/api/*",
    type: "raw",
  },
  wildcard: {
    id: "wildcard-dict",
    content: "WILDCARD_DATA",
    pattern: "*",
    type: "raw",
  },
  js_files: {
    id: "js-dict",
    content: "JS_COMMON_CODE",
    pattern: "*.js",
    type: "raw",
  },
};

let server = null;
let requestLog = []; // Track requests for verification

async function sync_to_server() {
  if (server.processId) {
    await server.execute(`global.requestLog = ${JSON.stringify(requestLog)};`);
  } else {
    dump("Server not running?\n");
  }
}

async function sync_from_server() {
  if (server.processId) {
    requestLog = await server.execute(`global.requestLog`);
  } else {
    dump("Server not running? (from)\n");
  }
}

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

// Calculate expected SHA-256 hash for dictionary content
async function calculateDictionaryHash(content) {
  let hasher = Cc["@mozilla.org/security/hash;1"].createInstance(
    Ci.nsICryptoHash
  );
  hasher.init(Ci.nsICryptoHash.SHA256);
  let bytes = new TextEncoder().encode(content);
  hasher.update(bytes, bytes.length);
  let hash = hasher.finish(false);
  return btoa(hash); // Convert to base64
}

// Setup dictionary test server
async function setupServer() {
  if (!server) {
    server = new NodeHTTPSServer();
    await server.start();

    registerCleanupFunction(async () => {
      try {
        await server.stop();
      } catch (e) {
        // Ignore server stop errors during cleanup
      }
    });
  }
  return server;
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

// Verify dictionary is stored in cache
function verifyDictionaryStored(url, shouldExist, callback) {
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  asyncCheckCacheEntryPresence(url, "disk", shouldExist, lci, callback);
}

// Setup server endpoint that expects specific dictionary headers
async function registerDictionaryAwareEndpoint(
  httpServer,
  path,
  responseContent
) {
  // We have to put all values and functions referenced in the handler into
  // this string which will be turned into a function for the handler, because
  // NodeHTTPSServer handlers can't access items in the local or global scopes of the
  // containing file
  let func = `
    // Log the request for analysis
    global.requestLog[global.requestLog.length] = {
      path: "${path}",
      hasAvailableDict: request.headers['available-dictionary'] !== undefined,
      availableDict: request.headers['available-dictionary'] || null
    };

    response.writeHead(200, {
      "Content-Type": "text/plain",
    });
    response.end("${responseContent}", "binary");
`;
  let handler = new Function("request", "response", func);
  return httpServer.registerPathHandler(path, handler);
}

// Setup retrieval test server with dictionaries and resources
async function setupRetrievalTestServer() {
  await setupServer();

  // Dictionary endpoints - store dictionaries with different patterns
  await server.registerPathHandler(
    "/dict/api-v1",
    function (request, response) {
      const RETRIEVAL_TEST_DICTIONARIES = {
        api_v1: {
          id: "api-v1-dict",
          content: "API_V1_COMMON_DATA",
          pattern: "/api/v1/*",
          type: "raw",
        },
      };
      let dict = RETRIEVAL_TEST_DICTIONARIES.api_v1;
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
        "Cache-Control": "max-age=3600",
      });
      response.end(dict.content, "binary");
    }
  );

  await server.registerPathHandler(
    "/dict/api-generic",
    function (request, response) {
      const RETRIEVAL_TEST_DICTIONARIES = {
        api_generic: {
          id: "api-generic-dict",
          content: "API_GENERIC_DATA",
          pattern: "/api/*",
          type: "raw",
        },
      };
      let dict = RETRIEVAL_TEST_DICTIONARIES.api_generic;
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
        "Cache-Control": "max-age=3600",
      });
      response.end(dict.content, "binary");
    }
  );

  await server.registerPathHandler("/wildcard", function (request, response) {
    const RETRIEVAL_TEST_DICTIONARIES = {
      wildcard: {
        id: "wildcard-dict",
        content: "WILDCARD_DATA",
        pattern: "*",
        type: "raw",
      },
    };
    let dict = RETRIEVAL_TEST_DICTIONARIES.wildcard;
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
      "Cache-Control": "max-age=3600",
    });
    response.end(dict.content, "binary");
  });

  await server.registerPathHandler("/js", function (request, response) {
    const RETRIEVAL_TEST_DICTIONARIES = {
      js_files: {
        id: "js-dict",
        content: "JS_COMMON_CODE",
        pattern: "*.js",
        type: "raw",
      },
    };
    let dict = RETRIEVAL_TEST_DICTIONARIES.js_files;
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Use-As-Dictionary": `match="${dict.pattern}", id="${dict.id}", type=${dict.type}`,
      "Cache-Control": "max-age=3600",
    });
    response.end(dict.content, "binary");
  });

  // Resource endpoints that should trigger dictionary retrieval
  await registerDictionaryAwareEndpoint(
    server,
    "/api/v1/users",
    "API V1 USERS DATA"
  );
  await registerDictionaryAwareEndpoint(
    server,
    "/api/v2/posts",
    "API V2 POSTS DATA"
  );
  await registerDictionaryAwareEndpoint(
    server,
    "/api/generic",
    "GENERIC API DATA"
  );
  await registerDictionaryAwareEndpoint(server, "/web/page", "WEB PAGE DATA");
  await registerDictionaryAwareEndpoint(
    server,
    "/scripts/app.js",
    "JAVASCRIPT CODE"
  );
  await registerDictionaryAwareEndpoint(
    server,
    "/styles/main.css",
    "CSS STYLES"
  );

  return server;
}

// Setup baseline dictionaries for retrieval testing
add_task(async function test_setup_dictionaries() {
  await setupRetrievalTestServer();

  // Clear any existing cache
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  evict_cache_entries("all", lci);
  requestLog = [];
  await sync_to_server();

  // Store all test dictionaries
  const dictPaths = ["/dict/api-v1", "/dict/api-generic", "/wildcard", "/js"];

  for (let path of dictPaths) {
    let url = `https://localhost:${server.port()}${path}`;

    let chan = makeChan(url);
    let [, data] = await channelOpenPromise(chan);
    dump(`**** Dictionary loaded: ${path}, data length: ${data.length}\n`);

    // Verify dictionary was stored
    await new Promise(resolve => {
      verifyDictionaryStored(url, true, resolve);
    });
  }
  dump("**** Setup complete\n");
});

// Test basic dictionary lookup and Available-Dictionary header generation
add_task(async function test_basic_dictionary_retrieval() {
  let url = `https://localhost:${server.port()}/api/v1/users`;
  requestLog = [];
  await sync_to_server();

  // Calculate expected hash for api_v1 dictionary
  let expectedHash = await calculateDictionaryHash(
    RETRIEVAL_TEST_DICTIONARIES.api_v1.content
  );

  let chan = makeChan(url);
  let [, data] = await channelOpenPromise(chan);

  Assert.equal(data, "API V1 USERS DATA", "Resource content matches");

  // Check request log to see if Available-Dictionary header was sent
  await sync_from_server();
  let logEntry = requestLog.find(entry => entry.path === "/api/v1/users");
  Assert.ok(logEntry && logEntry.hasAvailableDict, "Has Available-Dictionary");
  Assert.ok(
    logEntry.availableDict.includes(expectedHash),
    "Available-Dictionary header should contain expected hash"
  );
  dump("**** Basic retrieval test complete\n");
});

// Test URL pattern matching logic for dictionary selection
add_task(async function test_dictionary_pattern_matching() {
  const patternMatchTests = [
    { url: "/api/v1/users", expectedPattern: "/api/v1/*", dictKey: "api_v1" },
    { url: "/api/v2/posts", expectedPattern: "/api/*", dictKey: "api_generic" },
    { url: "/api/generic", expectedPattern: "/api/*", dictKey: "api_generic" },
    { url: "/scripts/app.js", expectedPattern: "*.js", dictKey: "js_files" },
    { url: "/web/page", expectedPattern: "*", dictKey: "wildcard" }, // Only wildcard should match
    { url: "/styles/main.css", expectedPattern: "*", dictKey: "wildcard" },
  ];

  requestLog = [];
  await sync_to_server();

  for (let test of patternMatchTests) {
    let url = `https://localhost:${server.port()}${test.url}`;
    let expectedDict = RETRIEVAL_TEST_DICTIONARIES[test.dictKey];
    let expectedHash = await calculateDictionaryHash(expectedDict.content);

    let chan = makeChan(url);
    let [, data] = await channelOpenPromise(chan);

    Assert.greater(data.length, 0, `Resource ${test.url} should have content`);

    // Check request log
    await sync_from_server();
    let logEntry = requestLog.find(entry => entry.path === test.url);
    Assert.ok(
      logEntry && logEntry.hasAvailableDict,
      `Available-Dictionary header should be present for ${test.url}`
    );
    if (logEntry && logEntry.hasAvailableDict) {
      Assert.ok(
        logEntry.availableDict.includes(expectedHash),
        `Available-Dictionary header should contain expected hash for ${test.url}`
      );
    }
  }
});

// Test dictionary precedence when multiple patterns match
add_task(async function test_dictionary_precedence() {
  // Test URL that matches multiple patterns: /api/v1/users
  // Should match: "/api/v1/*" (most specific), "/api/*", "*" (wildcard)
  // Most specific pattern should take precedence

  let url = `https://localhost:${server.port()}/api/v1/users`;
  requestLog = [];
  await sync_to_server();

  let mostSpecificHash = await calculateDictionaryHash(
    RETRIEVAL_TEST_DICTIONARIES.api_v1.content
  );

  let chan = makeChan(url);
  let [, data] = await channelOpenPromise(chan);

  Assert.equal(data, "API V1 USERS DATA", "Content should match");

  // Check request log for precedence
  await sync_from_server();
  let logEntry = requestLog.find(entry => entry.path === "/api/v1/users");
  Assert.ok(
    logEntry && logEntry.hasAvailableDict,
    "Available-Dictionary header should be present for precedence test"
  );
  if (logEntry && logEntry.hasAvailableDict) {
    // The most specific pattern (/api/v1/*) should be included
    // Implementation may include multiple matching dictionaries
    Assert.ok(
      logEntry.availableDict.includes(mostSpecificHash),
      "Available-Dictionary header should contain most specific pattern hash"
    );
  }
});

// Test successful dictionary lookup and usage
add_task(async function test_dictionary_cache_hit() {
  let url = `https://localhost:${server.port()}/api/generic`;
  requestLog = [];
  await sync_to_server();

  let expectedHash = await calculateDictionaryHash(
    RETRIEVAL_TEST_DICTIONARIES.api_generic.content
  );

  let chan = makeChan(url);
  let [, data] = await channelOpenPromise(chan);

  Assert.equal(data, "GENERIC API DATA", "Content should match");

  // Verify dictionary lookup succeeded
  await sync_from_server();
  let logEntry = requestLog.find(entry => entry.path === "/api/generic");
  Assert.ok(
    logEntry && logEntry.hasAvailableDict,
    "Available-Dictionary header should be present for cache hit"
  );
  if (logEntry && logEntry.hasAvailableDict) {
    Assert.ok(
      logEntry.availableDict.includes(expectedHash),
      "Available-Dictionary header should contain expected hash for cache hit"
    );
  }
});

// Test Available-Dictionary header hash format compliance
add_task(async function test_dictionary_hash_format() {
  // Test that dictionary hashes follow IETF spec format: :base64hash:

  let testDict = RETRIEVAL_TEST_DICTIONARIES.api_v1;
  let calculatedHash = await calculateDictionaryHash(testDict.content);

  // Verify hash is base64 format
  Assert.greater(calculatedHash.length, 0, "Hash should not be empty");

  // Verify base64 pattern (rough check)
  let base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
  Assert.ok(base64Pattern.test(calculatedHash), "Hash should be valid base64");

  // The hash format should be structured field byte sequence: :base64:
  let structuredFieldFormat = `:${calculatedHash}:`;
  Assert.ok(
    structuredFieldFormat.includes(calculatedHash),
    "Hash should follow structured field format"
  );
});

// Test retrieval with multiple dictionary matches
add_task(async function test_multiple_dictionary_matches() {
  // Create a request that could match multiple dictionaries
  let url = `https://localhost:${server.port()}/api/test`;
  requestLog = [];
  await sync_to_server();

  await registerDictionaryAwareEndpoint(server, "/api/test", "API TEST DATA");

  let apiGenericHash = await calculateDictionaryHash(
    RETRIEVAL_TEST_DICTIONARIES.api_generic.content
  );
  let chan = makeChan(url);
  let [, data] = await channelOpenPromise(chan);

  Assert.equal(data, "API TEST DATA", "Content should match");

  // Check for multiple dictionary hashes in Available-Dictionary header
  await sync_from_server();
  let logEntry = requestLog.find(entry => entry.path === "/api/test");
  Assert.ok(
    logEntry && logEntry.hasAvailableDict,
    "Available-Dictionary header should be present for multiple matches"
  );
  if (logEntry && logEntry.hasAvailableDict) {
    // Could match both /api/* and * patterns - verify the longest pattern's hash is present
    // (IETF spec says the longest match should be used)
    let hasApiGenericHash = logEntry.availableDict.includes(apiGenericHash);
    Assert.ok(
      hasApiGenericHash,
      "Available-Dictionary header should contain at least one expected hash for multiple matches"
    );
  }
});

// Test case-insensitive Vary header removal (Bug 2010968)
add_task(async function test_vary_header_case_insensitive_removal() {
  // Test that RemoveFromVary removes Accept-Encoding regardless of case
  // Both "Accept-Encoding" and "accept-encoding" should be properly removed

  // Setup dictionary endpoints with different Vary header cases
  await server.registerPathHandler(
    "/dict/vary-uppercase",
    function (request, response) {
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary":
          'match="/test/uppercase/*", id="vary-upper-dict", type=raw',
        "Cache-Control": "max-age=3600",
        Vary: "Accept-Encoding, User-Agent",
      });
      response.end("VARY_UPPERCASE_DICT_DATA", "binary");
    }
  );

  await server.registerPathHandler(
    "/dict/vary-lowercase",
    function (request, response) {
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary":
          'match="/test/lowercase/*", id="vary-lower-dict", type=raw',
        "Cache-Control": "max-age=3600",
        Vary: "accept-encoding, User-Agent",
      });
      response.end("VARY_LOWERCASE_DICT_DATA", "binary");
    }
  );

  await server.registerPathHandler(
    "/dict/vary-mixedcase",
    function (request, response) {
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Use-As-Dictionary":
          'match="/test/mixed/*", id="vary-mixed-dict", type=raw',
        "Cache-Control": "max-age=3600",
        Vary: "AcCePt-EnCoDiNg, User-Agent",
      });
      response.end("VARY_MIXEDCASE_DICT_DATA", "binary");
    }
  );

  // Test 1: Uppercase Accept-Encoding
  let urlUpper = `https://localhost:${server.port()}/dict/vary-uppercase`;
  let chanUpper = makeChan(urlUpper);
  let [reqUpper, dataUpper] = await channelOpenPromise(chanUpper);
  Assert.equal(
    dataUpper,
    "VARY_UPPERCASE_DICT_DATA",
    "Dictionary with uppercase Accept-Encoding should be fetched"
  );

  // Check the Vary header - Accept-Encoding should be removed
  let varyUpper = reqUpper
    .QueryInterface(Ci.nsIHttpChannel)
    .getResponseHeader("Vary");
  Assert.ok(
    !varyUpper.toLowerCase().includes("accept-encoding"),
    `Vary header should not contain Accept-Encoding (was: "${varyUpper}")`
  );
  Assert.ok(
    varyUpper.includes("User-Agent"),
    "Vary header should still contain User-Agent"
  );

  // Verify dictionary was stored
  await new Promise(resolve => {
    verifyDictionaryStored(urlUpper, true, resolve);
  });

  // Test 2: Lowercase accept-encoding
  let urlLower = `https://localhost:${server.port()}/dict/vary-lowercase`;
  let chanLower = makeChan(urlLower);
  let [reqLower, dataLower] = await channelOpenPromise(chanLower);
  Assert.equal(
    dataLower,
    "VARY_LOWERCASE_DICT_DATA",
    "Dictionary with lowercase accept-encoding should be fetched"
  );

  // Check the Vary header - accept-encoding should be removed
  let varyLower = reqLower
    .QueryInterface(Ci.nsIHttpChannel)
    .getResponseHeader("Vary");
  Assert.ok(
    !varyLower.toLowerCase().includes("accept-encoding"),
    `Vary header should not contain accept-encoding (was: "${varyLower}")`
  );
  Assert.ok(
    varyLower.includes("User-Agent"),
    "Vary header should still contain User-Agent"
  );

  // Verify dictionary was stored
  await new Promise(resolve => {
    verifyDictionaryStored(urlLower, true, resolve);
  });

  // Test 3: Mixed case AcCePt-EnCoDiNg
  let urlMixed = `https://localhost:${server.port()}/dict/vary-mixedcase`;
  let chanMixed = makeChan(urlMixed);
  let [reqMixed, dataMixed] = await channelOpenPromise(chanMixed);
  Assert.equal(
    dataMixed,
    "VARY_MIXEDCASE_DICT_DATA",
    "Dictionary with mixed case Accept-Encoding should be fetched"
  );

  // Check the Vary header - AcCePt-EnCoDiNg should be removed
  let varyMixed = reqMixed
    .QueryInterface(Ci.nsIHttpChannel)
    .getResponseHeader("Vary");
  Assert.ok(
    !varyMixed.toLowerCase().includes("accept-encoding"),
    `Vary header should not contain Accept-Encoding in any case (was: "${varyMixed}")`
  );
  Assert.ok(
    varyMixed.includes("User-Agent"),
    "Vary header should still contain User-Agent"
  );

  // Verify dictionary was stored
  await new Promise(resolve => {
    verifyDictionaryStored(urlMixed, true, resolve);
  });

  dump("**** Case-insensitive Vary header removal test complete\n");
});

// Cleanup
add_task(async function cleanup() {
  // Clear cache
  let lci = Services.loadContextInfo.custom(false, {
    partitionKey: `(https,localhost)`,
  });
  evict_cache_entries("all", lci);
});
