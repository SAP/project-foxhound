/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Integration tests for JSON Policy System
 *
 * Focus: End-to-end flows with real JSON policies
 * - Real policy loading from tool-execution-policies.json
 * - Critical allow/deny flows
 * - Integration with SecurityOrchestrator
 * - @Mentions support
 */

const { SecurityOrchestrator, getSecurityOrchestrator } =
  ChromeUtils.importESModule(
    "chrome://global/content/ml/security/SecurityOrchestrator.sys.mjs"
  );

const PREF_SECURITY_ENABLED = "browser.ml.security.enabled";
const POLICY_JSON_URL =
  "chrome://global/content/ml/security/policies/tool-execution-policies.json";

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
 * Test: JSON policy file loads and has valid structure.
 *
 * Reason:
 * The policy JSON file is fetched at runtime. This test validates that
 * the file exists, parses correctly, and contains the required fields
 * (id, phase, effect). Build-time validation catches authoring errors.
 */
add_task(async function test_json_policy_file_loads_and_validates() {
  const response = await fetch(POLICY_JSON_URL);
  const policyData = await response.json();

  // File exists and parses
  Assert.ok(response.ok, "Policy JSON should be accessible");
  Assert.ok(policyData.policies, "Should have policies array");
  Assert.greater(
    policyData.policies.length,
    0,
    "Should have at least one policy"
  );

  // First policy has required structure
  const policy = policyData.policies[0];
  Assert.ok(policy.id, "Policy should have id");
  Assert.ok(policy.phase, "Policy should have phase");
  Assert.ok(policy.effect, "Policy should have effect");

  await teardown();
});

/**
 * Test: SecurityOrchestrator initializes with policies loaded.
 *
 * Reason:
 * The orchestrator must load policies during initialization so they're
 * available for evaluation. This test verifies the full initialization
 * path works and policies are functional (not just loaded).
 */
add_task(async function test_orchestrator_initializes_with_policies() {
  setup();

  // If getSecurityOrchestrator succeeds, policies loaded correctly
  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);

  Assert.ok(ledger, "Should initialize successfully");
  Assert.ok(
    orchestrator.getSessionLedger(TEST_SESSION_ID),
    "Should have session ledger"
  );

  // Verify policies work by testing actual evaluation
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
      requestId: "test",
    },
  });

  Assert.equal(
    decision.effect,
    "deny",
    "Policies should be loaded and working (denies unseen URL)"
  );
  Assert.equal(
    decision.policyId,
    "block-unseen-links",
    "Should use JSON policy"
  );

  await teardown();
});

/**
 * Test: end-to-end deny for unseen link.
 *
 * Reason:
 * Core security behavior: URLs not in the ledger must be denied.
 * This validates the real JSON policy produces the expected denial
 * with correct code and policyId.
 */
add_task(async function test_e2e_deny_unseen_link() {
  setup();

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
      requestId: "test-deny",
    },
  });

  Assert.equal(
    decision.effect,
    "deny",
    "CRITICAL: Should deny unseen URL (real policy from JSON)"
  );
  Assert.equal(
    decision.code,
    "UNSEEN_LINK",
    "Should have UNSEEN_LINK code from JSON policy"
  );
  Assert.equal(
    decision.policyId,
    "block-unseen-links",
    "Should be from block-unseen-links policy"
  );

  await teardown();
});

/**
 * Test: end-to-end deny if any URL is unseen.
 *
 * Reason:
 * All-or-nothing security: if a request includes multiple URLs and
 * any one is unseen, the entire request must be denied. Partial
 * trust is not acceptable.
 */
add_task(async function test_e2e_deny_if_any_url_unseen() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  const tabLedger = ledger.forTab("tab-1");
  tabLedger.add("https://example.com");

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
      requestId: "test-deny-multiple",
    },
  });

  Assert.equal(
    decision.effect,
    "deny",
    "Should deny if ANY URL unseen (all-or-nothing security)"
  );
  Assert.equal(decision.code, "UNSEEN_LINK");

  await teardown();
});

/**
 * Test: end-to-end deny for malformed URL.
 *
 * Reason:
 * Fail-closed behavior: URLs that can't be parsed or normalized
 * cannot be validated against the ledger. They must be treated
 * as unseen and denied.
 */
