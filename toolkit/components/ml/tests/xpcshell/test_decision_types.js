/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit tests for DecisionTypes.sys.mjs
 *
 * Tests the core type definitions and helpers for the security layer:
 * - SecurityPolicyError class (constructor, toJSON, throw/catch)
 * - Decision helper functions (allow, deny) - correct structure
 * - Type guards (isAllow, isDeny) - control flow correctness
 * - Constants (DenialCodes, ReasonPhrases) - expected values
 */

const {
  SecurityPolicyError,
  DenialCodes,
  ReasonPhrases,
  createAllowDecision,
  createDenyDecision,
  isAllowDecision,
  isDenyDecision,
} = ChromeUtils.importESModule(
  "chrome://global/content/ml/security/DecisionTypes.sys.mjs"
);

/**
 * Test: SecurityPolicyError constructor captures all decision properties.
 *
 * Reason:
 * SecurityPolicyError wraps deny decisions for structured error handling.
 * The constructor must capture code, policyId, reason, and details so that
 * error handlers can log meaningful security violation messages and take
 * appropriate action based on the denial reason.
 */
add_task(async function test_security_policy_error_constructor() {
  const decision = {
    effect: "deny",
    policyId: "test-policy",
    code: "TEST_CODE",
    reason: "Test reason message",
    details: { foo: "bar" },
  };

  const error = new SecurityPolicyError(decision);

  // Check properties that matter for error handling
  Assert.equal(error.name, "SecurityPolicyError", "Should have correct name");
  Assert.equal(
    error.message,
    "Test reason message",
    "Should have correct message"
  );
  Assert.equal(error.code, "TEST_CODE", "Should have correct code");
  Assert.equal(error.policyId, "test-policy", "Should have correct policyId");
  Assert.deepEqual(
    error.decision,
    decision,
    "Should store the full decision object"
  );
});

/**
 * Test: SecurityPolicyError.toJSON() serializes correctly.
 *
 * Reason:
 * Security errors need to be logged for debugging and auditing.
 * The toJSON() method must produce a JSON-serializable object
 * containing all relevant fields (code, policyId, message, decision).
 */
add_task(async function test_security_policy_error_toJSON() {
  const decision = {
    effect: "deny",
    policyId: "test-policy",
    code: "TEST_CODE",
    reason: "Test reason",
    details: { url: "https://example.com" },
  };

  const error = new SecurityPolicyError(decision);
  const json = error.toJSON();

  // Check serialized structure has all required fields
  Assert.equal(json.name, "SecurityPolicyError", "JSON should include name");
  Assert.equal(json.code, "TEST_CODE", "JSON should include code");
  Assert.equal(json.policyId, "test-policy", "JSON should include policyId");
  Assert.equal(json.message, "Test reason", "JSON should include message");
  Assert.deepEqual(
    json.decision,
    decision,
    "JSON should include full decision"
  );

  // Verify it's JSON-serializable (critical for logging/telemetry)
  const serialized = JSON.stringify(json);
  const parsed = JSON.parse(serialized);
  Assert.equal(parsed.code, "TEST_CODE", "Should round-trip through JSON");
});

/**
 * Test: SecurityPolicyError can be thrown and caught.
 *
 * Reason:
 * The security layer uses throw/catch for control flow when policies deny
 * requests. The error must behave as a standard Error subclass so it can
 * be caught, inspected, and handled by callers up the stack.
 */
add_task(async function test_error_throw_catch() {
  const decision = createDenyDecision("TEST_CODE", "Test reason");

  try {
    throw new SecurityPolicyError(decision);
  } catch (error) {
    Assert.equal(
      error.name,
      "SecurityPolicyError",
      "Should catch as SecurityPolicyError"
    );
    Assert.equal(error.code, "TEST_CODE", "Should have correct code");
    Assert.equal(error.message, "Test reason", "Should have correct message");
  }
});

/**
 * Test: createAllowDecision() returns correct structure.
 *
 * Reason:
 * Allow decisions are the "happy path" result. The helper must return
 * a minimal object with only `effect: "allow"` to keep the API simple
 * and avoid confusion with deny decision properties.
 */
add_task(async function test_allow_helper() {
  const decision = createAllowDecision();

  Assert.equal(decision.effect, "allow", "Should have effect 'allow'");
  Assert.equal(
    Object.keys(decision).length,
    1,
    "Should only have 'effect' property"
  );
});

/**
 * Test: createDenyDecision() with all parameters.
 *
 * Reason:
 * Deny decisions carry diagnostic information (code, reason, details, policyId)
 * needed for logging, debugging, and user feedback. The helper must correctly
 * assemble all provided parameters into the decision structure.
 */
add_task(async function test_deny_helper_full() {
  const decision = createDenyDecision(
    "TEST_CODE",
    "Test reason",
    { url: "https://example.com" },
    "custom-policy"
  );

  Assert.equal(decision.effect, "deny", "Should have effect 'deny'");
  Assert.equal(decision.code, "TEST_CODE", "Should have correct code");
  Assert.equal(decision.reason, "Test reason", "Should have correct reason");
  Assert.equal(
    decision.policyId,
    "custom-policy",
    "Should have custom policyId"
  );
  Assert.deepEqual(
    decision.details,
    { url: "https://example.com" },
    "Should have correct details"
  );
});

/**
 * Test: createDenyDecision() uses default policyId.
 *
 * Reason:
 * Most denials come from the "block-unseen-links" policy. Providing a sensible
 * default reduces boilerplate at call sites while still allowing override
 * when needed for other policies.
 */
