/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

const { IPPChannelFilter, IPPMode } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPPChannelFilter.sys.mjs"
);

const { NetUtil } = ChromeUtils.importESModule(
  "resource://gre/modules/NetUtil.sys.mjs"
);

const { MasqueProtocol, ConnectProtocol, Server } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPProtectionServerlist.sys.mjs"
);

add_task(async function test_constructProxyInfo_masque_protocol() {
  const authToken = "Bearer test-token";
  const isolationKey = "test-isolation-key";
  const fallBackInfo = null;

  const masqueProtocol = new MasqueProtocol({
    name: "masque",
    host: "masque.example.com",
    port: 443,
    templateString: "proxy/{target_host}/{target_port}/",
  });

  const proxyInfo = IPPChannelFilter.constructProxyInfo(
    authToken,
    isolationKey,
    masqueProtocol,
    fallBackInfo
  );

  Assert.equal(proxyInfo.type, "masque", "Proxy type should be masque");
  Assert.equal(proxyInfo.host, "masque.example.com", "Host should match");
  Assert.equal(proxyInfo.port, 443, "Port should match");
  Assert.equal(
    proxyInfo.connectionIsolationKey,
    isolationKey,
    "Isolation key should match"
  );
  Assert.equal(
    proxyInfo.flags & Ci.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST,
    Ci.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST,
    "Should have TRANSPARENT_PROXY_RESOLVES_HOST flag"
  );
  Assert.equal(
    proxyInfo.failoverTimeout,
    10,
    "Failover timeout should be 10 seconds"
  );
  Assert.equal(proxyInfo.failoverProxy, null, "Should have no fallback proxy");
});

add_task(async function test_constructProxyInfo_connect_protocol_https() {
  const authToken = "Bearer test-token";
  const isolationKey = "test-isolation-key";
  const fallBackInfo = null;

  const connectProtocol = new ConnectProtocol({
    name: "connect",
    host: "connect.example.com",
    port: 8443,
    scheme: "https",
  });

  const proxyInfo = IPPChannelFilter.constructProxyInfo(
    authToken,
    isolationKey,
    connectProtocol,
    fallBackInfo
  );

  Assert.equal(proxyInfo.type, "https", "Proxy type should be https");
  Assert.equal(proxyInfo.host, "connect.example.com", "Host should match");
  Assert.equal(proxyInfo.port, 8443, "Port should match");
  Assert.equal(
    proxyInfo.connectionIsolationKey,
    isolationKey,
    "Isolation key should match"
  );
  Assert.equal(
    proxyInfo.flags & Ci.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST,
    Ci.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST,
    "Should have TRANSPARENT_PROXY_RESOLVES_HOST flag"
  );
  Assert.equal(
    proxyInfo.failoverTimeout,
    10,
    "Failover timeout should be 10 seconds"
  );
  Assert.equal(proxyInfo.failoverProxy, null, "Should have no fallback proxy");
});

add_task(async function test_constructProxyInfo_connect_protocol_http() {
  const authToken = "Bearer test-token";
  const isolationKey = "test-isolation-key";
  const fallBackInfo = null;

  const connectProtocol = new ConnectProtocol({
    name: "connect",
    host: "connect.example.com",
    port: 8080,
    scheme: "http",
  });

  const proxyInfo = IPPChannelFilter.constructProxyInfo(
    authToken,
    isolationKey,
    connectProtocol,
    fallBackInfo
  );

  Assert.equal(proxyInfo.type, "http", "Proxy type should be http");
  Assert.equal(proxyInfo.host, "connect.example.com", "Host should match");
  Assert.equal(proxyInfo.port, 8080, "Port should match");
  Assert.equal(
    proxyInfo.connectionIsolationKey,
    isolationKey,
    "Isolation key should match"
  );
});

