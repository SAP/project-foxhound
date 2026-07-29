/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  });
});

function startDropServer() {
  const server = Cc["@mozilla.org/network/server-socket;1"].createInstance(
    Ci.nsIServerSocket
  );
  info("Using a random port.");
  server.init(-1, true, -1);
  server.asyncListen({
    onSocketAccepted(socket, transport) {
      // Close immediately, no response sent.
      transport.close(Cr.NS_OK);
    },
    onStopListening() {},
  });
  registerCleanupFunction(() => server.close());
  return server.port;
}

add_task(async function test_net_empty_response_copy() {
  await setSecurityCertErrorsFeltPrivacyToTrue();

  const port = startDropServer();
  const url = `http://127.0.0.1:${port}/`;
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

  info("Loading and waiting for the net error.");
  await pageLoaded;

  Assert.ok("Loaded empty server response.");
  await SpecialPowers.spawn(browser, [], async () => {
    await ContentTaskUtils.waitForCondition(
      () => content?.document?.querySelector("net-error-card"),
      "Wait for empty-response copy to render"
    );
    const doc = content.document;
    const netErrorCard = doc.querySelector("net-error-card").wrappedJSObject;
    Assert.ok(netErrorCard, "NetErrorCard supports empty server responses.");
    Assert.ok(netErrorCard.errorTitle, "NetErrorCard has errorTitle.");
    Assert.ok(netErrorCard.errorIntro, "NetErrorCard has errorIntro.");
    Assert.ok(netErrorCard.tryAgainButton, "NetErrorCard has tryAgainButton.");
    Assert.equal(
      netErrorCard.errorTitle.dataset.l10nId,
      "problem-with-this-site-title",
      "Using the 'problem with this site' title"
    );
    Assert.equal(
      netErrorCard.errorIntro.dataset.l10nId,
      "neterror-http-empty-response-description",
      "Using the 'empty response' intro."
    );
    const list = netErrorCard.renderRoot.querySelector(".what-can-you-do-list");
    Assert.ok(list, "NetErrorCard has what-can-you-do list.");
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
      "The 'Try Again' button is shown."
    );
  });
  BrowserTestUtils.removeTab(tab);
});
