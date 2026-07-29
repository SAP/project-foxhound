/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// A test to check that the storage inspector is working correctly without
// userContextId.

"use strict";

const testCases = [
  [
    ["cookies", MAIN_ORIGIN],
    [
      getCookieId("c1", MAIN_HOST, "/browser"),
      getCookieId("cs2", "." + MAIN_DOMAIN, "/"),
      getCookieId("c3", MAIN_HOST, "/"),
      getCookieId("c4", "." + MAIN_DOMAIN, "/"),
      getCookieId("uc1", "." + MAIN_DOMAIN, "/"),
      getCookieId("uc2", "." + MAIN_DOMAIN, "/"),
    ],
  ],
  [
    ["cookies", ALT_ORIGIN_SECURED],
    [
      getCookieId("uc1", "." + MAIN_DOMAIN, "/"),
      getCookieId("uc2", "." + MAIN_DOMAIN, "/"),
      getCookieId("cs2", "." + MAIN_DOMAIN, "/"),
      getCookieId("c4", "." + MAIN_DOMAIN, "/"),
      getCookieId(
        "sc1",
        "sectest1.example.org",
        "/browser/devtools/client/storage/test"
      ),
      getCookieId(
        "sc2",
        "sectest1.example.org",
        "/browser/devtools/client/storage/test"
      ),
    ],
  ],
  [
    ["localStorage", MAIN_ORIGIN],
    ["key", "ls1", "ls2"],
  ],
  [["localStorage", ALT_ORIGIN], ["iframe-u-ls1"]],
  [["localStorage", ALT_ORIGIN_SECURED], ["iframe-s-ls1"]],
  [
    ["sessionStorage", MAIN_ORIGIN],
    ["key", "ss1"],
  ],
  [
    ["sessionStorage", ALT_ORIGIN],
    ["iframe-u-ss1", "iframe-u-ss2"],
  ],
  [["sessionStorage", ALT_ORIGIN_SECURED], ["iframe-s-ss1"]],
  [
    ["indexedDB", MAIN_ORIGIN],
    ["idb1 (default)", "idb2 (default)"],
  ],
  [
    ["indexedDB", MAIN_ORIGIN, "idb1 (default)"],
    ["obj1", "obj2"],
  ],
  [["indexedDB", MAIN_ORIGIN, "idb2 (default)"], ["obj3"]],
  [
    ["indexedDB", MAIN_ORIGIN, "idb1 (default)", "obj1"],
    [1, 2, 3],
  ],
  [["indexedDB", MAIN_ORIGIN, "idb1 (default)", "obj2"], [1]],
  [["indexedDB", MAIN_ORIGIN, "idb2 (default)", "obj3"], []],
  [["indexedDB", ALT_ORIGIN], []],
  [
    ["indexedDB", ALT_ORIGIN_SECURED],
    ["idb-s1 (default)", "idb-s2 (default)"],
  ],
  [["indexedDB", ALT_ORIGIN_SECURED, "idb-s1 (default)"], ["obj-s1"]],
  [["indexedDB", ALT_ORIGIN_SECURED, "idb-s2 (default)"], ["obj-s2"]],
  [
    ["indexedDB", ALT_ORIGIN_SECURED, "idb-s1 (default)", "obj-s1"],
    [6, 7],
  ],
  [["indexedDB", ALT_ORIGIN_SECURED, "idb-s2 (default)", "obj-s2"], [16]],
  [
    ["Cache", MAIN_ORIGIN, "plop"],
    [MAIN_URL + "404_cached_file.js", MAIN_URL + "browser_storage_basic.js"],
  ],
];

/**
 * Test that the desired number of tree items are present
 */
function testTree(tests) {
  const doc = gPanelWindow.document;
  for (const [item] of tests) {
    ok(
      doc.querySelector("[data-id='" + JSON.stringify(item) + "']"),
      `Tree item ${item.toSource()} should be present in the storage tree`
    );
  }
}

/**
 * Test that correct table entries are shown for each of the tree item
 */
async function testTables(tests) {
  const doc = gPanelWindow.document;
  // Expand all nodes so that the synthesized click event actually works
  gUI.tree.expandAll();

  // First tree item is already selected so no clicking and waiting for update
  for (const id of tests[0][1]) {
    ok(
      doc.querySelector(".table-widget-cell[data-id='" + id + "']"),
      "Table item " + id + " should be present"
    );
  }

  // Click rest of the tree items and wait for the table to be updated
  for (const [treeItem, items] of tests.slice(1)) {
    await selectTreeItem(treeItem);

    // Check whether correct number of items are present in the table
    is(
      doc.querySelectorAll(
        ".table-widget-column:first-of-type .table-widget-cell"
      ).length,
      items.length,
      "Number of items in table is correct"
    );

    // Check if all the desired items are present in the table
    for (const id of items) {
      ok(
        doc.querySelector(".table-widget-cell[data-id='" + id + "']"),
        "Table item " + id + " should be present"
      );
    }
  }
}

add_task(async function () {
  // storage-listings.html explicitly mixes secure and insecure frames.
  // We should not enforce https for tests using this page.
  await pushPref("dom.security.https_first", false);

  await openTabAndSetupStorage(MAIN_URL + "storage-listings.html");

  testTree(testCases);
  await testTables(testCases);
});
