/**
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

/**
 * Verifies that the QuotaManager observer participates correctly in the
 * clearPrivateBrowsingData() collector pattern:
 * - The PBMCleanupCallback fires after storage is cleared.
 * - The callback fires even when no private storage exists (no-op path).
 * - onDataDeleted receives flags=0 on success.
 */

function clearPrivateBrowsingViaService() {
  return new Promise((resolve, reject) => {
    try {
      Services.clearData.clearPrivateBrowsingData({
        onDataDeleted(aFailedFlags) {
          resolve(aFailedFlags);
        },
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function testSteps() {
  const packages = [
    "clearStoragesForPrivateBrowsing_profile",
    "defaultStorageDirectory_shared",
  ];

  info("Test 1: Callback fires after storage is cleared");

  info("Clearing existing storage");

  let request = clear();
  await requestFinished(request);

  info("Verifying storage is empty before install");

  verifyStorage(packages, "beforeInstall");

  info("Installing private browsing storage package");

  installPackages(packages);

  info("Verifying storage is present after install");

  verifyStorage(packages, "afterInstall");

  info("Calling clearPrivateBrowsingData() and awaiting callback");

  let flags = await clearPrivateBrowsingViaService();

  Assert.equal(flags, 0, "onDataDeleted received flags=0 (success)");

  info("Verifying storage is cleared after clearPrivateBrowsingData()");

  verifyStorage(packages, "afterClearPrivateBrowsing");

  info("Test 2: Callback fires when no private storage exists");

  info("Clearing storage");

  request = clear();
  await requestFinished(request);

  info("Calling clearPrivateBrowsingData() on empty profile");

  flags = await clearPrivateBrowsingViaService();

  Assert.equal(
    flags,
    0,
    "onDataDeleted received flags=0 even with no private storage"
  );
}
