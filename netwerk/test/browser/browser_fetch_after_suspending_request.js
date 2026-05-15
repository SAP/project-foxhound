/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function () {
  info("Run test with network.http.rcwn.enabled set to true");
  await test_fetch_after_suspend(true);
  info("Run test with network.http.rcwn.enabled set to false");
  await test_fetch_after_suspend(false);
});

let wrappedChannel;

async function test_fetch_after_suspend(rcwnEnabled) {
  info("Set network.http.rcwn.enabled to " + rcwnEnabled);
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.http.rcwn.enabled", rcwnEnabled],
      ["network.cache.suspended_writer_delay_ms", 300],
    ],
  });

  info("Add a new test tab");
  const tab = BrowserTestUtils.addTab(
    gBrowser,
    "https://example.com/document-builder.sjs?html=tab"
  );
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  const testBlockedUrl = "https://example.com/?test-blocked";

  info(`Add an observer to suspend the next channel to ${testBlockedUrl}`);
  const { promise, resolve } = Promise.withResolvers();
  const onExamineResponse = subject => {
    if (!(subject instanceof Ci.nsIHttpChannel)) {
      return;
    }

    const channel = subject.QueryInterface(Ci.nsIHttpChannel);
    if (channel.URI.displaySpec !== testBlockedUrl) {
      return;
    }

    wrappedChannel = ChannelWrapper.get(channel);
    wrappedChannel.suspend("test-blocked-suspend");
    Services.obs.removeObserver(onExamineResponse, "http-on-examine-response");
    resolve();
  };
  Services.obs.addObserver(onExamineResponse, "http-on-examine-response");

  info(`Send fetch call for ${testBlockedUrl}`);
  let first = fetch(tab.linkedBrowser, testBlockedUrl);

  info(
    "Wait for the fetch request to be suspended in http-on-examine-response"
  );
  await promise;

  info("Fetch the same URL again");
  let secondCompleted = false;
  let second = fetch(tab.linkedBrowser, testBlockedUrl).then(() => {
    secondCompleted = true;
  });

  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  let timer = new Promise(resolve => setTimeout(resolve, 6000));
  await Promise.race([second, timer]);

  Assert.equal(
    secondCompleted,
    true,
    "The second fetch should resolve successfully"
  );

  // Resume the first channel and await its completion so we don't leak anything.
  wrappedChannel.resume();
  await first;

  info("Cleanup");
  gBrowser.removeTab(tab);
}

function fetch(browser, url) {
  return SpecialPowers.spawn(browser, [url], async _url => {
    const response = await content.fetch(_url);
    await response.text();
  });
}

add_task(async function test_fetch_after_suspended_timer_fires() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.http.rcwn.enabled", false],
      ["network.cache.suspended_writer_delay_ms", 300],
    ],
  });

  info("Add a new test tab");
  const tab = BrowserTestUtils.addTab(
    gBrowser,
    "https://example.com/document-builder.sjs?html=tab"
  );
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  const testBlockedUrl = "https://example.com/?test-blocked";

  info(`Add an observer to suspend the next channel to ${testBlockedUrl}`);
  const { promise, resolve } = Promise.withResolvers();
  const onExamineResponse = subject => {
    if (!(subject instanceof Ci.nsIHttpChannel)) {
      return;
    }

    const channel = subject.QueryInterface(Ci.nsIHttpChannel);
    if (channel.URI.displaySpec !== testBlockedUrl) {
      return;
    }

    wrappedChannel = ChannelWrapper.get(channel);
    wrappedChannel.suspend("test-blocked-suspend");
    Services.obs.removeObserver(onExamineResponse, "http-on-examine-response");
    resolve();
  };
  Services.obs.addObserver(onExamineResponse, "http-on-examine-response");

  info(`Send fetch call for ${testBlockedUrl}`);
  let first = fetch(tab.linkedBrowser, testBlockedUrl);

  info(
    "Wait for the fetch request to be suspended in http-on-examine-response"
  );
  await promise;

  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  info("Fetch the same URL again");
  let secondCompleted = false;
  let second = fetch(tab.linkedBrowser, testBlockedUrl).then(() => {
    secondCompleted = true;
  });

  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  let timer = new Promise(resolve => setTimeout(resolve, 2000));
  await Promise.race([second, timer]);

  Assert.equal(
    secondCompleted,
    true,
    "The second fetch should resolve successfully"
  );

  // Resume the first channel and await its completion so we don't leak anything.
  wrappedChannel.resume();
  await first;

  info("Cleanup");
  gBrowser.removeTab(tab);
});

add_task(async function test_fetch_after_suspended_and_resumed() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.http.rcwn.enabled", false],
      ["network.cache.suspended_writer_delay_ms", 1000],
    ],
  });

  info("Add a new test tab");
  const tab = BrowserTestUtils.addTab(
    gBrowser,
    "https://example.com/document-builder.sjs?html=tab"
  );
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  const testBlockedUrl = "https://example.com/?test-blocked";

  info(`Add an observer to suspend the next channel to ${testBlockedUrl}`);
  const { promise, resolve } = Promise.withResolvers();
  const onExamineResponse = subject => {
    if (!(subject instanceof Ci.nsIHttpChannel)) {
      return;
    }

    const channel = subject.QueryInterface(Ci.nsIHttpChannel);
    if (channel.URI.displaySpec !== testBlockedUrl) {
      return;
    }

    wrappedChannel = ChannelWrapper.get(channel);
    wrappedChannel.suspend("test-blocked-suspend");
    Services.obs.removeObserver(onExamineResponse, "http-on-examine-response");
    resolve();
  };
  Services.obs.addObserver(onExamineResponse, "http-on-examine-response");

  info(`Send fetch call for ${testBlockedUrl}`);
  let first = fetch(tab.linkedBrowser, testBlockedUrl);

  info(
    "Wait for the fetch request to be suspended in http-on-examine-response"
  );
  await promise;

  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 100));

  // Resume the channel to make sure we cancel timer
  wrappedChannel.resume();

  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1500));

  info("Fetch the same URL again");
  let secondCompleted = false;
  let second = fetch(tab.linkedBrowser, testBlockedUrl).then(() => {
    secondCompleted = true;
  });

  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  let timer = new Promise(resolve => setTimeout(resolve, 2000));
  await Promise.race([second, timer]);

  Assert.equal(
    secondCompleted,
    true,
    "The second fetch should resolve successfully"
  );
  await first;

  info("Cleanup");
  gBrowser.removeTab(tab);
});
