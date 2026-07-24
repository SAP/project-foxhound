/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

// Test deleting all storage entries using the toolbar delete-all button
add_task(async function testDeleteAllButton() {
  await openTabAndSetupStorage(MAIN_DOMAIN_SECURED + "storage-listings.html");

  // Test deleting all cookies for a specific host using the toolbar button
  info("Test state before delete");
  await checkState([
    [
      ["cookies", "https://test1.example.org"],
      [
        getCookieId("c1", "test1.example.org", "/browser"),
        getCookieId("c3", "test1.example.org", "/"),
        getCookieId("cs2", ".example.org", "/"),
        getCookieId("c4", ".example.org", "/"),
      ],
    ],
  ]);

  info("Delete all cookies using toolbar button");
  await performRemoveAll(["cookies", "https://test1.example.org"]);

  info("Test state after delete");
  await checkState([[["cookies", "https://test1.example.org"], []]]);

  // Test deleting all localStorage for a specific host using the toolbar button
  info("Test state before delete");
  await checkState([
    [
      ["localStorage", "https://test1.example.org"],
      ["key", "ls1", "ls2"],
    ],
  ]);

  info("Delete all localStorage using toolbar button");
  await performRemoveAll(["localStorage", "https://test1.example.org"]);

  info("Test state after delete");
  await checkState([[["localStorage", "https://test1.example.org"], []]]);

  // Test deleting all sessionStorage for a specific host using the toolbar button
  info("Test state before delete");
  await checkState([
    [
      ["sessionStorage", "https://test1.example.org"],
      ["key", "ss1"],
    ],
  ]);

  info("Delete all sessionStorage using toolbar button");

  await performRemoveAll(["sessionStorage", "https://test1.example.org"]);

  info("Test state after delete");
  await checkState([[["sessionStorage", "https://test1.example.org"], []]]);
});
