/*
 * Tests for cache2 Compression Dictionary support (draft-ietf-httpbis-compression-dictionary-19)
 * - Storing dictionaries via Use-As-Dictionary
 * - Using Available-Dictionary for decompression
 */

"use strict";

// Load cache helpers
Services.scriptloader.loadSubScript("resource://test/head_cache.js", this);

const { NodeHTTPSServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

var server = null;
// Keep these in sync with duplicates below!
const dictContent = "DICTIONARY_DATA";
const decompressedContent = "COMPRESSED_DATA";
const resourcePath = "/resource";
const dictPath = "/dict";

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

// Serve a dictionary with Use-As-Dictionary header
function serveDictionary(request, response) {
  // the server can't see the global versions of these.
  // Note: keep in sync with above!
  let dict = "dict1";
  const dictContent = "DICTIONARY_DATA";
  response.writeHead(200, {
    "Content-Type": "application/octet-stream",
    "Use-As-Dictionary": `match=\"*\", id=\"${dict}\", type=raw`,
    "Cache-Control": "max-age=3600",
  });
  response.end(dictContent, "binary");
}

// Serve a resource with Available-Dictionary header
function serveCompressedResource(request, response) {
  // brotli compressed data is 4 byte magic + 32-byte SHA-256 hash (which we
  // don't check)
  const compressedContent =
    "\xff\x44\x43\x42" +
    "12345678901234567890123456789012" +
    "\x21\x38\x00\x04COMPRESSED_DATA\x03";
  let availDict = request.headers["available-dictionary"];
  if (availDict != undefined) {
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "dcb",
    });
    response.end(compressedContent, "binary");
  } else {
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
    });
    response.end("UNCOMPRESSED_DATA", "binary");
  }
}

add_setup(async function () {
  Services.prefs.setBoolPref("network.http.dictionaries.enable", true);
  if (!server) {
    server = new NodeHTTPSServer();
    await server.start();
    registerCleanupFunction(async () => {
      await server.stop();
    });

    await server.registerPathHandler(dictPath, serveDictionary);
    await server.registerPathHandler(resourcePath, serveCompressedResource);
  }
});

add_task(async function test_resource_without_dictionary() {
  let uri = `${server.origin()}${resourcePath}`;
  let chan = makeChan(uri);
  let [, data] = await channelOpenPromise(chan);
  Assert.equal(data, "UNCOMPRESSED_DATA", "Received uncompressed data");
});

add_task(async function test_store_dictionary() {
  let uri = `${server.origin()}${dictPath}`;
  let chan = makeChan(uri);
  let [, data] = await channelOpenPromise(chan);
  Assert.equal(data, dictContent, "Dictionary body matches");

  await new Promise(resolve => {
    // Check that dictionary is stored in cache (disk)
    let lci = Services.loadContextInfo.custom(false, {
      partitionKey: `(https,localhost)`,
    });
    asyncCheckCacheEntryPresence(uri, "disk", true, lci, resolve);
  });
});

add_task(async function test_use_dictionary_for_resource() {
  let uri = `${server.origin()}${resourcePath}`;

  let chan = makeChan(uri);
  let [req, data] = await channelOpenPromise(chan);
  // Check for expected uncompressed content
  Assert.strictEqual(
    data,
    decompressedContent,
    "Received compressed data (decompression not supported in test)"
  );
  // Check response headers
  Assert.equal(
    req.getResponseHeader("Content-Encoding"),
    "",
    "Content-Encoding dcb was removed"
  );
  let availdict = req.getRequestHeader("available-dictionary");
  Assert.equal(availdict, ":iFRBfhN7ePMquH3Lmw/oL4xRkaa8QjW43JQO+04KA7I=:");
});
