"use strict";

/* import-globals-from browser_head.js */
Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/dom/serviceworkers/test/browser_head.js",
  this
);

// ASRouter may hit "closed database" IDB errors when
// clearPrivateBrowsingData fires last-pb-context-exited while
// it is recording impressions in a PBM window.
const { PromiseTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PromiseTestUtils.sys.mjs"
);
PromiseTestUtils.allowMatchingRejectionsGlobally(
  /Can't start a transaction on a closed database/
);

const TEST_ORIGIN = "http://mochi.test:8888";
const PAGE_URL = `${TEST_ORIGIN}/${DIR_PATH}/empty_with_utils.html`;
const SW_SCRIPT = "empty.js";

let scopeCounter = 0;
function nextScope() {
  return `empty.html?pbm_cleanup_${scopeCounter++}`;
}

function getPBMRegistrationCount() {
  let count = 0;
  let regs = SWM.getAllRegistrations();
  for (let i = 0; i < regs.length; i++) {
    let reg = regs.queryElementAt(i, Ci.nsIServiceWorkerRegistrationInfo);
    if (reg.principal.originAttributes.privateBrowsingId === 1) {
      count++;
    }
  }
  return count;
}

add_setup(async function () {
  // testing.enabled is needed to allow SW registration on non-secure
  // (http://) origins used by the mochitest server.
  await SpecialPowers.pushPrefEnv({
    set: [["dom.serviceWorkers.testing.enabled", true]],
  });
});

async function registerPBMServiceWorker(scope) {
  let pbmWin = await BrowserTestUtils.openNewBrowserWindow({ private: true });
  let tab = await BrowserTestUtils.openNewForegroundTab(
    pbmWin.gBrowser,
    PAGE_URL
  );
  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [{ script: SW_SCRIPT, scope }],
    async function ({ script, scope }) {
      await content.wrappedJSObject.registerAndWaitForActive(script, scope);
    }
  );
  BrowserTestUtils.removeTab(tab);
  // Return the window so the caller can control when it closes.
  return pbmWin;
}

add_task(async function test_pbm_sw_removed_by_clearPrivateBrowsingData() {
  let scope = nextScope();
  let pbmWin = await registerPBMServiceWorker(scope);
  Assert.greaterOrEqual(
    getPBMRegistrationCount(),
    1,
    "PBM service worker registered"
  );

  let flags = await new Promise(resolve => {
    Services.clearData.clearPrivateBrowsingData({
      onDataDeleted(aFailedFlags) {
        resolve(aFailedFlags);
      },
    });
  });

  Assert.equal(flags, 0, "clearPrivateBrowsingData completed without failure");
  Assert.equal(
    getPBMRegistrationCount(),
    0,
    "PBM service worker removed after cleanup"
  );
  await BrowserTestUtils.closeWindow(pbmWin);
});

add_task(async function test_pbm_cleanup_preserves_normal_sw() {
  let pbmScope = nextScope();
  let normalScope = nextScope();

  // Register a normal SW first.
  let normalReg = await install_sw({
    origin: TEST_ORIGIN,
    script: SW_SCRIPT,
    scope: normalScope,
  });
  ok(normalReg, "Normal service worker registered");

  // Register a PBM SW.
  let pbmWin = await registerPBMServiceWorker(pbmScope);
  Assert.greaterOrEqual(
    getPBMRegistrationCount(),
    1,
    "PBM service worker registered"
  );

  let flags = await new Promise(resolve => {
    Services.clearData.clearPrivateBrowsingData({
      onDataDeleted(aFailedFlags) {
        resolve(aFailedFlags);
      },
    });
  });

  Assert.equal(flags, 0, "clearPrivateBrowsingData completed without failure");
  Assert.equal(
    getPBMRegistrationCount(),
    0,
    "PBM service worker removed after cleanup"
  );

  let normalCheck = swm_lookup_reg({
    origin: TEST_ORIGIN,
    script: SW_SCRIPT,
    scope: normalScope,
  });
  ok(normalCheck, "Normal service worker still registered after PBM cleanup");

  // Clean up.
  await BrowserTestUtils.closeWindow(pbmWin);
  let fullScope = `${TEST_ORIGIN}/${DIR_PATH}/${normalScope}`;
  await new Promise(resolve => {
    SWM.unregister(
      getPrincipal(fullScope),
      { unregisterSucceeded: resolve, unregisterFailed: resolve },
      fullScope
    );
  });
});

add_task(
  async function test_multiple_pbm_sw_removed_by_clearPrivateBrowsingData() {
    let scopes = [nextScope(), nextScope(), nextScope()];
    let pbmWin = await BrowserTestUtils.openNewBrowserWindow({ private: true });

    for (let scope of scopes) {
      let tab = await BrowserTestUtils.openNewForegroundTab(
        pbmWin.gBrowser,
        PAGE_URL
      );
      await SpecialPowers.spawn(
        tab.linkedBrowser,
        [{ script: SW_SCRIPT, scope }],
        async function ({ script, scope }) {
          await content.wrappedJSObject.registerAndWaitForActive(script, scope);
        }
      );
      BrowserTestUtils.removeTab(tab);
    }

    Assert.equal(
      getPBMRegistrationCount(),
      3,
      "All three PBM service workers registered"
    );

    let flags = await new Promise(resolve => {
      Services.clearData.clearPrivateBrowsingData({
        onDataDeleted(aFailedFlags) {
          resolve(aFailedFlags);
        },
      });
    });

    Assert.equal(
      flags,
      0,
      "clearPrivateBrowsingData completed without failure"
    );
    Assert.equal(
      getPBMRegistrationCount(),
      0,
      "All PBM service workers removed after cleanup"
    );
    await BrowserTestUtils.closeWindow(pbmWin);
  }
);

add_task(async function test_pbm_sw_removed_by_last_pb_context_exited() {
  let scope = nextScope();
  let pbmWin = await registerPBMServiceWorker(scope);
  Assert.greaterOrEqual(
    getPBMRegistrationCount(),
    1,
    "PBM service worker registered"
  );

  Services.obs.notifyObservers(null, "last-pb-context-exited");

  await BrowserTestUtils.waitForCondition(
    () => getPBMRegistrationCount() === 0,
    "PBM registrations removed after last-pb-context-exited"
  );
  await BrowserTestUtils.closeWindow(pbmWin);
});
