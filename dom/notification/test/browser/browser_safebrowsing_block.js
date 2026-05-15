"use strict";

const { PermissionTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PermissionTestUtils.sys.mjs"
);

const { UrlClassifierTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/UrlClassifierTestUtils.sys.mjs"
);

const PHISH_TABLE = "moztest-phish-simple";
const DYNAMIC_PHISH_TABLE = "mochitest-phish-simple";
const PHISH_URL = "https://www.itisatrap.org/firefox/its-a-trap.html";
const NORMAL_URL =
  "https://example.com/browser/dom/notification/test/browser/file_safebrowsing_test.html";
const PERMISSION_NAME = "desktop-notification";

async function getTelemetryRate() {
  await Services.fog.testFlushAllChildren();
  return (
    Glean.webNotification.showSafeBrowsingBlock.testGetValue() ?? {
      numerator: 0,
      denominator: 0,
    }
  );
}

function waitForDBInit() {
  let principal = Services.scriptSecurityManager.createContentPrincipal(
    Services.io.newURI(PHISH_URL),
    {}
  );
  let dbService = Cc["@mozilla.org/url-classifier/dbservice;1"].getService(
    Ci.nsIUrlClassifierDBService
  );

  return BrowserTestUtils.waitForCondition(
    () =>
      new Promise(resolve => {
        dbService.lookup(principal, PHISH_TABLE, value => {
          resolve(value === PHISH_TABLE);
        });
      }),
    "DB lookup confirmed phishing URL is in table"
  );
}

function addHostToPhishingTable(host) {
  let entry = host + "/";
  let updateData = `n:1000\ni:${DYNAMIC_PHISH_TABLE}\nad:1\na:1:32:${entry.length}\n${entry}\n`;

  return UrlClassifierTestUtils.useTestDatabase({
    pref: "urlclassifier.phishTable",
    name: DYNAMIC_PHISH_TABLE,
    update: updateData,
  });
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["urlclassifier.phishTable", PHISH_TABLE],
      ["browser.safebrowsing.phishing.enabled", true],
      ["dom.webnotifications.block_if_on_safebrowsing", true],
    ],
  });

  SafeBrowsing.init();
  await waitForDBInit();
});

// Test 1: Normal site registers SW, sends notification - should succeed.
// This is a control test ensuring notifications work for non-phishing sites.
// Also verifies telemetry: denominator increments, numerator does not.
add_task(async function test_sw_notification_allowed_for_normal_site() {
  Services.fog.testResetFOG();

  let normalPrincipal = Services.scriptSecurityManager.createContentPrincipal(
    Services.io.newURI("https://example.com"),
    {}
  );

  PermissionTestUtils.add(
    normalPrincipal,
    PERMISSION_NAME,
    Services.perms.ALLOW_ACTION
  );

  // Step 1 & 2: Visit page and register service worker
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: NORMAL_URL,
    },
    async browser => {
      let result = await SpecialPowers.spawn(browser, [], async () => {
        await content.navigator.serviceWorker.register(
          "file_safebrowsing_test.serviceworker.js"
        );
        const reg = await content.navigator.serviceWorker.ready;

        return new Promise(resolve => {
          content.navigator.serviceWorker.onmessage = event => {
            resolve(event.data);
          };
          reg.active.postMessage("show-notification");
        });
      });

      ok(result.success, "Service worker notification should succeed");
    }
  );

  // Verify permission is still intact
  is(
    PermissionTestUtils.testPermission(normalPrincipal, PERMISSION_NAME),
    Services.perms.ALLOW_ACTION,
    "Permission should still be granted for normal site"
  );

  // Verify telemetry: denominator should be 1, numerator should be 0
  let rate = await getTelemetryRate();
  is(rate.denominator, 1, "Denominator should be 1 (one notification checked)");
  is(rate.numerator, 0, "Numerator should be 0 (no notifications blocked)");

  // Cleanup
  await SpecialPowers.removeAllServiceWorkerData();
  PermissionTestUtils.remove(normalPrincipal, PERMISSION_NAME);
});

