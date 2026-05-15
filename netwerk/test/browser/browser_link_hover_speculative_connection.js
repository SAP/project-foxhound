/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const TEST_PATH = "/browser/netwerk/test/browser/";

let gServer;
let gServerURL;
let gConnectionNumberWhenRequested = 0;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      // Enable speculative connections for hover on HTTPS
      ["network.predictor.enable-hover-on-ssl", true],
      // Enable network debugging observations
      ["network.http.debug-observations", true],
    ],
  });

  // Set up local HTTP server for the target page
  gServer = new HttpServer();
  gServer.start(-1);
  gServerURL = `http://localhost:${gServer.identity.primaryPort}`;

  // Register handler for the target page
  gServer.registerPathHandler("/target.html", handleTarget);

  registerCleanupFunction(async () => {
    await gServer.stop();
  });
});

function handleTarget(request, response) {
  response.setHeader("Content-Type", "text/html", false);
  response.setHeader("Cache-Control", "no-cache", false);

  // Record which connection number handled this request
  gConnectionNumberWhenRequested = response._connection.number;

  let body = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Target Page</title>
    </head>
    <body>
      <h1>Target Page</h1>
      <p>Connection: ${gConnectionNumberWhenRequested}</p>
    </body>
    </html>
  `;

  response.write(body);
}

/**
 * Helper function to simulate hovering over a link element
 */
function hoverOverLink(browser, linkId) {
  return SpecialPowers.spawn(browser, [linkId], async id => {
    let link = content.document.getElementById(id);
    // Dispatch mouseover event which should trigger the speculative connection
    let event = new content.MouseEvent("mouseover", {
      bubbles: true,
      cancelable: true,
      view: content,
    });
    link.dispatchEvent(event);
  });
}

/**
 * Helper function to click a link and wait for navigation
 */
async function clickLink(browser, linkId) {
  let loadedPromise = BrowserTestUtils.browserLoaded(browser);

  await SpecialPowers.spawn(browser, [linkId], async id => {
    let link = content.document.getElementById(id);
    link.click();
  });

  await loadedPromise;
}

add_task(async function test_link_hover_https_page() {
  let speculativeConnectObserved = false;
  let observer = {
    QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),
    observe(aSubject, aTopic, aData) {
      if (
        aTopic == "speculative-connect-request" &&
        aData.includes("localhost")
      ) {
        info("Observed speculative connection request for: " + aData);
        speculativeConnectObserved = true;
      }
    },
  };
  Services.obs.addObserver(observer, "speculative-connect-request");

  // Load the test page from HTTPS example.com with the target URL pointing to our local server
  const targetURL = encodeURIComponent(gServerURL + "/target.html");
  const pageURL =
    "https://example.com" +
    TEST_PATH +
    "file_link_hover.sjs?target=" +
    targetURL;

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: pageURL,
      waitForLoad: true,
    },
    async function (browser) {
      // Record the current connection count before hovering
      let connectionCountBeforeHover = gServer.connectionNumber;
      info("Connection count before hover: " + connectionCountBeforeHover);

      // Wait for the link element to be available in the page
      await SpecialPowers.spawn(browser, [], async () => {
        await ContentTaskUtils.waitForCondition(
          () => content.document.getElementById("testLink"),
          "Waiting for link element to be available"
        );
      });

      // Hover over the link to trigger speculative connection
      await hoverOverLink(browser, "testLink");

      // Wait for the speculative connection to be fully established
      // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check connection count after hover
      let connectionCountAfterHover = gServer.connectionNumber;
      info("Connection count after hover: " + connectionCountAfterHover);

      // Verify that a speculative connection request was observed
      Assert.ok(
        speculativeConnectObserved,
        "Speculative connection should be triggered on link hover"
      );

      // Now click the link - it should use the speculative connection
      await clickLink(browser, "testLink");

      // Check connection count after click
      let connectionCountAfterClick = gServer.connectionNumber;
      info("Connection count after click: " + connectionCountAfterClick);
      info(
        "Connection number that handled the request: " +
          gConnectionNumberWhenRequested
      );

      // Verify that exactly one NEW connection was established
      Assert.equal(
        connectionCountAfterClick,
        connectionCountBeforeHover + 1,
        "Exactly one connection should be established for the HTTP request"
      );

      // Verify that the request was handled by the new connection
      Assert.equal(
        gConnectionNumberWhenRequested,
        connectionCountBeforeHover + 1,
        "The HTTP request should be handled by the new connection"
      );
    }
  );

  Services.obs.removeObserver(observer, "speculative-connect-request");
});

add_task(async function test_link_hover_http_page() {
  let speculativeConnectObserved = false;
  let observer = {
    QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),
    observe(aSubject, aTopic, aData) {
      if (
        aTopic == "speculative-connect-request" &&
        aData.includes("localhost")
      ) {
        info("Observed speculative connection request for: " + aData);
        speculativeConnectObserved = true;
      }
    },
  };
  Services.obs.addObserver(observer, "speculative-connect-request");

  // Load the test page from HTTP example.com with the target URL pointing to our local server
  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  const targetURL = encodeURIComponent(gServerURL + "/target.html");
  const pageURL =
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://example.com" +
    TEST_PATH +
    "file_link_hover.sjs?target=" +
    targetURL;

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: pageURL,
      waitForLoad: true,
    },
    async function (browser) {
      // Record the current connection count before hovering
      // This should be 0 since we haven't connected to our server yet
      let connectionCountBeforeHover = gServer.connectionNumber;
      info("Connection count before hover: " + connectionCountBeforeHover);

      // Wait for the link element to be available in the page
      await SpecialPowers.spawn(browser, [], async () => {
        await ContentTaskUtils.waitForCondition(
          () => content.document.getElementById("testLink"),
          "Waiting for link element to be available"
        );
      });

      // Hover over the link to trigger speculative connection
      await hoverOverLink(browser, "testLink");

      // Wait for the speculative connection to be fully established
      // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check connection count after hover
      let connectionCountAfterHover = gServer.connectionNumber;
      info("Connection count after hover: " + connectionCountAfterHover);

      // Verify that a speculative connection request was observed
      Assert.ok(
        speculativeConnectObserved,
        "Speculative connection should be triggered on link hover from HTTP page"
      );

      // Now click the link - it should use the speculative connection
      await clickLink(browser, "testLink");

      // Check connection count after click
      let connectionCountAfterClick = gServer.connectionNumber;
      info("Connection count after click: " + connectionCountAfterClick);
      info(
        "Connection number that handled the request: " +
          gConnectionNumberWhenRequested
      );

      // Verify that exactly one NEW connection was established
      Assert.equal(
        connectionCountAfterClick,
        connectionCountBeforeHover + 1,
        "Exactly one connection should be established for the HTTP request"
      );

      // Verify that the request was handled by the new connection
      Assert.equal(
        gConnectionNumberWhenRequested,
        connectionCountBeforeHover + 1,
        "The HTTP request should be handled by the new connection"
      );
    }
  );

  Services.obs.removeObserver(observer, "speculative-connect-request");
});

add_task(async function test_link_hover_https_page_pref_disabled() {
  // Disable the pref for speculative connections on HTTPS
  await SpecialPowers.pushPrefEnv({
    set: [["network.predictor.enable-hover-on-ssl", false]],
  });

  let speculativeConnectObserved = false;
  let observer = {
    QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),
    observe(aSubject, aTopic, aData) {
      if (
        aTopic == "speculative-connect-request" &&
        aData.includes("localhost")
      ) {
        info("Observed speculative connection request for: " + aData);
        speculativeConnectObserved = true;
      }
    },
  };
  Services.obs.addObserver(observer, "speculative-connect-request");

  // Load the test page from HTTPS example.com with the target URL pointing to our local server
  const targetURL = encodeURIComponent(gServerURL + "/target.html");
  const pageURL =
    "https://example.com" +
    TEST_PATH +
    "file_link_hover.sjs?target=" +
    targetURL;

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: pageURL,
      waitForLoad: true,
    },
    async function (browser) {
      // Record the current connection count before hovering
      let connectionCountBeforeHover = gServer.connectionNumber;
      info("Connection count before hover: " + connectionCountBeforeHover);

      // Wait for the link element to be available in the page
      await SpecialPowers.spawn(browser, [], async () => {
        await ContentTaskUtils.waitForCondition(
          () => content.document.getElementById("testLink"),
          "Waiting for link element to be available"
        );
      });

      // Hover over the link
      await hoverOverLink(browser, "testLink");

      // Wait a bit to see if any speculative connection would be triggered
      // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check connection count after hover
      let connectionCountAfterHover = gServer.connectionNumber;
      info("Connection count after hover: " + connectionCountAfterHover);

      // Verify that NO speculative connection request was observed
      Assert.ok(
        !speculativeConnectObserved,
        "Speculative connection should NOT be triggered on link hover from HTTPS page when pref is disabled"
      );

      // Now click the link - it will create a new connection
      await clickLink(browser, "testLink");

      // Check connection count after click
      let connectionCountAfterClick = gServer.connectionNumber;
      info("Connection count after click: " + connectionCountAfterClick);

      // Verify that exactly one NEW connection was created (by the click, not hover)
      Assert.equal(
        connectionCountAfterClick,
        connectionCountBeforeHover + 1,
        "Exactly one connection should be established (from the click, not hover)"
      );
    }
  );

  Services.obs.removeObserver(observer, "speculative-connect-request");

  // Restore the pref
  await SpecialPowers.popPrefEnv();
});
