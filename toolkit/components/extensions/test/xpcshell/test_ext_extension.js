"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ExtensionPermissions: "resource://gre/modules/ExtensionPermissions.sys.mjs",
});

const FILE_ACCESS_OPT_IN_PREF =
  "extensions.webextensions.fileSchemeAccess.requireOptIn";
// Force default to true so that test cleanup is simpler when we drop the pref.
Services.prefs.setBoolPref(FILE_ACCESS_OPT_IN_PREF, true);

add_task(async function test_is_allowed_incognito_access() {
  async function background() {
    let allowed = await browser.extension.isAllowedIncognitoAccess();

    browser.test.assertEq(true, allowed, "isAllowedIncognitoAccess is true");
    browser.test.notifyPass("isAllowedIncognitoAccess");
  }

  let extension = ExtensionTestUtils.loadExtension({
    background,
    incognitoOverride: "spanning",
  });

  await extension.startup();
  await extension.awaitFinish("isAllowedIncognitoAccess");
  await extension.unload();
});

add_task(async function test_is_denied_incognito_access() {
  async function background() {
    let allowed = await browser.extension.isAllowedIncognitoAccess();

    browser.test.assertEq(false, allowed, "isAllowedIncognitoAccess is false");
    browser.test.notifyPass("isNotAllowedIncognitoAccess");
  }

  let extension = ExtensionTestUtils.loadExtension({
    background,
  });

  await extension.startup();
  await extension.awaitFinish("isNotAllowedIncognitoAccess");
  await extension.unload();
});

add_task(async function test_in_incognito_context_false() {
  function background() {
    browser.test.assertEq(
      false,
      browser.extension.inIncognitoContext,
      "inIncognitoContext returned false"
    );
    browser.test.notifyPass("inIncognitoContext");
  }

  let extension = ExtensionTestUtils.loadExtension({
    background,
  });

  await extension.startup();
  await extension.awaitFinish("inIncognitoContext");
  await extension.unload();
});

async function do_test_isAllowedFileSchemeAccess_default_false() {
  async function background() {
    let allowed = await browser.extension.isAllowedFileSchemeAccess();

    browser.test.assertEq(false, allowed, "isAllowedFileSchemeAccess is false");
    browser.test.notifyPass("isAllowedFileSchemeAccess");
  }

  let extension = ExtensionTestUtils.loadExtension({
    // The purpose of this test is to verify that isAllowedFileSchemeAccess()
    // returns false when the internal file access permission is missing. To
    // make sure that the "false" result is for that reason, and not due to
    // the absence of "file:"-permissions, include all host permissions that
    // cover file access in the manifest.
    manifest: { host_permissions: ["<all_urls>", "file://*/*"] },
    background,
  });

  await extension.startup();
  await extension.awaitFinish("isAllowedFileSchemeAccess");
  await extension.unload();
}

add_task(
  { pref_set: [[FILE_ACCESS_OPT_IN_PREF, false]] },
  async function test_is_allowed_file_scheme_access_requireOptIn_false() {
    // When opt-in from bug 2034168 is disabled, default to false as before.
    await do_test_isAllowedFileSchemeAccess_default_false();
  }
);

add_task(
  { pref_set: [[FILE_ACCESS_OPT_IN_PREF, true]] },
  async function test_is_allowed_file_scheme_access_requireOptIn_true() {
    // When opt-in is required, we default to false by default.
    await do_test_isAllowedFileSchemeAccess_default_false();
  }
);

add_task(async function test_is_allowed_file_scheme_access_change_optin() {
  const extensionId = "@file_access_opt_in_test";

  await ExtensionPermissions.add(extensionId, {
    permissions: ["internal:fileSchemeAllowed"],
    origins: [],
  });

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: { gecko: { id: extensionId } },
      // Note: internally the flag is independent of whether file: permissions
      // were requested.
      permissions: [],
    },
    background() {
      browser.test.onMessage.addListener(async (msg, expectedValue) => {
        browser.test.assertEq(
          expectedValue,
          await browser.extension.isAllowedFileSchemeAccess(),
          `isAllowedFileSchemeAccess is ${expectedValue} (${msg})`
        );
        browser.test.sendMessage("check_done");
      });
    },
  });

  await extension.startup();

  extension.sendMessage("with internal permission granted", true);
  await extension.awaitMessage("check_done");

  await ExtensionPermissions.remove(
    extensionId,
    { permissions: ["internal:fileSchemeAllowed"], origins: [] },
    // Note: Extension instance is required to be included here to enable the
    // permission change to be detected and be propagated to the child.
    extension.extension
  );

  extension.sendMessage("after internal permission revoked", false);
  await extension.awaitMessage("check_done");

  // For completeness, also check that isAllowedFileSchemeAccess is sensitive
  // to pref flips at runtime.
  await runWithPrefs([[FILE_ACCESS_OPT_IN_PREF, false]], async () => {
    extension.sendMessage("with pref off", false);
    await extension.awaitMessage("check_done");

    await ExtensionPermissions.add(
      extensionId,
      { permissions: ["internal:fileSchemeAllowed"], origins: [] },
      extension.extension
    );

    extension.sendMessage("with pref on, internal permission added", false);
    await extension.awaitMessage("check_done");
  });

  extension.sendMessage("with pref off again, permission still there", true);
  await extension.awaitMessage("check_done");

  await extension.unload();
});
