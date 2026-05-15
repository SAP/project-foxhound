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

describe("WorkerListener for chrome worker", function () {
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
  });

  it("Emits expected events for a chrome worker", async function test_chromeWorker() {
    info("Register the worker listener actors");
    registerWebDriverWorkerListenerActor();

    info("Create a chrome worker from chrome context");
    const chromeWorker = new ChromeWorker(CHROME_WORKER_URL);

    info("Wait for the chrome worker to load");
    await new Promise(resolve => {
      chromeWorker.onmessage = e => {
        if (e.data === "chrome worker loaded") {
          resolve();
        }
      };
    });

    const [worker] = await waitForWorkersByURL(
      registeredWorkers,
      CHROME_WORKER_URL,
      1
    );

    assertWorkerData(worker, {
      type: Ci.nsIWorkerDebugger.TYPE_DEDICATED,
      url: CHROME_WORKER_URL,
      isChrome: true,
    });

    info("Terminate the chrome worker");
    chromeWorker.terminate();

    await waitForWorkersByIds(unregisteredWorkers, [worker.id], 1);
  });
});
