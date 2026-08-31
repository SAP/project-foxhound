/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Unit tests for SecurityOrchestrator (JSON Policy System)
 *
 * Focus: Critical security boundaries and core functionality
 * - Preference switch behavior (security on/off)
 * - Policy execution (allow/deny with real policies)
 * - Envelope validation (security boundary)
 * - Error handling (fail-closed)
 * - Session management (register/cleanup)
 */

const { SecurityOrchestrator, getSecurityOrchestrator } =
  ChromeUtils.importESModule(
    "chrome://global/content/ml/security/SecurityOrchestrator.sys.mjs"
  );

const PREF_SECURITY_ENABLED = "browser.ml.security.enabled";

const TEST_SESSION_ID = "test-session";

/** @type {SecurityOrchestrator|null} */
let orchestrator = null;

function setup() {
  Services.prefs.clearUserPref(PREF_SECURITY_ENABLED);
}

async function teardown() {
  Services.prefs.clearUserPref(PREF_SECURITY_ENABLED);
  await SecurityOrchestrator.resetForTesting();
  orchestrator = null;
}

/**
 * Test: initialization creates a session with ledger.
 *
 * Reason:
 * getSecurityOrchestrator() + registerSession() must initialize a functional
 * session with an empty ledger ready for URL seeding. This is the entry point
 * for all security layer operations.
 */
add_task(async function test_initialization_creates_session() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);

  Assert.ok(ledger, "Should return session ledger");
  Assert.equal(ledger.tabCount(), 0, "Should start with no tabs");
  Assert.ok(
    orchestrator.getSessionLedger(TEST_SESSION_ID),
    "Should be able to get session ledger"
  );

  await teardown();
});

/**
 * Test: preference switch disabled allows everything.
 *
 * Reason:
 * When browser.ml.security.enabled=false, all policy enforcement is
 * bypassed. This provides a debugging escape hatch and allows the
 * feature to be disabled without code changes.
 */
add_task(async function test_pref_switch_disabled_allows_everything() {
  setup();
  Services.prefs.setBoolPref(PREF_SECURITY_ENABLED, false);

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1"); // Empty ledger

  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: ["https://evil.com"], // Unseen URL
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "test-123",
    },
  });

  Assert.equal(
    decision.effect,
    "allow",
    "Pref switch OFF: should allow everything (pass-through)"
  );

  await teardown();
});

/**
 * Test: preference switch enabled enforces policies.
 *
 * Reason:
 * When browser.ml.security.enabled=true (the default), policies must
 * be enforced. Unseen URLs should be denied. This is the expected
 * production behavior.
 */
add_task(async function test_pref_switch_enabled_enforces_policies() {
  setup();
  Services.prefs.setBoolPref(PREF_SECURITY_ENABLED, true);

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1");

  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: ["https://evil.com"],
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "test-123",
    },
  });

  Assert.equal(decision.effect, "deny", "Pref switch ON: should enforce");
  Assert.equal(decision.code, "UNSEEN_LINK", "Should deny unseen links");

  await teardown();
});

/**
 * Test: preference switch responds to runtime changes.
 *
 * Reason:
 * The preference is checked on each evaluate() call, not cached at
 * initialization. This allows toggling security on/off without
 * restarting the browser or recreating the orchestrator.
 */
add_task(async function test_pref_switch_runtime_change() {
  setup();

  Services.prefs.setBoolPref(PREF_SECURITY_ENABLED, true);
  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1");

  const envelope = {
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: ["https://evil.com"],
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "req-1",
    },
  };

  // Should deny when enabled
  let decision = await orchestrator.evaluate(TEST_SESSION_ID, envelope);
  Assert.equal(decision.effect, "deny", "Should deny when enabled");

  // Disable at runtime
  Services.prefs.setBoolPref(PREF_SECURITY_ENABLED, false);

  // Should allow immediately
  decision = await orchestrator.evaluate(TEST_SESSION_ID, envelope);
  Assert.equal(
    decision.effect,
    "allow",
    "Should allow immediately after runtime disable"
  );

  await teardown();
});

/**
 * Test: invalid envelope throws error.
 *
 * Reason:
 * Malformed envelopes (missing phase, action, or context) indicate a
 * wiring bug. These should throw immediately so tests catch
 * the issue rather than silently failing.
 */
