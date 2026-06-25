"use strict";

const server = createHttpServer({ hosts: ["example.com"] });
server.registerPathHandler("/page", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/html", false);
  response.write(`<script>var res = fetch("/redirect");</script>`);
});

server.registerPathHandler("/redirect", (request, response) => {
  response.setStatusLine(request.httpVersion, 302, "Found");
  response.setHeader("Location", "/target", false);
});

server.registerPathHandler("/target", (request, response) => {
  response.processAsync();
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/plain", false);
  // Flush headers + a byte so OnStartRequest reaches the content process, then
  // hold the response open so the channel does not get torn down.
  response.write("x");
  registerCleanupFunction(() => response.finish());
});

// ChannelWrapper.registerTraceableChannel on an unopened channel should be
// rejected, because ChannelWrapper::RequestListener would be unable to trace
// the channel on an unopened channel. Not doing so previously caused
// webRequest.filterResponseData to trigger crashes in the web content process
// due to attempts to attach a StreamFilter after response was received.
//
// This is a regression test for bug 2044517, reproducing the race condition
// described at https://bugzilla.mozilla.org/show_bug.cgi?id=1673749#c31
add_task(async function test_filterResponseData_after_redirect() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["webRequest", "webRequestBlocking", "<all_urls>"],
    },
    background() {
      // Note: We intentionally do not add "blocking" to this listener here,
      // because we want to simulate a race condition where filterResponseData
      // is called at an unfortunate time. We precisely simulate that below, by
      // calling registerTraceableChannel later.
      browser.webRequest.onHeadersReceived.addListener(
        ({ requestId }) => {
          let filter = browser.webRequest.filterResponseData(requestId);
          filter.onstart = () => {
            browser.test.fail("Unexpected filter.onstart");
          };
          filter.onstop = () => {
            browser.test.fail("Unexpected filter.onstop");
          };
          filter.onerror = () => {
            browser.test.assertEq(
              "Invalid request ID",
              filter.error,
              "Got expected filter.error in filter.onerror"
            );
            browser.test.sendMessage("done");
          };
          browser.test.sendMessage("onResponseStarted");
        },
        { urls: ["*://example.com/target"] }
      );
      browser.webRequest.handlerBehaviorChanged().then(() => {
        browser.test.sendMessage("ready");
      });
    },
  });

  await extension.startup();
  await extension.awaitMessage("ready");
  const seenEvents = [];
  // Using onMessage instead of awaitMessage so we can immediately assert
  // the expected sequence of events on webRequest.onResponseStarted.
  extension.onMessage("onResponseStarted", () => {
    Assert.deepEqual(
      ["onBeforeRedirect"],
      seenEvents,
      "onResponseStarted should happen after onBeforeRedirect"
    );
    seenEvents.push("onResponseStarted");
  });

  const policy = WebExtensionPolicy.getByID(extension.id);
  const { remoteTab } =
    extension.extension.backgroundContext.xulBrowser.frameLoader;

  const { WebRequest } = ChromeUtils.importESModule(
    "resource://gre/modules/WebRequest.sys.mjs"
  );
  function triggerRaceOnRedirect(details) {
    equal(details.redirectUrl, "http://example.com/target", "Got redirect");
    // We are synchronously inside ChannelEventSink.asyncOnChannelRedirect in
    // WebRequest.sys.mjs, and when we return, the ChannelWrapper's channel
    // will be updated to by HttpObserverManager.onChannelReplaced to the new
    // channel, which does NOT have a stream listener yet (due to it not having
    // received one from AsyncOpen, due to the delayed onRedirectVerifyCallback
    // call in ChannelEventSink.asyncOnChannelRedirect.
    //
    // Intercept the channel setter in HttpObserverManager.onChannelReplaced,
    // so we can intercept ChannelWrapper when it has an unopened channel.
    const { ChannelWrapper } = Cu.getGlobalForObject(WebRequest);
    const orig = Object.getOwnPropertyDescriptor(
      ChannelWrapper.prototype,
      "channel"
    );
    Object.defineProperty(ChannelWrapper.prototype, "channel", {
      configurable: true,
      get: orig.get,
      set(newChannel) {
        // Before doing anything, restore original property descriptor.
        Object.defineProperty(ChannelWrapper.prototype, "channel", orig);

        strictEqual(this.id, +details.requestId, "Intercepted ChannelWrapper");

        // Check that registerTraceableChannel was not called yet because we
        // must be the first to call it for the channel to reproduce the
        // original race condition. See below for details.
        equal(
          ChannelWrapper.getRegisteredChannel(this.id, policy, remoteTab),
          null,
          "Sanity check: registerTraceableChannel not called yet"
        );

        // Invoke original setter, which was restored above.
        this.channel = newChannel;

        // newChannel is missing HttpBaseChannel::mListener (as explained
        // above), so the call to ChannelWrapper::RegisterTraceableChannel will
        // fail because ChannelWrapper::RequestListener::Init() fails when
        // HttpBaseChannel::mListener is absent. For more details on the race,
        // see https://bugzilla.mozilla.org/show_bug.cgi?id=1673749#c31
        this.registerTraceableChannel(policy, remoteTab);

        // This assertion failed before the fix to bug 2044517. But even
        // without this assertion, we would have triggered a release assertion
        // in mozilla::extensions::StreamFilterParent::Init.
        equal(
          ChannelWrapper.getRegisteredChannel(this.id, policy, remoteTab),
          null,
          "registerTraceableChannel failed to register unopened channel "
        );

        // Record so we can check below, and also elsewhere when we verify
        // that onBeforeRedirect is before the final onResponseStarted.
        seenEvents.push("onBeforeRedirect");
      },
    });
    // After returning, the ChannelWrapper.channel setter should be triggered
    // immediately. Verify that it happens.
    Promise.resolve().then(() => {
      Assert.deepEqual(
        ["onBeforeRedirect"],
        seenEvents,
        "channelWrapper.channel setter called after onBeforeRedirect"
      );
      WebRequest.onBeforeRedirect.removeListener(triggerRaceOnRedirect);
    });
  }
  WebRequest.onBeforeRedirect.addListener(
    triggerRaceOnRedirect,
    { urls: new MatchPatternSet(["*://example.com/redirect"]) },
    [],
    { addonId: extension.id, policy, blockingAllowed: false }
  );

  let contentPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/page"
  );
  await extension.awaitMessage("done");
  await contentPage.close();
  await extension.unload();

  Assert.deepEqual(
    ["onBeforeRedirect", "onResponseStarted"],
    seenEvents,
    "Observed all expected webRequest events"
  );
});
