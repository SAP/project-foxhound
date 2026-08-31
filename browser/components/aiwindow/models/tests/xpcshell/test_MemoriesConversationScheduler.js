/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

do_get_profile();
("use strict");

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { MemoriesConversationScheduler } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesConversationScheduler.sys.mjs"
);
const { MemoriesManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs"
);
const { PREF_GENERATE_MEMORIES_FROM_CONVERSATION } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesConstants.sys.mjs"
);
const { ChatStore, ChatMessage, MESSAGE_ROLE } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
);

// Clear memories pref after testing
add_setup(async function () {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(PREF_GENERATE_MEMORIES_FROM_CONVERSATION);
  });
});

/**
 * Builds fake chat history data for testing
 *
 * @param {number} numMessagesToCreate  Number of user messages to create (default: 10)
 * @returns {Promise<ChatMessage[]>}    Array of ChatMessage instances
 */
async function buildFakeChatHistory(numMessagesToCreate = 10) {
  const fixedNow = 1_700_000_000_000;

  let messages = [];
  for (let i = 0; i < numMessagesToCreate; i++) {
    messages.push(
      new ChatMessage({
        createdDate: fixedNow - i * 10_000,
        ordinal: i + 1,
        role: MESSAGE_ROLE.USER,
        content: { type: "text", body: `Test message ${i + 1}` },
        pageUrl: `https://example.com/${i + 1}`,
        turnIndex: 0,
      })
    );
  }

  return messages;
}

/**
 * Tests the scheduler does not initialize when the memories preference is false
 */
add_task(async function test_schedule_not_init_when_pref_false() {
  Services.prefs.setBoolPref(PREF_GENERATE_MEMORIES_FROM_CONVERSATION, false);

  let scheduler = MemoriesConversationScheduler.maybeInit();
  Assert.equal(
    scheduler,
    null,
    "Scheduler should not be initialized when pref is false"
  );
});

/**
 * Tests the scheduler initializes but does not run when there aren't enough messages
 */
add_task(async function test_scheduler_doesnt_run_with_insufficient_messages() {
  Services.prefs.setBoolPref(PREF_GENERATE_MEMORIES_FROM_CONVERSATION, true);

  // Need at least 10 messages for memories generation to trigger
  // 5 will cause the expected failure
  const messages = await buildFakeChatHistory(5);
  const sb = sinon.createSandbox();

  try {
    const findMessagesStub = sb
      .stub(ChatStore, "findMessagesByDate")
      .callsFake(async () => {
        return messages;
      });

    const lastTsStub = sb
      .stub(MemoriesManager, "getLastConversationMemoryTimestamp")
      .resolves(0);

    const generateStub = sb
      .stub(MemoriesManager, "generateMemoriesFromConversationHistory")
      .resolves();

    sb.stub(MemoriesManager, "shouldEnableMemoriesFromSchedulers").returns(
      true
    );

    let scheduler = MemoriesConversationScheduler.maybeInit();
    Assert.ok(scheduler, "Scheduler should be initialized when pref is true");

    await scheduler.runNowForTesting();
    Assert.ok(
      findMessagesStub.calledOnce,
      "Should check for recent messages once"
    );
    Assert.ok(lastTsStub.calledOnce, "Should check last memory timestamp once");
    Assert.ok(
      !generateStub.calledOnce,
      "Memories generation should not be triggered with only 5 messages"
    );
  } finally {
    sb.restore();
  }
});

/**
 * Tests that an HTTP 429 sets a backoff and the next tick is a no-op.
 */
add_task(async function test_429_triggers_backoff() {
  Services.prefs.setBoolPref(PREF_GENERATE_MEMORIES_FROM_CONVERSATION, true);

  const messages = await buildFakeChatHistory();
  const sb = sinon.createSandbox();

  let scheduler;
  try {
    sb.stub(MemoriesManager, "shouldEnableMemoriesFromSchedulers").returns(
      true
    );
    sb.stub(ChatStore, "findMessagesByDate").resolves(messages);
    sb.stub(MemoriesManager, "getLastConversationMemoryTimestamp").resolves(0);

    const rateLimitErr = new Error("Too Many Requests");
    rateLimitErr.status = 429;
    const generateStub = sb
      .stub(MemoriesManager, "generateMemoriesFromConversationHistory")
      .rejects(rateLimitErr);

    scheduler = MemoriesConversationScheduler.maybeInit();

    // First tick: generate fails with 429 → backoff is set.
    await scheduler.runNowForTesting();
    sinon.assert.calledOnce(generateStub);

    // Second tick within backoff window: should be a no-op.
    await scheduler.runNowForTesting();
    sinon.assert.calledOnce(generateStub);

    // Clear backoff; next tick should attempt generation again.
    scheduler.setBackoffUntilMsForTesting(0);
    await scheduler.runNowForTesting();
    sinon.assert.calledTwice(generateStub);
  } finally {
    scheduler?.destroy?.();
    sb.restore();
  }
});

/**
 * Tests that a non-429 error does NOT trigger backoff — subsequent ticks retry.
 */
add_task(async function test_non_429_error_does_not_backoff() {
  Services.prefs.setBoolPref(PREF_GENERATE_MEMORIES_FROM_CONVERSATION, true);

  const messages = await buildFakeChatHistory();
  const sb = sinon.createSandbox();

  let scheduler;
  try {
    sb.stub(MemoriesManager, "shouldEnableMemoriesFromSchedulers").returns(
      true
    );
    sb.stub(ChatStore, "findMessagesByDate").resolves(messages);
    sb.stub(MemoriesManager, "getLastConversationMemoryTimestamp").resolves(0);

    const generateStub = sb
      .stub(MemoriesManager, "generateMemoriesFromConversationHistory")
      .rejects(new Error("network glitch"));

    scheduler = MemoriesConversationScheduler.maybeInit();

    await scheduler.runNowForTesting();
    sinon.assert.calledOnce(generateStub);

    // Second tick should retry — no backoff for non-429 errors.
    await scheduler.runNowForTesting();
    sinon.assert.calledTwice(generateStub);
  } finally {
    scheduler?.destroy?.();
    sb.restore();
  }
});

/**
 * Tests the scheduler initializes and runs when there are enough messages
 */
add_task(async function test_scheduler_runs_with_small_history() {
  Services.prefs.setBoolPref(PREF_GENERATE_MEMORIES_FROM_CONVERSATION, true);

  const messages = await buildFakeChatHistory();
  const sb = sinon.createSandbox();

  try {
    sb.stub(MemoriesManager, "shouldEnableMemoriesFromSchedulers").returns(
      true
    );

    const findMessagesStub = sb
      .stub(ChatStore, "findMessagesByDate")
      .callsFake(async () => {
        return messages;
      });

    const lastTsStub = sb
      .stub(MemoriesManager, "getLastConversationMemoryTimestamp")
      .resolves(0);

    const generateStub = sb
      .stub(MemoriesManager, "generateMemoriesFromConversationHistory")
      .resolves();

    let scheduler = MemoriesConversationScheduler.maybeInit();
    Assert.ok(scheduler, "Scheduler should be initialized when pref is true");

    await scheduler.runNowForTesting();
    Assert.ok(
      findMessagesStub.calledOnce,
      "Should check for recent messages once"
    );
    Assert.ok(lastTsStub.calledOnce, "Should check last memory timestamp once");
    Assert.ok(
      generateStub.calledOnce,
      "Memories generation should be triggered once"
    );
  } finally {
    sb.restore();
  }
});
