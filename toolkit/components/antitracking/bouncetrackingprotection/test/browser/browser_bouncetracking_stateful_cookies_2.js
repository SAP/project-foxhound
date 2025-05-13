/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let bounceTrackingProtection;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.bounceTrackingProtection.requireStatefulBounces", true],
      ["privacy.bounceTrackingProtection.bounceTrackingGracePeriodSec", 0],
    ],
  });
  bounceTrackingProtection = Cc[
    "@mozilla.org/bounce-tracking-protection;1"
  ].getService(Ci.nsIBounceTrackingProtection);
});

// Cookie tests.

add_task(async function test_bounce_stateful_cookies_server_sameSiteFrame() {
  info("Test client bounce with cookie set in same site frame.");
  await runTestBounce({
    bounceType: "client",
    setState: "cookie-server",
    setStateSameSiteFrame: true,
  });
});

add_task(async function test_bounce_stateful_cookies_crossSiteFrame() {
  info(
    "Test client bounce with partitioned cookies set in a third-party iframe."
  );
  await runTestBounce({
    bounceType: "client",
    setState: "cookie-client",
    setStateCrossSiteFrame: true,
  });
});

add_task(async function test_bounce_stateful_cookies_server_crossSiteFrame() {
  info(
    "Test client bounce with partitioned server cookies set in a third-party iframe."
  );
  await runTestBounce({
    bounceType: "client",
    setState: "cookie-server",
    setStateCrossSiteFrame: true,
  });
});

add_task(async function test_bounce_stateful_cookies_server_sameSiteImage() {
  info(
    "Test client bounce with partitioned server cookies set via a same-site image."
  );
  await runTestBounce({
    bounceType: "client",
    setState: "cookie-server",
    setCookieViaImage: "same-site",
  });
});

add_task(async function test_bounce_stateful_cookies_server_crossSiteImage() {
  info(
    "Test client bounce with partitioned server cookies set via a third-party / cross-site image."
  );
  await runTestBounce({
    bounceType: "client",
    setState: "cookie-server",
    setCookieViaImage: "cross-site",
  });
});
