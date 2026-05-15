/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { Spotlight } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/Spotlight.sys.mjs"
);

const { OnboardingMessageProvider } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/OnboardingMessageProvider.sys.mjs"
);

add_task(
  async function test_restore_from_backup_messages_not_suffixed_without_pref() {
    const PREF = "browser.backup.profile-restoration-date";
    Services.prefs.clearUserPref(PREF);

    const messages = await OnboardingMessageProvider.getMessages();

    Assert.ok(
      !messages.some(
        message =>
          message.id.startsWith("RESTORE_FROM_BACKUP") &&
          /_\d+$/.test(message.id)
      ),
      "No restore from backup message id has a timestamp suffix when pref is missing"
    );
  }
);

add_task(async function test_restore_from_backup_messages_suffixed_with_pref() {
  const PREF = "browser.backup.profile-restoration-date";
  const timestamp = 123456789;

  Services.prefs.setIntPref(PREF, timestamp);
  registerCleanupFunction(() => Services.prefs.clearUserPref(PREF));

  const messages = await OnboardingMessageProvider.getMessages();
  const restoreMessages = messages.filter(message =>
    message.id.startsWith("RESTORE_FROM_BACKUP")
  );

  Assert.greater(
    restoreMessages.length,
    0,
    "Found restore messages in provider"
  );

  for (const message of restoreMessages) {
    Assert.ok(
      message.id.endsWith(`_${timestamp}`),
      `id is suffixed with timestamp: ${message.id}`
    );
    Assert.ok(
      message.content.id.endsWith(`_${timestamp}`),
      `content.id suffixed: ${message.content.id}`
    );
    Assert.equal(message.frequency?.lifetime, 1, "Lifetime is 1");
  }
});

add_task(
  async function test_restore_from_backup_messages_reeligible_when_timestamp_changes() {
    const PREF = "browser.backup.profile-restoration-date";
    const first_restore_timestamp = 123456789;
    const second_restore_timestamp = 223456789;

    Services.prefs.setIntPref(PREF, first_restore_timestamp);
    registerCleanupFunction(() => Services.prefs.clearUserPref(PREF));

    const messages = await OnboardingMessageProvider.getMessages();
    const firstRestoreMessages = messages.filter(m =>
      m.id.startsWith("RESTORE_FROM_BACKUP")
    );
    Assert.greater(
      firstRestoreMessages.length,
      0,
      "Found restore messages in provider"
    );

    for (const message of firstRestoreMessages) {
      Assert.ok(
        message.id.endsWith(`_${first_restore_timestamp}`),
        `Message id is suffixed with first timestamp: ${message.id}`
      );
      Assert.ok(
        message.content.id.endsWith(`_${first_restore_timestamp}`),
        `Content id is suffixed with first timestamp: ${message.id}`
      );
    }

    // Simulate a new restore and fetch message ids
    Services.prefs.setIntPref(PREF, second_restore_timestamp);
    const messages2 = await OnboardingMessageProvider.getMessages();

    const secondRestoreMessages = messages2.filter(message =>
      message.id.startsWith("RESTORE_FROM_BACKUP")
    );
    Assert.greater(
      secondRestoreMessages.length,
      0,
      "Found restore messages in provider"
    );

    // Ensure all restore ids changed to the new suffix
    const firstRestoreMessageIds = new Set(
      firstRestoreMessages.map(message => message.id)
    );
    for (const message of secondRestoreMessages) {
      Assert.ok(
        message.id.endsWith(`_${second_restore_timestamp}`),
        `Message id is suffixed with new timestamp: ${message.id}`
      );
      Assert.ok(
        !firstRestoreMessageIds.has(message.id),
        "Second restore message id is different from first restore message id"
      );

      Assert.ok(
        !firstRestoreMessageIds.has(message.content.id),
        "Second restore content id is different from first restore content id"
      );
    }
  }
);

add_task(async function test_spotlight_restore_telemetry_uses_suffixed_ids() {
  const PREF = "browser.backup.profile-restoration-date";
  const timestamp = 123456789;

  Services.prefs.setIntPref(PREF, timestamp);
  registerCleanupFunction(() => Services.prefs.clearUserPref(PREF));

  // Avoiding panelTestProvider so we can use the helper created in OnboardingMessageProvider to append the timestmap
  let messages = await OnboardingMessageProvider.getMessages();
  let restoreMessage = messages.find(
    message =>
      message.id.startsWith("RESTORE_FROM_BACKUP") &&
      message.id.endsWith(`_${timestamp}`)
  );
  Assert.ok(
    restoreMessage,
    "Found timestamp-suffixed restore spotlight message"
  );
  const dispatchStub = sinon.stub();
  const win = await BrowserTestUtils.openNewBrowserWindow();

  Spotlight.showSpotlightDialog(
    win.gBrowser.selectedBrowser,
    restoreMessage,
    dispatchStub
  );

  await TestUtils.waitForCondition(
    () => win.document.readyState === "complete",
    "Waiting for restore spotlight to finish loading"
  );

  const baseId = restoreMessage.id.replace(/_\d+$/, "");
  Assert.ok(
    dispatchStub.neverCalledWithMatch(
      sinon.match({
        type: "IMPRESSION",
        data: sinon.match({ id: baseId.id }),
      })
    ),
    "IMPRESSION telemetry not dispatched with base message id"
  );

  Assert.ok(
    dispatchStub.calledWithMatch(
      sinon.match({
        type: "IMPRESSION",
        data: sinon.match({ id: restoreMessage.id }),
      })
    ),
    "IMPRESSION telemetry dispatched with timestamp suffixed message id"
  );
  await BrowserTestUtils.closeWindow(win);
});
