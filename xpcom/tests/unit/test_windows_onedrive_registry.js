/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

// Each "test suite" is a set of tests run on a specific registry
// configuration.
// NB: None of these files will actually exist.
const customerId = "12345";

const testSuites = [
  {
    registryMap: {
      "HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Personal\\UserFolder":
        "Q:\\Me\\OneDrive",
      "HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Personal\\cid":
        customerId,
    },
    personalFolder: "Q:\\Me\\OneDrive",
    businessFolders: [],
  },
  {
    registryMap: {
      "HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Business1\\UserFolder":
        "Q:\\Me\\OneDrive - MyOrg",
    },
    personalFolder: null,
    businessFolders: ["Q:\\Me\\OneDrive - MyOrg"],
  },
  {
    registryMap: {
      "HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Personal\\UserFolder":
        "Q:\\Me\\OneDrive - Personal",
      "HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Personal\\cid":
        customerId,
      "HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Business5\\UserFolder":
        "Q:\\Me\\OneDrive - Org1",
      "HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Business6\\UserFolder":
        "Q:\\Me\\OneDrive - Org2",
      "HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Business10\\UserFolder":
        "Q:\\Me\\OneDrive - Org2(2)",
    },
    personalFolder: "Q:\\Me\\OneDrive - Personal",
    businessFolders: [
      "Q:\\Me\\OneDrive - Org1",
      "Q:\\Me\\OneDrive - Org2",
      "Q:\\Me\\OneDrive - Org2(2)",
    ],
  },
];

// value of registryMap from currently-running test suite
let currentRegistryContents;
// The registry won't be opened for more than one key at a time.
let currentRegistryPath;
// Un-mock the registry.  We need to do this before test end (i.e.
// registerCleanupFunction) because cleanup involves the registry.
let do_cleanup;

let mockRegistry = {
  open: (root, path, mode) => {
    Assert.equal(
      root,
      Ci.nsIWindowsRegKey.ROOT_KEY_CURRENT_USER,
      "reg key is in HKEY_CURRENT_USER"
    );
    let isPersonal = path.match(
      /Software\\Microsoft\\OneDrive\\Accounts\\Personal/
    );
    let isBusiness = path.match(
      /Software\\Microsoft\\OneDrive\\Accounts\\Business(\d+)/
    );
    Assert.ok(isPersonal || isBusiness, "opening correct root path");
    Assert.equal(mode, Ci.nsIWindowsRegKey.ACCESS_READ, "mode was ACCESS_READ");
    currentRegistryPath = "HKEY_CURRENT_USER\\" + path;
  },
  hasValue: value => {
    const allowedKeys = new Set(["UserFolder", "cid"]);
    Assert.ok(allowedKeys.has(value), `value is ${value}`);
    return currentRegistryPath + "\\" + value in currentRegistryContents;
  },
  readStringValue: value => {
    if (!(currentRegistryPath + "\\" + value in currentRegistryContents)) {
      // This should never happen.
      Assert.ok(
        false,
        `${currentRegistryPath + "\\" + value} not found in registry`
      );
      throw new Error("read nonexistent value");
    }
    return currentRegistryContents[currentRegistryPath + "\\" + value];
  },

  setRegistryContents: newRegistryMap => {
    info(`setting new registry map: ${JSON.stringify(newRegistryMap)}`);
    currentRegistryContents = newRegistryMap;
  },

  QueryInterface: ChromeUtils.generateQI(["nsIWindowsRegKey"]),
};

function setupMockRegistryComponent() {
  const { MockRegistrar } = ChromeUtils.importESModule(
    "resource://testing-common/MockRegistrar.sys.mjs"
  );
  let cid = MockRegistrar.registerEx(
    "@mozilla.org/windows-registry-key;1",
    { shouldCreateInstance: false },
    mockRegistry
  );
  do_cleanup = () => {
    MockRegistrar.unregister(cid);
  };
}

add_task(async function runTests() {
  setupMockRegistryComponent();

  for (let test of testSuites) {
    mockRegistry.setRegistryContents(test.registryMap);
    let dirSvc = Services.dirsvc.QueryInterface(Ci.nsIProperties);
    try {
      let personalFolder = dirSvc.get("OneDrPD", Ci.nsIFile);
      Assert.equal(
        personalFolder.path,
        test.personalFolder,
        "got correct personal OneDrive root"
      );
    } catch (e) {
      // DirectoryService throws out error codes and returns NS_ERROR_FAILURE
      // for any error.
      Assert.equal(e.result, Cr.NS_ERROR_FAILURE, "reported file not found");
      Assert.equal(
        test.personalFolder,
        null,
        "non-existent personal OneDrive root"
      );
    }

    let businessFolders = Array.from(
      dirSvc.get("OneDrBDL", Ci.nsISimpleEnumerator)
    );
    Assert.equal(
      businessFolders.length,
      test.businessFolders.length,
      "Found all business folders"
    );
    if (test.businessFolders.length) {
      for (let folder of businessFolders) {
        Assert.ok(
          test.businessFolders.includes(folder.path),
          `Found business folder ${folder.path}`
        );
      }
    }
  }

  do_cleanup();
});
