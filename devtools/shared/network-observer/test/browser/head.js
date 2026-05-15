/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  NetworkHelper:
    "resource://devtools/shared/network-observer/NetworkHelper.sys.mjs",
  NetworkObserver:
    "resource://devtools/shared/network-observer/NetworkObserver.sys.mjs",
  NetworkUtils:
    "resource://devtools/shared/network-observer/NetworkUtils.sys.mjs",
});

const TEST_DIR = gTestPath.substr(0, gTestPath.lastIndexOf("/"));
const CHROME_URL_ROOT = TEST_DIR + "/";
const URL_ROOT = CHROME_URL_ROOT.replace(
  "chrome://mochitests/content/",
  "https://example.com/"
);

/**
 * Load the provided url in an existing browser.
 * Returns a promise which will resolve when the page is loaded.
 *
 * @param {Browser} browser
 *     The browser element where the URL should be loaded.
 * @param {string} url
 *     The URL to load in the new tab
 */
async function loadURL(browser, url) {
  const loaded = BrowserTestUtils.browserLoaded(browser);
  BrowserTestUtils.startLoadingURIString(browser, url);
  return loaded;
}

/**
 * Create a new foreground tab loading the provided url.
 * Returns a promise which will resolve when the page is loaded.
 *
 * @param {string} url
 *     The URL to load in the new tab
 */
async function addTab(url) {
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url);
  registerCleanupFunction(() => {
    gBrowser.removeTab(tab);
  });
  return tab;
}

/**
 * Base network event owner class implementing all mandatory callbacks and
 * keeping track of which callbacks have been called.
 */
class NetworkEventOwner {
  hasCacheDetails = false;
  hasEventTimings = false;
  hasRawHeaders = false;
  hasResponseCache = false;
  hasResponseContent = false;
  hasResponseContentComplete = false;
  hasResponseStart = false;
  hasSecurityInfo = false;
  hasServerTimings = false;

  addCacheDetails() {
    this.hasCacheDetails = true;
  }
  addEventTimings() {
    this.hasEventTimings = true;
  }
  addRawHeaders() {
    this.hasRawHeaders = true;
  }
  addResponseCache() {
    this.hasResponseCache = true;
  }
  addResponseContent() {
    this.hasResponseContent = true;
  }
  addResponseContentComplete() {
    this.hasResponseContentComplete = true;
  }
  addResponseStart() {
    this.hasResponseStart = true;
  }
  addSecurityInfo() {
    this.hasSecurityInfo = true;
  }
  addServerTimings() {
    this.hasServerTimings = true;
  }
  addServiceWorkerTimings() {
    this.hasServiceWorkerTimings = true;
  }
}

/**
 * Create a simple network event owner, with mock implementations of all
 * the expected APIs for a NetworkEventOwner.
 */
function createNetworkEventOwner() {
  return new NetworkEventOwner();
}

/**
 * Wait for network events matching the provided URL, until the count reaches
 * the provided expected count.
 *
 * @param {string|null} expectedUrl
 *     The URL which should be monitored by the NetworkObserver.If set to null watch for
 *      all requests
 * @param {number} expectedRequestsCount
 *     How many different events (requests) are expected.
 * @returns {Promise}
 *     A promise which will resolve with an array of network event owners, when
 *     the expected event count is reached.
 */
async function waitForNetworkEvents(expectedUrl = null, expectedRequestsCount) {
  const events = [];
  const networkObserver = new NetworkObserver({
    ignoreChannelFunction: channel =>
      expectedUrl ? channel.URI.spec !== expectedUrl : false,
    onNetworkEvent: () => {
      info("waitForNetworkEvents received a new event");
      const owner = createNetworkEventOwner();
      events.push(owner);
      return owner;
    },
  });
  registerCleanupFunction(() => networkObserver.destroy());

  info("Wait until the events count reaches " + expectedRequestsCount);
  await BrowserTestUtils.waitForCondition(
    () => events.length >= expectedRequestsCount
  );
  return events;
}

/**
 * NetworkEventOwner class which can be used to assert the response content of
 * a network event.
 */
class ResponseContentOwner extends NetworkEventOwner {
  addResponseContent(response) {
    super.addResponseContent();
    this.compressionEncodings = response.compressionEncodings;
    this.contentCharset = response.contentCharset;
    this.decodedBodySize = response.decodedBodySize;
    this.encodedBodySize = response.encodedBodySize;
    this.encodedData = response.encodedData;
    this.encoding = response.encoding;
    this.isContentEncoded = response.isContentEncoded;
    this.text = response.text;
  }

  addResponseContentComplete({ truncated }) {
    super.addResponseContentComplete();
    this.truncated = truncated;
  }

  /**
   * Simple helper to decode the content of a response from a network event.
   */
  async getDecodedContent() {
    if (!this.isContentEncoded) {
      // If the content is not encoded we can directly return the text property.
      return this.text;
    }

    // Otherwise call the dedicated NetworkUtils decodeResponseChunks helper.
    return NetworkUtils.decodeResponseChunks(this.encodedData, {
      charset: this.contentCharset,
      compressionEncodings: this.compressionEncodings,
      encodedBodySize: this.encodedBodySize,
      encoding: this.encoding,
    });
  }
}

/**
 * Helper to compress a string using gzip.
 */
function gzipCompressString(string) {
  return new Promise(resolve => {
    const observer = {
      onStreamComplete(loader, context, status, length, result) {
        resolve(String.fromCharCode.apply(this, result));
      },
    };

    const scs = Cc["@mozilla.org/streamConverters;1"].getService(
      Ci.nsIStreamConverterService
    );
    const listener = Cc["@mozilla.org/network/stream-loader;1"].createInstance(
      Ci.nsIStreamLoader
    );
    listener.init(observer);
    const converter = scs.asyncConvertData(
      "uncompressed",
      "gzip",
      listener,
      null
    );
    const stringStream = Cc[
      "@mozilla.org/io/string-input-stream;1"
    ].createInstance(Ci.nsIStringInputStream);
    stringStream.setByteStringData(string);
    converter.onStartRequest(null, null);
    converter.onDataAvailable(null, stringStream, 0, string.length);
    converter.onStopRequest(null, null, null);
  });
}
