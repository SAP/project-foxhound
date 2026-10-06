"use strict";

AddonTestUtils.init(this);

add_setup(async () => {
  await ExtensionTestUtils.startAddonManager();
});

const CAN_CRASH_EXTENSIONS = WebExtensionPolicy.useRemoteWebExtensions;

add_setup(
  // Crash dumps are only generated when MOZ_CRASHREPORTER is set.
  // Crashes are only generated if tests can crash the extension process.
  { skip_if: () => !AppConstants.MOZ_CRASHREPORTER || !CAN_CRASH_EXTENSIONS },
  setup_crash_reporter_override_and_cleaner
);

async function test_storage_session_after_crash({ persistent }) {
  async function background() {
    let before = await browser.storage.session.get();

    browser.storage.session.set({ count: (before.count ?? 0) + 1 });

    // Roundtrip the data through the parent process.
    let after = await browser.storage.session.get();

    browser.test.sendMessage("data", { before, after });
  }

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["storage"],
      background: { persistent },
    },
    background,
  });

  await extension.startup();

  info(`Testing storage.session after crash with persistent=${persistent}`);

  {
    let { before, after } = await extension.awaitMessage("data");

    equal(JSON.stringify(before), "{}", "Initial before storage is empty.");
    equal(after.count, 1, "After storage counter is correct.");
  }

  info("Crashing the extension process.");
  await crashExtensionBackground(extension);
  await extension.wakeupBackground();

  {
    let { before, after } = await extension.awaitMessage("data");

    equal(before.count, 1, "Before storage counter is correct.");
    equal(after.count, 2, "After storage counter is correct.");
  }

  await extension.unload();
}

add_task(
  { skip_if: () => !CAN_CRASH_EXTENSIONS },
  function test_storage_session_after_crash_persistent() {
    return test_storage_session_after_crash({ persistent: true });
  }
);

add_task(
  { skip_if: () => !CAN_CRASH_EXTENSIONS },
  function test_storage_session_after_crash_event_page() {
    return test_storage_session_after_crash({ persistent: false });
  }
);
