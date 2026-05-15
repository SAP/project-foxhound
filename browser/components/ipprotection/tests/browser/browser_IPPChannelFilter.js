/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { IPPChannelFilter } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPChannelFilter.sys.mjs"
);
const { IPPExceptionsManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPExceptionsManager.sys.mjs"
);

add_task(async function test_createConnection_and_proxy() {
  await using proxyInfo = withProxyServer();
  // Create the IPP connection filter
  const filter = IPPChannelFilter.create();
  filter.initialize("", proxyInfo.server);
  filter.start();

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    // Note: this will not be loaded as the proxy will refuse the connection
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://example.com/"
  );

  await proxyInfo.gotConnection;
  await BrowserTestUtils.removeTab(tab);
  filter.stop();
});

add_task(async function test_exclusion_and_proxy() {
  const server = new HttpServer();
  server.registerPathHandler("/", (request, response) => {
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "text/plain");
    response.write("Hello World");
  });
  server.start(-1);

  await using proxyInfo = withProxyServer();
  // Create the IPP connection filter
  const filter = IPPChannelFilter.create([
    "http://localhost:" + server.identity.primaryPort,
  ]);
  filter.initialize("", proxyInfo.server);
  proxyInfo.gotConnection.then(() => {
    Assert.ok(false, "Proxy connection should not be made for excluded URL");
  });
  filter.start();

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://localhost:" + server.identity.primaryPort
  );
  await BrowserTestUtils.removeTab(tab);
  filter.stop();
});

add_task(async function test_essential_exclusion() {
  const server = new HttpServer();
  server.registerPathHandler("/", (request, response) => {
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "text/plain");
    response.write("Hello World");
  });
  server.start(-1);

  await using proxyInfo = withProxyServer();
  // Create the IPP connection filter
  const filter = IPPChannelFilter.create();

  filter.initialize("", proxyInfo.server);
  proxyInfo.gotConnection.then(() => {
    Assert.ok(false, "Proxy connection should not be made for excluded URL");
  });
  filter.start();

  let response = await fetch(
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://localhost:" + server.identity.primaryPort
  );
  Assert.equal(response.status, 200, "Should successfully load the URL");

  filter.stop();
});

add_task(async function test_exclusion_manager() {
  const server = new HttpServer();
  server.registerPathHandler("/", (request, response) => {
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "text/plain");
    response.write("Hello World");
  });
  server.start(-1);

  await using proxyInfo = withProxyServer();
  // Create the IPP connection filter
  const filter = IPPChannelFilter.create();
  // Add a site exclusion using IPPExceptionsManager
  let principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(
      "http://localhost:" + server.identity.primaryPort
    );
  IPPExceptionsManager.addExclusion(principal);

  filter.initialize("", proxyInfo.server);
  proxyInfo.gotConnection.then(() => {
    Assert.ok(false, "Proxy connection should not be made for excluded URL");
  });
  filter.start();

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://localhost:" + server.identity.primaryPort
  );
  await BrowserTestUtils.removeTab(tab);
  filter.stop();

  IPPExceptionsManager.removeExclusion(principal);
});

add_task(async function test_channel_suspend_resume() {
  await using proxyInfo = withProxyServer();
  // Create the IPP connection filter
  const filter = IPPChannelFilter.create();
  filter.start();

  let tab = BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    // Note: this will not be loaded as the proxy will refuse the connection
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://example.com/"
  );

  const pendingChannels = new Promise(resolve => {
    const id = setInterval(() => {
      if (filter.hasPendingChannels) {
        clearInterval(id);
        resolve(true);
      }
    }, 500);

    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    setTimeout(() => {
      clearInterval(id);
      resolve(false);
    }, 5000);
  });

  Assert.ok(
    await pendingChannels,
    "Proxy connection qeues channels when not initialized"
  );

  filter.initialize("", proxyInfo.server);

  Assert.ok(!filter.hasPendingChannels, "All the pending channels are gone.");

  await BrowserTestUtils.removeTab(await tab);
  filter.stop();
});

// Verify that when a URL is excluded from IPP, the global (system) HTTP proxy
// is used as the fallback instead of the IPP proxy.
add_task(async function test_excluded_url_falls_back_to_global_proxy() {
  await using globalProxy = withProxyServer();
  await using localProxy = withProxyServer();

  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.proxy.type", 1],
      ["network.proxy.http", "localhost"],
      ["network.proxy.http_port", globalProxy.server.port],
    ],
  });

  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  const filter = IPPChannelFilter.create(["http://example.com"]);
  filter.initialize("", localProxy.server);
  localProxy.gotConnection.then(() => {
    Assert.ok(false, "IPP (local) proxy should not receive excluded URL");
  });
  filter.start();

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://example.com/"
  );
  // The Global proxy should have gotten a connection.
  await globalProxy.gotConnection;
  await BrowserTestUtils.removeTab(tab);
  filter.stop();
});

// Second test: check observer and proxy info on channel
add_task(async function channelfilter_proxiedChannels() {
  // Disable DOH, as otherwise the iterator will have
  // mozilla-clouldflare-dns as the first channel.
  await SpecialPowers.pushPrefEnv({
    set: [["network.trr.mode", 0]], // Disable DNS-over-HTTPS for this test
  });

  await using proxyInfo = withProxyServer();
  const filter = IPPChannelFilter.create();
  filter.initialize("", proxyInfo.server);
  filter.start();
  const channelIter = filter.proxiedChannels();
  let nextChannel = channelIter.next();

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    // Note: this will not be loaded as the proxy will refuse the connection
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://example.com/"
  );
  let { value, done } = await nextChannel;
  Assert.equal(done, false, "Iterator should not be done yet");

  Assert.notEqual(value, null, "Channel should not be null");
  // Assert that the channel loaded example.com
  Assert.ok(
    value.URI.host === "example.com" ||
      value.URI.host === "mozilla.cloudflare-dns.com",
    "Channel should load example.com or mozilla.cloudflare-dns.com"
  );
  await BrowserTestUtils.removeTab(tab);
  filter.stop();

  ({ value, done } = await channelIter.next());
  Assert.equal(done, true, "Iterator should be done after stopping the filter");
});
