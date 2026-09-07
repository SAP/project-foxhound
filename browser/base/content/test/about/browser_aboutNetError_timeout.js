/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Creates a TCP server which binds to a random available port. When Firefox
 * connects to the server, the OS completes the handshake and onSocketAccepted
 * fires. The callback immediately returns without reading or writing anything,
 * and the server just holds the connection open and says nothing, which forces
 * NS_ERROR_NET_TIMEOUT.
 */
function startHangingServer() {
  const server = Cc["@mozilla.org/network/server-socket;1"].createInstance(
    Ci.nsIServerSocket
  );
  server.init(-1, true, -1);
  const openTransports = [];
  server.asyncListen({
    onSocketAccepted(socket, transport) {
      openTransports.push(transport);
    },
    onStopListening() {},
  });
  registerCleanupFunction(() => {
    for (let transport of openTransports) {
      transport.close(Cr.NS_OK);
    }
    server.close();
  });
  return server.port;
}

async function loadTimeoutErrorPage(url) {
  let browser, tab;
  let pageLoaded;
  await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    () => {
      gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser, url);
      browser = gBrowser.selectedBrowser;
      tab = gBrowser.selectedTab;
      pageLoaded = BrowserTestUtils.waitForErrorPage(browser);
    },
    false
  );
  await pageLoaded;
  return { browser, tab };
}

add_task(async function test_netTimeout_error_page_elements() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.http.response.timeout", 1],
      ["network.http.tcp_keepalive.short_lived_connections", false],
      ["network.http.tcp_keepalive.long_lived_connections", false],
    ],
  });

  const port = startHangingServer();
  const url = `http://127.0.0.1:${port}/`;
  const { browser, tab } = await loadTimeoutErrorPage(url);

  await SpecialPowers.spawn(browser, [], async function () {
    await ContentTaskUtils.waitForCondition(
      () => content?.document?.querySelector("net-error-card"),
      "Wait for net-error-card to render"
    );
    const doc = content.document;
    const netErrorCard = doc.querySelector("net-error-card").wrappedJSObject;
    await netErrorCard.getUpdateComplete();

    Assert.equal(
      netErrorCard.errorTitle.dataset.l10nId,
      "netTimeout-title",
      "Using the netTimeout title"
    );
    Assert.equal(
      netErrorCard.errorIntro.dataset.l10nId,
      "fp-neterror-net-timeout-intro",
      "Using the netTimeout intro"
    );
    const list = netErrorCard.renderRoot.querySelector(".what-can-you-do-list");
    Assert.ok(list, "The what-can-you-do list is present");
    Assert.ok(
      list.querySelector('[data-l10n-id="neterror-load-error-try-again"]'),
      "List includes try-again item"
    );
    Assert.ok(
      list.querySelector('[data-l10n-id="neterror-load-error-connection"]'),
      "List includes connection item"
    );
    Assert.ok(
      list.querySelector('[data-l10n-id="neterror-load-error-firewall"]'),
      "List includes firewall item"
    );
    Assert.ok(
      ContentTaskUtils.isVisible(netErrorCard.tryAgainButton),
      "The 'Try Again' button is shown"
    );
    Assert.ok(
      !netErrorCard.renderRoot.querySelector(
        '[data-l10n-id="fp-cert-error-code"]'
      ),
      "No error code is shown for netTimeout"
    );
  });

  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_netTimeout_hostname_in_intro() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.http.response.timeout", 1],
      ["network.http.tcp_keepalive.short_lived_connections", false],
      ["network.http.tcp_keepalive.long_lived_connections", false],
    ],
  });

  const port = startHangingServer();
  const url = `http://127.0.0.1:${port}/`;
  const { browser, tab } = await loadTimeoutErrorPage(url);

  await SpecialPowers.spawn(browser, [port], async function (serverPort) {
    await ContentTaskUtils.waitForCondition(
      () => content?.document?.querySelector("net-error-card"),
      "Wait for net-error-card to render"
    );
    const doc = content.document;
    const netErrorCard = doc.querySelector("net-error-card").wrappedJSObject;
    await netErrorCard.getUpdateComplete();

    const l10nArgs = JSON.parse(
      netErrorCard.errorIntro.getAttribute("data-l10n-args")
    );
    Assert.equal(
      l10nArgs.hostname,
      `127.0.0.1:${serverPort}`,
      "Hostname including port is passed to the intro l10n args"
    );
  });

  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});