add_task(async function test_constructProxyInfo_with_fallback() {
  const authToken = "Bearer test-token";
  const isolationKey = "test-isolation-key";

  // Create a fallback proxy
  const fallbackProtocol = new ConnectProtocol({
    name: "connect",
    host: "fallback.example.com",
    port: 8080,
    scheme: "http",
  });

  const fallBackInfo = IPPChannelFilter.constructProxyInfo(
    authToken,
    isolationKey,
    fallbackProtocol,
    null
  );

  const primaryProtocol = new MasqueProtocol({
    name: "masque",
    host: "primary.example.com",
    port: 443,
    templateString: "proxy/{target_host}/{target_port}/",
  });

  const proxyInfo = IPPChannelFilter.constructProxyInfo(
    authToken,
    isolationKey,
    primaryProtocol,
    fallBackInfo
  );

  Assert.equal(proxyInfo.type, "masque", "Primary proxy type should be masque");
  Assert.equal(
    proxyInfo.host,
    "primary.example.com",
    "Primary host should match"
  );
  Assert.notEqual(
    proxyInfo.failoverProxy,
    null,
    "Should have a fallback proxy"
  );
  Assert.equal(
    proxyInfo.failoverProxy.type,
    "http",
    "Fallback proxy type should be http"
  );
  Assert.equal(
    proxyInfo.failoverProxy.host,
    "fallback.example.com",
    "Fallback host should match"
  );
});

add_task(async function test_constructProxyInfo_unknown_protocol() {
  const authToken = "Bearer test-token";
  const isolationKey = "test-isolation-key";

  const unknownProtocol = {
    name: "unknown",
    host: "unknown.example.com",
    port: 443,
  };

  Assert.throws(
    () =>
      IPPChannelFilter.constructProxyInfo(
        authToken,
        isolationKey,
        unknownProtocol,
        null
      ),
    /Cannot construct ProxyInfo for Unknown server-protocol: unknown/,
    "Should throw error for unknown protocol"
  );
});

add_task(async function test_serverToProxyInfo_single_protocol() {
  const authToken = "Bearer test-token";

  const server = new Server({
    hostname: "single.example.com",
    port: 443,
    protocols: [
      {
        name: "masque",
        host: "single.example.com",
        port: 443,
        templateString: "proxy/{target_host}/{target_port}/",
      },
    ],
  });

  const proxyInfo = IPPChannelFilter.serverToProxyInfo(authToken, server);

  Assert.equal(proxyInfo.type, "masque", "Proxy type should be masque");
  Assert.equal(proxyInfo.host, "single.example.com", "Host should match");
  Assert.equal(proxyInfo.port, 443, "Port should match");
  Assert.equal(proxyInfo.failoverProxy, null, "Should have no fallback proxy");
  Assert.notEqual(
    proxyInfo.connectionIsolationKey,
    "",
    "Should have generated isolation key"
  );
});

