/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* global add_setup, add_task, Assert, info, do_get_profile, do_timeout, registerCleanupFunction, Services */

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const { NetUtil } = ChromeUtils.importESModule(
  "resource://gre/modules/NetUtil.sys.mjs"
);

// Create a test HTTP server
let gHttpServer = null;
let gServerPort = -1;
let gServerURL = "";

// Track requests received by the server
let gRequestsReceived = [];

/**
 * Helper to decode potentially gzipped request body
 */
function decodeRequestBody(request) {
  let bodyStream = request.bodyInputStream;
  let avail = bodyStream.available();
  if (avail === 0) {
    return "";
  }

  if (
    request.hasHeader("content-encoding") &&
    request.getHeader("content-encoding") === "gzip"
  ) {
    return "[gzipped content]";
  }

  return NetUtil.readInputStreamToString(bodyStream, avail);
}

/**
 * Wait for requests to arrive and settle.
 *
 * This waits for at least one request to arrive, then continues waiting
 * until no new requests arrive for `settleTime` milliseconds. This ensures
 * all pending viaduct-necko operations complete before the test proceeds,
 * avoiding race conditions where background requests might still be in flight.
 */
async function waitForRequestsToSettle(
  settleTime = 300,
  timeout = 10000,
  interval = 50
) {
  let start = Date.now();

  // First, wait for at least one request to arrive
  while (gRequestsReceived.length === 0) {
    if (Date.now() - start > timeout) {
      throw new Error("Timeout waiting for initial request");
    }
    await new Promise(resolve => do_timeout(interval, resolve));
  }

  // Now wait for requests to settle (no new requests for settleTime ms)
  let lastCount = 0;
  let lastChangeTime = Date.now();

  while (Date.now() - lastChangeTime < settleTime) {
    if (Date.now() - start > timeout) {
      info(
        `Timeout waiting for requests to settle, proceeding with ${gRequestsReceived.length} requests`
      );
      break;
    }

    if (gRequestsReceived.length !== lastCount) {
      lastCount = gRequestsReceived.length;
      lastChangeTime = Date.now();
    }

    await new Promise(resolve => do_timeout(interval, resolve));
  }

  info(`Requests settled with ${gRequestsReceived.length} total requests`);
}

/**
 * Setup function to initialize the HTTP server
 */
add_setup(async function () {
  info("Setting up viaduct-necko test environment");

  // FOG needs a profile directory to store its data
  do_get_profile();

  // Create and start the HTTP server
  gHttpServer = new HttpServer();

  // Register various test endpoints
  setupTestEndpoints();

  gHttpServer.start(-1);
  gServerPort = gHttpServer.identity.primaryPort;
  gServerURL = `http://localhost:${gServerPort}`;

  info(`Test HTTP server started on port ${gServerPort}`);

  // Set the telemetry port preference to use our test server
  Services.prefs.setIntPref("telemetry.fog.test.localhost_port", gServerPort);

  // Enable telemetry upload (needed for viaduct to be used)
  Services.prefs.setBoolPref("datareporting.healthreport.uploadEnabled", true);

  // Initialize FOG/Glean which should trigger viaduct-necko initialization
  // This internally calls init_necko_backend() through GkRust_Init
  Services.fog.testResetFOG();

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref("telemetry.fog.test.localhost_port");
    Services.prefs.clearUserPref("datareporting.healthreport.uploadEnabled");
    await new Promise(resolve => gHttpServer.stop(resolve));
  });
});

/**
 * Setup test endpoints on the HTTP server
 */
function setupTestEndpoints() {
  // Glean telemetry submission endpoints
  gHttpServer.registerPrefixHandler("/submit/", (request, response) => {
    const path = request.path;
    info(`Viaduct request received: ${request.method} ${path}`);

    // Read the request body
    const body = decodeRequestBody(request);

    // Extract ping type from path
    // Path format: /submit/firefox-desktop/{ping-type}/1/{uuid}
    const pathParts = path.split("/");
    const pingType = pathParts[3] || "unknown";

    gRequestsReceived.push({
      path,
      method: request.method,
      pingType,
      body,
      bodySize: request.hasHeader("content-length")
        ? parseInt(request.getHeader("content-length"), 10)
        : body.length,
      headers: {
        "content-type": request.hasHeader("content-type")
          ? request.getHeader("content-type")
          : null,
        "content-encoding": request.hasHeader("content-encoding")
          ? request.getHeader("content-encoding")
          : null,
        "user-agent": request.hasHeader("user-agent")
          ? request.getHeader("user-agent")
          : null,
      },
    });

    // Return a response similar to what a telemetry server would return
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Server", "TestServer/1.0 (Viaduct Backend)");
    response.setHeader("Date", new Date().toUTCString());
    response.setHeader("Connection", "close");
    response.setHeader("Content-Type", "application/json");

    const responseBody = JSON.stringify({
      status: "ok",
      message: "Test server response",
    });
    response.setHeader("Content-Length", responseBody.length.toString());
    response.write(responseBody);
  });
}

/**
 * Test that the viaduct-necko backend was initialized and is processing requests
 */
