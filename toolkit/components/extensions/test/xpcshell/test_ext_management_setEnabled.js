"use strict";

// Verifies that management.setEnabled cannot be used by an extension to toggle
// itself (or any non-theme extension) unless the extension is required by an
// enterprise policy. This test runs on Android as well, to confirm that the
// absence of Services.policies does not accidentally allow setEnabled.
//
// See https://bugzilla.mozilla.org/show_bug.cgi?id=1282982 for the canonical
// bug on changing this behavior.

AddonTestUtils.init(this);
AddonTestUtils.overrideCertDB();
AddonTestUtils.createAppInfo(
  "xpcshell@tests.mozilla.org",
  "XPCShell",
  "42",
  "42"
);

add_setup(async () => {
  await ExtensionTestUtils.startAddonManager();
});

add_task(async function test_setEnabled_on_self_rejects() {
  const TEST_ID = "test_management_setenabled_self@tests.mozilla.com";

  async function background(TEST_ID) {
    let self = await browser.management.get(TEST_ID);
    browser.test.assertTrue(self.enabled, "addon is enabled");
    await browser.test.assertRejects(
      browser.management.setEnabled(TEST_ID, false),
      "setEnabled can only be used for themes or by addons installed by enterprise policy",
      "setEnabled should fail on self when not required by policy"
    );
    self = await browser.management.get(TEST_ID);
    browser.test.assertTrue(self.enabled, "addon is still enabled");
    browser.test.sendMessage("done");
  }

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: { gecko: { id: TEST_ID } },
      permissions: ["management"],
    },
    background: `(${background})("${TEST_ID}")`,
    useAddonManager: "temporary",
  });
  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});
