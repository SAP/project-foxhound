/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * This test verifies that the EventSource created by a foreign worker will
 * properly set the IsInThirdPartyContext flag on the channel's loadInfo.
 */

function createPromiseForObservingChannel(aURL, aExpected) {
  return new Promise(resolve => {
    let observer = (aSubject, aTopic) => {
      if (aTopic === "http-on-modify-request") {
        let httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
        let reqLoadInfo = httpChannel.loadInfo;

        // Make sure this is the request which we want to check.
        if (httpChannel.URI.spec !== aURL) {
          return;
        }

        is(
          reqLoadInfo.isInThirdPartyContext,
          aExpected,
          `IsInThirdPartyContext is ${aExpected}`
        );

        Services.obs.removeObserver(observer, "http-on-modify-request");
        resolve();
      }
    };

    Services.obs.addObserver(observer, "http-on-modify-request");
  });
}

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "network.cookie.cookieBehavior",
        BEHAVIOR_REJECT_TRACKER_AND_PARTITION_FOREIGN,
      ],
    ],
  });

  registerCleanupFunction(async () => {
    await new Promise(resolve => {
      Services.clearData.deleteData(Ci.nsIClearDataService.CLEAR_ALL, () =>
        resolve()
      );
    });
  });
});

add_task(async function test_eventSource_firstParty() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE_HTTPS
  );

  let promise = createPromiseForObservingChannel(
    "https://example.net/browser/toolkit/components/antitracking/test/browser/eventsource_message.sjs",
    false
  );

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    let worker = new content.SharedWorker("eventsource_worker.js");
    await new content.Promise(resolve => {
      worker.port.onmessage = resolve;
    });
  });

  await promise;

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_foreignWorker_eventSource() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE_HTTPS
  );

  // Open a cross-site iframe.
  let crossOriginBC = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [TEST_3RD_PARTY_PAGE],
    async src => {
      let iframe = content.document.createElement("iframe");
      iframe.src = src;

      await new content.Promise(resolve => {
        iframe.onload = resolve;
        content.document.body.appendChild(iframe);
      });

      return iframe.browsingContext;
    }
  );

  let promise = createPromiseForObservingChannel(
    "https://tracking.example.org/browser/toolkit/components/antitracking/test/browser/eventsource_message.sjs",
    true
  );

  await SpecialPowers.spawn(crossOriginBC, [], async () => {
    let worker = new content.SharedWorker("eventsource_worker.js");
    await new content.Promise(resolve => {
      worker.port.onmessage = resolve;
    });
  });

  await promise;

  await BrowserTestUtils.removeTab(tab);
});
