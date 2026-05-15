/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const FRONTEND_URL =
  "https://example.com/browser/devtools/client/performance-new/test/browser/webchannel-js-sources.html";

add_task(async function test_webchannel_get_js_sources() {
  info("Test the WebChannel GET_JS_SOURCES request functionality");

  // Register some mock JS sources for testing. We already test the logic that
  // retrieves the sources in other tests. This test focuses on the webchannel
  // itself only.
  const mockJSSources = {
    "uuid-12345-1": "function testFunction() { return 42; }",
    "uuid-12345-2": "console.log('Hello from source 2');",
    "uuid-67890-5": "function anotherFunction() { return 'test'; }",
    "uuid-67890-6": "alert('Hello world');",
  };

  const sourcesToRequest = ["uuid-12345-1", "uuid-12345-2", "uuid-67890-5"];

  const expectedResponse = [
    { sourceText: "function testFunction() { return 42; }" },
    { sourceText: "console.log('Hello from source 2');" },
    { sourceText: "function anotherFunction() { return 'test'; }" },
  ];

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: "about:blank",
    },
    async browser => {
      // Register the mock sources for the current browser
      BackgroundJSM.registerProfileCaptureForBrowser(
        browser,
        Promise.resolve(new ArrayBuffer(0)), // Mock profile result
        null, // No symbolication service
        mockJSSources
      );

      // Now navigate to the test HTML page
      const url =
        FRONTEND_URL +
        "?testType=basic" +
        "&sourceUuids=" +
        encodeURIComponent(JSON.stringify(sourcesToRequest)) +
        "&expectedResponse=" +
        encodeURIComponent(JSON.stringify(expectedResponse));

      const loaded = BrowserTestUtils.browserLoaded(browser);
      BrowserTestUtils.startLoadingURIString(browser, url);
      await loaded;

      await waitForTabTitle("JS sources received");
      ok(true, "The JS sources are successfully retrieved by the WebChannel.");
    }
  );
});

add_task(async function test_webchannel_get_js_sources_nonexistent() {
  info("Test GET_JS_SOURCES WebChannel request with non-existent sources");

  // Register some mock JS sources
  const mockJSSources = {
    "uuid-12345-1": "function testFunction() { return 42; }",
  };

  // Request non-existent sources (should return null)
  const sourcesToRequest = [
    "uuid-12345-999", // Non-existent UUID
    "uuid-99999-1", // Non-existent UUID
  ];

  const expectedResponse = [
    { error: "Source not found in the browser" },
    { error: "Source not found in the browser" },
  ];

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: "about:blank",
    },
    async browser => {
      // Register the mock sources for the current browser
      BackgroundJSM.registerProfileCaptureForBrowser(
        browser,
        Promise.resolve(new ArrayBuffer(0)),
        null,
        mockJSSources
      );

      // Now navigate to the test HTML page
      const url =
        FRONTEND_URL +
        "?testType=nonexistent" +
        "&sourceUuids=" +
        encodeURIComponent(JSON.stringify(sourcesToRequest)) +
        "&expectedResponse=" +
        encodeURIComponent(JSON.stringify(expectedResponse));

      const loaded = BrowserTestUtils.browserLoaded(browser);
      BrowserTestUtils.startLoadingURIString(browser, url);
      await loaded;

      await waitForTabTitle("JS sources received");
      ok(
        true,
        "Successfully verified GET_JS_SOURCES with non-existent sources"
      );
    }
  );
});

add_task(async function test_webchannel_get_js_sources_no_data() {
  info("Test GET_JS_SOURCES WebChannel request when no data is registered");

  const sourcesToRequest = ["uuid-12345-1"];

  // Open a new tab without registering JS sources
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: "about:blank",
    },
    async browser => {
      // Don't register any JS sources - this should cause an error

      // Now navigate to the test HTML page
      const url =
        FRONTEND_URL +
        "?testType=no-data" +
        "&sourceUuids=" +
        encodeURIComponent(JSON.stringify(sourcesToRequest)) +
        "&expectError=true";

      const loaded = BrowserTestUtils.browserLoaded(browser);
      BrowserTestUtils.startLoadingURIString(browser, url);
      await loaded;

      await waitForTabTitle("JS sources received");
      ok(true, "Successfully verified GET_JS_SOURCES error handling");
    }
  );
});

add_task(async function test_webchannel_get_js_sources_invalid_request() {
  info("Test GET_JS_SOURCES WebChannel request with invalid sources parameter");

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: "about:blank",
    },
    async browser => {
      // Don't need to register JS sources for this test

      // For this test, we need to pass invalid sourceUuids directly in the HTML
      // We'll use a special URL parameter that the HTML will use directly
      const url =
        FRONTEND_URL +
        "?testType=invalid-request" +
        "&sourceUuids=invalid_not_array" + // This is intentionally not JSON
        "&expectError=true";

      const loaded = BrowserTestUtils.browserLoaded(browser);
      BrowserTestUtils.startLoadingURIString(browser, url);
      await loaded;

      await waitForTabTitle("JS sources received");
      ok(true, "Successfully verified GET_JS_SOURCES invalid request handling");
    }
  );
});
