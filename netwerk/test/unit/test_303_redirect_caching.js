// ABOUTME: Tests HTTP 303 redirect caching behavior with various cache headers
// ABOUTME: per RFC 9110 which allows caching 303 with explicit freshness info
"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

let httpserver = null;

function make_channel(url) {
  return NetUtil.newChannel({ uri: url, loadUsingSystemPrincipal: true });
}

const responseBody = "response body";

function contentHandler(metadata, response) {
  response.setHeader("Content-Type", "text/plain");
  response.bodyOutputStream.write(responseBody, responseBody.length);
}

function setup_test_server() {
  httpserver = new HttpServer();
  httpserver.registerPathHandler("/content", contentHandler);
  httpserver.start(-1);
}

registerCleanupFunction(async () => {
  if (httpserver) {
    await new Promise(resolve => httpserver.stop(resolve));
  }
});

function get_url(path) {
  return `http://localhost:${httpserver.identity.primaryPort}${path}`;
}

// Test 1: 303 with Cache-Control: max-age should be cached
add_task(async function test_303_with_max_age() {
  setup_test_server();

  let requestCount = 0;
  httpserver.registerPathHandler("/redirect1", (metadata, response) => {
    requestCount++;
    response.setStatusLine(metadata.httpVersion, 303, "See Other");
    response.setHeader("Location", get_url("/content"), false);
    response.setHeader("Cache-Control", "max-age=3600", false);
  });

  // First request
  let chan = make_channel(get_url("/redirect1"));
  let buffer = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener((request, buf) => resolve(buf), null));
  });
  Assert.equal(buffer, responseBody);
  Assert.equal(requestCount, 1, "First request should hit server");

  // Second request - should use cached redirect
  chan = make_channel(get_url("/redirect1"));
  buffer = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener((request, buf) => resolve(buf), null));
  });
  Assert.equal(buffer, responseBody);
  Assert.equal(requestCount, 1, "Second request should use cached redirect");
});

// Test 2: 303 with Expires header should be cached
add_task(async function test_303_with_expires() {
  let requestCount = 0;
  httpserver.registerPathHandler("/redirect2", (metadata, response) => {
    requestCount++;
    response.setStatusLine(metadata.httpVersion, 303, "See Other");
    response.setHeader("Location", get_url("/content"), false);
    // Set Expires to 1 hour in the future
    let expires = new Date();
    expires.setHours(expires.getHours() + 1);
    response.setHeader("Expires", expires.toUTCString(), false);
  });

  // First request
  let chan = make_channel(get_url("/redirect2"));
  let buffer = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener((request, buf) => resolve(buf), null));
  });
  Assert.equal(buffer, responseBody);
  Assert.equal(requestCount, 1, "First request should hit server");

  // Second request - should use cached redirect
  chan = make_channel(get_url("/redirect2"));
  buffer = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener((request, buf) => resolve(buf), null));
  });
  Assert.equal(buffer, responseBody);
  Assert.equal(requestCount, 1, "Second request should use cached redirect");
});

// Test 3: 303 without cache headers should NOT be cached
add_task(async function test_303_without_cache_headers() {
  let requestCount = 0;
  httpserver.registerPathHandler("/redirect3", (metadata, response) => {
    requestCount++;
    response.setStatusLine(metadata.httpVersion, 303, "See Other");
    response.setHeader("Location", get_url("/content"), false);
    // No Cache-Control or Expires headers
  });

  // First request
  let chan = make_channel(get_url("/redirect3"));
  let buffer = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener((request, buf) => resolve(buf), null));
  });
  Assert.equal(buffer, responseBody);
  Assert.equal(requestCount, 1, "First request should hit server");

  // Second request - should hit server again (not cached)
  chan = make_channel(get_url("/redirect3"));
  buffer = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener((request, buf) => resolve(buf), null));
  });
  Assert.equal(buffer, responseBody);
  Assert.equal(
    requestCount,
    2,
    "Second request should hit server (not cached)"
  );
});

// Test 4: 303 with Cache-Control: no-store should NOT be cached
add_task(async function test_303_with_no_store() {
  let requestCount = 0;
  httpserver.registerPathHandler("/redirect4", (metadata, response) => {
    requestCount++;
    response.setStatusLine(metadata.httpVersion, 303, "See Other");
    response.setHeader("Location", get_url("/content"), false);
    response.setHeader("Cache-Control", "no-store", false);
  });

  // First request
  let chan = make_channel(get_url("/redirect4"));
  let buffer = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener((request, buf) => resolve(buf), null));
  });
  Assert.equal(buffer, responseBody);
  Assert.equal(requestCount, 1, "First request should hit server");

  // Second request - should hit server again due to no-store
  chan = make_channel(get_url("/redirect4"));
  buffer = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener((request, buf) => resolve(buf), null));
  });
  Assert.equal(buffer, responseBody);
  Assert.equal(requestCount, 2, "Second request should hit server (no-store)");
});

// Test 5: 303 with Cache-Control: no-cache should require revalidation
add_task(async function test_303_with_no_cache() {
  let requestCount = 0;
  httpserver.registerPathHandler("/redirect5", (metadata, response) => {
    requestCount++;
    response.setStatusLine(metadata.httpVersion, 303, "See Other");
    response.setHeader("Location", get_url("/content"), false);
    response.setHeader("Cache-Control", "max-age=3600, no-cache", false);
  });

  // First request
  let chan = make_channel(get_url("/redirect5"));
  let buffer = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener((request, buf) => resolve(buf), null));
  });
  Assert.equal(buffer, responseBody);
  Assert.equal(requestCount, 1, "First request should hit server");

  // Second request - should revalidate due to no-cache
  chan = make_channel(get_url("/redirect5"));
  buffer = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener((request, buf) => resolve(buf), null));
  });
  Assert.equal(buffer, responseBody);
  Assert.equal(requestCount, 2, "Second request should revalidate (no-cache)");
});
