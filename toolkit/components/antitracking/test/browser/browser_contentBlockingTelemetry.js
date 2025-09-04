/**
 * Bug 1668199 - Testing the content blocking telemetry.
 */

"use strict";

const { TelemetryTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TelemetryTestUtils.sys.mjs"
);
const LABEL_STORAGE_GRANTED = 0;
const LABEL_STORAGE_ACCESS_API = 1;
const LABEL_OPENER_AFTER_UI = 2;
const LABEL_OPENER = 3;
const LABEL_REDIRECT = 4;
const LABEL_REDIRECT_TRACKER = 5;
const LABEL_NAVIGATION = 6;
const LABEL_CT_OFFSET = 7;

function clearTelemetry() {
  Services.telemetry.getSnapshotForHistograms("main", true /* clear */);
  Services.telemetry.getHistogramById("STORAGE_ACCESS_REMAINING_DAYS").clear();
}

async function cleanup() {
  await new Promise(resolve => {
    Services.clearData.deleteData(Ci.nsIClearDataService.CLEAR_ALL, () =>
      resolve()
    );
  });
}

function getExpectedExpiredDaysFromPref(pref) {
  let expiredSecond = Services.prefs.getIntPref(pref);

  // This is unlikely to happen, but just in case.
  if (expiredSecond <= 0) {
    return 0;
  }

  // We need to subtract one second from the expect expired second because there
  // will be a short delay between the time we add the permission and the time
  // we record the telemetry. Subtracting one can help us to get the correct
  // expected expired days.
  //
  // Note that 86400 is seconds in one day.
  return Math.trunc((expiredSecond - 1) / 86400);
}

async function testTelemetry(
  aProbeInParent,
  aExpectedCnt,
  aExpectedCntTracker,
  aLabel,
  aExpectedIdx
) {
  info("Trigger the 'idle-daily' to trigger the telemetry probe.");
  // Synthesis a fake 'idle-daily' notification to the content blocking
  // telemetry service.
  let cbts = Cc["@mozilla.org/content-blocking-telemetry-service;1"].getService(
    Ci.nsIObserver
  );
  cbts.observe(null, "idle-daily", null);

  let storageAccessGrantedHistogram;

  // Wait until the telemetry probe appears.
  await BrowserTestUtils.waitForCondition(() => {
    let histograms;
    if (aProbeInParent) {
      histograms = Services.telemetry.getSnapshotForHistograms(
        "main",
        false /* clear */
      ).parent;
    } else {
      histograms = Services.telemetry.getSnapshotForHistograms(
        "main",
        false /* clear */
      ).content;
    }
    storageAccessGrantedHistogram = histograms.STORAGE_ACCESS_GRANTED_COUNT;
    return (
      !!storageAccessGrantedHistogram &&
      storageAccessGrantedHistogram.values[LABEL_STORAGE_GRANTED] ==
        aExpectedCnt &&
      storageAccessGrantedHistogram.values[
        LABEL_STORAGE_GRANTED + LABEL_CT_OFFSET
      ] == aExpectedCntTracker
    );
  });

  is(
    storageAccessGrantedHistogram.values[LABEL_STORAGE_GRANTED],
    aExpectedCnt,
    "There should be expected storage access granted count in telemetry."
  );
  is(
    storageAccessGrantedHistogram.values[aLabel],
    1,
    "There should be one reason count in telemetry."
  );

  is(
    storageAccessGrantedHistogram.values[
      LABEL_STORAGE_GRANTED + LABEL_CT_OFFSET
    ],
    aExpectedCntTracker,
    "There should be expected storage access granted count in telemetry."
  );
  is(
    storageAccessGrantedHistogram.values[aLabel + LABEL_CT_OFFSET],
    1,
    "There should be one reason count in telemetry."
  );

  let storageAccessRemainingDaysHistogram = Services.telemetry.getHistogramById(
    "STORAGE_ACCESS_REMAINING_DAYS"
  );

  TelemetryTestUtils.assertHistogram(
    storageAccessRemainingDaysHistogram,
    aExpectedIdx,
    1
  );

  // Clear telemetry probes
  clearTelemetry();
  await cleanup();
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.cookie.cookieBehavior", BEHAVIOR_REJECT_TRACKER],
      ["network.cookie.cookieBehavior.pbmode", BEHAVIOR_REJECT_TRACKER],
      ["privacy.trackingprotection.annotate_channels", true],
      [
        "privacy.restrict3rdpartystorage.userInteractionRequiredForHosts",
        "tracking.example.com,tracking.example.org",
      ],
      ["toolkit.telemetry.ipcBatchTimeout", 0],
      // Explicity set the expiration time to 29 days to avoid an intermittent
      // issue that we could get 30 days of expiration time if we test the
      // telemetry too soon.
      ["privacy.restrict3rdpartystorage.expiration", 2591999],
      ["privacy.restrict3rdpartystorage.expiration_redirect", 2591999],
    ],
  });

  // Clear Telemetry probes before testing.
  // There can be telemetry race conditions if the previous test generates
  // content blocking telemetry.
  // See Bug 1686836, Bug 1686894.
  clearTelemetry();

  await UrlClassifierTestUtils.addTestTrackers();
  registerCleanupFunction(_ => {
    Services.perms.removeAll();
    UrlClassifierTestUtils.cleanupTestTrackers();
  });
});

