"use strict";

const {
  BaseNodeServer,
  HTTP3Server,
  NodeHTTPServer,
  NodeHTTPSServer,
  NodeHTTP2Server,
  NodeServer,
  with_node_servers,
} = ChromeUtils.importESModule("resource://testing-common/NodeServer.sys.mjs");

const baseURL = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);

// Node-side code: raw TCP server that captures SNI from TLS ClientHello.
/* globals require, global */
class NodeSNIServerCode {
  // Extracts the SNI hostname from a TLS ClientHello message.
  static extractSNI(buffer) {
    if (buffer.length < 5) {
      return null;
    }
    const contentType = buffer[0];
    if (contentType !== 0x16) {
      return null;
    }
    const recordLength = buffer.readUInt16BE(3);
    if (buffer.length < 5 + recordLength) {
      return null;
    }
    const handshakeType = buffer[5];
    if (handshakeType !== 0x01) {
      return null;
    }

    let offset = 5 + 1 + 3 + 2 + 32;

    const sessionIdLength = buffer[offset];
    offset += 1 + sessionIdLength;

    const cipherSuitesLength = buffer.readUInt16BE(offset);
    offset += 2 + cipherSuitesLength;

    const compressionMethodsLength = buffer[offset];
    offset += 1 + compressionMethodsLength;

    if (offset + 2 > buffer.length) {
      return null;
    }
    const extensionsLength = buffer.readUInt16BE(offset);
    offset += 2;

    const extensionsEnd = offset + extensionsLength;
    while (offset + 4 <= extensionsEnd) {
      const extType = buffer.readUInt16BE(offset);
      const extLength = buffer.readUInt16BE(offset + 2);
      offset += 4;

      if (extType === 0x0000) {
        const sniListLength = buffer.readUInt16BE(offset);
        let sniOffset = offset + 2;
        const sniEnd = offset + sniListLength + 2;
        while (sniOffset + 3 <= sniEnd) {
          const nameType = buffer[sniOffset];
          const nameLength = buffer.readUInt16BE(sniOffset + 1);
          sniOffset += 3;
          if (nameType === 0x00) {
            return buffer
              .slice(sniOffset, sniOffset + nameLength)
              .toString("ascii");
          }
          sniOffset += nameLength;
        }
      }
      offset += extLength;
    }
    return null;
  }

  static async startServer(port) {
    const net = require("net");
    global.sniValues = [];
    global.connectionCount = 0;
    global.server = net.createServer(socket => {
      global.connectionCount++;
      socket.once("data", data => {
        const sni = NodeSNIServerCode.extractSNI(data);
        console.log(`sni = ${sni}`);
        if (sni) {
          global.sniValues.push(sni);
        }
      });
      socket.on("error", () => {});
    });
    await new Promise(resolve => global.server.listen(port, resolve));
    return global.server.address().port;
  }
}

// Test-side server class extending BaseNodeServer.
class NodeSNIServer extends BaseNodeServer {
  async start(port = 0) {
    this.processId = await NodeServer.fork();
    await this.execute(NodeSNIServerCode);
    this._port = await this.execute(`NodeSNIServerCode.startServer(${port})`);
  }

  async stop() {
    if (this.processId) {
      await this.execute(`global.server.close(() => {})`);
      await NodeServer.kill(this.processId);
      this.processId = undefined;
    }
  }

  async connectionCount() {
    return this.execute(`global.connectionCount`);
  }

  async sniValues() {
    return this.execute(`global.sniValues`);
  }
}

function waitForFetchComplete(port) {
  let targetURL = `https://localhost:${port}/`;
  return new Promise(resolve => {
    let observer = {
      observe(subject) {
        let channel = subject.QueryInterface(Ci.nsIChannel);
        if (channel.URI.spec !== targetURL) {
          return;
        }
        Services.obs.removeObserver(observer, "http-on-stop-request");
        resolve(channel.status);
      },
    };
    Services.obs.addObserver(observer, "http-on-stop-request");
  });
}

let gServer;

const kExpectedConnsBeforePromptResponse = Services.prefs.getBoolPref(
  "network.http.happy_eyeballs_enabled",
  false
)
  ? 0
  : 1;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.lna.blocking", true],
      ["network.proxy.allow_hijacking_localhost", false],
      ["network.lna.address_space.public.override", "127.0.0.1:4443"],
      [
        "network.proxy.no_proxies_on",
        "localhost, 127.0.0.1, foo.example.com, cert-mismatch.test",
      ],
    ],
  });

  gServer = new NodeSNIServer();
  await gServer.start();
  info(`SNI capture server listening on port ${gServer.port()}`);

  registerCleanupFunction(async () => {
    await gServer.stop();
  });
});

