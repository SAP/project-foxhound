/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);
const { ExtensionPermissions } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionPermissions.sys.mjs"
);

AddonTestUtils.initMochitest(this);

async function getAddonCardWithPermsSection(win, addonId) {
  let card = getAddonCard(win, addonId);
  let permsSection = card.querySelector(
    "addon-permissions-list .addon-permissions-list-wrapper"
  );
  if (!permsSection) {
    let loaded = waitForViewLoad(win);
    card.querySelector('[action="expand"]').click();
    await loaded;
  }
  card = getAddonCard(win, addonId);
  let { deck, tabGroup } = card.details;
  let permsBtn = tabGroup.querySelector('[name="permissions"]');
  let permsShown = BrowserTestUtils.waitForEvent(deck, "view-changed");
  permsBtn.click();
  await permsShown;
  return card;
}

function getFileToggle(card) {
  return card.querySelector(
    `addon-permissions-list moz-toggle[permission-type="file_scheme_access"]`
  );
}

async function verifyToggleFilePermission(extension, toggle) {
  is(
    toggle.label,
    // This is the webext-perms-host-description-file-urls string:
    "Access local files on your computer",
    "file-access toggle has expected string"
  );
  is(toggle.pressed, false, "toggle starts off");

  // Click to enable.
  toggle.click();

  await TestUtils.waitForCondition(async () => {
    let perms = await ExtensionPermissions.get(extension.id);
    return perms.permissions.includes("internal:fileSchemeAllowed");
  }, "internal permission granted");

  is(toggle.pressed, true, "toggle is on");

  let policy = WebExtensionPolicy.getByID(extension.id);
  is(policy.fileSchemeAllowed, true, "policy.fileSchemeAllowed OK");

  // Click again to revoke.
  toggle.click();

  await TestUtils.waitForCondition(async () => {
    let p = await ExtensionPermissions.get(extension.id);
    return !p.permissions.includes("internal:fileSchemeAllowed");
  }, "internal permission removed");

  is(policy.fileSchemeAllowed, false, "policy updated after revocation");
}

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [["extensions.webextensions.fileSchemeAccess.requireOptIn", true]],
  });
});

add_task(async function test_without_any_file_permissions() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      manifest_version: 3,
      name: "Without any file permissions",
      host_permissions: ["https://example.com/*"],
    },
    useAddonManager: "temporary",
  });
  await extension.startup();

  let win = await loadInitialView("extension");
  let card = await getAddonCardWithPermsSection(win, extension.id);

  ok(!getFileToggle(card), "file-access toggle is hidden");

  await closeView(win);
  await extension.unload();
});

async function do_test_all_urls_permission(manifest_version) {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      manifest_version,
      name: `With <all_urls> in host_permissions (MV${manifest_version})`,
      host_permissions: ["<all_urls>"],
    },
    useAddonManager: "temporary",
  });
  await extension.startup();

  let win = await loadInitialView("extension");
  let card = await getAddonCardWithPermsSection(win, extension.id);

  let toggle = getFileToggle(card);
  ok(toggle, "file-access toggle is shown");

  let allUrlsToggle = card.querySelector(
    `moz-toggle[permission-key="<all_urls>"]`
  );
  if (manifest_version === 2) {
    ok(!allUrlsToggle, "<all_urls> is not an optional permission in MV2");
    is(toggle.id, "permission-0", "file-access toggle is the first item");
    ok(!card.querySelector("#permission-1"), "no other optional toggles");
  } else {
    // Verify that the file access option is rendered below <all_urls>.
    ok(allUrlsToggle, "<all_urls> turns into an optional permission in MV3");
    is(allUrlsToggle.id, "permission-0", "all_urls is the first item");
    is(toggle.id, "permission-1", "file-access toggle is the second item");
  }

  await verifyToggleFilePermission(extension, toggle);

  await closeView(win);
  await extension.unload();
}

add_task(async function test_all_urls_permission_mv2() {
  await do_test_all_urls_permission(2);
});

add_task(async function test_all_urls_permission_mv3() {
  await do_test_all_urls_permission(3);
});

async function test_with_file_in_content_scripts_matches(manifest_version) {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      manifest_version,
      name: `Content script with file:///* in matches MV${manifest_version}`,
      content_scripts: [{ matches: ["file:///*"], js: ["cs.js"] }],
    },
    files: { "cs.js": "" },
    useAddonManager: "temporary",
  });
  await extension.startup();

  let win = await loadInitialView("extension");
  let card = await getAddonCardWithPermsSection(win, extension.id);

  let toggle = getFileToggle(card);
  ok(toggle, "file-access toggle is shown");

  await verifyToggleFilePermission(extension, toggle);

  await closeView(win);
  await extension.unload();
}

add_task(async function test_with_file_in_content_scripts_matches_mv2() {
  await test_with_file_in_content_scripts_matches(2);
});

add_task(async function test_with_file_in_content_scripts_matches_mv3() {
  await test_with_file_in_content_scripts_matches(3);
});
