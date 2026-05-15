"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);
const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

const override = Cc["@mozilla.org/network/native-dns-override;1"].getService(
  Ci.nsINativeDNSResolverOverride
);

function makeChannel(url, triggeringPrincipalURI = null) {
  let uri2 = NetUtil.newURI(url);
  // by default system principal is used, which cannot be used for permission based tests
  // because the default system principal has all permissions
  var principal = Services.scriptSecurityManager.createContentPrincipal(
    uri2,
    {}
  );

  // For LNA tests, we need a cross-origin triggering principal to test blocking behavior
  // If not specified, use a different origin to ensure cross-origin requests
  var triggeringPrincipal;
  if (triggeringPrincipalURI) {
    let triggeringURI = NetUtil.newURI(triggeringPrincipalURI);
    triggeringPrincipal = Services.scriptSecurityManager.createContentPrincipal(
      triggeringURI,
      {}
    );
  } else {
    // Default to a cross-origin principal (public.example.com)
    let triggeringURI = NetUtil.newURI("https://public.example.com");
    triggeringPrincipal = Services.scriptSecurityManager.createContentPrincipal(
      triggeringURI,
      {}
    );
  }

  return NetUtil.newChannel({
    uri: url,
    loadingPrincipal: principal,
    triggeringPrincipal,
    securityFlags: Ci.nsILoadInfo.SEC_REQUIRE_SAME_ORIGIN_INHERITS_SEC_CONTEXT,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_OTHER,
  }).QueryInterface(Ci.nsIHttpChannel);
}

var ChannelCreationObserver = {
  QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),
  observe(aSubject, aTopic) {
    if (aTopic == "http-on-opening-request") {
      var chan = aSubject.QueryInterface(Ci.nsIHttpChannel);
      if (chan.URI.spec.includes("test_lna_social_tracker")) {
        chan.loadInfo.triggeringThirdPartyClassificationFlags =
          Ci.nsIClassifiedChannel.CLASSIFIED_ANY_SOCIAL_TRACKING;
      } else if (chan.URI.spec.includes("test_lna_basic_tracker")) {
        chan.loadInfo.triggeringThirdPartyClassificationFlags =
          Ci.nsIClassifiedChannel.CLASSIFIED_ANY_BASIC_TRACKING;
      } else if (chan.URI.spec.includes("test_lna_content_tracker")) {
        chan.loadInfo.triggeringThirdPartyClassificationFlags =
          Ci.nsIClassifiedChannel.CLASSIFIED_TRACKING_CONTENT;
      }
    }
  },
};

ChromeUtils.defineLazyGetter(this, "H1_URL", function () {
  return "http://localhost:" + httpServer.identity.primaryPort;
});

ChromeUtils.defineLazyGetter(this, "H2_URL", function () {
  return "https://localhost:" + server.port();
});

ChromeUtils.defineLazyGetter(this, "H1_EXAMPLE_URL", function () {
  return "http://example.com:" + httpServer.identity.primaryPort;
});

ChromeUtils.defineLazyGetter(this, "H1_TEST_EXAMPLE_URL", function () {
  return "http://test.example.com:" + httpServer.identity.primaryPort;
});

ChromeUtils.defineLazyGetter(this, "H1_SERVER_LOCAL_URL", function () {
  return "http://server.local:" + httpServer.identity.primaryPort;
});

ChromeUtils.defineLazyGetter(this, "H1_API_DEV_LOCAL_URL", function () {
  return "http://api.dev.local:" + httpServer.identity.primaryPort;
});

let httpServer = null;
let server = new NodeHTTP2Server();
function pathHandler(metadata, response) {
  response.setStatusLine(metadata.httpVersion, 200, "OK");
  let body = "success";
  response.bodyOutputStream.write(body, body.length);
}