add_task(async function test_invalid_envelope_throws() {
  setup();
  Services.prefs.setBoolPref(PREF_SECURITY_ENABLED, true);
  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);

  await Assert.rejects(
    orchestrator.evaluate(TEST_SESSION_ID, null),
    /Security envelope is null or invalid/,
    "Null envelope should throw"
  );

  await Assert.rejects(
    orchestrator.evaluate(TEST_SESSION_ID, {
      action: { type: "test" },
      context: {},
    }),
    /Security envelope missing required fields/,
    "Missing phase should throw"
  );

  await Assert.rejects(
    orchestrator.evaluate(TEST_SESSION_ID, { phase: "test", context: {} }),
    /Security envelope missing required fields/,
    "Missing action should throw"
  );

  await Assert.rejects(
    orchestrator.evaluate(TEST_SESSION_ID, {
      phase: "test",
      action: { type: "test" },
    }),
    /Security envelope missing required fields/,
    "Missing context should throw"
  );

  await teardown();
});

/**
 * Test: policy allows seeded URL.
 *
 * Reason:
 * URLs added to the ledger represent user-visible, trusted content.
 * Tool calls requesting these URLs should be allowed. This is the
 * core functionality enabling legitimate AI-assisted browsing.
 */
add_task(async function test_policy_allows_seeded_url() {
  setup();
  Services.prefs.setBoolPref(PREF_SECURITY_ENABLED, true);
  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);

  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1").add("https://example.com");

  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: ["https://example.com"], // In ledger
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "test-123",
    },
  });

  Assert.equal(decision.effect, "allow", "Should allow seeded URL");

  await teardown();
});

/**
 * Test: policy denies unseen URL.
 *
 * Reason:
 * URLs not in the ledger are untrusted and potentially injected by
 * malicious page content. They must be denied to prevent prompt
 * injection attacks from directing tools to attacker-controlled URLs.
 */
add_task(async function test_policy_denies_unseen_url() {
  setup();
  Services.prefs.setBoolPref(PREF_SECURITY_ENABLED, true);
  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);

  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1"); // Empty ledger

  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: ["https://evil.com"], // Not in ledger
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "test-123",
    },
  });

  Assert.equal(decision.effect, "deny", "Should deny unseen URL");
  Assert.equal(decision.code, "UNSEEN_LINK", "Should have UNSEEN_LINK code");
  Assert.ok(decision.reason, "Should have reason");
  Assert.equal(
    decision.policyId,
    "block-unseen-links",
    "Should identify policy"
  );

  await teardown();
});

/**
 * Test: policy denies if any URL is unseen.
 *
 * Reason:
 * All-or-nothing security: a request with multiple URLs must have
 * all URLs in the ledger. If any URL is unseen, the entire request
 * is denied. Partial trust is not acceptable.
 */
add_task(async function test_policy_denies_if_any_url_unseen() {
  setup();
  Services.prefs.setBoolPref(PREF_SECURITY_ENABLED, true);
  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);

  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1").add("https://example.com");

  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: [
        "https://example.com", // OK
        "https://evil.com", // NOT OK
      ],
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "test-123",
    },
  });

  Assert.equal(
    decision.effect,
    "deny",
    "Should deny if ANY URL unseen (all-or-nothing)"
  );

  await teardown();
});

/**
 * Test: malformed URL fails closed.
 *
 * Reason:
 * URLs that cannot be parsed or normalized cannot be validated
 * against the ledger. They must be treated as unseen and denied
 * rather than allowed by default.
 */
add_task(async function test_malformed_url_fails_closed() {
  setup();
  Services.prefs.setBoolPref(PREF_SECURITY_ENABLED, true);
  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);

  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1");

  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: ["not-a-valid-url"],
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "test-123",
    },
  });

  Assert.equal(
    decision.effect,
    "deny",
    "Malformed URL should fail closed (deny)"
  );
  // Malformed URLs are treated as unseen (not in ledger) rather than
  // caught as specifically malformed
  Assert.equal(decision.code, "UNSEEN_LINK", "Should have UNSEEN_LINK code");

  await teardown();
});

/**
 * Test: unknown session throws error.
 *
 * Reason:
 * Requests for unregistered sessions indicate a wiring bug.
 * These should throw immediately so tests catch the issue.
 */
