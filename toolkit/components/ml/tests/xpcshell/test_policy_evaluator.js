/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit tests for PolicyEvaluator.sys.mjs
 *
 * Note: PolicyEvaluator is used internally by SecurityOrchestrator.
 * These tests verify policy evaluation behavior through the public API
 * rather than testing internal implementation details.
 *
 * Focus: Policy matching, deny/allow effects, multiple conditions
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
 * Test: policy matches the correct phase.
 *
 * Reason:
 * Policies are scoped to specific phases (e.g., "tool.execution").
 * A policy should only evaluate when the envelope's phase matches,
 * ensuring policies don't interfere with unrelated operations.
 */
add_task(async function test_policy_matches_correct_phase() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1");

  // tool.execution phase should match our policies
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
    "Policy should match tool.execution phase"
  );
  Assert.equal(decision.policyId, "block-unseen-links");

  await teardown();
});

/**
 * Test: policy ignores unknown phases.
 *
 * Reason:
 * When no policy matches the requested phase, the default behavior
 * is to allow. This ensures new phases can be added without requiring
 * policy updates, and unknown phases don't cause false denials.
 */
add_task(async function test_policy_ignores_unknown_phase() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1");

  // Unknown phase should not match any policies
  const decision = await orchestrator.evaluate(TEST_SESSION_ID, {
    phase: "unknown.phase",
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
    "allow",
    "Unknown phase should not match policies (allow by default)"
  );

  await teardown();
});

/**
 * Test: deny policy denies when condition fails.
 *
 * Reason:
 * A deny policy with a failing condition (URL not in ledger) must
 * produce a deny decision with code, reason, policyId, and details.
 * This is the core security enforcement mechanism.
 */
add_task(async function test_deny_policy_denies_when_condition_fails() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1").add("https://example.com");

  // URL not in ledger = condition fails = deny
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
      requestId: "test",
    },
  });

  Assert.equal(decision.effect, "deny", "Should deny when condition fails");
  Assert.equal(decision.code, "UNSEEN_LINK");
  Assert.ok(decision.reason, "Should have reason");
  Assert.equal(decision.policyId, "block-unseen-links");
  Assert.ok(decision.details, "Should include failure details");

  await teardown();
});

/**
 * Test: deny policy passes through when condition passes.
 *
 * Reason:
 * A deny policy only blocks when its condition fails. When the condition
 * passes (all URLs in ledger), the policy doesn't apply and the request
 * is allowed. This ensures legitimate requests aren't blocked.
 */
add_task(
  async function test_deny_policy_passes_through_when_condition_passes() {
    setup();

    orchestrator = await getSecurityOrchestrator();
    orchestrator.registerSession(TEST_SESSION_ID);
    const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
    ledger.forTab("tab-1").add("https://example.com");

    // URL in ledger = condition passes = policy doesn't apply (allow)
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
        requestId: "test",
      },
    });

    Assert.equal(
      decision.effect,
      "allow",
      "Should allow when deny policy condition passes (policy doesn't apply)"
    );

    await teardown();
  }
);

/**
 * Test: policy checks all URLs in the request.
 *
 * Reason:
 * All-or-nothing security: if any URL in the request is unseen,
 * the entire request must be denied. Checking only the first URL
 * would allow attackers to smuggle unseen URLs in multi-URL requests.
 */
add_task(async function test_policy_checks_all_urls() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1").add("https://example.com");
  // Not adding evil.com

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
      requestId: "test",
    },
  });

  Assert.equal(
    decision.effect,
    "deny",
    "Should deny if ANY URL fails condition (all-or-nothing)"
  );

  await teardown();
});

/**
 * Test: policy allows when all URLs are valid.
 *
 * Reason:
 * When every URL in the request exists in the ledger, the condition
 * passes and the request is allowed. This validates the happy path
 * for multi-URL tool calls.
 */
add_task(async function test_policy_allows_when_all_urls_valid() {
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
      urls: ["https://example.com", "https://mozilla.org"], // Both OK
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
    "Should allow when all URLs pass condition"
  );

  await teardown();
});

/**
 * Test: policy applies to get_page_content tool.
 *
 * Reason:
 * The get_page_content tool fetches external URLs and is the primary
 * vector for prompt injection attacks. The block-unseen-links policy
 * must apply to this tool to prevent malicious URL access.
 */
add_task(async function test_policy_applies_to_get_page_content() {
  setup();

  orchestrator = await getSecurityOrchestrator();
  orchestrator.registerSession(TEST_SESSION_ID);
  const ledger = orchestrator.getSessionLedger(TEST_SESSION_ID);
  ledger.forTab("tab-1");

  // Verify policy applies to get_page_content (the main URL-fetching tool)
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
    "Policy should apply to get_page_content"
  );

  await teardown();
});

/**
 * Test: deny decision includes policy information.
 *
 * Reason:
 * Deny decisions must include diagnostic information (code, reason,
 * policyId, details) for logging and debugging. This helps identify
 * which policy blocked a request and why.
 */
add_task(async function test_deny_decision_includes_policy_info() {
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
      urls: ["https://evil.com"],
      tabId: "tab-1",
    },
    context: {
      currentTabId: "tab-1",
      mentionedTabIds: [],
      requestId: "test",
    },
  });

  // Verify decision structure
  Assert.equal(decision.effect, "deny", "Should have effect");
  Assert.equal(decision.code, "UNSEEN_LINK", "Should have code");
  Assert.ok(decision.reason, "Should have reason");
  Assert.equal(
    decision.policyId,
    "block-unseen-links",
    "Should identify policy"
  );
  Assert.ok(decision.details, "Should have details");
  Assert.ok(
    decision.details.failedCondition,
    "Should identify failed condition"
  );

  await teardown();
});
