/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit tests for SecurityLogger.sys.mjs
 *
 * Tests verify that logging operations complete without error.
 * The logger outputs to Browser Console for developer debugging.
 */

const { logSecurityEvent } = ChromeUtils.importESModule(
  "chrome://global/content/ml/security/SecurityLogger.sys.mjs"
);

function createTestEntry(overrides = {}) {
  return {
    requestId: "req-123",
    sessionId: "session-456",
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "get_page_content",
      urls: ["https://example.com/page"],
      args: { mode: "full" },
    },
    context: {
      tainted: true,
      trustedCount: 5,
    },
    decision: {
      effect: "allow",
    },
    durationMs: 1.5,
    ...overrides,
  };
}

/**
 * Test: logSecurityEvent completes without error.
 *
 * Reason:
 * Basic smoke test—logging should never throw. Failures in logging
 * shouldn't break security evaluation flow.
 */
add_task(function test_logSecurityEvent_completes_without_error() {
  logSecurityEvent(createTestEntry());
  Assert.ok(true, "logSecurityEvent() completed without error");
});

/**
 * Test: logSecurityEvent handles deny decisions.
 *
 * Reason:
 * Deny decisions include extra fields (policyId, code, reason).
 * Logger must handle the full deny structure without error.
 */
add_task(function test_logSecurityEvent_handles_deny_decision() {
  logSecurityEvent(
    createTestEntry({
      decision: {
        effect: "deny",
        policyId: "block-unseen-links",
        code: "UNSEEN_LINK",
        reason: "URL not in trusted context",
      },
    })
  );
  Assert.ok(true, "logSecurityEvent() handles deny decision without error");
});

/**
 * Test: logSecurityEvent handles missing optional fields.
 *
 * Reason:
 * Not all actions have URLs or args. Logger must gracefully handle
 * minimal entries without throwing on missing optional fields.
 */
add_task(function test_logSecurityEvent_handles_missing_optional_fields() {
  logSecurityEvent({
    requestId: "req-minimal",
    sessionId: "session-minimal",
    phase: "tool.execution",
    action: {
      type: "tool.call",
      tool: "search_tabs",
    },
    context: {},
    decision: { effect: "allow" },
    durationMs: 0.5,
  });
  Assert.ok(
    true,
    "logSecurityEvent() handles missing optional fields without error"
  );
});

/**
 * Test: logSecurityEvent handles error entries.
 *
 * Reason:
 * When evaluation fails with an exception, the error is logged.
 * Logger must handle Error objects without throwing.
 */
add_task(function test_logSecurityEvent_handles_error_entry() {
  logSecurityEvent(
    createTestEntry({
      error: new Error("Test error"),
    })
  );
  Assert.ok(true, "logSecurityEvent() handles error entries without error");
});

/**
 * Test: logSecurityEvent handles multiple URLs.
 *
 * Reason:
 * Tool calls may request multiple URLs. Logger must handle
 * multiple URLs without error.
 */
add_task(function test_logSecurityEvent_handles_multiple_urls() {
  logSecurityEvent(
    createTestEntry({
      action: {
        type: "tool.call",
        tool: "get_page_content",
        urls: [
          "https://example.com/page1",
          "https://example.com/page2",
          "https://example.com/page3",
        ],
      },
    })
  );
  Assert.ok(true, "logSecurityEvent() handles multiple URLs without error");
});