// Test 2: Site registers SW when clean, then becomes phishing, then tries to
// send notification via SW - should be blocked and permission revoked.
// This is the key scenario we're protecting against.
// Also verifies telemetry: both numerator and denominator increment.
add_task(
  async function test_sw_notification_blocked_when_site_becomes_phishing() {
    Services.fog.testResetFOG();

    let testOrigin = "https://example.com";
    let testPrincipal = Services.scriptSecurityManager.createContentPrincipal(
      Services.io.newURI(testOrigin),
      {}
    );

    // Grant notification permission (simulating user granted permission when
    // site was clean)
    PermissionTestUtils.add(
      testPrincipal,
      PERMISSION_NAME,
      Services.perms.ALLOW_ACTION
    );

    // Step 1 & 2: Visit clean page and register service worker
    await BrowserTestUtils.withNewTab(
      {
        gBrowser,
        url: NORMAL_URL,
      },
      async browser => {
        await SpecialPowers.spawn(browser, [], async () => {
          await content.navigator.serviceWorker.register(
            "file_safebrowsing_test.serviceworker.js"
          );
          await content.navigator.serviceWorker.ready;
        });
      }
    );
    // Step 3: Tab is now closed (withNewTab closes it)

    // Step 4: Site becomes phishing - add example.com to phishing table
    info("Adding example.com to phishing table");
    await addHostToPhishingTable("example.com");

    // Verify the URL is now in the phishing table
    let dbService = Cc["@mozilla.org/url-classifier/dbservice;1"].getService(
      Ci.nsIUrlClassifierDBService
    );
    let lookupResult = await new Promise(resolve => {
      dbService.lookup(testPrincipal, DYNAMIC_PHISH_TABLE, value => {
        resolve(value);
      });
    });
    is(
      lookupResult,
      DYNAMIC_PHISH_TABLE,
      "example.com should now be in phishing table"
    );

    // Verify permission is still there before we try the notification
    is(
      PermissionTestUtils.testPermission(testPrincipal, PERMISSION_NAME),
      Services.perms.ALLOW_ACTION,
      "Permission should still be granted before notification attempt"
    );

    // Step 5: SW tries to send notification (no tabs open).
    // We need to trigger the SW to send a notification. We can do this by
    // opening a new tab to the same origin and messaging the SW.
    await BrowserTestUtils.withNewTab(
      {
        gBrowser,
        url: NORMAL_URL,
      },
      async browser => {
        let result = await SpecialPowers.spawn(browser, [], async () => {
          const reg = await content.navigator.serviceWorker.ready;

          return new Promise(resolve => {
            content.navigator.serviceWorker.onmessage = event => {
              resolve(event.data);
            };
            reg.active.postMessage("show-notification");
          });
        });

        ok(
          !result.success,
          "Service worker notification should fail for phishing site"
        );
        is(
          result.error,
          "Permission to show Notification denied.",
          "Error message should be generic permission denial"
        );
      }
    );

    // Verify permission was revoked
    is(
      PermissionTestUtils.testPermission(testPrincipal, PERMISSION_NAME),
      Services.perms.UNKNOWN_ACTION,
      "Permission should be revoked after Safe Browsing block"
    );

    // Verify telemetry: both numerator and denominator should be 1
    let rate = await getTelemetryRate();
    is(
      rate.denominator,
      1,
      "Denominator should be 1 (one notification checked)"
    );
    is(rate.numerator, 1, "Numerator should be 1 (one notification blocked)");

    // Cleanup
    await SpecialPowers.removeAllServiceWorkerData();
    PermissionTestUtils.remove(testPrincipal, PERMISSION_NAME);
    Services.prefs.setCharPref("urlclassifier.phishTable", PHISH_TABLE);
  }
);
