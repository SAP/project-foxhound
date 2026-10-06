/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/remote/shared/test/browser/workers/helper-workerlistener.js",
  this
);

const {
  registerWebDriverWorkerListenerActor,
  unregisterWebDriverWorkerListenerActor,
  workerListenerRegistry,
} = ChromeUtils.importESModule(
  "chrome://remote/content/shared/js-process-actors/WebDriverWorkerListenerActor.sys.mjs"
);

const TEST_PAGE = "https://example.com/document-builder.sjs?html=test";

describe("WorkerListener", function () {
  let registeredWorkers;
  let unregisteredWorkers;
  let onWorkerRegistered;
  let onWorkerUnregistered;

  beforeEach(async () => {
    registeredWorkers = [];
    onWorkerRegistered = (name, worker) => registeredWorkers.push(worker);
    workerListenerRegistry.on("worker-registered", onWorkerRegistered);

    unregisteredWorkers = [];
    onWorkerUnregistered = (name, worker) => unregisteredWorkers.push(worker);
    workerListenerRegistry.on("worker-unregistered", onWorkerUnregistered);
  });

  afterEach(() => {
    workerListenerRegistry.off("worker-registered", onWorkerRegistered);
    workerListenerRegistry.off("worker-unregistered", onWorkerUnregistered);
    unregisterWebDriverWorkerListenerActor();

    gBrowser.removeAllTabsBut(gBrowser.tabs[0]);
  });

  // Some tests run in two variants: delayListenerRegistration=true or false.
  // When delayListenerRegistration is true, the worker listener will be added
  // only after the workers have already been started in the page.
  // For automation, the common case is to already have the listener started
  // (ie delayListenerRegistration=false), so this scenario is tested first.
  for (const delayListenerRegistration of [false, true]) {
    const delayStr = delayListenerRegistration ? " (delayed)" : "";
    it(
      "Emits expected events for a single dedicated worker" + delayStr,
      async function test_workerRegistered() {
        if (!delayListenerRegistration) {
          info("Register the worker listener actors before registering worker");
          registerWebDriverWorkerListenerActor();
        }

        info("Create and select a new tab");
        const tab = BrowserTestUtils.addTab(gBrowser, WORKER_TEST_PAGE);
        gBrowser.selectedTab = tab;
        const browser = tab.linkedBrowser;
        await BrowserTestUtils.browserLoaded(browser);

        info("Register the worker in the test page");
        await SpecialPowers.spawn(browser, [], () => {
          content.wrappedJSObject.registerWorker();
        });

        if (delayListenerRegistration) {
          info("Register the worker listener actors after registering worker");
          await SpecialPowers.spawn(browser, [], async () => {
            await content.wrappedJSObject.onWorkerReady;
          });
          registerWebDriverWorkerListenerActor();
        }

        const [worker] = await waitForWorkersByURL(
          registeredWorkers,
          WORKER_URL,
          1
        );

        assertWorkerData(worker, {
          alreadyRegistered: delayListenerRegistration,
          type: Ci.nsIWorkerDebugger.TYPE_DEDICATED,
          windowIDs: [
            browser.browsingContext.currentWindowGlobal.innerWindowId,
          ],
          url: WORKER_URL,
        });

        // Check that getWorkers also contains the expected worker
        const expectedWorkersFromAPI = workerListenerRegistry
          .getWorkers()
          .filter(w => w.url === WORKER_URL);
        is(
          expectedWorkersFromAPI.length,
          1,
          "getWorkers() also contains one worker for the expected URL"
        );
        assertWorkerData(expectedWorkersFromAPI[0], worker);

        info("Reload the selected tab to unregister the worker");
        BrowserCommands.reload();
        await waitForWorkersByIds(unregisteredWorkers, [worker.id], 1);
      }
    );

    it(
      "Emits expected events for multiple workers" + delayStr,
      async function test_multipleWorkers() {
        if (!delayListenerRegistration) {
          info("Register the worker listener actors before registering worker");
          registerWebDriverWorkerListenerActor();
        }

        info("Create and select a new tab");
        const tab = BrowserTestUtils.addTab(gBrowser, WORKER_TEST_PAGE);
        gBrowser.selectedTab = tab;
        const browser = tab.linkedBrowser;
        await BrowserTestUtils.browserLoaded(browser);

        info("Spawn 3 workers using data URIs");
        await SpecialPowers.spawn(browser, [], () => {
          content.worker1 = new content.Worker(
            "data:text/javascript,postMessage('worker1')"
          );
          content.worker2 = new content.Worker(
            "data:text/javascript,postMessage('worker2')"
          );
          content.worker3 = new content.Worker(
            "data:text/javascript,postMessage('worker3')"
          );
        });

        if (delayListenerRegistration) {
          info("Register the worker listener actors after registering worker");
          registerWebDriverWorkerListenerActor();
        }

        const expectedWorkers = await waitForWorkersByURL(
          registeredWorkers,
          url => url.startsWith("data:text/javascript"),
          3
        );

        const workerIds = expectedWorkers.map(w => w.id);
        is(new Set(workerIds).size, 3, "All workers have unique ids");
        for (const worker of expectedWorkers) {
          assertWorkerData(worker, {
            alreadyRegistered: delayListenerRegistration,
            type: Ci.nsIWorkerDebugger.TYPE_DEDICATED,
            windowIDs: [
              browser.browsingContext.currentWindowGlobal.innerWindowId,
            ],
            checkUrl: url => url.startsWith("data:text/javascript"),
          });
        }

        info("Reload the selected tab to unregister the workers");
        BrowserCommands.reload();

        await waitForWorkersByIds(unregisteredWorkers, workerIds, 3);
      }
    );

    it(
      "Emits expected events for workers in multiple tabs" + delayStr,
      async function test_workersInMultipleTabs() {
        if (!delayListenerRegistration) {
          info("Register the worker listener actors before registering worker");
          registerWebDriverWorkerListenerActor();
        }

        const tab1 = BrowserTestUtils.addTab(gBrowser, WORKER_TEST_PAGE);
        const browser1 = tab1.linkedBrowser;
        await BrowserTestUtils.browserLoaded(browser1);

        const tab2 = BrowserTestUtils.addTab(gBrowser, WORKER_TEST_PAGE);
        const browser2 = tab2.linkedBrowser;
        await BrowserTestUtils.browserLoaded(browser2);

        info("Register the worker in the both test pages");
        await SpecialPowers.spawn(browser1, [], () => {
          content.wrappedJSObject.registerWorker();
        });
        await SpecialPowers.spawn(browser2, [], () => {
          content.wrappedJSObject.registerWorker();
        });

        if (delayListenerRegistration) {
          info("Wait for the workers to be registered");
          await SpecialPowers.spawn(browser1, [], async () => {
            await content.wrappedJSObject.onWorkerReady;
          });
          await SpecialPowers.spawn(browser2, [], async () => {
            await content.wrappedJSObject.onWorkerReady;
          });

          info("Register the worker listener actors after registering worker");
          registerWebDriverWorkerListenerActor();
        }

        const expectedWorkers = await waitForWorkersByURL(
          registeredWorkers,
          WORKER_URL,
          2
        );

        const workerIds = expectedWorkers.map(w => w.id);
        is(
          new Set(workerIds).size,
          2,
          "Workers from different tabs have unique ids"
        );

        const windowId1 =
          browser1.browsingContext.currentWindowGlobal.innerWindowId;
        const worker1 = expectedWorkers.find(w => w.windowIDs[0] === windowId1);
        ok(worker1, "Found a worker corresponding to the first tab");
        assertWorkerData(worker1, {
          alreadyRegistered: delayListenerRegistration,
          type: Ci.nsIWorkerDebugger.TYPE_DEDICATED,
          windowIDs: [windowId1],
          url: WORKER_URL,
        });

        const windowId2 =
          browser2.browsingContext.currentWindowGlobal.innerWindowId;
        const worker2 = expectedWorkers.find(w => w.windowIDs[0] === windowId2);
        ok(worker2, "Found a worker corresponding to the second tab");
        assertWorkerData(worker2, {
          alreadyRegistered: delayListenerRegistration,
          type: Ci.nsIWorkerDebugger.TYPE_DEDICATED,
          windowIDs: [windowId2],
          url: WORKER_URL,
        });

        info("Reload the first tab to unregister the worker from this tab");
        gBrowser.selectedTab = tab1;
        BrowserCommands.reload();

        await waitForWorkersByIds(unregisteredWorkers, [worker1.id], 1);

        info("Reload the second tab to unregister the worker from this tab");
        gBrowser.selectedTab = tab2;
        BrowserCommands.reload();

        await waitForWorkersByIds(unregisteredWorkers, [worker2.id], 1);
      }
    );
  }

  it("Handles mixed scenario with workers before and after registration", async function test_mixedScenario() {
    info("Create and select a new tab");
    const tab = BrowserTestUtils.addTab(gBrowser, WORKER_TEST_PAGE);
    gBrowser.selectedTab = tab;
    const browser = tab.linkedBrowser;
    await BrowserTestUtils.browserLoaded(browser);

    info("Create 2 workers BEFORE registration");
    await SpecialPowers.spawn(browser, [], () => {
      content.worker1 = new content.Worker(
        "data:text/javascript,postMessage('before1')"
      );
      content.worker2 = new content.Worker(
        "data:text/javascript,postMessage('before2')"
      );
    });

    info("Register the actor (should find 2 pre-existing workers)");
    registerWebDriverWorkerListenerActor();

    info("Wait for 2 pre-existing workers to be detected");
    const preExistingWorkers = await waitForWorkersByURL(
      registeredWorkers,
      url => url.startsWith("data:text/javascript"),
      2
    );

    for (const worker of preExistingWorkers) {
      assertWorkerData(worker, {
        alreadyRegistered: true,
        type: Ci.nsIWorkerDebugger.TYPE_DEDICATED,
        windowIDs: [browser.browsingContext.currentWindowGlobal.innerWindowId],
        checkUrl: url => url.startsWith("data:text/javascript"),
      });
    }

    info("Create 2 more workers after registration");
    await SpecialPowers.spawn(browser, [], () => {
      content.worker3 = new content.Worker(
        "data:text/javascript,postMessage('after1')"
      );
      content.worker4 = new content.Worker(
        "data:text/javascript,postMessage('after2')"
      );
    });

    info("Wait for all 4 workers (2 before + 2 after)");
    const expectedWorkers = await waitForWorkersByURL(
      registeredWorkers,
      url => url.startsWith("data:text/javascript"),
      4
    );

    const workerIds = expectedWorkers.map(w => w.id);
    is(new Set(workerIds).size, 4, "All workers have unique IDs");

    const newWorkers = expectedWorkers.filter(
      w => !preExistingWorkers.includes(w)
    );
    for (const worker of newWorkers) {
      assertWorkerData(worker, {
        alreadyRegistered: false,
        type: Ci.nsIWorkerDebugger.TYPE_DEDICATED,
        windowIDs: [browser.browsingContext.currentWindowGlobal.innerWindowId],
        checkUrl: url => url.startsWith("data:text/javascript"),
      });
    }

    const workersFromAPI = workerListenerRegistry
      .getWorkers()
      .filter(w => w.url.startsWith("data:text/javascript"));
    is(workersFromAPI.length, 4, "getWorkers() returns all 4 workers");

    info("Reload the selected tab to unregister all workers");
    BrowserCommands.reload();

    await BrowserTestUtils.waitForCondition(
      () =>
        unregisteredWorkers.filter(w => workerIds.includes(w.id)).length === 4,
      "Wait for all 4 workers to be unregistered"
    );
  });

  it("Detects pre-existing worker in background (non-selected) tab", async function test_backgroundTabWorker() {
    info("Create background tab with worker");
    const backgroundTab = BrowserTestUtils.addTab(gBrowser, WORKER_TEST_PAGE);
    const backgroundBrowser = backgroundTab.linkedBrowser;
    await BrowserTestUtils.browserLoaded(backgroundBrowser);

    info("Create foreground tab (select it)");
    const foregroundTab = BrowserTestUtils.addTab(gBrowser, TEST_PAGE);
    gBrowser.selectedTab = foregroundTab;
    await BrowserTestUtils.browserLoaded(foregroundTab.linkedBrowser);

    info("Create worker in background tab BEFORE registration");
    await SpecialPowers.spawn(backgroundBrowser, [], () => {
      content.wrappedJSObject.registerWorker();
    });

    info("Wait for worker to be registered in WorkerDebuggerManager");
    await SpecialPowers.spawn(backgroundBrowser, [], async () => {
      await content.wrappedJSObject.onWorkerReady;
    });

    info("Register the listener after the worker started in background tab");
    registerWebDriverWorkerListenerActor();

    info("Wait for worker from background tab");
    const expectedWorkers = await waitForWorkersByURL(
      registeredWorkers,
      WORKER_URL,
      1
    );

    assertWorkerData(expectedWorkers[0], {
      alreadyRegistered: true,
      type: Ci.nsIWorkerDebugger.TYPE_DEDICATED,
      windowIDs: [
        backgroundBrowser.browsingContext.currentWindowGlobal.innerWindowId,
      ],
      url: WORKER_URL,
    });

    // Check that getWorkers also contains the expected worker
    const expectedWorkersFromAPI = workerListenerRegistry
      .getWorkers()
      .filter(w => w.url === WORKER_URL);
    is(
      expectedWorkersFromAPI.length,
      1,
      "getWorkers() also contains one worker for the expected URL"
    );
    assertWorkerData(expectedWorkersFromAPI[0], expectedWorkers[0]);

    info("Reload the tab to unregister the worker");
    gBrowser.selectedTab = backgroundTab;
    BrowserCommands.reload();
    await waitForWorkersByIds(unregisteredWorkers, [expectedWorkers[0].id], 1);
  });
});