add_task(
  async function test_serverToProxyInfo_multiple_protocols_fallback_chain() {
    const authToken = "Bearer test-token";

    const server = new Server({
      hostname: "multi.example.com",
      port: 443,
      protocols: [
        {
          name: "masque",
          host: "multi.example.com",
          port: 443,
          templateString: "proxy/{target_host}/{target_port}/",
        },
        {
          name: "connect",
          host: "multi.example.com",
          port: 8443,
          scheme: "https",
        },
        {
          name: "connect",
          host: "multi.example.com",
          port: 8080,
          scheme: "http",
        },
      ],
    });

    const proxyInfo = IPPChannelFilter.serverToProxyInfo(authToken, server);

    // Verify the primary proxy (first protocol - masque)
    Assert.equal(
      proxyInfo.type,
      "masque",
      "Primary proxy type should be masque"
    );
    Assert.equal(
      proxyInfo.host,
      "multi.example.com",
      "Primary host should match"
    );
    Assert.equal(proxyInfo.port, 443, "Primary port should match");

    // Verify the first fallback (second protocol - https connect)
    const firstFallback = proxyInfo.failoverProxy;
    Assert.notEqual(firstFallback, null, "Should have first fallback proxy");
    Assert.equal(
      firstFallback.type,
      "https",
      "First fallback type should be https"
    );
    Assert.equal(
      firstFallback.host,
      "multi.example.com",
      "First fallback host should match"
    );
    Assert.equal(firstFallback.port, 8443, "First fallback port should match");

    // Verify the second fallback (third protocol - http connect)
    const secondFallback = firstFallback.failoverProxy;
    Assert.notEqual(secondFallback, null, "Should have second fallback proxy");
    Assert.equal(
      secondFallback.type,
      "http",
      "Second fallback type should be http"
    );
    Assert.equal(
      secondFallback.host,
      "multi.example.com",
      "Second fallback host should match"
    );
    Assert.equal(
      secondFallback.port,
      8080,
      "Second fallback port should match"
    );

    // Verify end of chain
    Assert.equal(
      secondFallback.failoverProxy,
      null,
      "Should be end of fallback chain"
    );

    // Verify all proxies share the same isolation key
    const isolationKey = proxyInfo.connectionIsolationKey;
    Assert.equal(
      firstFallback.connectionIsolationKey,
      isolationKey,
      "First fallback should share isolation key"
    );
    Assert.equal(
      secondFallback.connectionIsolationKey,
      isolationKey,
      "Second fallback should share isolation key"
    );
  }
);

add_task(async function test_serverToProxyInfo_empty_protocols() {
  const authToken = "Bearer test-token";

  // Server with no protocols (should default to connect)
  const server = new Server({
    hostname: "default.example.com",
    port: 443,
    protocols: [],
  });

  const proxyInfo = IPPChannelFilter.serverToProxyInfo(authToken, server);

  Assert.equal(proxyInfo.type, "https", "Should default to https connect");
  Assert.equal(proxyInfo.host, "default.example.com", "Host should match");
  Assert.equal(proxyInfo.port, 443, "Port should match");
  Assert.equal(proxyInfo.failoverProxy, null, "Should have no fallback proxy");
});

add_task(async function test_serverToProxyInfo_isolation_key_uniqueness() {
  const authToken = "Bearer test-token";

  const server = new Server({
    hostname: "isolation.example.com",
    port: 443,
    protocols: [
      {
        name: "connect",
        host: "isolation.example.com",
        port: 443,
        scheme: "https",
      },
    ],
  });

  const proxyInfo1 = IPPChannelFilter.serverToProxyInfo(authToken, server);
  const proxyInfo2 = IPPChannelFilter.serverToProxyInfo(authToken, server);

  Assert.notEqual(
    proxyInfo1.connectionIsolationKey,
    proxyInfo2.connectionIsolationKey,
    "Each call should generate unique isolation keys"
  );
});

add_task(async function test_suspend_clears_proxyInfo() {
  const pass = new ProxyPass(createProxyPassToken());

  const server = new Server({
    hostname: "test.example.com",
    port: 443,
    protocols: [
      {
        name: "connect",
        host: "test.example.com",
        port: 443,
        scheme: "https",
      },
    ],
  });

  const filter = new IPPChannelFilter();
  filter.initialize(pass, server);

  Assert.notEqual(
    filter.proxyInfo,
    null,
    "proxyInfo should be set after initialize"
  );

  filter.suspend();

  Assert.equal(
    filter.proxyInfo,
    null,
    "proxyInfo should be null after suspend"
  );
});

