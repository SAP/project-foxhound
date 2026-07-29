/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

// Test deleting all storage entries using the toolbar delete-all button
add_task(async function testDeleteAllButton() {
  await openTabAndSetupStorage(MAIN_URL_SECURED + "storage-listings.html");

  // Test deleting all cookies for a specific host using the toolbar button
  info("Test state before delete");
  await checkState([
    [
      ["cookies", MAIN_ORIGIN_SECURED],
      [
        getCookieId("c1", MAIN_HOST, "/browser"),
        getCookieId("c3", MAIN_HOST, "/"),
        getCookieId("cs2", "." + MAIN_DOMAIN, "/"),
        getCookieId("c4", "." + MAIN_DOMAIN, "/"),
      ],
    ],
  ]);

  info("Delete all cookies using toolbar button");
  await performRemoveAll(["cookies", MAIN_ORIGIN_SECURED]);

  info("Test state after delete");
  await checkState([[["cookies", MAIN_ORIGIN_SECURED], []]]);

  // Test deleting all localStorage for a specific host using the toolbar button
  info("Test state before delete");
  await checkState([
    [
      ["localStorage", MAIN_ORIGIN_SECURED],
      ["key", "ls1", "ls2"],
    ],
  ]);

  info("Delete all localStorage using toolbar button");
  await performRemoveAll(["localStorage", MAIN_ORIGIN_SECURED]);

  info("Test state after delete");
  await checkState([[["localStorage", MAIN_ORIGIN_SECURED], []]]);

  // Test deleting all sessionStorage for a specific host using the toolbar button
  info("Test state before delete");
  await checkState([
    [
      ["sessionStorage", MAIN_ORIGIN_SECURED],
      ["key", "ss1"],
    ],
  ]);

  info("Delete all sessionStorage using toolbar button");

  await performRemoveAll(["sessionStorage", MAIN_ORIGIN_SECURED]);

  info("Test state after delete");
  await checkState([[["sessionStorage", MAIN_ORIGIN_SECURED], []]]);
});