add_task(async function testTelemetryForStorageAccessAPI() {
  info("Starting testing if storage access API send telemetry probe ...");

  // First, clear all permissions.
  Services.perms.removeAll();

  info("Creating a new tab");
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE
  );
  let browser = gBrowser.getBrowserForTab(tab);

  info("Loading the tracking iframe and call the RequestStorageAccess.");
  await SpecialPowers.spawn(
    browser,
    [
      {
        page: TEST_3RD_PARTY_PAGE_UI,
      },
    ],
    async obj => {
      let msg = {};
      msg.callback = (async _ => {
        /* import-globals-from storageAccessAPIHelpers.js */
        await callRequestStorageAccess();
      }).toString();

      await new content.Promise(resolve => {
        let ifr = content.document.createElement("iframe");
        ifr.onload = function () {
          info("Sending code to the 3rd party content");
          ifr.contentWindow.postMessage(msg, "*");
        };

        content.addEventListener("message", function msg(event) {
          if (event.data.type == "finish") {
            content.removeEventListener("message", msg);
            resolve();
            return;
          }

          if (event.data.type == "ok") {
            ok(event.data.what, event.data.msg);
            return;
          }

          if (event.data.type == "info") {
            info(event.data.msg);
            return;
          }

          ok(false, "Unknown message");
        });

        content.document.body.appendChild(ifr);
        ifr.src = obj.page;
      });
    }
  );

  info("Removing the tab");
  BrowserTestUtils.removeTab(tab);

  let expectedExpiredDays = getExpectedExpiredDaysFromPref(
    "privacy.restrict3rdpartystorage.expiration"
  );

  // The storage access permission will be expired in 29 days, so the expected
  // index in the telemetry probe would be 29.
  await testTelemetry(
    false,
    1,
    1,
    LABEL_STORAGE_ACCESS_API,
    expectedExpiredDays
  );
  await cleanup();
});

