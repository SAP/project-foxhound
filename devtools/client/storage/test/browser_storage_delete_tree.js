/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Test deleting all storage items from the tree.

add_task(async function () {
  // storage-listings.html explicitly mixes secure and insecure frames.
  // We should not enforce https for tests using this page.
  await pushPref("dom.security.https_first", false);

  await openTabAndSetupStorage(MAIN_URL + "storage-listings.html");

  const contextMenu =
    gPanelWindow.document.getElementById("storage-tree-popup");
  const menuDeleteAllItem = contextMenu.querySelector(
    "#storage-tree-popup-delete-all"
  );

  info("test state before delete");
  await checkState([
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
      ["localStorage", MAIN_ORIGIN],
      ["key", "ls1", "ls2"],
    ],
    [
      ["sessionStorage", MAIN_ORIGIN],
      ["key", "ss1"],
    ],
    [
      ["indexedDB", MAIN_ORIGIN, "idb1 (default)", "obj1"],
      [1, 2, 3],
    ],
    [
      ["Cache", MAIN_ORIGIN, "plop"],
      [MAIN_URL + "404_cached_file.js", MAIN_URL + "browser_storage_basic.js"],
    ],
  ]);

  info("do the delete");
  const deleteHosts = [
    ["cookies", MAIN_ORIGIN],
    ["localStorage", MAIN_ORIGIN],
    ["sessionStorage", MAIN_ORIGIN],
    ["indexedDB", MAIN_ORIGIN, "idb1 (default)", "obj1"],
    ["Cache", MAIN_ORIGIN, "plop"],
  ];

  for (const store of deleteHosts) {
    const storeName = store.join(" > ");

    await selectTreeItem(store);

    const eventName =
      "store-objects-" + (store[0] == "cookies" ? "edit" : "cleared");
    const eventWait = gUI.once(eventName);

    const selector = `[data-id='${JSON.stringify(store)}'] > .tree-widget-item`;
    const target = gPanelWindow.document.querySelector(selector);
    ok(target, `tree item found in ${storeName}`);
    await waitForContextMenu(contextMenu, target, () => {
      info(`Opened tree context menu in ${storeName}`);
      contextMenu.activateItem(menuDeleteAllItem);
    });

    await eventWait;
  }

  info("test state after delete");
  await checkState([
    [["cookies", MAIN_ORIGIN], []],
    [["localStorage", MAIN_ORIGIN], []],
    [["sessionStorage", MAIN_ORIGIN], []],
    [["indexedDB", MAIN_ORIGIN, "idb1 (default)", "obj1"], []],
    [["Cache", MAIN_ORIGIN, "plop"], []],
  ]);
});
