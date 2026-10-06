/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const SUPPORT_FILES_PATH =
  "browser/browser/components/enterprisepolicies/tests/browser";
const BLOCKED_PAGE = "policy_websitefilter_block.html";
const EXCEPTION_PAGE = "policy_websitefilter_exception.html";
const SAVELINKAS_PAGE = "policy_websitefilter_savelink.html";

const { SpecialPowersForProcess } = ChromeUtils.importESModule(
  "resource://testing-common/SpecialPowersProcessActor.sys.mjs"
);

const scope = this;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.ipc.keepProcessesAlive.web", 0],
      ["dom.ipc.processPreload.enabled", false],
    ],
  });
});

function unregisterServiceWorker(registrationInfo) {
  let { promise, resolve, reject } = Promise.withResolvers();

  Cc["@mozilla.org/serviceworkers/manager;1"]
    .getService(Ci.nsIServiceWorkerManager)
    .unregister(
      registrationInfo.principal,
      {
        unregisterSucceeded: resolve,
        unregisterFailed: reject,
      },
      registrationInfo.scope
    );

  return promise;
}

function waitForProcessShutdown(domProcess) {
  info(`Waiting for DOM process ${domProcess.remoteType} to shutdown`);

  let shutdownPromise = new Promise(resolve => {
    Services.obs.addObserver(function obs(subject) {
      if (
        subject.QueryInterface(Ci.nsIPropertyBag2).getProperty("childID") ==
        domProcess.childID
      ) {
        Services.obs.removeObserver(obs, "ipc:content-shutdown");
        info(`DOM process ${domProcess.remoteType} has shut down`);
        resolve();
      }
    }, "ipc:content-shutdown");
  });

  let ProcessTools = Cc["@mozilla.org/processtools-service;1"].getService(
    Ci.nsIProcessToolsService
  );
  try {
    ProcessTools.kill(domProcess.osPid);
  } catch (e) {
    console.error(e);
  }

  return shutdownPromise;
}

async function waitForProcessesShutdown(origin) {
  let swm = Cc["@mozilla.org/serviceworkers/manager;1"].getService(
    Ci.nsIServiceWorkerManager
  );
  let registrations = swm.getAllRegistrations();
  for (let i = 0; i < registrations.length; i++) {
    let registrationInfo = registrations.queryElementAt(
      i,
      Ci.nsIServiceWorkerRegistrationInfo
    );
    if (registrationInfo.principal?.originNoSuffix == origin) {
      registrationInfo.forceShutdown();
      await unregisterServiceWorker(registrationInfo);
    }
  }

  Services.ppmm.releaseCachedProcesses();

  await Promise.all(
    ChromeUtils.getAllDOMProcesses()
      .filter(p => p.remoteType?.includes(origin))
      .map(waitForProcessShutdown)
  );

  let processes = ChromeUtils.getAllDOMProcesses().filter(p =>
    p.remoteType?.includes(origin)
  );
  Assert.equal(
    processes.length,
    0,
    "Should have shut down the cached processes"
  );
}

function isJitDisabledForRemoteType(remoteType) {
  return (
    remoteType.endsWith("^disableJit=1") || remoteType.endsWith("&disableJit=1")
  );
}

function assertJitStateForRemoteType(remoteType, expectedJitDisabled, message) {
  Assert.equal(
    isJitDisabledForRemoteType(remoteType),
    expectedJitDisabled,
    message
  );
}

function assertJitStateForBrowsingContext(
  browsingContext,
  expectedJitDisabled,
  message
) {
  assertJitStateForRemoteType(
    browsingContext.currentRemoteType,
    expectedJitDisabled,
    message
  );
}

async function checkJitForURL(url, expectedJitDisabled) {
  await BrowserTestUtils.withNewTab(url, browser => {
    assertJitStateForBrowsingContext(
      browser.browsingContext,
      expectedJitDisabled,
      "Expected the JIT status to match expected"
    );
  });
}

async function verifyWorkers(
  browsingContext,
  origin,
  expectJitDisabled,
  siteJitDisabled
) {
  await TestUtils.waitForCondition(() => {
    return SpecialPowers.spawn(browsingContext, [], () => {
      return (
        content.document.getElementById("service-worker-status").textContent ==
          "service-worker-success" &&
        content.document.getElementById("shared-worker-status").textContent ==
          "shared-worker-success"
      );
    });
  }, "Waiting for workers to respond");

  let processes = ChromeUtils.getAllDOMProcesses();
  let webProcesses = processes.filter(p =>
    p.remoteType?.startsWith(`webIsolated=${origin}`)
  );
  let serviceWorkerProcesses = processes.filter(p =>
    p.remoteType?.startsWith(`webServiceWorker=${origin}`)
  );

  if (expectJitDisabled == siteJitDisabled) {
    // Shared workers should run in the same process as the web content if the JIT state matches.
    Assert.equal(
      webProcesses.length,
      1,
      `Should be one web isolated process for ${origin}`
    );
    assertJitStateForRemoteType(
      webProcesses[0].remoteType,
      expectJitDisabled,
      `Expected JIT state to be correct for the shared worker for ${origin}`
    );
  } else {
    // If the JIT state doesn't match, the shared worker should run in a different process.
    Assert.equal(
      webProcesses.length,
      2,
      `Should be two web isolated processes for ${origin}`
    );

    assertJitStateForBrowsingContext(
      browsingContext,
      siteJitDisabled,
      `Expected JIT state to be correct for the webpage ${origin}`
    );

    // The shared worker should be the other process and should have the opposite JIT state.
    Assert.notEqual(
      isJitDisabledForRemoteType(webProcesses[0].remoteType),
      isJitDisabledForRemoteType(webProcesses[1].remoteType),
      "JIT state should differ between the two web isolated processes"
    );
  }

  // Service workers always run in their own process.
  Assert.equal(
    serviceWorkerProcesses.length,
    1,
    `Should be one service worker process for ${origin}`
  );
  assertJitStateForRemoteType(
    serviceWorkerProcesses[0].remoteType,
    expectJitDisabled,
    `Expected JIT state to be correct in the service worker process for ${origin}`
  );
}

