/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Test for bug 2038901: .csv files should always be identified as text/csv,
 * even when Windows (with Excel installed) maps .csv to
 * application/vnd.ms-excel in the registry.
 */

const { MockRegistry } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistry.sys.mjs"
);

function run_test() {
  let registry = new MockRegistry();
  registerCleanupFunction(() => registry.shutdown());

  registry.setValue(
    Ci.nsIWindowsRegKey.ROOT_KEY_CLASSES_ROOT,
    ".csv",
    "Content Type",
    "application/vnd.ms-excel"
  );

  const mimeService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
  Assert.equal(
    mimeService.getTypeFromExtension("csv"),
    "text/csv",
    "csv extension should map to text/csv regardless of OS registry"
  );
}