add_task(
  async function test_replaceAuthTokenAndResume_preserves_connect_protocol() {
    const pass = new ProxyPass(createProxyPassToken());
    const newPass = new ProxyPass(createProxyPassToken());

    const server = new Server({
      hostname: "connect.example.com",
      port: 443,
      protocols: [
        {
          name: "connect",
          host: "connect.example.com",
          port: 443,
          scheme: "https",
        },
      ],
    });

    const filter = new IPPChannelFilter();
    filter.initialize(pass, server);

    Assert.equal(filter.proxyInfo.type, "https", "Should start as https");
    const originalIsolationKey = filter.proxyInfo.connectionIsolationKey;

    filter.replaceAuthTokenAndResume(newPass);

    Assert.equal(
      filter.proxyInfo.type,
      "https",
      "Should remain https after token replacement"
    );
    Assert.notEqual(
      filter.proxyInfo.connectionIsolationKey,
      originalIsolationKey,
      "Isolation key should change after token replacement"
    );
  }
);

add_task(
  async function test_replaceAuthTokenAndResume_preserves_masque_protocol() {
    const pass = new ProxyPass(createProxyPassToken());
    const newPass = new ProxyPass(createProxyPassToken());

    const server = new Server({
      hostname: "masque.example.com",
      port: 443,
      protocols: [
        {
          name: "masque",
          host: "masque.example.com",
          port: 443,
          templateString: "proxy/{target_host}/{target_port}/",
        },
      ],
    });

    const filter = new IPPChannelFilter();
    filter.initialize(pass, server);

    Assert.equal(filter.proxyInfo.type, "masque", "Should start as masque");

    filter.replaceAuthTokenAndResume(newPass);

    Assert.equal(
      filter.proxyInfo.type,
      "masque",
      "Should remain masque after token replacement"
    );
    Assert.equal(
      filter.proxyInfo.host,
      "masque.example.com",
      "Host should be preserved"
    );
    Assert.equal(filter.proxyInfo.port, 443, "Port should be preserved");
  }
);

add_task(
  async function test_replaceAuthTokenAndResume_preserves_masque_with_connect_fallback() {
    const pass = new ProxyPass(createProxyPassToken());
    const newPass = new ProxyPass(createProxyPassToken());

    const server = new Server({
      hostname: "multi.example.com",
      port: 443,
      protocols: [
        {
          name: "masque",
          host: "multi.example.com",
          port: 443,
          templateString: "proxy/{target_host}/{target_port}/",
        },
        {
          name: "connect",
          host: "multi.example.com",
          port: 8443,
          scheme: "https",
        },
      ],
    });

    const filter = new IPPChannelFilter();
    filter.initialize(pass, server);

    Assert.equal(filter.proxyInfo.type, "masque", "Primary should be masque");
    Assert.equal(
      filter.proxyInfo.failoverProxy.type,
      "https",
      "Fallback should be https"
    );

    filter.replaceAuthTokenAndResume(newPass);

    Assert.equal(
      filter.proxyInfo.type,
      "masque",
      "Primary should remain masque after replacement"
    );
    Assert.notEqual(
      filter.proxyInfo.failoverProxy,
      null,
      "Fallback chain should be preserved"
    );
    Assert.equal(
      filter.proxyInfo.failoverProxy.type,
      "https",
      "Fallback should remain https after replacement"
    );
    Assert.equal(
      filter.proxyInfo.failoverProxy.host,
      "multi.example.com",
      "Fallback host should be preserved"
    );
    Assert.equal(
      filter.proxyInfo.failoverProxy.port,
      8443,
      "Fallback port should be preserved"
    );
    Assert.equal(
      filter.proxyInfo.connectionIsolationKey,
      filter.proxyInfo.failoverProxy.connectionIsolationKey,
      "Isolation key should be shared across the chain"
    );
  }
);

add_task(async function test_suspend_clears_proxyInfo() {
  const server = new Server({
    hostname: "test.example.com",
    port: 443,
    protocols: [
      {
        name: "connect",
        host: "test.example.com",
        port: 443,
        scheme: "https",
      },
    ],
  });

  const filter = new IPPChannelFilter();
  filter.initialize(new ProxyPass(createProxyPassToken()), server);

  Assert.notEqual(
    filter.proxyInfo,
    null,
    "proxyInfo should be set after initialize"
  );

  filter.suspend();

  Assert.equal(
    filter.proxyInfo,
    null,
    "proxyInfo should be null after suspend"
  );
});

