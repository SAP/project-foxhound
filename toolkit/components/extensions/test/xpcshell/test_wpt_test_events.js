"use strict";

const { ExtensionTestCommon } = ChromeUtils.importESModule(
  "resource://testing-common/ExtensionTestCommon.sys.mjs"
);

const WPT = "web-platform.test";
const server = createHttpServer({ hosts: [WPT, "example.com"] });
server.registerDirectory("/data/", do_get_file("data"));

function loadPage(domain, query = "") {
  return ExtensionTestUtils.loadContentPage(
    `http://${domain}/data/file_wpt_events.html?${query}`
  );
}

async function requestAndCollect(unsubscribe = false) {
  let done = Promise.withResolvers();
  let events = [];

  function onEvent({ detail }) {
    Assert.ok(true, "Received event: " + JSON.stringify(detail));
    events.push(detail);
    if (detail.error || detail.done || detail.data.remainingTests === 0) {
      done.resolve(events);
      this.content.removeEventListener("testEvent", onEvent);
    }
  }
  this.content.addEventListener("testEvent", onEvent);

  if (!unsubscribe) {
    this.content.wrappedJSObject.subscribe();
  } else {
    this.content.wrappedJSObject.unsubscribe();
  }
  return done.promise;
}

async function runTestExt() {
  // Intentionally not using ExtensionWrapper here, we don't want
  // browser.test.assertX() assertions to reach the test harness,
  // and explicitly check for expected events in tests below.
  let ext = ExtensionTestCommon.generate({
    async background() {
      await browser.test.runTests([
        async () => {
          browser.test.assertEq(0xff, 255, "Same value.");
          // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
          await new Promise(r => setTimeout(r, 100));
          browser.test.assertTrue(1, "Truthy after await.");
        },
        function subTest2() {
          browser.test.assertThrows(() => {
            throw new Error("Wrong!");
          });
          browser.test.assertTrue(false, "Actually false.");

          // Thrown errors interrupt only the current task.
          throw new Error("Interrupted!");
        },
        function still_runs_despite_previous_tast_failed() {
          // Assert without a message.
          browser.test.fail();

          // TODO: https://bugzilla.mozilla.org/show_bug.cgi?id=1981876
          // Once failed assertions start throwing, this will be unreachable.
          browser.test.assertTrue(true, "Assertions don't throw (yet).");
        },
        function subTest4() {
          browser.test.assertEq(true, "true", "No type coercion.");
        },
      ]);
      browser.test.sendMessage("test-ext-done");
    },
  });

  let done = Promise.withResolvers();

  ext.on("test-message", function fn(_, msg) {
    if (msg === "test-ext-done") {
      ext.off("test-message", fn);
      done.resolve(ext);
    }
  });

  await Promise.all([ext.startup(), done.promise]);
  await ExtensionTestCommon.unloadTestExtension(ext);
}

function checkEvents(events, info) {
  Assert.deepEqual(
    events,
    [
      {
        event: "onTestStarted",
        data: { testName: "unnamed_test_1" },
      },
      {
        event: "onAssertEquality",
        data: {
          result: true,
          message: "Same value.",
          expectedValue: "255",
          actualValue: "255",
        },
      },
      {
        event: "onAssert",
        data: { result: true, message: "Truthy after await." },
      },
      {
        event: "onTestFinished",
        data: {
          remainingTests: 3,
          testName: "unnamed_test_1",
          result: true,
          assertionDescription: "unnamed_test_1 PASS",
        },
      },
      {
        event: "onTestStarted",
        data: { testName: "subTest2" },
      },
      {
        event: "onAssert",
        data: {
          result: true,
          message:
            "Function threw, expecting error to match '/.*/', got 'Error: Wrong!'",
        },
      },
      {
        event: "onAssert",
        data: { result: false, message: "Actually false." },
      },
      {
        event: "onTestFinished",
        data: {
          remainingTests: 2,
          testName: "subTest2",
          result: false,
          assertionDescription: "Exception running subTest2: Interrupted!",
        },
      },
      {
        event: "onTestStarted",
        data: { testName: "still_runs_despite_previous_tast_failed" },
      },
      {
        event: "onAssert",
        data: { result: false, message: "Assertion FAIL" },
      },
      {
        event: "onAssert",
        data: { result: true, message: "Assertions don't throw (yet)." },
      },
      {
        event: "onTestFinished",
        data: {
          remainingTests: 1,
          testName: "still_runs_despite_previous_tast_failed",
          result: false,
          assertionDescription: "Assertion FAIL",
        },
      },
      {
        event: "onTestStarted",
        data: { testName: "subTest4" },
      },
      {
        event: "onAssertEquality",
        data: {
          result: false,
          message: "No type coercion.",
          expectedValue: "true",
          actualValue: "true (different)",
        },
      },
      {
        event: "onTestFinished",
        data: {
          remainingTests: 0,
          testName: "subTest4",
          result: false,
          assertionDescription:
            "No type coercion. - Expected: true, Actual: true (different)",
        },
      },
    ],
    `Expected events - ${info}`
  );
}

// Normally this is not an expected situation. Real Firefox will always trigger
// loading ExtensionParent.sys.mjs on startup to support builtin extensions.
add_task(async function test_not_available_before_actor_init() {
  Assert.equal(
    false,
    Cu.isESModuleLoaded("resource://gre/modules/ExtensionParent.sys.mjs"),
    "ExtensionParent.sys.mjs not loaded in xpcshell tests by itself."
  );

  let page = await loadPage(WPT);
  let results = await page.spawn([], requestAndCollect);
  await page.close();

  Assert.deepEqual(
    results,
    [{ error: "Missing browser namespace." }],
    "browser.test not defined before WPTEvents actor initializion."
  );
});

add_task(async function test_events_queuing_scenarios() {
  // Importing to trigger the WPTEvents actor initialization.
  ChromeUtils.importESModule("resource://gre/modules/ExtensionParent.sys.mjs");

  info("Run test ext before event listener subscribed.");
  await runTestExt();
  let page1 = await loadPage(WPT, 1);

  let results1 = await page1.spawn([], requestAndCollect);
  checkEvents(results1, "Correct events queued.");

  info("Open second page with listener without closing the first one.");
  let page2 = await loadPage(WPT, 2);

  let results2 = page2.spawn([], requestAndCollect);

  await runTestExt();
  checkEvents(await results2, "Newest listener received messages.");

  let unsub1 = await page1.spawn([true], requestAndCollect);
  Assert.deepEqual(
    unsub1,
    [{ done: "unsubscribed" }],
    "Unsubscribing first listener shouldn't affect second."
  );

  let again2 = page2.spawn([], requestAndCollect);
  await runTestExt();
  checkEvents(await again2, "Second listener still received messages.");

  info("Closing both listeners.");
  await page1.close();
  await page2.close();

  info("Running the test before third listener subscribed.");
  await runTestExt();

  let page3 = await loadPage(WPT, 3);
  let results3 = await page3.spawn([], requestAndCollect);
  checkEvents(results3, "Third listener got queued messages.");
  await page3.close();
});

add_task(async function test_not_available_on_example_com() {
  // Importing to trigger the WPTEvents actor initialization.
  ChromeUtils.importESModule("resource://gre/modules/ExtensionParent.sys.mjs");

  let page = await loadPage("example.com");
  let results = await page.spawn([], requestAndCollect);
  await page.close();

  Assert.deepEqual(
    results,
    [{ error: "Missing browser namespace." }],
    "browser.test not defined on example.com."
  );
});
