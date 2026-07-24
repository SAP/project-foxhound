/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

let mainBrowsingContext = null;
let iframeBrowsingContext = null;

// This test verifies that an iframe from a public address does not taint the address space of its parent page.
// We load a main page from server1 (localhost) that embeds an iframe loading from server2 (a public address).
// A second iframe from server1 (localhost) is then added. If the main page's address space were tainted by the public iframe,
// the second iframe would fail to load. This test ensures that does not happen.
add_task(async function test_main_ipAddressSpace_unaffected_by_iframe() {
  // Start server1
  let server1 = new HttpServer();
  server1.start(-1);
  const server1Port = server1.identity.primaryPort;
  const server1Base = `http://localhost:${server1Port}`;

  // Start server2
  let server2 = new HttpServer();
  server2.start(-1);
  const server2Port = server2.identity.primaryPort;
  const server2Base = `http://localhost:${server2Port}`;
  // override server2 as public
  var override_value = `127.0.0.1:${server2Port}`;

  Services.prefs.setCharPref(
    "network.lna.address_space.public.override",
    override_value
  );
  Services.prefs.setBoolPref("network.lna.blocking", true);
  Services.prefs.setBoolPref("network.localhost.prompt.testing", true);
  Services.prefs.setBoolPref("network.localhost.prompt.testing.allow", false);

  registerCleanupFunction(async () => {
    await server1.stop();
    await server2.stop();
    Services.prefs.clearUserPref("network.lna.address_space.public.override");
    Services.prefs.clearUserPref("network.lna.blocking");
    Services.prefs.clearUserPref("network.localhost.prompt.testing");
    Services.prefs.clearUserPref("network.localhost.prompt.testing.allow");
  });

  server1.registerPathHandler("/test", (request, response) => {
    response.setHeader("Content-Type", "text/html", false);
    response.write(`
    <!DOCTYPE html>
    <html>
      <body>
        <iframe src="${server2Base}/iframe" id="childframe1"
                onload="loadSecondIframe()"></iframe>

        <script>
          function loadSecondIframe() {
            const iframe = document.createElement('iframe');
            iframe.src = "${server1Base}/test2";
            iframe.id = "childframe2";
            document.body.appendChild(iframe);
          }
        </script>
      </body>
    </html>
  `);
  });

  server1.registerPathHandler("/test2", (request, response) => {
    response.setHeader("Content-Type", "text/html", false);
    response.write(
      "<!DOCTYPE html><html><body><p>Dummy content</p></body></html>"
    );
  });

  server2.registerPathHandler("/iframe", (request, response) => {
    response.setHeader("Content-Type", "text/html", false);
    response.write(
      "<!DOCTYPE html><html><body><p>Iframe content</p></body></html>"
    );
  });
  // Set up the http-on-stop-request observer
  const testURLs = new Set([
    `${server1Base}/test`,
    `${server2Base}/iframe`,
    `${server1Base}/test2`,
  ]);

  let observerPromise = new Promise(resolve => {
    let seen = new Set();

    var httpObserver = {
      observe(subject, topic) {
        if (topic !== "http-on-stop-request") {
          return;
        }

        let channel = subject.QueryInterface(Ci.nsIHttpChannel);
        if (!channel || !testURLs.has(channel.URI.spec)) {
          return;
        }

        info(`Observed load of: ${channel.URI.spec}`);
        is(channel.status, Cr.NS_OK, "Channel should have loaded successfully");
        seen.add(channel.URI.spec);
        if (seen.size === 3) {
          resolve();
        }
      },
    };

    Services.obs.addObserver(httpObserver, "http-on-stop-request");
  });

  // Open the test page in a new tab
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    `${server1Base}/test`
  );

  await observerPromise;

  // Cleanup
  gBrowser.removeTab(tab);
});
