"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

// nonlocal.example.com resolves to 127.0.0.1 via network.dns.native-is-localhost
// but is NOT treated as a secure context (unlike localhost/127.0.0.1)
const PUBLIC_SERVER_HOST = "nonlocal.example.com";

let gLocalServer;
let gPublicServer;
let gLocalServerPort;
let gPublicServerPort;

async function restorePermissions() {
  info("Restoring permissions");
  Services.obs.notifyObservers(null, "testonly-reload-permissions-from-disk");
  Services.perms.removeAll();
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["permissions.manager.defaultsUrl", ""],
      ["network.lna.block_insecure_contexts", true],
      ["network.lna.blocking", true],
      ["network.http.rcwn.enabled", false],
      // Make nonlocal.example.com resolve to 127.0.0.1
      ["network.dns.native-is-localhost", true],
    ],
  });
  Services.obs.notifyObservers(null, "testonly-reload-permissions-from-disk");

  // Start the "local" server (LNA target) on a random port
  gLocalServer = new HttpServer();
  gLocalServer.start(-1);
  gLocalServerPort = gLocalServer.identity.primaryPort;
  info(`Local server started on port ${gLocalServerPort}`);
  registerLocalServerHandlers(gLocalServer);

  // Start the "public" server (serves the test page) on a random port
  gPublicServer = new HttpServer();
  gPublicServer.start(-1);
  gPublicServerPort = gPublicServer.identity.primaryPort;
  // Add identity for nonlocal.example.com
  gPublicServer.identity.add("http", PUBLIC_SERVER_HOST, gPublicServerPort);
  info(`Public server started on port ${gPublicServerPort}`);
  registerPublicServerHandlers(gPublicServer);

  registerCleanupFunction(async () => {
    await restorePermissions();
    await new Promise(resolve => {
      gLocalServer.stop(resolve);
    });
    await new Promise(resolve => {
      gPublicServer.stop(resolve);
    });
  });
});

function registerLocalServerHandlers(server) {
  server.registerPathHandler("/", (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*", false);
    response.setHeader("Content-Type", "text/plain", false);
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.write("hello from localhost");
  });
}

function registerPublicServerHandlers(server) {
  server.registerPathHandler("/test.html", (request, response) => {
    const params = new URLSearchParams(request.queryString);
    const testType = params.get("test");
    const rand = params.get("rand");
    const targetURL = `http://localhost:${gLocalServerPort}/?type=${testType}&rand=${rand}`;

    response.setHeader("Content-Type", "text/html", false);
    response.setStatusLine(request.httpVersion, 200, "OK");

    let script;
    switch (testType) {
      case "fetch":
        script = `
          fetch("${targetURL}")
            .then(response => console.log("fetch succeeded:", response))
            .catch(error => console.log("fetch failed:", error));
        `;
        break;
      case "xhr":
        script = `
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "${targetURL}");
          xhr.onload = () => console.log("xhr succeeded");
          xhr.onerror = () => console.log("xhr failed");
          xhr.send();
        `;
        break;
      case "img":
        script = `
          const img = document.createElement("img");
          img.src = "${targetURL}";
          img.onload = () => console.log("img loaded");
          img.onerror = () => console.log("img failed");
          document.body.appendChild(img);
        `;
        break;
      default:
        script = `console.error("Unknown test type: ${testType}");`;
    }

    response.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>LNA Insecure Context Test</title>
</head>
<body>
<script type="text/javascript">
  window.addEventListener('load', function () {
    console.log("Running test: ${testType} with rand: ${rand}");
    ${script}
  });
</script>
</body>
</html>`);
  });
}

function observeAndCheck(testType, rand, expectedStatus, message) {
  return new Promise(resolve => {
    const url = `http://localhost:${gLocalServerPort}/?type=${testType}&rand=${rand}`;
    info(`Observing for URL: ${url}`);
    const observer = {
      observe(subject, topic) {
        if (topic !== "http-on-stop-request") {
          return;
        }

        let channel = subject.QueryInterface(Ci.nsIHttpChannel);
        if (!channel) {
          return;
        }

        if (channel.URI.spec !== url) {
          return;
        }

        info(`Observed channel status: ${channel.status}`);
        is(channel.status, expectedStatus, message);
        Services.obs.removeObserver(observer, "http-on-stop-request");
        resolve();
      },
    };
    Services.obs.addObserver(observer, "http-on-stop-request");
  });
}

const testCases = [
  {
    type: "fetch",
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "xhr",
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "img",
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
];

add_task(async function test_lna_insecure_context_blocking() {
  info("Testing that LNA requests from HTTP are blocked without prompt");

  // Configure proxy bypass for our test servers and set up LNA address space override
  await SpecialPowers.pushPrefEnv({
    set: [
      // Bypass proxy for our test servers
      [
        "network.proxy.no_proxies_on",
        `localhost, 127.0.0.1, ${PUBLIC_SERVER_HOST}`,
      ],
      // Configure the public server's address as public address space
      // so that requests from it to localhost (local address space) trigger LNA checks
      [
        "network.lna.address_space.public.override",
        `127.0.0.1:${gPublicServerPort}`,
      ],
    ],
  });
  info(`Set public override to 127.0.0.1:${gPublicServerPort}`);

  for (const test of testCases) {
    const rand = Math.random();
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    const url = `http://${PUBLIC_SERVER_HOST}:${gPublicServerPort}/test.html?test=${test.type}&rand=${rand}`;
    info(`Loading test page: ${url}`);

    const promise = observeAndCheck(
      test.type,
      rand,
      test.denyStatus,
      `LNA request from HTTP origin should be blocked for ${test.type}`
    );

    const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url);

    // Wait for the LNA request to complete (should be blocked)
    await promise;

    // Verify that no notification/prompt was shown (insecure contexts
    // should be blocked without prompting)
    let popup = PopupNotifications.getNotification(
      "local-network-access",
      gBrowser.selectedBrowser
    );
    ok(
      !popup,
      `No permission prompt should be shown for ${test.type} from insecure context`
    );

    gBrowser.removeTab(tab);
  }
});