// Test 1: Verify that blocking the LNA prompt does not leak SNI.
add_task(async function test_lna_block_no_sni_leak() {
  Services.obs.notifyObservers(null, "testonly-reload-permissions-from-disk");
  Services.perms.removeAll();

  is(await gServer.connectionCount(), 0, "No connections before loading page");

  let promptPromise = BrowserTestUtils.waitForEvent(
    PopupNotifications.panel,
    "popupshown"
  );
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    `${baseURL}page_fetch_localhost_https.html?port=${gServer.port()}`
  );

  await promptPromise;

  let popup = PopupNotifications.getNotification(
    "loopback-network",
    tab.linkedBrowser
  );
  ok(popup, "LNA permission prompt should appear for https://localhost fetch");

  Assert.equal(
    await gServer.connectionCount(),
    kExpectedConnsBeforePromptResponse,
    `${kExpectedConnsBeforePromptResponse} TCP connection(s) expected before LNA prompt response`
  );

  Assert.deepEqual(
    await gServer.sniValues(),
    [],
    "No SNI values should be captured before the user responds to the LNA prompt"
  );

  let notification = popup?.owner?.panel?.childNodes?.[0];
  ok(notification, "Notification popup element is available");
  let fetchDone = waitForFetchComplete(gServer.port());
  notification.secondaryButton.click();
  await fetchDone;

  Assert.equal(
    await gServer.connectionCount(),
    kExpectedConnsBeforePromptResponse,
    "No new TCP connections after blocking the LNA prompt"
  );

  Assert.deepEqual(
    await gServer.sniValues(),
    [],
    "No SNI values should be captured after the user rejects the LNA prompt"
  );

  gBrowser.removeTab(tab);
});

// Test 2: After clearing permissions, verify re-prompt and that accepting
// allows the SNI to reach the server.
add_task(async function test_lna_accept_receives_sni() {
  Services.obs.notifyObservers(null, "testonly-reload-permissions-from-disk");
  Services.perms.removeAll();

  // Reset server counters.
  await gServer.execute(`global.connectionCount = 0`);
  await gServer.execute(`global.sniValues = []`);

  let promptPromise = BrowserTestUtils.waitForEvent(
    PopupNotifications.panel,
    "popupshown"
  );
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    `${baseURL}page_fetch_localhost_https.html?port=${gServer.port()}`
  );

  await promptPromise;

  let popup = PopupNotifications.getNotification(
    "loopback-network",
    tab.linkedBrowser
  );
  ok(popup, "LNA permission prompt should appear again after permission reset");

  Assert.equal(
    await gServer.connectionCount(),
    kExpectedConnsBeforePromptResponse,
    `${kExpectedConnsBeforePromptResponse} TCP connection(s) expected before LNA prompt response`
  );

  Assert.deepEqual(
    await gServer.sniValues(),
    [],
    "No SNI values should be captured before accepting the LNA prompt"
  );

  // Accept the prompt.
  let notification = popup?.owner?.panel?.childNodes?.[0];
  ok(notification, "Notification popup element is available for accept");
  notification.button.click();

  // The server is a raw TCP socket, so the TLS handshake will fail after the
  // ClientHello is sent. Wait for the SNI to be captured by the server.
  await BrowserTestUtils.waitForCondition(
    async () => !!(await gServer.sniValues()).length,
    "Waiting for SNI value after accepting the LNA prompt"
  );

  Assert.greater(
    (await gServer.sniValues()).length,
    0,
    "SNI value should be captured after the user accepts the LNA prompt"
  );

  gBrowser.removeTab(tab);
});

// foo.example.com is in the NodeHTTPSServer/NodeHTTP2Server cert SAN; the
// .test hostname is not, so TLS will fail on a cert mismatch.
const CERT_MATCH_HOST = "foo.example.com";
const CERT_MISMATCH_HOST = "cert-mismatch.test";

function observeStopRequest(targetURL) {
  return new Promise(resolve => {
    let observer = {
      observe(subject) {
        let channel = subject.QueryInterface(Ci.nsIChannel);
        if (channel.URI.spec !== targetURL) {
          return;
        }
        Services.obs.removeObserver(observer, "http-on-stop-request");
        resolve(channel.status);
      },
    };
    Services.obs.addObserver(observer, "http-on-stop-request");
  });
}

