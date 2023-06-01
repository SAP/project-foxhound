"use strict";

const HOSTS = new Set(["example.com"]);

Services.prefs.setBoolPref("extensions.manifestV3.enabled", true);

const server = createHttpServer({ hosts: HOSTS });

const BASE_URL = `http://example.com`;
const pageURL = `${BASE_URL}/plain.html`;

server.registerPathHandler("/plain.html", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/html");
  response.setHeader("Content-Security-Policy", "upgrade-insecure-requests;");
  response.write("<!DOCTYPE html><html></html>");
});

async function testWebSocketInFrameUpgraded() {
  const frame = document.createElement("iframe");
  frame.src = browser.runtime.getURL("frame.html");
  document.documentElement.appendChild(frame);
}

// testIframe = true: open WebSocket from iframe (original test case).
// testIframe = false: open WebSocket from content script.
async function test_webSocket({
  manifest_version,
  useIframe,
  content_security_policy,
  expectUpgrade,
}) {
  let web_accessible_resources =
    manifest_version == 2
      ? ["frame.html"]
      : [{ resources: ["frame.html"], matches: ["*://example.com/*"] }];

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      manifest_version,
      permissions: ["webRequest", "webRequestBlocking"],
      host_permissions: ["<all_urls>"],
      granted_host_permissions: true,
      web_accessible_resources,
      content_security_policy,
      content_scripts: [
        {
          matches: ["http://*/plain.html"],
          run_at: "document_idle",
          js: [useIframe ? "content_script.js" : "load_WebSocket.js"],
        },
      ],
    },
    temporarilyInstalled: true,
    background() {
      browser.webRequest.onBeforeSendHeaders.addListener(
        details => {
          let header = details.requestHeaders.find(h => h.name === "Origin");
          browser.test.sendMessage("ws_request", {
            ws_scheme: new URL(details.url).protocol,
            originHeader: header?.value,
          });
        },
        { urls: ["wss://example.com/*", "ws://example.com/*"] },
        ["requestHeaders", "blocking"]
      );
    },
    files: {
      "frame.html": `
<html>
    <head>
        <meta charset="utf-8"/>
        <script src="load_WebSocket.js"></script>
    </head>
    <body>
    </body>
</html>
	  `,
      "load_WebSocket.js": `new WebSocket("ws://example.com/ws_dummy");`,
      "content_script.js": `
      (${testWebSocketInFrameUpgraded})()
      `,
    },
  });

  await extension.startup();

  let contentPage = await ExtensionTestUtils.loadContentPage(pageURL);
  let { ws_scheme, originHeader } = await extension.awaitMessage("ws_request");

  if (expectUpgrade) {
    Assert.equal(ws_scheme, "wss:", "ws:-request should have been upgraded");
  } else {
    Assert.equal(ws_scheme, "ws:", "ws:-request should not have been upgraded");
  }

  if (useIframe) {
    Assert.equal(
      originHeader,
      `moz-extension://${extension.uuid}`,
      "Origin header of WebSocket request from extension page"
    );
  } else {
    Assert.equal(
      originHeader,
      manifest_version == 2 ? "null" : "http://example.com",
      "Origin header of WebSocket request from content script"
    );
  }
  await contentPage.close();
  await extension.unload();
}

// Page CSP does not affect extension iframes.
add_task(async function test_webSocket_upgrade_iframe_mv2() {
  await test_webSocket({
    manifest_version: 2,
    useIframe: true,
    expectUpgrade: false,
  });
});

// Page CSP does not affect extension iframes, however upgrade-insecure-requests causes this
// request to be upgraded in the iframe.
add_task(async function test_webSocket_upgrade_iframe_mv3() {
  await test_webSocket({
    manifest_version: 3,
    useIframe: true,
    expectUpgrade: true,
  });
});

// Test that removing upgrade-insecure-requests allows http request in the iframe.
add_task(async function test_webSocket_noupgrade_iframe_mv3() {
  let content_security_policy = {
    extension_pages: `script-src 'self'`,
  };
  await test_webSocket({
    manifest_version: 3,
    content_security_policy,
    useIframe: true,
    expectUpgrade: false,
  });
});

// Page CSP does not affect MV2 in the content script.
add_task(async function test_webSocket_upgrade_in_contentscript_mv2() {
  await test_webSocket({
    manifest_version: 2,
    useIframe: false,
    expectUpgrade: false,
  });
});

// Page CSP affects MV3 in the content script.
add_task(async function test_webSocket_upgrade_in_contentscript_mv3() {
  await test_webSocket({
    manifest_version: 3,
    useIframe: false,
    expectUpgrade: true,
  });
});
