/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

const MODULE_BASE = "resource://services-common/";
const shared_modules = ["async.sys.mjs", "rest.sys.mjs", "utils.sys.mjs"];

const non_android_modules = ["tokenserverclient.sys.mjs"];

const TEST_BASE = "resource://testing-common/services/common/";
const shared_test_modules = ["logging.sys.mjs"];

function expectImportsToSucceed(mm, base = MODULE_BASE) {
  for (let m of mm) {
    let resource = base + m;
    let succeeded = false;
    try {
      ChromeUtils.importESModule(resource);
      succeeded = true;
    } catch (e) {}

    if (!succeeded) {
      throw new Error(`Importing ${resource} should have succeeded!`);
    }
  }
}

async function expectImportsToFail(mm, base = MODULE_BASE) {
  for (let m of mm) {
    let resource = base + m;
    let succeeded = false;
    try {
      // ChromeUtils.importESModule(resource); cannot be called because it
      // triggers a crash in CheckForBrokenChromeURL (in automation only) with:
      // "Missing chrome or resource URLs: resource://services-common/tokenserverclient.sys.mjs"
      // Instead, we verify that the file does really not exist.
      await fetch(resource);
      succeeded = true;
    } catch (e) {}

    if (succeeded) {
      throw new Error(`Importing ${resource} should have failed!`);
    }
  }
}

add_task(async function test_imports() {
  expectImportsToSucceed(shared_modules);
  expectImportsToSucceed(shared_test_modules, TEST_BASE);
  expectImportsToSucceed(["LogManager.sys.mjs"], "resource://gre/modules/");

  if (AppConstants.platform != "android") {
    expectImportsToSucceed(non_android_modules);
  } else {
    await expectImportsToFail(non_android_modules);

    // Sanity check: fetch does not throw for modules that exist.
    await fetch(MODULE_BASE + shared_modules[0]);
  }
});
