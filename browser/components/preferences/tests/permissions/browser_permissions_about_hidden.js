"use strict";

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const PERMISSIONS_URL =
  "chrome://browser/content/preferences/dialogs/sitePermissions.xhtml";
const PERMISSION_TYPES = [
  // Location
  "geo",
  // Camera
  "camera",
  // Microphone
  "microphone",
  // Speaker
  "speaker",
  // Notifications
  "desktop-notification",
  // Autoplay
  "autoplay-media",
  // Virtual reality
  "xr",
];

/**
 * Asserts there are exactly `count` `permissionType` permission entries for `domain`/`scheme`.
 * You must specify exactly one of the `domain` and `scheme` arguments.
 */
async function assertEntries({
  domain = null,
  scheme = null,
  permissionType,
  count,
  contextMsg,
}) {
  if (Boolean(domain) === Boolean(scheme)) {
    throw new Error(
      "For assertEntries you MUST specify either domain OR scheme."
    );
  }

  let dialogWin = await openAndLoadSubDialog(PERMISSIONS_URL, null, {
    permissionType,
  });
  await dialogWin.document.mozSubdialogReady;

  let richlistbox = dialogWin.document.getElementById("permissionsBox");
  let filterFunction = domain
    ? origin => origin?.includes(domain)
    : origin => origin?.startsWith(scheme);
  let domainOrigins = Array.from(richlistbox.querySelectorAll("richlistitem"))
    .map(item => item.getAttribute("origin"))
    .filter(filterFunction);

  Assert.equal(
    domainOrigins.length,
    count,
    `${contextMsg}: ${count} ${domain ? domain : scheme} entries should be shown for permissionType=${permissionType}.`
  );

  let closePromise = BrowserTestUtils.waitForEvent(
    dialogWin,
    "dialogclosing",
    true
  );
  dialogWin.document.querySelector("dialog").getButton("cancel").click();
  await closePromise;
}

add_task(async function test_no_about_entries_in_site_permissions_dialogs() {
  let privacyPane;

  registerCleanupFunction(() => {
    Services.perms.removeAll();
    if (privacyPane) {
      BrowserTestUtils.removeTab(gBrowser.selectedTab);
    }
  });

  // Open about:preferences#privacy and ensure there are no about:* entries.
  privacyPane = await openPreferencesViaOpenPreferencesAPI("privacy", {
    leaveOpen: true,
  });
  for (let type of PERMISSION_TYPES) {
    await assertEntries({
      scheme: "about:",
      permissionType: type,
      count: 0,
      contextMsg: "Initial",
    });
  }

  // Add Location permissions for about:welcome and https://example.com.
  PermissionTestUtils.add("about:welcome", "geo", Services.perms.ALLOW_ACTION);
  PermissionTestUtils.add(
    "https://example.com",
    "geo",
    Services.perms.ALLOW_ACTION
  );

  // Ensure there are still no about:* entries in Location.
  await assertEntries({
    scheme: "about:",
    permissionType: "geo",
    count: 0,
    contextMsg: "After adding about:welcome Location permission",
  });
  // Ensure an entry for https://example.com is displayed in Location.
  await assertEntries({
    domain: "example.com",
    permissionType: "geo",
    count: 1,
    contextMsg: "After adding https://example.com Location permission",
  });
});