add_setup(async () => {
  Services.prefs.setBoolPref("network.lna.block_trackers", true);
  Services.obs.addObserver(ChannelCreationObserver, "http-on-opening-request");
  // fail transactions on Local Network Access
  Services.prefs.setBoolPref("network.lna.blocking", true);

  // enable prompt for prefs testing, with this we can simulate the prompt actions by
  // network.lna.blocking.prompt.allow = false/true
  Services.prefs.setBoolPref("network.localhost.prompt.testing", true);
  Services.prefs.setBoolPref("network.localnetwork.prompt.testing", true);

  Services.prefs.setBoolPref(
    "network.lna.local-network-to-localhost.skip-checks",
    false
  );

  Services.prefs.setBoolPref("network.lna.websocket.enabled", true);

  // H1 Server
  httpServer = new HttpServer();
  httpServer.registerPathHandler("/test_lna", pathHandler);
  httpServer.start(-1);
  // Add domain identities for testing domain skip patterns
  httpServer.identity.add("http", "example.com", 80);
  httpServer.identity.add("http", "test.example.com", 80);
  httpServer.identity.add("http", "server.local", 80);
  httpServer.identity.add("http", "api.dev.local", 80);

  // H2 Server
  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  await server.start();
  registerCleanupFunction(async () => {
    try {
      await server.stop();
      await httpServer.stop();
      Services.prefs.clearUserPref("network.lna.blocking");
      Services.prefs.clearUserPref("network.lna.blocking.prompt.testing");
      Services.prefs.clearUserPref("network.localhost.prompt.testing.allow");
      Services.prefs.clearUserPref("network.localnetwork.prompt.testing.allow");
      Services.prefs.clearUserPref(
        "network.lna.local-network-to-localhost.skip-checks"
      );
      Services.prefs.clearUserPref("network.lna.websocket.enabled");

      Services.prefs.clearUserPref(
        "network.lna.address_space.private.override"
      );
    } catch (e) {
      // Ignore errors during cleanup
      info("Error during cleanup:", e);
    }
  });
  await server.registerPathHandler("/test_lna", (req, resp) => {
    let content = `ok`;
    resp.writeHead(200, {
      "Content-Type": "text/plain",
      "Content-Length": `${content.length}`,
    });
    resp.end(content);
  });
});