function raceWithTimeout(promise, ms) {
  let timeoutId;
  let timeout = new Promise(resolve => {
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    timeoutId = setTimeout(() => resolve(false), ms);
  });
  return Promise.race([promise.then(() => true), timeout]).finally(() =>
    clearTimeout(timeoutId)
  );
}

// Shared setup for one server: pins `host` to 127.0.0.1, classifies the
// server address:port as Private, and builds the target and page URLs. The
// caller is responsible for removing the tab and clearing the DNS override.
async function setupLnaRequest(server, host) {
  Services.obs.notifyObservers(null, "testonly-reload-permissions-from-disk");
  Services.perms.removeAll();

  let port = server.port();
  let scheme = server.protocol();
  info(`${scheme}/${server.version()} server listening on port ${port}`);

  const dnsOverride = Cc[
    "@mozilla.org/network/native-dns-override;1"
  ].getService(Ci.nsINativeDNSResolverOverride);
  dnsOverride.addIPOverride(host, "127.0.0.1");

  let prefs = [
    ["network.lna.address_space.private.override", `127.0.0.1:${port}`],
  ];
  // The initiating page is served over https://example.com; when the fetch
  // target is plaintext HTTP we need to disable mixed-content blocking,
  // otherwise the fetch is blocked by the DOM layer before any network
  // code (and any LNA check) runs.
  if (scheme === "http") {
    prefs.push(
      ["security.mixed_content.block_active_content", false],
      ["security.mixed_content.upgrade_mixed_display_content", false],
      ["security.mixed_content.upgrade_mixed_active_content", false]
    );
  }
  await SpecialPowers.pushPrefEnv({ set: prefs });

  return {
    scheme,
    label: `${scheme}/${server.version()}`,
    targetURL: `${scheme}://${host}:${port}/`,
    pageURL:
      `${baseURL}page_fetch_localhost_https.html` +
      `?port=${port}&host=${host}&scheme=${scheme}`,
    async cleanup(tab) {
      if (tab) {
        gBrowser.removeTab(tab);
      }
      dnsOverride.clearHostOverride(host);
      await SpecialPowers.popPrefEnv();
    },
  };
}

// Shared body for the cert-mismatch assertion: open the tab, wait for the
// fetch to fail, and verify TLS (not LNA) is the failure reason and no LNA
// prompt was shown.
async function runCertMismatchAgainstServer(server) {
  let ctx = await setupLnaRequest(server, CERT_MISMATCH_HOST);
  info(`cert mismatch variant: ${ctx.label}`);

  let popupShown = false;
  let popupListener = () => {
    popupShown = true;
  };
  PopupNotifications.panel.addEventListener("popupshown", popupListener);

  let fetchDone = observeStopRequest(ctx.targetURL);
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    ctx.pageURL
  );

  let status = await fetchDone;
  PopupNotifications.panel.removeEventListener("popupshown", popupListener);

  Assert.notEqual(
    status,
    Cr.NS_OK,
    `[${ctx.label}] Fetch should fail due to TLS cert hostname mismatch`
  );
  Assert.notEqual(
    status,
    Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
    `[${ctx.label}] Fetch should fail from TLS, not from an LNA prompt decision`
  );
  ok(
    !popupShown,
    `[${ctx.label}] No LNA prompt should be shown when TLS cert does not match`
  );
  for (let id of ["loopback-network", "local-network"]) {
    let popup = PopupNotifications.getNotification(id, tab.linkedBrowser);
    ok(!popup, `[${ctx.label}] No ${id} LNA prompt should be present`);
  }

  await ctx.cleanup(tab);
}

// For each TLS server variant, verify that a fetch to a hostname not covered
// by the server cert fails on TLS without showing an LNA prompt.
add_task(async function test_local_network_cert_mismatch() {
  await with_node_servers(
    [NodeHTTPSServer, NodeHTTP2Server],
    runCertMismatchAgainstServer
  );
});