add_task(async function test_replaceAuthTokenAndResume_after_suspend() {
  const server = new Server({
    hostname: "test.example.com",
    port: 443,
    protocols: [
      {
        name: "connect",
        host: "test.example.com",
        port: 443,
        scheme: "https",
      },
    ],
  });

  const filter = new IPPChannelFilter();
  filter.initialize(new ProxyPass(createProxyPassToken()), server);

  const isolationKeyBefore = filter.proxyInfo.connectionIsolationKey;

  filter.suspend();
  Assert.equal(
    filter.proxyInfo,
    null,
    "proxyInfo should be null after suspend"
  );

  filter.replaceAuthTokenAndResume(new ProxyPass(createProxyPassToken()));

  Assert.notEqual(
    filter.proxyInfo,
    null,
    "proxyInfo should be set after resume"
  );
  Assert.equal(filter.proxyInfo.type, "https", "Protocol should be preserved");
  Assert.notEqual(
    filter.proxyInfo.connectionIsolationKey,
    isolationKeyBefore,
    "Isolation key should change after token replacement"
  );
});

add_task(async function test_suspend_queues_channels_until_resume() {
  const INCLUSION_PREF = "browser.ipProtection.inclusion.match_patterns";
  Services.prefs.setStringPref(
    INCLUSION_PREF,
    JSON.stringify(["*://example.com/*"])
  );

  const server = new Server({
    hostname: "test.example.com",
    port: 443,
    protocols: [
      {
        name: "connect",
        host: "test.example.com",
        port: 443,
        scheme: "https",
      },
    ],
  });

  const filter = new IPPChannelFilter();
  filter.initialize(new ProxyPass(createProxyPassToken()), server);
  filter.suspend();

  Assert.equal(filter.hasPendingChannels, false, "No pending channels yet");

  // isDocument:true bypasses the system-channel guard in shouldProxy when
  // proxyInfo is null; the inclusion pattern ensures shouldInclude returns true
  // without needing a fully-formed nsIChannel for shouldExclude.
  const fakeChannel = {
    isDocument: true,
    URI: Services.io.newURI("https://example.com/test"),
    loadInfo: { triggeringPrincipal: { isSystemPrincipal: true } },
  };
  let resolvedProxyInfo;
  const fakeProxyFilter = {
    onProxyFilterResult(info) {
      resolvedProxyInfo = info;
    },
  };
  filter.applyFilter(fakeChannel, null, fakeProxyFilter);

  Assert.equal(
    filter.hasPendingChannels,
    true,
    "Channel should be queued while suspended"
  );
  Assert.equal(
    resolvedProxyInfo,
    undefined,
    "Channel should not be resolved yet"
  );

  filter.replaceAuthTokenAndResume(new ProxyPass(createProxyPassToken()));

  Assert.equal(
    filter.hasPendingChannels,
    false,
    "Pending channels should be flushed after resume"
  );
  Assert.notEqual(
    resolvedProxyInfo,
    null,
    "Channel should be resolved after resume"
  );
  Assert.equal(
    resolvedProxyInfo.type,
    "https",
    "Resolved proxy should use the new token's proxy info"
  );

  Services.prefs.clearUserPref(INCLUSION_PREF);
});

add_task(async function test_resume_restores_same_connection() {
  const server = new Server({
    hostname: "test.example.com",
    port: 443,
    protocols: [
      { name: "connect", host: "test.example.com", port: 443, scheme: "https" },
    ],
  });

  const filter = new IPPChannelFilter();
  filter.initialize(new ProxyPass(createProxyPassToken()), server);

  const isolationKeyBefore = filter.isolationKey;

  filter.suspend();
  Assert.equal(filter.proxyInfo, null, "suspend() clears proxyInfo");

  filter.resume();

  Assert.notEqual(filter.proxyInfo, null, "resume() restores proxyInfo");
  Assert.equal(
    filter.isolationKey,
    isolationKeyBefore,
    "resume() rebuilds the connection with the same isolation key"
  );
});