// This test simulates the failure of transaction due to local network access
// (local host) and subsequent retries based on user prompt actions.
// The user prompt actions are simulated by prefs `network.lna.blocking.prompt.testing.allow`
add_task(async function lna_blocking_tests_localhost_prompt() {
  const localHostTestCases = [
    // [allowAction, parentIpAddressSpace, urlSuffix, expectedStatus]
    [true, Ci.nsILoadInfo.Public, "/test_lna", Cr.NS_OK, H1_URL],
    [true, Ci.nsILoadInfo.Private, "/test_lna", Cr.NS_OK, H1_URL],
    [false, Ci.nsILoadInfo.Local, "/test_lna", Cr.NS_OK, H1_URL],
    [
      false,
      Ci.nsILoadInfo.Public,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H1_URL,
    ],
    [
      false,
      Ci.nsILoadInfo.Private,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H1_URL,
    ],
    [true, Ci.nsILoadInfo.Public, "/test_lna", Cr.NS_OK, H2_URL],
    [true, Ci.nsILoadInfo.Private, "/test_lna", Cr.NS_OK, H2_URL],
    [true, Ci.nsILoadInfo.Local, "/test_lna", Cr.NS_OK, H2_URL],
    [
      false,
      Ci.nsILoadInfo.Public,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H2_URL,
    ],
    [
      false,
      Ci.nsILoadInfo.Private,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H2_URL,
    ],
    [true, Ci.nsILoadInfo.Local, "/test_lna", Cr.NS_OK, H2_URL],
    [
      false,
      Ci.nsILoadInfo.Public,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H2_URL,
    ],
    [
      false,
      Ci.nsILoadInfo.Private,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H2_URL,
    ],
    [false, Ci.nsILoadInfo.Local, "/test_lna", Cr.NS_OK, H2_URL],
    // Test cases for local network access from trackers
    // NO LNA then request should not be blocked
    [false, Ci.nsILoadInfo.Local, "/test_lna_basic_tracker", Cr.NS_OK, H2_URL],
    [false, Ci.nsILoadInfo.Local, "/test_lna_social_tracker", Cr.NS_OK, H2_URL],
    [
      false,
      Ci.nsILoadInfo.Local,
      "/test_lna_content_tracker",
      Cr.NS_OK,
      H2_URL,
    ],
    [
      false,
      Ci.nsILoadInfo.Public,
      "/test_lna_basic_tracker",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H2_URL,
    ],
    [
      false,
      Ci.nsILoadInfo.Public,
      "/test_lna_social_tracker",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H2_URL,
    ],
    [
      true,
      Ci.nsILoadInfo.Public,
      "/test_lna_content_tracker",
      Cr.NS_OK,
      H2_URL,
    ],
    [
      false,
      Ci.nsILoadInfo.Private,
      "/test_lna_basic_tracker",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H2_URL,
    ],
    [
      false,
      Ci.nsILoadInfo.Private,
      "/test_lna_social_tracker",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H2_URL,
    ],
    [
      false,
      Ci.nsILoadInfo.Private,
      "/test_lna_content_tracker",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H2_URL,
    ],
  ];

  for (let [allow, space, suffix, expectedStatus, url] of localHostTestCases) {
    info(`do_test ${url}${suffix}, ${space} -> ${expectedStatus}`);

    Services.prefs.setBoolPref("network.localhost.prompt.testing.allow", allow);

    let chan = makeChannel(url + suffix);
    chan.loadInfo.parentIpAddressSpace = space;

    let expectFailure = expectedStatus !== Cr.NS_OK ? CL_EXPECT_FAILURE : 0;

    await new Promise(resolve => {
      chan.asyncOpen(new ChannelListener(resolve, null, expectFailure));
    });

    Assert.equal(chan.status, expectedStatus);
    if (expectedStatus === Cr.NS_OK) {
      Assert.equal(chan.protocolVersion, url === H1_URL ? "http/1.1" : "h2");
    }
  }
});

add_task(async function lna_blocking_tests_local_network() {
  // add override such that target servers is considered as local network (and not localhost)
  var override_value =
    "127.0.0.1" +
    ":" +
    httpServer.identity.primaryPort +
    "," +
    "127.0.0.1" +
    ":" +
    server.port();

  Services.prefs.setCharPref(
    "network.lna.address_space.private.override",
    override_value
  );

  const localNetworkTestCases = [
    // [allowAction, parentIpAddressSpace, urlSuffix, expectedStatus]
    [true, Ci.nsILoadInfo.Public, "/test_lna", Cr.NS_OK, H1_URL],
    [false, Ci.nsILoadInfo.Private, "/test_lna", Cr.NS_OK, H1_URL],
    [false, Ci.nsILoadInfo.Local, "/test_lna", Cr.NS_OK, H1_URL],
    [
      false,
      Ci.nsILoadInfo.Public,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H1_URL,
    ],
    [false, Ci.nsILoadInfo.Private, "/test_lna", Cr.NS_OK, H1_URL],
    [true, Ci.nsILoadInfo.Public, "/test_lna", Cr.NS_OK, H2_URL],
    [false, Ci.nsILoadInfo.Private, "/test_lna", Cr.NS_OK, H2_URL],
    [false, Ci.nsILoadInfo.Local, "/test_lna", Cr.NS_OK, H2_URL],
    [
      false,
      Ci.nsILoadInfo.Public,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H2_URL,
    ],
  ];

  for (let [
    allow,
    space,
    suffix,
    expectedStatus,
    url,
  ] of localNetworkTestCases) {
    info(`do_test ${url}, ${space} -> ${expectedStatus}`);

    Services.prefs.setBoolPref(
      "network.localnetwork.prompt.testing.allow",
      allow
    );

    let chan = makeChannel(url + suffix);
    chan.loadInfo.parentIpAddressSpace = space;

    let expectFailure = expectedStatus !== Cr.NS_OK ? CL_EXPECT_FAILURE : 0;

    await new Promise(resolve => {
      chan.asyncOpen(new ChannelListener(resolve, null, expectFailure));
    });

    Assert.equal(chan.status, expectedStatus);
    if (expectedStatus === Cr.NS_OK) {
      Assert.equal(chan.protocolVersion, url === H1_URL ? "http/1.1" : "h2");
    }
  }
  Services.prefs.clearUserPref("network.lna.address_space.private.override");
});

