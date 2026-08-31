/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Test deleting all cookies

async function performDelete(store, rowName, action) {
  const contextMenu = gPanelWindow.document.getElementById(
    "storage-table-popup"
  );
  const menuDeleteAllItem = contextMenu.querySelector(
    "#storage-table-popup-delete-all"
  );
  const menuDeleteAllSessionCookiesItem = contextMenu.querySelector(
    "#storage-table-popup-delete-all-session-cookies"
  );
  const menuDeleteAllFromItem = contextMenu.querySelector(
    "#storage-table-popup-delete-all-from"
  );

  const storeName = store.join(" > ");

  await selectTreeItem(store);

  const eventWait = gUI.once("store-objects-edit");
  const cells = getRowCells(rowName, true);

  await waitForContextMenu(contextMenu, cells.name, () => {
    info(`Opened context menu in ${storeName}, row '${rowName}'`);
    switch (action) {
      case "deleteAll":
        menuDeleteAllItem.click();
        break;
      case "deleteAllSessionCookies":
        menuDeleteAllSessionCookiesItem.click();
        break;
      case "deleteAllFrom": {
        menuDeleteAllFromItem.click();
        const hostName = cells.host.value;
        ok(
          menuDeleteAllFromItem.getAttribute("label").includes(hostName),
          `Context menu item label contains '${hostName}'`
        );
        break;
      }
    }
  });

  await eventWait;
}

add_task(async function () {
  // storage-listings.html explicitly mixes secure and insecure frames.
  // We should not enforce https for tests using this page.
  await pushPref("dom.security.https_first", false);

  await openTabAndSetupStorage(MAIN_URL + "storage-listings.html");

  info("test state before delete");
  await checkState([
    [
      ["cookies", MAIN_ORIGIN],
      [
        getCookieId("c1", MAIN_HOST, "/browser"),
        getCookieId("c3", MAIN_HOST, "/"),
        getCookieId("cs2", "." + MAIN_DOMAIN, "/"),
        getCookieId("c4", "." + MAIN_DOMAIN, "/"),
        getCookieId("uc1", "." + MAIN_DOMAIN, "/"),
        getCookieId("uc2", "." + MAIN_DOMAIN, "/"),
      ],
    ],
    [
      ["cookies", ALT_ORIGIN_SECURED],
      [
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
        getCookieId("uc1", "." + MAIN_DOMAIN, "/"),
        getCookieId("uc2", "." + MAIN_DOMAIN, "/"),
      ],
    ],
  ]);

  info("delete all from domain");
  // delete only cookies that match the host exactly
  let id = getCookieId("c1", MAIN_HOST, "/browser");
  await performDelete(["cookies", MAIN_ORIGIN], id, "deleteAllFrom");

  info("test state after delete all from domain");
  await checkState([
    // Domain cookies (.example.org) must not be deleted.
    [
      ["cookies", MAIN_ORIGIN],
      [
        getCookieId("cs2", "." + MAIN_DOMAIN, "/"),
        getCookieId("c4", "." + MAIN_DOMAIN, "/"),
        getCookieId("uc1", "." + MAIN_DOMAIN, "/"),
        getCookieId("uc2", "." + MAIN_DOMAIN, "/"),
      ],
    ],
    [
      ["cookies", ALT_ORIGIN_SECURED],
      [
        getCookieId("cs2", "." + MAIN_DOMAIN, "/"),
        getCookieId("c4", "." + MAIN_DOMAIN, "/"),
        getCookieId("uc1", "." + MAIN_DOMAIN, "/"),
        getCookieId("uc2", "." + MAIN_DOMAIN, "/"),
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
  ]);

  info("delete all session cookies");
  // delete only session cookies
  id = getCookieId("cs2", "." + MAIN_DOMAIN, "/");
  await performDelete(["cookies", ALT_ORIGIN], id, "deleteAllSessionCookies");

  info("test state after delete all session cookies");
  await checkState([
    // Cookies with expiry date must not be deleted.
    [
      ["cookies", MAIN_ORIGIN],
      [
        getCookieId("c4", "." + MAIN_DOMAIN, "/"),
        getCookieId("uc2", "." + MAIN_DOMAIN, "/"),
      ],
    ],
    [
      ["cookies", ALT_ORIGIN_SECURED],
      [
        getCookieId("c4", "." + MAIN_DOMAIN, "/"),
        getCookieId("uc2", "." + MAIN_DOMAIN, "/"),
        getCookieId(
          "sc2",
          "sectest1.example.org",
          "/browser/devtools/client/storage/test"
        ),
      ],
    ],
  ]);

  info("delete all");
  // delete all cookies for host, including domain cookies
  id = getCookieId("uc2", "." + MAIN_DOMAIN, "/");
  await performDelete(["cookies", ALT_ORIGIN], id, "deleteAll");

  info("test state after delete all");
  await checkState([
    // Domain cookies (.example.org) are deleted too, so deleting in sectest1
    // also removes stuff from test1.
    [["cookies", MAIN_ORIGIN], []],
    [["cookies", ALT_ORIGIN_SECURED], []],
  ]);
});

add_task(async function testDeleteWithDomain() {
  // Test that cookies whose host starts with "." are properly deleted
  await openTabAndSetupStorage(MAIN_URL + "storage-cookies.html");

  await checkState([
    [
      ["cookies", MAIN_ORIGIN],
      [
        getCookieId("test1", ".test1.example.org", "/browser"),
        getCookieId("test2", MAIN_HOST, "/browser"),
        getCookieId("test3", ".test1.example.org", "/browser"),
        getCookieId("test4", MAIN_HOST, "/browser"),
        getCookieId("test5", ".test1.example.org", "/browser"),
      ],
    ],
  ]);

  // delete all cookies for host, including domain cookies
  const id = getCookieId("test1", ".test1.example.org", "/browser");
  await performDelete(["cookies", MAIN_ORIGIN], id, "deleteAll");

  info("test state after delete all");
  await checkState([[["cookies", MAIN_ORIGIN], []]]);
});