add_task(async function testTelemetryForWindowOpenHeuristic() {
  info("Starting testing if window open heuristic send telemetry probe ...");

  // First, clear all permissions.
  Services.perms.removeAll();

  info("Creating a new tab");
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE
  );
  let browser = gBrowser.getBrowserForTab(tab);

  info("Loading the tracking iframe and trigger the heuristic");
  await SpecialPowers.spawn(
    browser,
    [
      {
        page: TEST_3RD_PARTY_PAGE_WO,
      },
    ],
    async obj => {
      let msg = {};
      msg.blockingCallback = (async _ => {
        /* import-globals-from storageAccessAPIHelpers.js */
        await noStorageAccessInitially();
      }).toString();

      msg.nonBlockingCallback = (async _ => {
        /* import-globals-from storageAccessAPIHelpers.js */
        await hasStorageAccessInitially();
      }).toString();

      info("Checking if storage access is denied");
      await new content.Promise(resolve => {
        let ifr = content.document.createElement("iframe");
        ifr.onload = function () {
          info("Sending code to the 3rd party content");
          ifr.contentWindow.postMessage(msg, "*");
        };

        content.addEventListener("message", function msg(event) {
          if (event.data.type == "finish") {
            content.removeEventListener("message", msg);
            resolve();
            return;
          }

          if (event.data.type == "ok") {
            ok(event.data.what, event.data.msg);
            return;
          }

          if (event.data.type == "info") {
            info(event.data.msg);
            return;
          }

          ok(false, "Unknown message");
        });

        content.document.body.appendChild(ifr);
        ifr.src = obj.page;
      });
    }
  );

  info("Removing the tab");
  BrowserTestUtils.removeTab(tab);

  let expectedExpiredDays = getExpectedExpiredDaysFromPref(
    "privacy.restrict3rdpartystorage.expiration"
  );

  // The storage access permission will be expired in 29 days, so the expected
  // index in the telemetry probe would be 29.
  await testTelemetry(false, 1, 1, LABEL_OPENER, expectedExpiredDays);
  await cleanup();
});

add_task(async function testTelemetryForUserInteractionHeuristic() {
  info(
    "Starting testing if UserInteraction heuristic send telemetry probe ..."
  );
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "privacy.restrict3rdpartystorage.heuristic.opened_window_after_interaction",
        true,
      ],
    ],
  });

  // First, clear all permissions.
  Services.perms.removeAll();

  info("Creating a new tab");
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE
  );
  let browser = gBrowser.getBrowserForTab(tab);

  info("Interact with the tracker in top-level.");
  await AntiTracking.interactWithTracker();

  info("Loading the tracking iframe and trigger the heuristic");
  await SpecialPowers.spawn(
    browser,
    [
      {
        page: TEST_3RD_PARTY_PAGE_UI,
        popup: TEST_POPUP_PAGE,
      },
    ],
    async obj => {
      let msg = {};
      msg.blockingCallback = (async _ => {
        await noStorageAccessInitially();
      }).toString();

      msg.nonBlockingCallback = (async _ => {
        /* import-globals-from storageAccessAPIHelpers.js */
        await hasStorageAccessInitially();
      }).toString();

      let ifr = content.document.createElement("iframe");
      let loading = new content.Promise(resolve => {
        ifr.onload = resolve;
      });
      content.document.body.appendChild(ifr);
      ifr.src = obj.page;
      await loading;

      info("Opening a window from the iframe.");
      await SpecialPowers.spawn(ifr, [obj.popup], async popup => {
        let windowClosed = new content.Promise(resolve => {
          Services.ww.registerNotification(
            function notification(aSubject, aTopic) {
              // We need to check the document URI here as well for the same
              // reason above.
              if (
                aTopic == "domwindowclosed" &&
                aSubject.document.documentURI ==
                  "https://tracking.example.org/browser/toolkit/components/antitracking/test/browser/3rdPartyOpenUI.html"
              ) {
                Services.ww.unregisterNotification(notification);
                resolve();
              }
            }
          );
        });

        content.open(popup);

        info("Let's wait for the window to be closed");
        await windowClosed;
      });
    }
  );

  info("Removing the tab");
  BrowserTestUtils.removeTab(tab);

  let expectedExpiredDays = getExpectedExpiredDaysFromPref(
    "privacy.restrict3rdpartystorage.expiration"
  );

  // The storage access permission will be expired in 29 days, so the expected
  // index in the telemetry probe would be 29.
  //
  // Note that the expected count here is 2. It's because the opener heuristic
  // will also be triggered when triggered UserInteraction Heuristic.
  await testTelemetry(false, 2, 2, LABEL_OPENER_AFTER_UI, expectedExpiredDays);
  await cleanup();
});

