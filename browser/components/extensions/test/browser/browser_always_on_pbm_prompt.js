/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

AddonTestUtils.initMochitest(this);

const addonId = "test@pbm-checkbox";
let xpi;

async function testCheckbox(allowPbm, expectedCheckboxValue) {
  const readyPromise = AddonTestUtils.promiseWebExtensionStartup(addonId);

  window.gURLBar.value = xpi.path;
  window.gURLBar.focus();
  EventUtils.synthesizeKey("KEY_Enter", {}, window);

  const panel = await promisePopupNotificationShown("addon-webext-permissions");
  const checkbox = panel.querySelector(
    "li.webext-perm-privatebrowsing > moz-checkbox"
  );
  ok(checkbox, "We found the PBM checkbox");

  is(
    checkbox.checked,
    expectedCheckboxValue,
    `We expected the PBM checkbox ${expectedCheckboxValue ? "" : "not "}to be checked for this test case.`
  );

  if (checkbox.checked != allowPbm) {
    let { promise, resolve } = Promise.withResolvers();
    checkbox.addEventListener("change", resolve, { once: true });
    checkbox.click();
    await promise;
  }

  is(checkbox.checked, allowPbm, "The checkbox matches allowPbm.");

  // Accept the installation
  panel.button.click();

  await readyPromise;

  let policy = WebExtensionPolicy.getByID(addonId);
  is(
    policy.privateBrowsingAllowed,
    allowPbm,
    `Private browsing permission has ${allowPbm ? "" : "not "}been granted`
  );
}

async function uninstall() {
  const addon = await AddonManager.getAddonByID(addonId);
  await addon.uninstall();
}

add_task(async function () {
  is(
    PrivateBrowsingUtils.permanentPrivateBrowsing,
    true,
    "We are in permanent PBM for this test"
  );

  xpi = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      browser_specific_settings: { gecko: { id: addonId } },
    },
  });

  await BrowserTestUtils.withNewTab({ gBrowser: window.gBrowser }, async () => {
    // First run: install the addon for the first time. We do not let it run in
    // PBM.
    await testCheckbox(false, true);
    // Second run: reinstall the already installed addon, to check the
    // permission denial prevails on being in always-on PBM.
    await testCheckbox(false, false);
  });

  await uninstall();

  await BrowserTestUtils.withNewTab({ gBrowser: window.gBrowser }, async () => {
    // Third run: install the addon for the first time, and let it run also in
    // PBM.
    await testCheckbox(true, true);
    // Fourth run: reinstall the already installed addon, to check permission
    // approval is persisted.
    await testCheckbox(true, true);
  });

  await uninstall();
});