// Test the network.lna.skip-domains preference
add_task(async function lna_domain_skip_tests() {
  // Add DNS overrides to map test domains to 127.0.0.1
  override.clearOverrides();
  Services.dns.clearCache(true);

  override.addIPOverride("example.com", "127.0.0.1");
  override.addIPOverride("test.example.com", "127.0.0.1");
  override.addIPOverride("server.local", "127.0.0.1");
  override.addIPOverride("api.dev.local", "127.0.0.1");

  // Add override such that target servers are considered as local network (and not localhost)
  // This includes all the domains we're testing with
  var override_value =
    "127.0.0.1" +
    ":" +
    httpServer.identity.primaryPort +
    "," +
    "127.0.0.1" +
    ":" +
    server.port();

  Services.prefs.setCharPref(
    "network.lna.address_space.private.override",
    override_value
  );

  const domainSkipTestCases = [
    // [skipDomains, parentSpace, expectedStatus, baseURL, description]
    // Exact domain match
    [
      "localhost",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_URL,
      "exact domain match - localhost",
    ],
    [
      "localhost",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H2_URL,
      "exact domain match - localhost H2",
    ],
    [
      "example.com",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_EXAMPLE_URL,
      "exact domain match - example.com",
    ],

    // Wildcard domain match
    [
      "*.localhost",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_URL,
      "wildcard domain match - *.localhost matches localhost",
    ],
    [
      "*.example.com",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_TEST_EXAMPLE_URL,
      "wildcard domain match - *.example.com matches test.example.com",
    ],
    [
      "*.example.com",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_EXAMPLE_URL,
      "wildcard domain match - *.example.com matches example.com",
    ],
    [
      "*.test.com",
      Ci.nsILoadInfo.Public,
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H1_EXAMPLE_URL,
      "wildcard no match - *.test.com doesn't match example.com",
    ],

    // Multiple domains (comma-separated)
    [
      "example.com,localhost,test.org",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_URL,
      "multiple domains - localhost match",
    ],
    [
      "example.com,localhost,test.org",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_EXAMPLE_URL,
      "multiple domains - example.com match",
    ],
    [
      "foo.com,test.org",
      Ci.nsILoadInfo.Public,
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H1_EXAMPLE_URL,
      "multiple domains no match - example.com not in list",
    ],

    // Empty skip domains (should apply normal LNA rules)
    [
      "",
      Ci.nsILoadInfo.Public,
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H1_URL,
      "empty skip domains - should block",
    ],

    // .local domain tests
    [
      "*.local",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_SERVER_LOCAL_URL,
      "wildcard .local - *.local matches server.local",
    ],
    [
      "*.local",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_API_DEV_LOCAL_URL,
      "wildcard .local - *.local matches api.dev.local",
    ],
    [
      "*.dev.local",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_API_DEV_LOCAL_URL,
      "wildcard subdomain .local - *.dev.local matches api.dev.local",
    ],
    [
      "server.local",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_SERVER_LOCAL_URL,
      "exact match .local - server.local matches server.local",
    ],
    [
      "*.local",
      Ci.nsILoadInfo.Public,
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H1_URL,
      "wildcard .local - *.local doesn't match localhost",
    ],

    // localhost variations
    [
      "localhost,*.local,*.internal",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_URL,
      "combined patterns - localhost matches localhost",
    ],
    [
      "localhost,*.local,*.internal",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_SERVER_LOCAL_URL,
      "combined patterns - *.local matches server.local",
    ],

    // Plain "*" wildcard matches all domains
    [
      "*",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_URL,
      "wildcard all - * matches localhost",
    ],
    [
      "*",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_EXAMPLE_URL,
      "wildcard all - * matches example.com",
    ],
    [
      "*",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_SERVER_LOCAL_URL,
      "wildcard all - * matches server.local",
    ],
    [
      "*",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      H1_TEST_EXAMPLE_URL,
      "wildcard all - * matches test.example.com",
    ],
  ];

  for (let [
    skipDomains,
    parentSpace,
    expectedStatus,
    url,
    description,
  ] of domainSkipTestCases) {
    info(`Testing domain skip: ${description} - domains: "${skipDomains}"`);

    // Set the domain skip preference
    Services.prefs.setCharPref("network.lna.skip-domains", skipDomains);

    // Disable prompt simulation for clean testing
    Services.prefs.setBoolPref("network.localhost.prompt.testing.allow", false);

    let chan = makeChannel(url + "/test_lna");
    chan.loadInfo.parentIpAddressSpace = parentSpace;

    let expectFailure = expectedStatus !== Cr.NS_OK ? CL_EXPECT_FAILURE : 0;

    await new Promise(resolve => {
      chan.asyncOpen(new ChannelListener(resolve, null, expectFailure));
    });

    Assert.equal(
      chan.status,
      expectedStatus,
      `Status should match for: ${description}`
    );
    if (expectedStatus === Cr.NS_OK) {
      Assert.equal(chan.protocolVersion, url === H2_URL ? "h2" : "http/1.1");
    }
  }

  // Cleanup
  Services.prefs.clearUserPref("network.lna.skip-domains");
  Services.prefs.clearUserPref("network.lna.address_space.private.override");
  override.clearOverrides();
  Services.dns.clearCache(true);
});
// Test the new network.lna.local-network-to-localhost.skip-checks preference
add_task(async function lna_local_network_to_localhost_skip_checks() {
  // Test cases: [skipPref, parentSpace, urlSuffix, expectedStatus, baseURL]
  const skipTestCases = [
    // Skip pref disabled (false) - existing behavior should be preserved
    [
      false,
      Ci.nsILoadInfo.Private,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H1_URL,
    ],
    [
      false,
      Ci.nsILoadInfo.Private,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H2_URL,
    ],
    [
      false,
      Ci.nsILoadInfo.Public,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H1_URL,
    ],
    [
      false,
      Ci.nsILoadInfo.Public,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H2_URL,
    ],

    // Skip pref enabled (true) - new behavior: Private->Local allowed, Public->Local still blocked
    [true, Ci.nsILoadInfo.Private, "/test_lna", Cr.NS_OK, H1_URL], // Private->Local now allowed
    [true, Ci.nsILoadInfo.Private, "/test_lna", Cr.NS_OK, H2_URL], // Private->Local now allowed
    [
      true,
      Ci.nsILoadInfo.Public,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H1_URL,
    ], // Public->Local still blocked
    [
      true,
      Ci.nsILoadInfo.Public,
      "/test_lna",
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      H2_URL,
    ], // Public->Local still blocked
  ];

  for (let [
    skipPref,
    parentSpace,
    suffix,
    expectedStatus,
    url,
  ] of skipTestCases) {
    info(
      `Testing skip pref: ${skipPref}, ${parentSpace} -> Local, expect: ${expectedStatus}`
    );

    // Set the new skip preference
    Services.prefs.setBoolPref(
      "network.lna.local-network-to-localhost.skip-checks",
      skipPref
    );

    // Disable prompt simulation for clean testing (prompt should not affect skip logic)
    Services.prefs.setBoolPref("network.localhost.prompt.testing.allow", false);

    let chan = makeChannel(url + suffix);
    chan.loadInfo.parentIpAddressSpace = parentSpace;
    // Target is always Local (localhost) since we're testing localhost servers

    let expectFailure = expectedStatus !== Cr.NS_OK ? CL_EXPECT_FAILURE : 0;

    await new Promise(resolve => {
      chan.asyncOpen(new ChannelListener(resolve, null, expectFailure));
    });

    Assert.equal(chan.status, expectedStatus);
    if (expectedStatus === Cr.NS_OK) {
      Assert.equal(chan.protocolVersion, url === H1_URL ? "http/1.1" : "h2");
    }
  }

  // Cleanup
  Services.prefs.clearUserPref(
    "network.lna.local-network-to-localhost.skip-checks"
  );
});

