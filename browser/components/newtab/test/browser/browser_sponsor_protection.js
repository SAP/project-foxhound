/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { SponsorProtection } = ChromeUtils.importESModule(
  "moz-src:///browser/components/newtab/SponsorProtection.sys.mjs"
);

/**
 * Sends some network traffic via the supplied browser using a POST fetch
 * request from the content process.
 *
 * @param {Browser} browser
 *   The browser that should send the traffic.
 * @param {boolean} expectTelemetry
 *   True if sendTraffic should wait for the sponsNavTrafficSent and
 *   sponNavTrafficRecvd Glean metrics to have changed before proceeding.
 * @returns {Promise<void>}
 *   Resolves once the http-on-stop-request notification fires for the supplied
 *   browser.
 */
async function sendTraffic(browser, expectTelemetry) {
  const priorSent = Glean.newtab.sponsNavTrafficSent.testGetValue()?.sum;
  const priorRecvd = Glean.newtab.sponsNavTrafficRecvd.testGetValue()?.sum;

  let httpStopSeen = TestUtils.topicObserved(
    "http-on-stop-request",
    subject => {
      if (!(subject instanceof Ci.nsIHttpChannel)) {
        return false;
      }

      let channel = subject;
      const { browsingContext } = channel.loadInfo;
      return (
        browser === browsingContext?.top.embedderElement &&
        channel.requestSize &&
        channel.transferSize
      );
    }
  );
  // Now send some network traffic from the content.
  await SpecialPowers.spawn(browser, [], async function () {
    const ONE_MB_IN_BYTES = 1024 * 1024;
    const dummyData = new Uint8Array(ONE_MB_IN_BYTES);
    await content.fetch("/", {
      method: "POST",
      body: dummyData,
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });
  });
  await httpStopSeen;

  if (expectTelemetry) {
    await TestUtils.waitForCondition(() => {
      return (
        Glean.newtab.sponsNavTrafficSent.testGetValue()?.sum != priorSent &&
        Glean.newtab.sponsNavTrafficRecvd.testGetValue()?.sum != priorRecvd
      );
    });
  }
}

/**
 * Tests that we do not measure traffic volume for unprotected browsers.
 */
add_task(async function test_no_measure_when_unprotected() {
  Services.fog.testResetFOG();

  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    Assert.ok(
      !SponsorProtection.isProtectedBrowser(browser),
      "Browser does not have protection applied."
    );
    Assert.equal(
      Glean.newtab.sponsNavTrafficSent.testGetValue(),
      null,
      "Should not have recorded any sent traffic"
    );
    Assert.equal(
      Glean.newtab.sponsNavTrafficRecvd.testGetValue(),
      null,
      "Should not have recorded any received traffic"
    );
  });
});

/**
 * Tests that we do measure traffic volume for protected browsers. Also tests
 * that measurement stops when the browser has protection removed.
 */
add_task(async function test_measure_when_protected() {
  Services.fog.testResetFOG();

  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    Assert.ok(
      !SponsorProtection.isProtectedBrowser(browser),
      "Browser does not have protection applied yet."
    );

    SponsorProtection.addProtectedBrowser(browser);

    Assert.ok(
      SponsorProtection.isProtectedBrowser(browser),
      "Browser now has sponsor protection applied.."
    );

    await sendTraffic(browser, true /* expectTelemetry */);

    const originalSentTraffic =
      Glean.newtab.sponsNavTrafficSent.testGetValue().sum;
    Assert.greater(
      originalSentTraffic,
      0,
      "Should have recorded some sent traffic"
    );
    const originalReceivedTraffic =
      Glean.newtab.sponsNavTrafficRecvd.testGetValue().sum;
    Assert.greater(
      originalReceivedTraffic,
      0,
      "Should have recorded some received traffic"
    );

    // Let's send another request and make sure that the traffic measurements
    // climb a bit.
    await sendTraffic(browser, true /* expectTelemetry */);

    const secondSentTraffic =
      Glean.newtab.sponsNavTrafficSent.testGetValue().sum;
    Assert.greater(
      secondSentTraffic,
      originalSentTraffic,
      "Should have recorded some more sent traffic"
    );
    const secondReceivedTraffic =
      Glean.newtab.sponsNavTrafficRecvd.testGetValue().sum;
    Assert.greater(
      secondReceivedTraffic,
      originalReceivedTraffic,
      "Should have recorded some more received traffic"
    );

    // Now remove the protection and ensure that the traffic values don't
    // change with any new requests.
    SponsorProtection.removeProtectedBrowser(browser);
    Assert.ok(
      !SponsorProtection.isProtectedBrowser(browser),
      "Browser does not have protection applied anymore."
    );

    // Now send some network traffic from the content.
    await sendTraffic(browser, false /* expectTelemetry */);

    Assert.equal(
      Glean.newtab.sponsNavTrafficSent.testGetValue().sum,
      secondSentTraffic,
      "Should not have recorded any additional sent traffic"
    );
    Assert.equal(
      Glean.newtab.sponsNavTrafficRecvd.testGetValue().sum,
      secondReceivedTraffic,
      "Should not have recorded any additional received traffic"
    );
  });
});
