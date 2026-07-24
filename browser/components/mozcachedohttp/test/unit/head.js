/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { NetUtil } = ChromeUtils.importESModule(
  "resource://gre/modules/NetUtil.sys.mjs"
);
const { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);
const { MozCachedOHTTPProtocolHandler } = ChromeUtils.importESModule(
  "moz-src:///browser/components/mozcachedohttp/MozCachedOHTTPProtocolHandler.sys.mjs"
);

do_get_profile();

ChromeUtils.registerProcessActor("MozCachedOHTTP", {
  parent: {
    esModuleURI:
      "moz-src:///browser/components/mozcachedohttp/actors/MozCachedOHTTPParent.sys.mjs",
  },
  includeParent: true,
});

/**
 * Creates a test URI for the moz-cached-ohttp protocol.
 *
 * @param {string} resourceURL - The target resource URL to encode
 * @returns {string} The moz-cached-ohttp:// URI
 */
function createTestOHTTPResourceURI(resourceURL) {
  const encodedURL = encodeURIComponent(resourceURL);
  return `moz-cached-ohttp://newtab-image/?url=${encodedURL}`;
}

/**
 * Creates a test channel with proper load info for privileged about content.
 * Always creates a MozCachedOHTTPChannel with the injected mock service.
 *
 * @param {string} uri - The URI to create a channel for
 * @returns {nsIChannel} The created channel
 */
function createTestChannel(uri) {
  const testURI = Services.io.newURI(uri);
  const principal = Services.scriptSecurityManager.getSystemPrincipal();
  const protocolHandler = new MozCachedOHTTPProtocolHandler();
  protocolHandler.injectOHTTPService(MockOHTTPService);

  const loadInfo = createLoadInfo(
    testURI,
    principal,
    Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_INHERITS_SEC_CONTEXT,
    Ci.nsIContentPolicy.TYPE_OTHER
  );

  return protocolHandler.newChannel(testURI, loadInfo);
}

/**
 * Creates a LoadInfo object for testing using the NetUtil.newChannel pattern.
 *
 * @param {nsIURI} uri - The URI to use for the temporary channel
 * @param {nsIPrincipal} loadingPrincipal - The loading principal
 * @param {number} securityFlags - Security flags
 * @param {number} contentPolicyType - Content policy type
 * @returns {nsILoadInfo} LoadInfo object
 */
function createLoadInfo(
  uri,
  loadingPrincipal,
  securityFlags,
  contentPolicyType
) {
  return NetUtil.newChannel({
    uri,
    loadingPrincipal,
    securityFlags,
    contentPolicyType,
  }).loadInfo;
}

/**
 * Creates a reusable data collecting listener for testing channel responses.
 *
 * @param {Function} onComplete
 *   Callback executed on completion with (data, success).
 * @returns {nsIStreamListener}
 *   Stream listener implementation
 */
function createDataCollectingListener(onComplete) {
  let receivedData = "";

  return {
    onStartRequest() {},

    onDataAvailable(request, inputStream, offset, count) {
      const binaryInputStream = Cc[
        "@mozilla.org/binaryinputstream;1"
      ].createInstance(Ci.nsIBinaryInputStream);
      binaryInputStream.setInputStream(inputStream);
      receivedData += binaryInputStream.readBytes(count);
    },

    onStopRequest(request, status) {
      const success = Components.isSuccessCode(status);
      onComplete(receivedData, success);
    },
  };
}

/**
 * Creates a simple completion listener for testing channel success/failure.
 *
 * @param {Function} onComplete
 *   Callback executed on completion with (success).
 * @returns {nsIStreamListener}
 *   Stream listener implementation
 */
function createCompletionListener(onComplete) {
  let receivedData = false;

  return {
    onStartRequest() {},

    onDataAvailable() {
      receivedData = true;
    },

    onStopRequest(request, status) {
      const success = Components.isSuccessCode(status);
      onComplete(success, receivedData);
    },
  };
}

/**
 * Mock OHTTP service for testing.
 * Simulates nsIObliviousHttpService behavior for protocol handler testing.
 */
const MockOHTTPService = {
  channelCreated: false,
  totalChannels: 0,
  lastRelayURI: null,
  lastTargetURI: null,
  lastConfig: null,
  shouldSucceed: true,
  shouldUseContentTypeHeader: "",

  /**
   * Creates a mock channel that simulates OHTTP behavior.
   *
   * @param {nsIURI} relayURI
   *   The OHTTP relay URI.
   * @param {nsIURI} targetURI
   *   The target resource URI.
   * @param {Uint8Array} config
   *   OHTTP configuration.
   * @returns {nsIChannel}
   *   Mock channel implementation.
   */
  newChannel(relayURI, targetURI, config) {
    this.channelCreated = true;
    this.lastRelayURI = relayURI;
    this.lastTargetURI = targetURI;
    this.lastConfig = config;
    this.totalChannels++;

    return this._createMockChannel(
      targetURI,
      this.shouldSucceed,
      this.shouldUseContentTypeHeader
    );
  },

  /**
   * Creates a mock channel with configurable success behavior.
   *
   * @param {nsIURI} targetURI
   *   The URI for the channel.
   * @param {boolean} shouldSucceed
   *   Whether the channel should succeed.
   * @param {string} shouldUseContentTypeHeader
   *   The Content-Type to have a header value set to, or the empty string
   *   for no Content-Type.
   * @returns {nsIChannel}
   *   Mock channel implementation.
   */
  _createMockChannel(targetURI, shouldSucceed, shouldUseContentTypeHeader) {
    return {
      URI: targetURI,
      loadInfo: null,
      loadFlags: 0,
      notificationCallbacks: null,
      loadGroup: null,

      asyncOpen(listener) {
        Services.tm.dispatchToMainThread(() => {
          this._simulateChannelResponse(listener, shouldSucceed);
        });
      },

      _simulateChannelResponse(listener, success) {
        try {
          listener.onStartRequest(this);

          if (success) {
            const data = new ArrayBuffer(1024);
            const inputStream = Cc[
              "@mozilla.org/io/arraybuffer-input-stream;1"
            ].createInstance(Ci.nsIArrayBufferInputStream);
            inputStream.setData(data, 0, data.byteLength);
            listener.onDataAvailable(this, inputStream, 0, data.byteLength);
          }

          listener.onStopRequest(
            this,
            success ? Cr.NS_OK : Cr.NS_ERROR_FAILURE
          );
        } catch (e) {
          listener.onStopRequest(this, Cr.NS_ERROR_FAILURE);
        }
      },

      visitResponseHeaders(visitor) {
        if (shouldUseContentTypeHeader) {
          visitor.visitHeader("Content-Type", shouldUseContentTypeHeader);
        }
      },

      QueryInterface: ChromeUtils.generateQI(["nsIChannel", "nsIRequest"]),
    };
  },

  /**
   * Resets the mock service state to initial values.
   */
  reset() {
    this.channelCreated = false;
    this.totalChannels = 0;
    this.lastRelayURI = null;
    this.lastTargetURI = null;
    this.lastConfig = null;
    this.shouldSucceed = true;
    this.shouldUseContentTypeHeader = "";
  },

  QueryInterface: ChromeUtils.generateQI(["nsIObliviousHttpService"]),
};

add_setup(async () => {
  registerCleanupFunction(() => {
    // Invokes OnHandleClosed on any nsICacheEntry instances that have been
    // used, allowing them to be closed out before the nsICacheStorageService
    // shuts down (which causes leak assertion failures in debug builds).
    Cu.forceGC();
  });
});