add_task(async function test_canResume_reflects_pass_state() {
  const server = new Server({
    hostname: "test.example.com",
    port: 443,
    protocols: [
      { name: "connect", host: "test.example.com", port: 443, scheme: "https" },
    ],
  });

  const validFilter = new IPPChannelFilter();
  validFilter.initialize(new ProxyPass(createProxyPassToken()), server);
  Assert.ok(validFilter.canResume, "A fresh valid pass can be resumed");

  const expiredFilter = new IPPChannelFilter();
  expiredFilter.initialize(
    new ProxyPass(createExpiredProxyPassToken()),
    server
  );
  Assert.ok(!expiredFilter.canResume, "An expired pass cannot be resumed");

  const now = Temporal.Now.instant();
  const soonToExpire = new ProxyPass(
    createProxyPassToken(now, now.add({ seconds: 30 }))
  );
  const rotatingFilter = new IPPChannelFilter();
  rotatingFilter.initialize(soonToExpire, server);
  Assert.ok(
    !rotatingFilter.canResume,
    "A pass within its rotation window cannot be resumed"
  );
});

add_task(async function test_local_connections() {
  const makePrincipal = url =>
    Services.scriptSecurityManager.createContentPrincipal(
      Services.io.newURI(url),
      {}
    );

  const tests = [
    // True either LAN or Loopback
    ["http://[::]", true],
    ["http://[::1]", true],
    ["http://[::1]:1234", true],
    ["http://[::ffff:0:0]", true],
    ["http://127.0.0.1", true],
    ["http://127.1.2.3", true],
    ["http://10.1.2.3", true],
    ["http://192.168.0.1", true],
    ["http://169.254.0.1", true],
    ["http://localhost", true],
    ["http://something.localhost", true],
    // False, anything else
    ["http://something.test", false],
    ["http://looocalhost", false],
    ["http://localhost.something", false],
    ["http://localhost6", false],
    ["http://looocalhost6", false],
    ["http://something.localhost6", false],
    ["http://localhost6.something", false],
    ["http://something.example", false],
    ["http://example.com", false],
    ["http://something.invalid", false],
    ["http://invalid.com", false],
    ["http://test.com", false],
    ["http://128.1.2.3", false],
    ["http://169.253.0.1", false],
    ["http://193.168.0.1", false],
    ["http://11.1.2.3", false],
  ];

  for (const [url, isLocal] of tests) {
    Assert.equal(IPPChannelFilter.isLocal(makePrincipal(url)), isLocal, url);
  }
});

add_task(async function test_shouldInclude() {
  const INCLUSION_PREF = "browser.ipProtection.inclusion.match_patterns";

  Services.prefs.setStringPref(
    INCLUSION_PREF,
    JSON.stringify(["*://example.com/*"])
  );

  const filter = IPPChannelFilter.create();

  const makeChannel = uri =>
    NetUtil.newChannel({ uri, loadUsingSystemPrincipal: true });

  Assert.ok(
    filter.shouldInclude(makeChannel("http://example.com/some/path")),
    "URL matching the inclusion pattern should be included"
  );

  Assert.ok(
    filter.shouldInclude(makeChannel("http://example.com/other/path")),
    "Different path on the same host should also match (ignorePath: true)"
  );

  Assert.ok(
    !filter.shouldInclude(makeChannel("http://other.com/")),
    "URL not matching the pattern should not be included"
  );

  Services.prefs.clearUserPref(INCLUSION_PREF);

  const emptyFilter = IPPChannelFilter.create();
  Assert.ok(
    !emptyFilter.shouldInclude(makeChannel("http://example.com/")),
    "Empty inclusion list should not include any URL"
  );
});