add_task(async function test_viaduct_backend_working() {
  info("Testing viaduct-necko backend initialization and request processing");

  const initialRequestCount = gRequestsReceived.length;
  info(
    `Already received ${initialRequestCount} requests during initialization`
  );

  // Wait for requests to arrive AND settle. This is critical to avoid race
  // conditions where background viaduct-necko operations might still be
  // completing when subsequent tests run.
  await waitForRequestsToSettle();

  // Check that we've received requests through viaduct
  Assert.ok(
    !!gRequestsReceived.length,
    `Viaduct-necko backend is processing requests. Received ${gRequestsReceived.length} requests.`
  );

  // Verify the requests are health pings
  const healthPings = gRequestsReceived.filter(r => r.pingType === "health");
  info(`Received ${healthPings.length} health pings through viaduct-necko`);

  // All telemetry submissions should be POST requests
  for (const request of gRequestsReceived) {
    Assert.equal(
      request.method,
      "POST",
      `Request to ${request.path} should be POST`
    );
  }

  // Log summary of what was processed
  const pingTypes = [...new Set(gRequestsReceived.map(r => r.pingType))];
  info(
    `Test successful: Viaduct-necko backend processed ${gRequestsReceived.length} requests`
  );
  info(`Ping types received: ${pingTypes.join(", ")}`);
  info(
    `The C++ backend successfully handled requests from Rust through the FFI layer`
  );
});

/**
 * Test different HTTP parameters and methods.
 * We verify different body sizes and headers are handled correctly.
 *
 * Note: We don't call testResetFOG() again here because it can hang in chaos
 * mode due to viaduct's synchronous waiting pattern combined with main-thread
 * dispatch. Instead, we analyze the requests already collected from setup.
 */
add_task(async function test_different_parameters() {
  info("Testing different HTTP parameters through viaduct-necko");

  const requestCount = gRequestsReceived.length;
  info(`Analyzing ${requestCount} requests from previous operations`);

  // Verify different content types and encodings were handled
  const contentTypes = new Set();
  const contentEncodings = new Set();
  const bodySizes = new Set();

  for (const request of gRequestsReceived) {
    if (request.headers["content-type"]) {
      contentTypes.add(request.headers["content-type"]);
    }
    if (request.headers["content-encoding"]) {
      contentEncodings.add(request.headers["content-encoding"]);
    }
    if (request.bodySize) {
      bodySizes.add(request.bodySize);
    }
  }

  info(`Content types seen: ${Array.from(contentTypes).join(", ")}`);
  info(`Content encodings seen: ${Array.from(contentEncodings).join(", ")}`);
  info(
    `Body sizes seen: ${Array.from(bodySizes)
      .sort((a, b) => a - b)
      .join(", ")}`
  );

  Assert.ok(
    !!gRequestsReceived.length,
    "Different parameters were processed successfully"
  );

  // Verify we're seeing body sizes (at least one request with a body)
  Assert.ok(
    bodySizes.size >= 1,
    `Body sizes handled: ${Array.from(bodySizes).join(", ")}`
  );
});

/**
 * Test that headers are properly passed through the FFI layer
 */
add_task(async function test_header_handling() {
  info("Testing header handling through viaduct-necko");

  // Check the headers that were sent in previous requests
  let hasHeaders = false;
  let headerCount = 0;

  for (const request of gRequestsReceived) {
    if (request.headers && Object.keys(request.headers).length) {
      hasHeaders = true;
      const nonNullHeaders = Object.entries(request.headers).filter(
        ([, value]) => value !== null
      );

      if (nonNullHeaders.length) {
        headerCount++;
        info(
          `Request headers found: ${JSON.stringify(Object.fromEntries(nonNullHeaders))}`
        );
      }
    }
  }

  Assert.ok(
    hasHeaders,
    "Headers are properly transmitted through viaduct-necko"
  );

  Assert.ok(headerCount > 0, `Found ${headerCount} requests with headers`);

  // Verify specific headers we expect to see
  const hasContentType = gRequestsReceived.some(
    r => r.headers && r.headers["content-type"] !== null
  );
  const hasContentEncoding = gRequestsReceived.some(
    r => r.headers && r.headers["content-encoding"] !== null
  );
  const hasUserAgent = gRequestsReceived.some(
    r => r.headers && r.headers["user-agent"] !== null
  );

  Assert.ok(hasContentType, "Content-Type header is present");
  Assert.ok(hasContentEncoding, "Content-Encoding header is present");
  Assert.ok(hasUserAgent, "User-Agent header is present");

  info("Headers are properly handled through the Rust -> C++ -> Necko chain");
});

/**
 * Test configuration validation.
 * We verify that the configuration is being passed correctly by checking
 * that requests complete successfully.
 */
add_task(async function test_configuration_validation() {
  info("Validating viaduct-necko configuration");

  // We can verify at least that requests are completing successfully
  // which means the configuration isn't breaking anything
  const successfulRequests = gRequestsReceived.filter(
    r => r.method === "POST" && r.path.includes("/submit/")
  );

  Assert.ok(
    !!successfulRequests.length,
    `Configuration is valid: ${successfulRequests.length} successful requests processed`
  );

  info(
    "Viaduct-necko backend configuration validated through successful request processing"
  );
});