add_task(async function testTelemetryForNavigationHeuristic() {
  info("Starting testing if navigation heuristic send telemetry probe ...");

  const TEST_TRACKING_PAGE = TEST_3RD_PARTY_DOMAIN + TEST_PATH + "page.html";

  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.restrict3rdpartystorage.heuristic.recently_visited", false],
      [
        "privacy.restrict3rdpartystorage.heuristic.opened_window_after_interaction",
        false,
      ],
      ["privacy.restrict3rdpartystorage.heuristic.window_open", false],
      ["privacy.restrict3rdpartystorage.heuristic.redirect", false],
      ["privacy.restrict3rdpartystorage.heuristic.navigation", true],
    ],
  });

  // First, clear all permissions.
  Services.perms.removeAll();

  info("Creating a new tab");
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE_HTTPS
  );
  let browser = gBrowser.getBrowserForTab(tab);

  info("Navigate to the tracking page.");
  await SpecialPowers.spawn(browser, [TEST_TRACKING_PAGE], async url => {
    content.document.userInteractionForTesting();

    let link = content.document.createElement("a");
    link.appendChild(content.document.createTextNode("click me!"));
    link.href = url;
    content.document.body.appendChild(link);
    link.click();
  });

  await BrowserTestUtils.browserLoaded(browser, false, TEST_TRACKING_PAGE);

  info("Navigate back to the first page.");
  await SpecialPowers.spawn(browser, [TEST_TOP_PAGE_HTTPS], async url => {
    content.document.userInteractionForTesting();

    let link = content.document.createElement("a");
    link.appendChild(content.document.createTextNode("click me!"));
    link.href = url;
    content.document.body.appendChild(link);
    link.click();
  });

  await BrowserTestUtils.browserLoaded(browser, false, TEST_TOP_PAGE_HTTPS);

  info("Removing the tab");
  BrowserTestUtils.removeTab(tab);

  let expectedExpiredDaysRedirect = getExpectedExpiredDaysFromPref(
    "privacy.restrict3rdpartystorage.expiration_redirect"
  );

  // We would only grant the storage permission for 29 days for the redirect
  // heuristic, so the expected index in the telemetry probe would be 29.
  await testTelemetry(
    true,
    1,
    1,
    LABEL_NAVIGATION,
    expectedExpiredDaysRedirect
  );
  await cleanup();
});

add_task(async function testTelemetryForRedirectHeuristic() {
  info("Starting testing if redirect heuristic send telemetry probe ...");

  const TEST_TRACKING_PAGE = TEST_3RD_PARTY_DOMAIN + TEST_PATH + "page.html";
  const TEST_REDIRECT_PAGE =
    TEST_3RD_PARTY_DOMAIN + TEST_PATH + "redirect.sjs?" + TEST_TOP_PAGE_HTTPS;

  // Perform per test setup
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.restrict3rdpartystorage.heuristic.redirect", true]],
  });

  // First, clear all permissions.
  Services.perms.removeAll();

  info("Creating a new tab");
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TRACKING_PAGE
  );
  let browser = gBrowser.getBrowserForTab(tab);

  info("Loading the tracking page and trigger the redirect.");
  SpecialPowers.spawn(browser, [TEST_REDIRECT_PAGE], async url => {
    content.document.userInteractionForTesting();

    let link = content.document.createElement("a");
    link.appendChild(content.document.createTextNode("click me!"));
    link.href = url;
    content.document.body.appendChild(link);
    link.click();
  });

  await BrowserTestUtils.browserLoaded(browser, false, TEST_TOP_PAGE_HTTPS);

  info("Removing the tab");
  BrowserTestUtils.removeTab(tab);

  let expectedExpiredDaysRedirect = getExpectedExpiredDaysFromPref(
    "privacy.restrict3rdpartystorage.expiration_redirect"
  );
  // We would only grant the storage permission for 29 days for the redirect
  // heuristic, so the expected index in the telemetry probe would be 29.

  await testTelemetry(
    true,
    1,
    1,
    LABEL_REDIRECT_TRACKER,
    expectedExpiredDaysRedirect
  );
  await cleanup();
});