add_task(async function test_shouldExclude_system_principal() {
  const filter = IPPChannelFilter.create();
  filter.proxyInfo = {};

  // A channel loaded with the system principal (like downloads) to a remote
  // URL should NOT be excluded - the URI principal should be used instead.
  const systemChannel = NetUtil.newChannel({
    uri: "http://example.com/download.bin",
    loadUsingSystemPrincipal: true,
  });
  Assert.ok(
    !filter.shouldExclude(systemChannel),
    "System-principal channel to remote URL should not be excluded"
  );

  // A channel with system principal to a local URL should still be excluded.
  const localChannel = NetUtil.newChannel({
    uri: "http://localhost/download.bin",
    loadUsingSystemPrincipal: true,
  });
  Assert.ok(
    filter.shouldExclude(localChannel),
    "System-principal channel to localhost should be excluded"
  );

  // A channel with a content loadingPrincipal should use that principal.
  const contentPrincipal =
    Services.scriptSecurityManager.createContentPrincipal(
      Services.io.newURI("http://page.example.com"),
      {}
    );
  const contentChannel = NetUtil.newChannel({
    uri: "http://cdn.example.com/file.bin",
    loadingPrincipal: contentPrincipal,
    securityFlags: Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_OTHER,
  });
  Assert.ok(
    !filter.shouldExclude(contentChannel),
    "Content-principal channel to remote URL should not be excluded"
  );
});

add_task(async function test_shouldExclude_ipp_exception() {
  const { IPPExceptionsManager } = ChromeUtils.importESModule(
    "moz-src:///toolkit/components/ipprotection/IPPExceptionsManager.sys.mjs"
  );

  const filter = IPPChannelFilter.create();
  filter.proxyInfo = {};

  const excludedPrincipal =
    Services.scriptSecurityManager.createContentPrincipal(
      Services.io.newURI("http://excluded.example.com"),
      {}
    );
  const allowedPrincipal =
    Services.scriptSecurityManager.createContentPrincipal(
      Services.io.newURI("http://allowed.example.com"),
      {}
    );

  IPPExceptionsManager.addExclusion(excludedPrincipal);

  // Channel with an excluded loadingPrincipal should be excluded.
  const excludedChannel = NetUtil.newChannel({
    uri: "http://cdn.example.com/file.bin",
    loadingPrincipal: excludedPrincipal,
    securityFlags: Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_OTHER,
  });
  Assert.ok(
    filter.shouldExclude(excludedChannel),
    "Channel with excluded principal should be excluded"
  );

  // Channel with a non-excluded loadingPrincipal should not be excluded.
  const allowedChannel = NetUtil.newChannel({
    uri: "http://cdn.example.com/file.bin",
    loadingPrincipal: allowedPrincipal,
    securityFlags: Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_OTHER,
  });
  Assert.ok(
    !filter.shouldExclude(allowedChannel),
    "Channel with non-excluded principal should not be excluded"
  );

  // System-principal channel to an excluded origin should also be excluded
  // (URI principal is used as fallback).
  const systemExcludedChannel = NetUtil.newChannel({
    uri: "http://excluded.example.com/download.bin",
    loadUsingSystemPrincipal: true,
  });
  Assert.ok(
    filter.shouldExclude(systemExcludedChannel),
    "System-principal channel to excluded origin should be excluded"
  );

  const downloadChannel = NetUtil.newChannel({
    uri: "http://cdn.example.com/download.bin",
    loadUsingSystemPrincipal: true,
    triggeringPrincipal: excludedPrincipal,
  });
  downloadChannel.loadInfo.isUserTriggeredSave = true;
  Assert.ok(
    filter.shouldExclude(downloadChannel),
    "Download with excluded triggeringPrincipal should be excluded"
  );

  const nonDownloadChannel = NetUtil.newChannel({
    uri: "http://cdn.example.com/file.bin",
    loadUsingSystemPrincipal: true,
    triggeringPrincipal: excludedPrincipal,
  });
  Assert.ok(
    !filter.shouldExclude(nonDownloadChannel),
    "Non-download channel with excluded triggeringPrincipal should not be excluded"
  );

  // After removing the exclusion, the channel should no longer be excluded.
  IPPExceptionsManager.removeExclusion(excludedPrincipal);

  const afterRemovalChannel = NetUtil.newChannel({
    uri: "http://cdn.example.com/file.bin",
    loadingPrincipal: excludedPrincipal,
    securityFlags: Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_OTHER,
  });
  Assert.ok(
    !filter.shouldExclude(afterRemovalChannel),
    "Channel should not be excluded after removing the exclusion"
  );

  Services.perms.removeByType("ipp-vpn");
});

