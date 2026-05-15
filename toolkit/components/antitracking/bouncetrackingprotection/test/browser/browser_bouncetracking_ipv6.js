/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that IPv6 addresses are correctly handled by bounce tracking
 * protection, with the address stored with brackets in the candidate
 * and user activation lists.
 */

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

let defined = {};
ChromeUtils.defineLazyGetter(defined, "IPV6_ORIGIN", function () {
  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  return `http://[::1]:${gHttpServer.identity.primaryPort}`;
});

let gHttpServer;

let bounceTrackingProtection;

add_setup(async function () {
  bounceTrackingProtection = Cc[
    "@mozilla.org/bounce-tracking-protection;1"
  ].getService(Ci.nsIBounceTrackingProtection);

  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "privacy.bounceTrackingProtection.mode",
        Ci.nsIBounceTrackingProtection.MODE_ENABLED,
      ],
      ["privacy.bounceTrackingProtection.requireStatefulBounces", false],
      ["privacy.bounceTrackingProtection.bounceTrackingGracePeriodSec", 0],
    ],
  });

  gHttpServer = new HttpServer();

  // Handler that serves a simple HTML page.
  gHttpServer.registerPathHandler("/", (request, response) => {
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "text/html", false);
    response.write(
      '<!DOCTYPE html><html><body><a id="link" href="#">click</a></body></html>'
    );
  });

  // Handler that performs a server-side redirect.
  gHttpServer.registerPathHandler("/bounce", (request, response) => {
    let target = request.queryString.split("=")[1];
    response.setStatusLine(request.httpVersion, 302, "Found");
    response.setHeader("Location", decodeURIComponent(target), false);
  });

  gHttpServer._start(-1, "[::1]");

  registerCleanupFunction(async () => {
    await gHttpServer.stop();
    bounceTrackingProtection.clearAll();
  });
});

add_task(async function test_ipv6_bounce_tracker() {
  info("Test that an IPv6 bounce tracker is recorded with brackets.");

  bounceTrackingProtection.clearAll();

  Assert.equal(
    bounceTrackingProtection.testGetBounceTrackerCandidateHosts({}).length,
    0,
    "No bounce tracker candidates initially."
  );
  Assert.equal(
    bounceTrackingProtection.testGetUserActivationHosts({}).length,
    0,
    "No user activation hosts initially."
  );

  let finalUrl = getBaseUrl(ORIGIN_B) + "file_start.html";

  await BrowserTestUtils.withNewTab(
    getBaseUrl(ORIGIN_A) + "file_start.html",
    async browser => {
      let promiseRecordBounces = waitForRecordBounces(browser);

      // Construct a bounce URL that goes through the IPv6 server.
      let bounceUrl = `${defined.IPV6_ORIGIN}/bounce?target=${encodeURIComponent(finalUrl)}`;

      info(`Navigating through IPv6 bounce: ${bounceUrl}`);

      // Navigate through the IPv6 bounce.
      await navigateLinkClick(browser, new URL(bounceUrl));

      // Wait for the final destination to load.
      await BrowserTestUtils.browserLoaded(browser, false, finalUrl);

      // Trigger end of extended navigation by navigating with user gesture.
      await navigateLinkClick(
        browser,
        new URL(getBaseUrl(ORIGIN_C) + "file_start.html")
      );

      await promiseRecordBounces;

      info("Checking bounce tracker candidates.");
      let candidateHosts = bounceTrackingProtection
        .testGetBounceTrackerCandidateHosts({})
        .map(entry => entry.siteHost);

      Assert.deepEqual(
        candidateHosts,
        ["[::1]"],
        "IPv6 bounce tracker should be recorded with brackets."
      );

      info("Checking user activation hosts.");
      let userActivationHosts = bounceTrackingProtection
        .testGetUserActivationHosts({})
        .map(entry => entry.siteHost)
        .sort();

      Assert.deepEqual(
        userActivationHosts,
        [SITE_A, SITE_B].sort(),
        "User activation should be recorded for sites with user interaction."
      );
    }
  );

  bounceTrackingProtection.clearAll();
});

add_task(async function test_ipv6_user_activation() {
  info("Test that user activation on an IPv6 site is recorded with brackets.");

  bounceTrackingProtection.clearAll();

  Assert.equal(
    bounceTrackingProtection.testGetUserActivationHosts({}).length,
    0,
    "No user activation hosts initially."
  );

  await BrowserTestUtils.withNewTab(
    `${defined.IPV6_ORIGIN}/`,
    async browser => {
      info("Simulating user interaction on the IPv6 page.");
      await BrowserTestUtils.synthesizeMouseAtPoint(1, 1, {}, browser);
    }
  );

  info("Checking user activation hosts.");
  let userActivationHosts = bounceTrackingProtection
    .testGetUserActivationHosts({})
    .map(entry => entry.siteHost);

  Assert.deepEqual(
    userActivationHosts,
    ["[::1]"],
    "IPv6 user activation should be recorded with brackets."
  );

  bounceTrackingProtection.clearAll();
});