add_task(async function test_e2e_deny_malformed_url() {
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
      requestId: "test-malformed",
    },
  });

  Assert.equal(
    decision.effect,
    "deny",
    "Should deny malformed URL (fail-closed)"
  );
  // Malformed URLs are treated as unseen (not in ledger) rather than
  // caught as specifically malformed
  Assert.equal(decision.code, "UNSEEN_LINK");

  await teardown();
});

/**
 * Test: end-to-end allow for seeded URL.
 *
 * Reason:
 * Core functionality: URLs that have been seeded into the ledger
 * (from user-visible page context) must be allowed. This is the
 * happy path for legitimate tool calls.
 */
add_task(async function test_e2e_allow_seeded_url() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  const tabLedger = ledger.forTab("tab-1");
  tabLedger.add("https://example.com");

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
      requestId: "test-allow",
    },
  });

  Assert.equal(
    decision.effect,
    "allow",
    "CRITICAL: Should allow seeded URL (real policy from JSON)"
  );

  await teardown();
});

/**
 * Test: end-to-end allow for multiple seeded URLs.
 *
 * Reason:
 * Tool calls may request multiple URLs. When all URLs are in the
 * ledger, the request should be allowed. Validates that the
 * allUrlsIn condition handles arrays correctly.
 */
add_task(async function test_e2e_allow_multiple_seeded_urls() {
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
      requestId: "test-allow-multiple",
    },
  });

  Assert.equal(decision.effect, "allow", "Should allow when all URLs seeded");

  await teardown();
});

/**
 * Test: end-to-end allow for empty URLs array.
 *
 * Reason:
 * Some tool calls don't require URL access. An empty URLs array
 * has nothing to validate, so the request should be allowed.
 */
add_task(async function test_e2e_allow_empty_urls() {
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
      urls: [], // No URLs to check
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "test-empty",
    },
  });

  Assert.equal(decision.effect, "allow", "Should allow when no URLs to check");

  await teardown();
});

/**
 * Test: end-to-end allow for URL from @mentioned tab.
 *
 * Reason:
 * The @mentions feature lets users explicitly grant access to URLs
 * from other tabs. When a URL exists in a mentioned tab's ledger,
 * the request should be allowed.
 */
add_task(async function test_e2e_allow_url_from_mentioned_tab() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);

  // Current tab
  ledger.forTab("tab-1").add("https://example.com");

  // Mentioned tab (different URL)
  ledger.forTab("tab-2").add("https://mozilla.org");

  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: ["https://mozilla.org"], // From @mentioned tab
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: ["tab-2"], // @mention tab-2
      requestId: "test-mention-allow",
    },
  });

  Assert.equal(
    decision.effect,
    "allow",
    "Should allow URL from @mentioned tab (merged ledger)"
  );

  await teardown();
});

/**
 * Test: end-to-end deny for URL not in current or @mentioned tabs.
 *
 * Reason:
 * Even with @mentions, URLs must exist in some trusted ledger.
 * A URL not present in the current tab or any mentioned tab
 * must still be denied.
 */
add_task(async function test_e2e_deny_url_not_in_mentioned_tabs() {
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
      urls: ["https://evil.com"], // Not in tab-1 or tab-2
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: ["tab-2"],
      requestId: "test-mention-deny",
    },
  });

  Assert.equal(
    decision.effect,
    "deny",
    "Should deny URL not in current or @mentioned tabs"
  );

  await teardown();
});

/**
 * Test: end-to-end URL normalization strips fragments.
 *
 * Reason:
 * URLs differing only by fragment (#section) refer to the same resource.
 * Normalization ensures a user who visited `page` can access `page#section`
 * without false denials.
 */
add_task(async function test_e2e_url_normalization_strips_fragments() {
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
      requestId: "test-normalize",
    },
  });

  Assert.equal(
    decision.effect,
    "allow",
    "Should allow after normalizing (fragments stripped)"
  );

  await teardown();
});

/**
 * Test: end-to-end preference switch bypasses policies.
 *
 * Reason:
 * The preference switch (browser.ml.security.enabled=false) must bypass all
 * policy enforcement, allowing everything through. This enables
 * debugging and provides an escape hatch if policies cause issues.
 */
add_task(async function test_e2e_pref_switch_bypasses_policies() {
  setup();

  // Disable security
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
      urls: ["https://evil.com"], // Unseen, but pref switch is off
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "test-prefswitch",
    },
  });

  Assert.equal(
    decision.effect,
    "allow",
    "Pref switch OFF: should bypass all policies (allow everything)"
  );

  await teardown();
});