add_task(async function test_pages() {
  await setupPolicyEngineWithJson({
    policies: {
      SitePolicies: [
        {
          // eslint-disable-next-line @microsoft/sdl/no-insecure-url
          Match: ["*.example.com"],
          Policies: { DisableJit: true },
        },
      ],
    },
  });

  await BrowserTestUtils.withNewTab("https://example.com/", async browser => {
    assertJitStateForBrowsingContext(
      browser.browsingContext,
      true,
      "Expected the JIT to be disabled for example.com"
    );

    let loaded = BrowserTestUtils.browserLoaded(browser);
    BrowserTestUtils.startLoadingURIString(browser, "https://example.org/");
    await loaded;

    assertJitStateForBrowsingContext(
      browser.browsingContext,
      false,
      "Expected the JIT to be enabled for example.org"
    );

    loaded = BrowserTestUtils.browserLoaded(browser);
    BrowserTestUtils.startLoadingURIString(browser, "https://example.com/");
    await loaded;

    assertJitStateForBrowsingContext(
      browser.browsingContext,
      true,
      "Expected the JIT to be disabled for example.com"
    );
  });

  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  await BrowserTestUtils.withNewTab("http://example.com/", browser => {
    assertJitStateForBrowsingContext(
      browser.browsingContext,
      true,
      "Expected the JIT to be disabled for example.com"
    );
  });

  await BrowserTestUtils.withNewTab("https://example.org/", browser => {
    assertJitStateForBrowsingContext(
      browser.browsingContext,
      false,
      "Expected the JIT to be enabled for example.org"
    );
  });

  // Test that inner frames take on the state of the top frame
  await BrowserTestUtils.withNewTab(
    `https://example.com/${SUPPORT_FILES_PATH}/framed.html`,
    async browser => {
      assertJitStateForBrowsingContext(
        browser.browsingContext,
        true,
        "Expected the JIT to be disabled for example.com"
      );

      Assert.equal(
        browser.browsingContext.children.length,
        1,
        "Should be a child frame"
      );
      let inner = browser.browsingContext.children[0];
      assertJitStateForBrowsingContext(
        inner,
        true,
        "Expected JIT to be disabled in the inner frame"
      );
    }
  );
});

add_task(async function test_workers_no_policy() {
  await setupPolicyEngineWithJson({
    policies: {
      SitePolicies: [
        {
          // eslint-disable-next-line @microsoft/sdl/no-insecure-url
          Match: ["*.example.com"],
          Policies: {},
        },
      ],
    },
  });

  await waitForProcessesShutdown("https://example.com");
  await waitForProcessesShutdown("https://example.org");

  await BrowserTestUtils.withNewTab(
    `https://example.com/${SUPPORT_FILES_PATH}/worker.html`,
    async browser => {
      await verifyWorkers(
        browser.browsingContext,
        "https://example.com",
        false,
        false
      );
    }
  );

  await waitForProcessesShutdown("https://example.com");

  await BrowserTestUtils.withNewTab(
    `https://example.org/${SUPPORT_FILES_PATH}/worker.html`,
    async browser => {
      await verifyWorkers(
        browser.browsingContext,
        "https://example.org",
        false,
        false
      );
    }
  );

  await waitForProcessesShutdown("https://example.org");

  await BrowserTestUtils.withNewTab(
    `https://example.com/${SUPPORT_FILES_PATH}/framed_worker.html`,
    async browser => {
      Assert.equal(
        browser.browsingContext.children.length,
        1,
        "Should be a child frame"
      );
      let inner = browser.browsingContext.children[0];
      await verifyWorkers(inner, "https://example.org", false, false);
    }
  );

  await waitForProcessesShutdown("https://example.org");
});

add_task(async function test_workers_with_policy() {
  await setupPolicyEngineWithJson({
    policies: {
      SitePolicies: [
        {
          // eslint-disable-next-line @microsoft/sdl/no-insecure-url
          Match: ["*.example.com"],
          Policies: { DisableJit: true },
        },
      ],
    },
  });

  await waitForProcessesShutdown("https://example.com");
  await waitForProcessesShutdown("https://example.org");

  await BrowserTestUtils.withNewTab(
    `https://example.com/${SUPPORT_FILES_PATH}/worker.html`,
    async browser => {
      await verifyWorkers(
        browser.browsingContext,
        "https://example.com",
        true,
        true
      );
    }
  );

  await waitForProcessesShutdown("https://example.com");

  await BrowserTestUtils.withNewTab(
    `https://example.org/${SUPPORT_FILES_PATH}/worker.html`,
    async browser => {
      await verifyWorkers(
        browser.browsingContext,
        "https://example.org",
        false,
        false
      );
    }
  );

  await waitForProcessesShutdown("https://example.org");

  await BrowserTestUtils.withNewTab(
    `https://example.com/${SUPPORT_FILES_PATH}/framed_worker.html`,
    async browser => {
      Assert.equal(
        browser.browsingContext.children.length,
        1,
        "Should be a child frame"
      );
      let inner = browser.browsingContext.children[0];
      await verifyWorkers(inner, "https://example.org", false, true);
    }
  );

  await waitForProcessesShutdown("https://example.org");
});
