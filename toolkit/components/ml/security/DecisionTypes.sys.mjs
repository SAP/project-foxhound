/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-nocheck - TODO - Remove this to type check this file.

/**
 * Type definitions and helpers for the Smart Window security layer.
 * Defines SecurityDecision, DenialCodes, and allow/deny helper functions.
 */

/**
 * Security decision allowing an action to proceed.
 *
 * @typedef {object} SecurityDecisionAllow
 * @property {"allow"} effect - The decision effect
 */

/**
 * Security decision denying an action with structured error information.
 *
 * @typedef {object} SecurityDecisionDeny
 * @property {"deny"} effect - The decision effect
 * @property {string} policyId - The policy that made this decision (e.g., "block-unseen-links")
 * @property {string} code - Denial code (see DenialCodes)
 * @property {string} reason - Explanation of the denial
 * @property {object} [details] - Optional additional context for logging/debugging
 */

/**
 * Result of policy evaluation.
 * Either allows the action or denies it with structured error information.
 *
 * @typedef {SecurityDecisionAllow | SecurityDecisionDeny} SecurityDecision
 */

/**
 * An action being evaluated by the security layer.
 *
 * Represents a request to perform an operation (e.g., tool call) that
 * requires security validation.
 *
 * @typedef {object} SecurityAction
 * @property {"tool.call"} type - Action type (extensible for future action types)
 * @property {string} tool - Tool name (case-sensitive, matches dispatcher constants)
 * @property {string[]} [urls] - URLs being accessed by the tool (always array, may be empty)
 * @property {string} tabId - The originating tab ID for this action
 * @property {object} [args] - Original tool arguments (for logging/debugging)
 */

/**
 * Request-scoped context for policy evaluation.
 *
 * Security Note:
 * Context is rebuilt for each request and discarded afterward to prevent
 * cross-request authorization leakage.
 *
 * @typedef {object} SecurityContext
 * @property {TabLedger} linkLedger - Request-scoped link ledger (union of authorized sources)
 * @property {string} sessionId - Smart Window session identifier
 * @property {string} requestId - Individual request identifier (for logging/correlation)
 * @property {string} currentTabId - The active/focused tab
 * @property {string[]} [mentionedTabIds] - Tab IDs explicitly referenced via @mentions (future)
 */

/**
 * Structured error thrown when a security policy denies an action.
 *
 * This error allows the tool dispatcher to catch and handle policy denials
 * gracefully, distinguishing them from other errors (e.g., network failures).
 */
export class SecurityPolicyError extends Error {
  /**
   * Creates a structured error from a denial decision.
   *
   * @param {SecurityDecisionDeny} decision - The denial decision
   */
  constructor(decision) {
    super(decision.reason);
    this.name = "SecurityPolicyError";
    this.code = decision.code;
    this.policyId = decision.policyId;
    this.decision = decision;
  }

  /**
   * Serializes the error for structured logging.
   * Avoids circular references and provides stable JSON output.
   *
   * @returns {object} Structured representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      policyId: this.policyId,
      message: this.message,
      decision: this.decision,
    };
  }
}

/**
 * @typedef {'allow' | 'deny'} PolicyEffect
 */

/** @type {PolicyEffect} */
export const EFFECT_ALLOW = "allow";

/** @type {PolicyEffect} */
export const EFFECT_DENY = "deny";

// Standard denial codes for consistent error handling across the security layer.
export const DenialCodes = Object.freeze({
  // URL not present in the request-scoped link ledger.
  // e.g., "block-unseen-links" policy
  UNSEEN_LINK: "UNSEEN_LINK",

  // URL parsing or normalization failed.
  // Fail-closed behavior: treat malformed URLs as untrusted.
  MALFORMED_URL: "MALFORMED_URL",

  // Required context (e.g., link ledger, tab ID) not provided.
  // Fail-closed behavior: cannot evaluate without proper context.
  MISSING_CONTEXT: "MISSING_CONTEXT",

  // Policy enforcement is disabled (from policy configuration file).
  POLICY_DISABLED: "POLICY_DISABLED",
});

// Standard reason phrases for denial codes.
export const ReasonPhrases = Object.freeze({
  UNSEEN_LINK: "URL not in selected request context",
  MALFORMED_URL: "Failed to parse or normalize URL",
  MISSING_CONTEXT: "Missing required evaluation context",
  POLICY_DISABLED: "Policy enforcement disabled",
});

/**
 * Creates an "allow" decision.
 *
 * @returns {SecurityDecisionAllow} Allow decision
 */
export const createAllowDecision = () =>
  /** @type {SecurityDecisionAllow} */ ({
    effect: EFFECT_ALLOW,
  });

/**
 * Creates a "deny" decision with structured error information.
 *
 * @param {string} code - Denial code from DenialCodes
 * @param {string} reason - Reason phrase for denial (from ReasonPhrases)
 * @param {object} [details] - Optional additional context
 * @param {string} [policyId="block-unseen-links"] - The policy making this decision
 * @returns {SecurityDecisionDeny} Deny decision
 */
export const createDenyDecision = (
  code,
  reason,
  details = undefined,
  policyId = "block-unseen-links"
) =>
  /** @type {SecurityDecisionDeny} */ ({
    effect: EFFECT_DENY,
    policyId,
    code,
    reason,
    details,
  });

/**
 * Type guard: checks if a decision is an allow.
 *
 * @param {SecurityDecision | undefined | null} decision - Decision to check
 * @returns {boolean} True if decision is allow
 */
export const isAllowDecision = decision => decision?.effect === EFFECT_ALLOW;

/**
 * Type guard: checks if a decision is a deny.
 *
 * @param {SecurityDecision | undefined | null} decision - Decision to check
 * @returns {boolean} True if decision is deny
 */
export const isDenyDecision = decision => decision?.effect === EFFECT_DENY;