// Exercise the prompt-shown path for a single server: open the tab, wait for
// the local-network prompt, click deny, and assert the fetch is denied.
async function runPromptShownAgainstServer(server) {
  let ctx = await setupLnaRequest(server, CERT_MATCH_HOST);
  info(`prompt-shown variant: ${ctx.label}`);

  let promptPromise = BrowserTestUtils.waitForEvent(
    PopupNotifications.panel,
    "popupshown"
  );
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    ctx.pageURL
  );

  let promptShown = await raceWithTimeout(promptPromise, 5000);
  ok(promptShown, `[${ctx.label}] LNA prompt should be shown within 5s`);

  let popup = PopupNotifications.getNotification(
    "local-network",
    tab.linkedBrowser
  );
  ok(popup, `[${ctx.label}] local-network LNA permission prompt should appear`);

  if (popup) {
    let fetchDone = observeStopRequest(ctx.targetURL);
    let notification = popup.owner.panel.childNodes[0];
    ok(notification, `[${ctx.label}] Notification popup element is available`);
    notification.secondaryButton.click();
    let status = await fetchDone;

    Assert.equal(
      status,
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      `[${ctx.label}] Fetch should be denied after user rejects the LNA prompt`
    );
  }

  await ctx.cleanup(tab);
}

// For each server variant, verify that a fetch to a Private address shows the
// local-network LNA prompt. TLS variants exercise the deferred post-handshake
// path; the plaintext HTTP variant exercises the check without any TLS.
add_task(async function test_local_network_prompt_shown() {
  await with_node_servers(
    [NodeHTTPServer, NodeHTTPSServer, NodeHTTP2Server],
    runPromptShownAgainstServer
  );
});

// Resolve paths for the h3 server binary and its cert DB. Mochitest does not
// set MOZ_HTTP3_SERVER_PATH / MOZ_HTTP3_CERT_DB_PATH the way xpcshell does, so
// fall back to the conventional build layout.
function resolveHttp3Paths() {
  let binPath = Services.env.get("MOZ_HTTP3_SERVER_PATH");
  if (!binPath) {
    let greD = Services.dirsvc.get("GreD", Ci.nsIFile).clone();
    greD.append(
      "http3server" + (Services.appinfo.OS === "WINNT" ? ".exe" : "")
    );
    if (greD.exists()) {
      binPath = greD.path;
    }
  }

  let dbPath = Services.env.get("MOZ_HTTP3_CERT_DB_PATH");
  if (!dbPath) {
    // Walk up from CurWorkD to find a repo/obj root containing
    // netwerk/test/http3serverDB.
    let dir = Services.dirsvc.get("CurWorkD", Ci.nsIFile).clone();
    while (dir) {
      let candidate = dir.clone();
      candidate.append("netwerk");
      candidate.append("test");
      candidate.append("http3serverDB");
      if (candidate.exists() && candidate.isDirectory()) {
        dbPath = candidate.path;
        break;
      }
      let parent = dir.parent;
      if (!parent || parent.equals(dir)) {
        break;
      }
      dir = parent;
    }
  }

  return { binPath, dbPath };
}

// Run `body(server)` against an h3 server, mapping `host` to the local h3
// listener via the alt-svc-mapping-for-testing pref. Skips the test if the
// http3server binary or cert DB cannot be located.
async function withHttp3Server(host, body) {
  let { binPath, dbPath } = resolveHttp3Paths();
  if (!binPath || !dbPath) {
    info(
      `Skipping h3 variant: http3server binary or DB not found ` +
        `(bin=${binPath}, db=${dbPath})`
    );
    return;
  }

  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.http.http3.enable", true],
      ["network.dns.disableIPv6", true],
    ],
  });

  let server = new HTTP3Server();
  try {
    await server.start(binPath, dbPath);
  } catch (e) {
    info(`Skipping h3 variant: failed to start http3server: ${e}`);
    await SpecialPowers.popPrefEnv();
    return;
  }

  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "network.http.http3.alt-svc-mapping-for-testing",
        `${host};h3=:${server.port()}`,
      ],
    ],
  });

  try {
    await body(server);
  } finally {
    await server.stop();
    await SpecialPowers.popPrefEnv();
    await SpecialPowers.popPrefEnv();
  }
}

// Same prompt-shown assertion, but against an h3 server. H3 uses alt-svc to
// route the h1 origin to the h3 listener on localhost, so we set the
// alt-svc-mapping-for-testing pref instead of hitting the h3 port directly.
add_task(async function test_local_network_prompt_shown_h3() {
  await withHttp3Server(CERT_MATCH_HOST, runPromptShownAgainstServer);
});

// Same cert-mismatch assertion as test_local_network_cert_mismatch, but
// against an h3 server: a public hostname misdirected to a local h3 listener
// whose cert does not cover the hostname must fail on TLS (inside QUIC)
// without surfacing an LNA prompt.
add_task(async function test_local_network_cert_mismatch_h3() {
  await withHttp3Server(CERT_MISMATCH_HOST, runCertMismatchAgainstServer);
});