add_task(async function test_shouldProxy() {
  const INCLUSION_PREF = "browser.ipProtection.inclusion.match_patterns";
  const MODE_PREF = "browser.ipProtection.mode";

  const makeChannel = uri =>
    NetUtil.newChannel({ uri, loadUsingSystemPrincipal: true });

  // For cases 1-4 we want to test mode/inclusion/exclusion logic, not the
  // pre-init bypass, so give every filter a truthy proxyInfo.
  const makeFilter = (excludedPages = []) => {
    const f = IPPChannelFilter.create(excludedPages);
    f.proxyInfo = {};
    return f;
  };

  // 1. MODE_FULL (default): regular URL is proxied
  Assert.ok(
    makeFilter().shouldProxy(makeChannel("http://example.com/")),
    "MODE_FULL: regular URL should be proxied"
  );

  // 2. MODE_FULL: excluded origin is not proxied
  Assert.ok(
    !makeFilter(["http://excluded.com"]).shouldProxy(
      makeChannel("http://excluded.com/path")
    ),
    "MODE_FULL: excluded origin should not be proxied"
  );

  // 3. Inclusion rule overrides exclusion
  Services.prefs.setStringPref(
    INCLUSION_PREF,
    JSON.stringify(["*://excluded.com/*"])
  );
  Assert.ok(
    makeFilter(["http://excluded.com"]).shouldProxy(
      makeChannel("http://excluded.com/")
    ),
    "Inclusion rule should override exclusion rule"
  );
  Services.prefs.clearUserPref(INCLUSION_PREF);

  // 4. MODE_INCLUSION: non-included URL is not proxied
  Services.prefs.setIntPref(MODE_PREF, IPPMode.MODE_INCLUSION);
  Assert.ok(
    !makeFilter().shouldProxy(makeChannel("http://example.com/")),
    "MODE_INCLUSION: non-included URL should not be proxied"
  );
  Services.prefs.clearUserPref(MODE_PREF);

  // 5. Uninitialized filter + system-principal channel → not proxied
  Assert.ok(
    !IPPChannelFilter.create().shouldProxy(makeChannel("http://example.com/")),
    "System-principal channel should not be proxied before the proxy is initialized"
  );
});

add_task(async function test_shouldExclude_trr_service_channel() {
  const filter = IPPChannelFilter.create();
  filter.proxyInfo = {};

  const makeChannel = uri =>
    NetUtil.newChannel({ uri, loadUsingSystemPrincipal: true });

  const plain = makeChannel("https://doh.example.com/dns-query");
  Assert.ok(
    !filter.shouldExclude(plain),
    "A regular HTTPS channel should not be excluded by the TRR rule"
  );

  const trrChannel = makeChannel("https://doh.example.com/dns-query");
  trrChannel.QueryInterface(Ci.nsIHttpChannelInternal).isTRRServiceChannel =
    true;
  Assert.ok(
    filter.shouldExclude(trrChannel),
    "A channel marked as TRR service channel should be excluded"
  );
});