// Test that same-origin requests skip LNA checks
add_task(async function lna_same_origin_skip_checks() {
  // Ensure the local-network-to-localhost skip pref is disabled for this test
  Services.prefs.setBoolPref(
    "network.lna.local-network-to-localhost.skip-checks",
    false
  );

  // Test cases: [triggeringOriginURI, targetURL, parentSpace, expectedStatus, description]
  const sameOriginTestCases = [
    // Same origin cases - should skip LNA checks and allow the request
    [
      H1_URL,
      H1_URL + "/test_lna",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      "same origin localhost to localhost from Public should be allowed",
    ],
    [
      H1_URL,
      H1_URL + "/test_lna",
      Ci.nsILoadInfo.Private,
      Cr.NS_OK,
      "same origin localhost to localhost from Private should be allowed",
    ],
    [
      H2_URL,
      H2_URL + "/test_lna",
      Ci.nsILoadInfo.Public,
      Cr.NS_OK,
      "same origin localhost to localhost (H2) from Public should be allowed",
    ],
    [
      H2_URL,
      H2_URL + "/test_lna",
      Ci.nsILoadInfo.Private,
      Cr.NS_OK,
      "same origin localhost to localhost (H2) from Private should be allowed",
    ],

    // Cross-origin cases - should apply normal LNA checks and block
    // Use null to get the default cross-origin principal (public.example.com)
    [
      null,
      H1_URL + "/test_lna",
      Ci.nsILoadInfo.Public,
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      "cross origin to localhost from Public should be blocked",
    ],
    // Note: Private->Local transition test removed temporarily
    // as there may be other logic affecting this transition

    // Same origin but from local address space should still be allowed
    [
      H1_URL,
      H1_URL + "/test_lna",
      Ci.nsILoadInfo.Local,
      Cr.NS_OK,
      "same origin localhost to localhost from Local should be allowed",
    ],
  ];

  for (let [
    triggeringOriginURI,
    targetURL,
    parentSpace,
    expectedStatus,
    description,
  ] of sameOriginTestCases) {
    info(`Testing same origin check: ${description}`);

    // Disable prompt simulation for clean testing
    Services.prefs.setBoolPref("network.localhost.prompt.testing.allow", false);

    // Use makeChannel with explicit triggering principal
    let chan = makeChannel(targetURL, triggeringOriginURI);
    chan.loadInfo.parentIpAddressSpace = parentSpace;

    let expectFailure = expectedStatus !== Cr.NS_OK ? CL_EXPECT_FAILURE : 0;

    await new Promise(resolve => {
      chan.asyncOpen(new ChannelListener(resolve, null, expectFailure));
    });

    Assert.equal(
      chan.status,
      expectedStatus,
      `Status should match for: ${description}`
    );
    if (expectedStatus === Cr.NS_OK) {
      Assert.equal(
        chan.protocolVersion,
        targetURL.startsWith(H2_URL) ? "h2" : "http/1.1"
      );
    }
  }
});
