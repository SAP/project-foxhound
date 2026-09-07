/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit tests for ConditionEvaluator.sys.mjs
 *
 * Note: ConditionEvaluator is an internal module used by PolicyEvaluator.
 * These tests verify it through SecurityOrchestrator (the public API) rather
 * than testing internal implementation details.
 *
 * Focus: Testing condition evaluation behavior through policy execution
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
 * Test: condition passes when all URLs are present in the ledger.
 *
 * Reason:
 * The `allUrlsIn` condition should allow a tool call only when
 * every URL in `action.urls` exists in the request-scoped ledger.
 * This ensures that tool execution is restricted to trusted,
 * user-visible URLs and prevents unseen-link tool calls.
 */
add_task(async function test_condition_passes_when_all_urls_in_ledger() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  const tabLedger = ledger.forTab("tab-1");
  tabLedger.add("https://example.com");
  tabLedger.add("https://mozilla.org");

  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: ["https://example.com", "https://mozilla.org"],
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "test",
    },
  });

  Assert.equal(
    decision.effect,
    "allow",
    "Should allow when all URLs in ledger (condition passes)"
  );

  await teardown();
});

/**
 * Test: condition fails when any URL is missing from the ledger.
 *
 * Reason:
 * If even one URL in `action.urls` is not in the ledger, the condition
 * must fail and deny the request. This enforces all-or-nothing security —
 * partial trust is not acceptable for URL-based tool access.
 */
add_task(async function test_condition_fails_when_url_missing_from_ledger() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1").add("https://example.com");

  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: ["https://example.com", "https://evil.com"], // evil.com not in ledger
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "test",
    },
  });

  Assert.equal(
    decision.effect,
    "deny",
    "Should deny when URL not in ledger (condition fails)"
  );
  Assert.equal(decision.code, "UNSEEN_LINK");

  await teardown();
});

/**
 * Test: condition passes with an empty URLs array.
 *
 * Reason:
 * When no URLs are requested, there's nothing to validate. The condition
 * should pass (vacuous truth) since there are no untrusted URLs to block.
 * This allows tools that don't require URL access to proceed.
 */
add_task(async function test_condition_passes_with_empty_urls_array() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1");

  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: [], // Empty array
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "test",
    },
  });

  Assert.equal(
    decision.effect,
    "allow",
    "Should allow with empty URLs (nothing to check)"
  );

  await teardown();
});

/**
 * Test: condition fails with a malformed URL.
 *
 * Reason:
 * Malformed URLs cannot be normalized or matched against the ledger.
 * The security layer must fail-closed: if a URL can't be validated,
 * it's treated as unseen and denied rather than allowed.
 */
add_task(async function test_condition_fails_with_malformed_url() {
  setup();

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
      requestId: "test",
    },
  });

  Assert.equal(
    decision.effect,
    "deny",
    "Should deny malformed URL (condition/validation fails)"
  );
  // Malformed URLs are treated as unseen (not in ledger) rather than
  // caught as specifically malformed at this layer
  Assert.equal(decision.code, "UNSEEN_LINK");

  await teardown();
});

/**
 * Test: condition checks current tab's ledger only (no mentions).
 *
 * Reason:
 * When no @mentioned tabs are provided, the security check should only
 * consider URLs from the current tab's ledger. This establishes the
 * baseline isolation behavior before testing cross-tab merging.
 */
add_task(async function test_condition_checks_current_tab_only() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1").add("https://example.com");

  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
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
      requestId: "test",
    },
  });

  Assert.equal(
    decision.effect,
    "allow",
    "Should check current tab ledger only"
  );

  await teardown();
});

/**
 * Test: condition merges current tab with @mentioned tabs.
 *
 * Reason:
 * The @mentions feature allows users to explicitly grant access to URLs
 * from other tabs. When `mentionedTabIds` is provided, the security layer
 * must merge those ledgers with the current tab's ledger for validation.
 * This enables cross-tab workflows while maintaining explicit user consent.
 */
add_task(async function test_condition_merges_mentioned_tabs() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);

  ledger.forTab("tab-1").add("https://example.com");
  ledger.forTab("tab-2").add("https://mozilla.org");

  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: ["https://mozilla.org"],
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: ["tab-2"],
      requestId: "test",
    },
  });

  Assert.equal(
    decision.effect,
    "allow",
    "Should merge current tab + @mentioned tabs"
  );

  await teardown();
});

/**
 * Test: condition normalizes URLs before comparison.
 *
 * Reason:
 * URLs that differ only in fragments (#section) refer to the same resource.
 * The security layer must normalize URLs (stripping fragments, default ports,
 * etc.) so that superficial differences don't cause false denials. A user
 * who visited `example.com/page` should be allowed to access `example.com/page#section`.
 */
add_task(async function test_condition_normalizes_urls() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1").add("https://example.com/page"); // No fragment

  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: ["https://example.com/page#section"], // Has fragment
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "test",
    },
  });

  Assert.equal(
    decision.effect,
    "allow",
    "Should allow after normalizing URLs (fragments stripped)"
  );

  await teardown();
});