add_task(async function test_deny_helper_default_policy() {
  const decision = createDenyDecision("TEST_CODE", "Test reason");

  Assert.equal(
    decision.policyId,
    "block-unseen-links",
    "Should use default policyId"
  );
  Assert.equal(
    decision.details,
    undefined,
    "Details should be undefined when not provided"
  );
});

/**
 * Test: isAllowDecision() returns true for allow decisions.
 *
 * Reason:
 * Type guards enable safe control flow based on decision type. isAllowDecision()
 * must correctly identify allow decisions so callers can branch logic without
 * risking property access errors on deny decisions.
 */
add_task(async function test_isAllow_with_allow_decision() {
  const decision = createAllowDecision();
  Assert.ok(isAllowDecision(decision), "Should return true for allow decision");
});

/**
 * Test: isAllowDecision() returns false for deny decisions.
 *
 * Reason:
 * The type guard must distinguish between decision types. Returning true
 * for a deny decision would cause callers to skip error handling, potentially
 * allowing unauthorized actions.
 */
add_task(async function test_isAllow_with_deny_decision() {
  const decision = createDenyDecision("CODE", "reason");
  Assert.ok(
    !isAllowDecision(decision),
    "Should return false for deny decision"
  );
});

/**
 * Test: isAllowDecision() handles null/undefined/invalid gracefully.
 *
 * Reason:
 * Defensive programming requires type guards to handle malformed input
 * without throwing. Returning false for invalid input ensures callers
 * fall through to denial handling rather than crashing.
 */
add_task(async function test_isAllow_with_invalid() {
  Assert.ok(!isAllowDecision(null), "Should return false for null");
  Assert.ok(!isAllowDecision(undefined), "Should return false for undefined");
  Assert.ok(!isAllowDecision({}), "Should return false for empty object");
  Assert.ok(
    !isAllowDecision({ effect: "maybe" }),
    "Should return false for invalid effect"
  );
});

/**
 * Test: isDenyDecision() returns true for deny decisions.
 *
 * Reason:
 * Type guards enable safe control flow based on decision type. isDenyDecision()
 * must correctly identify deny decisions so callers can extract error details
 * (code, reason, policyId) without risking undefined property access.
 */
add_task(async function test_isDeny_with_deny_decision() {
  const decision = createDenyDecision("CODE", "reason");
  Assert.ok(isDenyDecision(decision), "Should return true for deny decision");
});

/**
 * Test: isDenyDecision() returns false for allow decisions.
 *
 * Reason:
 * The type guard must distinguish between decision types. Returning true
 * for an allow decision would cause unnecessary error handling for
 * legitimate requests.
 */
add_task(async function test_isDeny_with_allow_decision() {
  const decision = createAllowDecision();
  Assert.ok(
    !isDenyDecision(decision),
    "Should return false for allow decision"
  );
});

/**
 * Test: isDenyDecision() handles null/undefined/invalid gracefully.
 *
 * Reason:
 * Defensive programming requires type guards to handle malformed input
 * without throwing. Returning false for invalid input ensures callers
 * don't incorrectly treat garbage data as a deny decision.
 */
add_task(async function test_isDeny_with_invalid() {
  Assert.ok(!isDenyDecision(null), "Should return false for null");
  Assert.ok(!isDenyDecision(undefined), "Should return false for undefined");
  Assert.ok(!isDenyDecision({}), "Should return false for empty object");
  Assert.ok(
    !isDenyDecision({ effect: "maybe" }),
    "Should return false for invalid effect"
  );
});

/**
 * Test: complete flow from createDenyDecision() to SecurityPolicyError to toJSON().
 *
 * Reason:
 * This integration test validates the full error handling pipeline used in
 * production: a policy creates a deny decision, wraps it in SecurityPolicyError,
 * and serializes it for logging. All data must flow through correctly.
 */
add_task(async function test_deny_to_error_to_json() {
  const decision = createDenyDecision(
    DenialCodes.UNSEEN_LINK,
    ReasonPhrases.UNSEEN_LINK,
    {
      url: "https://evil.com",
    }
  );

  const error = new SecurityPolicyError(decision);
  const json = error.toJSON();

  Assert.equal(json.code, "UNSEEN_LINK", "Should preserve code through chain");
  Assert.equal(
    json.message,
    "URL not in selected request context",
    "Should preserve reason through chain"
  );
  Assert.equal(
    json.policyId,
    "block-unseen-links",
    "Should have default policyId"
  );
  Assert.deepEqual(
    json.decision.details,
    { url: "https://evil.com" },
    "Should preserve details through chain"
  );
});

/**
 * Test: allow/deny decisions work correctly in control flow.
 *
 * Reason:
 * Validates the common pattern used throughout the codebase: check decision
 * type with guards, then branch accordingly. This ensures the helpers and
 * guards compose correctly for real-world usage.
 */
add_task(async function test_decision_control_flow() {
  const allowDecision = createAllowDecision();
  const denyDecision = createDenyDecision("CODE", "reason");

  // Simulate policy evaluation control flow
  function processDecision(decision) {
    if (isAllowDecision(decision)) {
      return "allowed";
    } else if (isDenyDecision(decision)) {
      return "denied";
    }
    return "unknown";
  }

  Assert.equal(
    processDecision(allowDecision),
    "allowed",
    "Should handle allow decision"
  );
  Assert.equal(
    processDecision(denyDecision),
    "denied",
    "Should handle deny decision"
  );
  Assert.equal(
    processDecision(null),
    "unknown",
    "Should handle invalid decision gracefully"
  );
});
