/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const URIs = [
  "about:about",
  "http://example.com/browser/dom/base/test/empty.html",
];

async function runTest(input, url) {
  let tab = BrowserTestUtils.addTab(gBrowser, url);
  let browser = gBrowser.getBrowserForTab(tab);

  await BrowserTestUtils.browserLoaded(browser);

  let stream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(
    Ci.nsIStringInputStream
  );
  stream.setByteStringData(input);

  let data = {
    inputStream: stream,
  };

  is(
    data.inputStream.available(),
    input.length,
    "The length of the inputStream matches: " + input.length
  );

  // FIXME: SpecialPowers.spawn currently crashes when trying to return
  // values containing input streams.
  /* eslint-disable no-shadow */
  let dataBack = await SpecialPowers.spawn(browser, [data], function (data) {
    let dataBack = {
      inputStream: data.inputStream,
      check: true,
    };

    if (content.location.href.startsWith("about:")) {
      dataBack.check =
        data.inputStream instanceof
        content.Components.interfaces.nsIInputStream;
    }

    return dataBack;
  });
  /* eslint-enable no-shadow */

  ok(dataBack.check, "The inputStream is a nsIInputStream also on content.");
  ok(
    data.inputStream instanceof Ci.nsIInputStream,
    "The original object was an inputStream"
  );
  ok(
    dataBack.inputStream instanceof Ci.nsIInputStream,
    "We have an inputStream back from the content."
  );

  BrowserTestUtils.removeTab(tab);
}

add_task(async function test() {
  let a = "a";
  for (let i = 0; i < 25; ++i) {
    a += a;
  }

  for (let i = 0; i < URIs.length; ++i) {
    await runTest("Hello world", URIs[i]);
    await runTest(a, URIs[i]);
  }
});

// Sending an nsIInputStream over a broadcasting message manager should fail,
// as broadcasting message managers don't support transferring (bug 2023670).
// The structured clone write will fail and GetParamsForMessage falls back to
// JSON serialization, which drops the stream.
add_task(async function test_broadcast_inputStream_fails() {
  await BrowserTestUtils.withNewTab(
    "http://example.com/browser/dom/base/test/empty.html",
    async browser => {
      let stream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(
        Ci.nsIStringInputStream
      );
      stream.setByteStringData("hello");

      // Register the listener in the content process first, and wait for
      // that to complete before broadcasting, to avoid a race.
      await SpecialPowers.spawn(browser, [], () => {
        content._testPromise = new Promise(resolve => {
          Services.cpmm.addMessageListener(
            "test-inputstream",
            function listener(msg) {
              Services.cpmm.removeMessageListener("test-inputstream", listener);
              resolve(msg.data);
            }
          );
        });
      });

      let data = {
        inputStream: stream,
        sentinel: "hello",
      };

      Services.ppmm.broadcastAsyncMessage("test-inputstream", {
        inputStream: stream,
        sentinel: "hello",
      });

      let expectedResult = JSON.parse(JSON.stringify(data));

      await SpecialPowers.spawn(
        browser,
        [expectedResult],
        async expectedResult => {
          let data = await content._testPromise;
          is(data.sentinel, "hello", "Message was received");
          Assert.deepEqual(
            data,
            expectedResult,
            "The message is as-if it was round-tripped through JSON (which it was)"
          );
        }
      );
    }
  );
});
