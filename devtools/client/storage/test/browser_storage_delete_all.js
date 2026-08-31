/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Test deleting all storage items

add_task(async function () {
  // storage-listings.html explicitly mixes secure and insecure frames.
  // We should not enforce https for tests using this page.
  await pushPref("dom.security.https_first", false);

  await openTabAndSetupStorage(MAIN_URL + "storage-listings.html");

  const contextMenu = gPanelWindow.document.getElementById(
    "storage-table-popup"
  );
  const menuDeleteAllItem = contextMenu.querySelector(
    "#storage-table-popup-delete-all"
  );

  info("test state before delete");
  const beforeState = [
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
      ["indexedDB", MAIN_ORIGIN, "idb1 (default)", "obj1"],
      [1, 2, 3],
    ],
    [
      ["Cache", MAIN_ORIGIN, "plop"],
      [MAIN_URL + "404_cached_file.js", MAIN_URL + "browser_storage_basic.js"],
    ],
  ];

  await checkState(beforeState);

  info("do the delete");
  const deleteHosts = [
    [["localStorage", ALT_ORIGIN_SECURED], "iframe-s-ls1", "name"],
    [["sessionStorage", ALT_ORIGIN_SECURED], "iframe-s-ss1", "name"],
    [["indexedDB", MAIN_ORIGIN, "idb1 (default)", "obj1"], 1, "name"],
    [["Cache", MAIN_ORIGIN, "plop"], MAIN_URL + "404_cached_file.js", "url"],
  ];

  for (const [store, rowName, cellToClick] of deleteHosts) {
    const storeName = store.join(" > ");

    await selectTreeItem(store);

    const eventWait = gUI.once("store-objects-cleared");

    const cell = getRowCells(rowName)[cellToClick];
    await waitForContextMenu(contextMenu, cell, () => {
      info(`Opened context menu in ${storeName}, row '${rowName}'`);
      contextMenu.activateItem(menuDeleteAllItem);
    });

    await eventWait;
  }

  info("test state after delete");
  const afterState = [
    // iframes from the same host, one secure, one unsecure, are independent
    // from each other. Delete all in one doesn't touch the other one.
    [
      ["localStorage", MAIN_ORIGIN],
      ["key", "ls1", "ls2"],
    ],
    [["localStorage", ALT_ORIGIN], ["iframe-u-ls1"]],
    [["localStorage", ALT_ORIGIN_SECURED], []],
    [
      ["sessionStorage", MAIN_ORIGIN],
      ["key", "ss1"],
    ],
    [
      ["sessionStorage", ALT_ORIGIN],
      ["iframe-u-ss1", "iframe-u-ss2"],
    ],
    [["sessionStorage", ALT_ORIGIN_SECURED], []],
    [["indexedDB", MAIN_ORIGIN, "idb1 (default)", "obj1"], []],
    [["Cache", MAIN_ORIGIN, "plop"], []],
  ];

  await checkState(afterState);
});
