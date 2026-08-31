/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// We are using actual xpi files released in the wild, let's use the real cert
// checks for maximum realism.
AddonTestUtils.useRealCertChecks = true;

// We don't have an easy way to serve update manifests from a secure URL.
Services.prefs.setBoolPref(PREF_EM_CHECK_UPDATE_SECURITY, false);

// update_url from tabtweak-5.107-fx.xpi (decommissioned).
const UPDATE_URL_OLD =
  "https://addons.firefox.com.cn/chinaedition/addons/updates.json?reqVersion=%REQ_VERSION%&id=%ITEM_ID%&version=%ITEM_VERSION%&maxAppVersion=%ITEM_MAXAPPVERSION%&status=%ITEM_STATUS%&appID=%APP_ID%&appVersion=%APP_VERSION%&appOS=%APP_OS%&appABI=%APP_ABI%&locale=%APP_LOCALE%&currentAppVersion=%CURRENT_APP_VERSION%&updateType=%UPDATE_TYPE%&compatMode=%COMPATIBILITY_MODE%";
// update_url from tabtweak-6.202-fx.xpi.
const UPDATE_URL_NEW = "https://archive.mozilla.org/pub/cn_pack/addons.json";

// XPI of older version pointing to UPDATE_URL_OLD.
const OLD_XPI = do_get_file("data/cn_pack/tabtweak-5.107-fx.xpi");
const ADDON_ID = "tabtweak@mozillaonline.com";

const server = AddonTestUtils.createHttpServer({
  hosts: ["archive.mozilla.org"],
});
// data/cn_pack/addons.json has the actual response from UPDATE_URL_NEW
// (https://archive.mozilla.org/pub/cn_pack/addons.json), retrieved 2025-09-25.
server.registerFile(
  "/pub/cn_pack/addons.json",
  do_get_file("data/cn_pack/addons.json")
);
// This is the newer version of OLD_XPI.
server.registerFile(
  "/pub/cn_pack/addons/tabtweak/tabtweak-6.202-fx.xpi",
  do_get_file("data/cn_pack/tabtweak-6.202-fx.xpi")
);

add_setup(async () => {
  // addons.json has strict_min_version: 115.0 for the test add-on (ADDON_ID).
  AddonTestUtils.updateAppInfo({ version: "115.0" });
  await promiseStartupManager();

  // HttpServer does not support https (bug 1742061), so we replace all https
  // update requests with http.
  const { AddonUpdateChecker } = ChromeUtils.importESModule(
    "resource://gre/modules/addons/AddonUpdateChecker.sys.mjs"
  );
  const { sinon } = ChromeUtils.importESModule(
    "resource://testing-common/Sinon.sys.mjs"
  );
  function downgradeHttpUrl(url) {
    if (url.startsWith("https:")) {
      const httpUrl = url.replace(/^https:/, "http:");
      info(`Test-only hack: Using http instead of https for: ${url}`);
      return httpUrl;
    }
    return url;
  }
  const stub = sinon.stub(AddonUpdateChecker, "checkForUpdates");
  stub.callsFake(function (aId, aUrl, aObserver) {
    aUrl = downgradeHttpUrl(aUrl);
    const stub2 = sinon.stub(aObserver, "onUpdateCheckComplete");
    stub2.callsFake(function (results) {
      for (const result of results) {
        result.updateURL = downgradeHttpUrl(result.updateURL);
      }
      return stub2.wrappedMethod.call(this, results);
    });
    return stub.wrappedMethod.call(this, aId, aUrl, aObserver);
  });
  registerCleanupFunction(() => sinon.restore());
});

add_task(async function test_migrate_update_url() {
  // OLD_XPI uses a deprecated version format.
  ExtensionTestUtils.failOnSchemaWarnings(false);
  const { addon: addonOld } = await promiseInstallFile(OLD_XPI);
  ExtensionTestUtils.failOnSchemaWarnings(true);
  equal(addonOld.id, ADDON_ID, "Got expected addon ID");
  equal(
    addonOld.version,
    "5.107.0buildid20221104.101003",
    "Got expected old version"
  );
  equal(addonOld.updateURL, UPDATE_URL_OLD, "Got old updateURL");

  let install;
  const { messages } = await promiseConsoleOutput(async () => {
    const update = await promiseFindAddonUpdates(addonOld);
    install = update.updateAvailable;
    ok(install, "Found an update");
  });

  await promiseCompleteInstall(install);

  const addon = await AddonManager.getAddonByID(ADDON_ID);
  equal(addon.version, "6.0.20250903.174225", "Got updated version");
  equal(addon.updateURL, UPDATE_URL_NEW, "Got new updateURL");

  await addon.uninstall();

  // Intentionally checking "WARN" prefix to confirm verbosity; by default the
  // log verbosity is Warn, but in tests extensions.logging.enabled is set to
  // true, which increases the level to Debug. We want to make sure that
  // regular users see the log line without having to increase the log
  // verbosity.
  const R_EXPECTED_LOG_LINE =
    /WARN\s+update_url changed for add-on tabtweak@mozillaonline.com version 5.107.0buildid20221104.101003, from https:\/\/addons.firefox.com.cn\/chinaedition\/addons\/updates.json\?reqVersion=.* to https:\/\/archive.mozilla.org\/pub\/cn_pack\/addons.json/;
  AddonTestUtils.checkMessages(
    messages,
    { expected: [{ message: R_EXPECTED_LOG_LINE }] },
    "Got the expected log message"
  );
});