add_task(async function test_unknown_session_throws() {
  setup();
  Services.prefs.setBoolPref(PREF_SECURITY_ENABLED, true);
  orchestrator = await getSecurityOrchestrator();
  // Note: NOT calling registerSession()

  await Assert.rejects(
    orchestrator.evaluate("unknown-session", {
      phase: "tool.execution",
      action: {
        type: "tool.call",
        tool: "get_page_content",
        urls: ["https://example.com"],
        tabId: "tab-1",
      },
      context: {
        currentTabId: "tab-1",
        mentionedTabIds: [],
        requestId: "test-123",
      },
    }),
    /Session unknown-session is not registered/,
    "Unknown session should throw"
  );

  await teardown();
});

/**
 * Test: registerSession is idempotent.
 *
 * Reason:
 * Calling registerSession multiple times with the same sessionId should
 * not create duplicate ledgers or throw errors. This simplifies caller
 * logic and prevents accidental state corruption.
 */
add_task(async function test_register_session_idempotent() {
  setup();
  orchestrator = await getSecurityOrchestrator();

  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger1 = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger1.forTab("tab-1").add("https://example.com");

  // Register again - should not reset the ledger
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger2 = orchestrator.getSessionLedger(TEST_SESSION_ID);

  Assert.equal(ledger1, ledger2, "Should return same ledger instance");
  Assert.equal(
    ledger2.forTab("tab-1").lookup("https://example.com"),
    "https://example.com/",
    "Should return normalized URL, confirming ledger data preserved"
  );

  await teardown();
});

/**
 * Test: cleanupSession removes ledger.
 *
 * Reason:
 * When an AI Window closes, its session ledger must be removed to
 * prevent memory leaks and ensure clean state.
 */
add_task(async function test_cleanup_session_removes_ledger() {
  setup();
  orchestrator = await getSecurityOrchestrator();

  orchestrator.registerSession(TEST_SESSION_ID);
  Assert.ok(
    orchestrator.getSessionLedger(TEST_SESSION_ID),
    "Ledger should exist"
  );

  orchestrator.cleanupSession(TEST_SESSION_ID);
  Assert.equal(
    orchestrator.getSessionLedger(TEST_SESSION_ID),
    undefined,
    "Ledger should be removed after cleanup"
  );

  await teardown();
});

/**
 * Test: cleanupSession is idempotent.
 *
 * Reason:
 * Calling cleanupSession on a non-existent session should not throw.
 * This simplifies caller logic and handles edge cases gracefully.
 */
add_task(async function test_cleanup_session_idempotent() {
  setup();
  orchestrator = await getSecurityOrchestrator();

  // Should not throw even for non-existent session
  orchestrator.cleanupSession("non-existent-session");
  orchestrator.cleanupSession("non-existent-session");

  // Also should not throw after already cleaned up
  orchestrator.registerSession(TEST_SESSION_ID);
  orchestrator.cleanupSession(TEST_SESSION_ID);
  orchestrator.cleanupSession(TEST_SESSION_ID);

  await teardown();
});

/**
 * Test: registerSession rejects invalid sessionId.
 *
 * Reason:
 * Session IDs must be non-empty strings. Invalid IDs should be
 * rejected to prevent confusing state or security issues.
 */
add_task(async function test_register_session_rejects_invalid_id() {
  setup();
  orchestrator = await getSecurityOrchestrator();

  const invalidIds = [null, undefined, "", 123, {}, []];

  for (const invalidId of invalidIds) {
    Assert.throws(
      () => orchestrator.registerSession(invalidId),
      /registerSession requires a non-empty string sessionId/,
      `Should reject invalid sessionId: ${JSON.stringify(invalidId)}`
    );
  }

  await teardown();
});

/**
 * Test: getStats returns session count.
 *
 * Reason:
 * The stats should reflect the current number of registered sessions
 * for debugging and monitoring purposes.
 */
add_task(async function test_get_stats_returns_session_count() {
  setup();
  orchestrator = await getSecurityOrchestrator();

  let stats = orchestrator.getStats();
  Assert.equal(stats.sessionCount, 0, "Should start with 0 sessions");

  orchestrator.registerSession("session-1");
  orchestrator.registerSession("session-2");

  stats = orchestrator.getStats();
  Assert.equal(stats.sessionCount, 2, "Should have 2 sessions");
  Assert.ok(stats.sessionStats["session-1"], "Should have stats for session-1");
  Assert.ok(stats.sessionStats["session-2"], "Should have stats for session-2");

  orchestrator.cleanupSession("session-1");
  stats = orchestrator.getStats();
  Assert.equal(stats.sessionCount, 1, "Should have 1 session after cleanup");

  await teardown();
});
