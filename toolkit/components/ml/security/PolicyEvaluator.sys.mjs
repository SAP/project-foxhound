/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-nocheck - TODO - Remove this to type check this file.

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = XPCOMUtils.declareLazy({
  EFFECT_ALLOW: "chrome://global/content/ml/security/DecisionTypes.sys.mjs",
  EFFECT_DENY: "chrome://global/content/ml/security/DecisionTypes.sys.mjs",
  createAllowDecision:
    "chrome://global/content/ml/security/DecisionTypes.sys.mjs",
  createDenyDecision:
    "chrome://global/content/ml/security/DecisionTypes.sys.mjs",
  evaluateCondition:
    "chrome://global/content/ml/security/ConditionEvaluator.sys.mjs",
  resolveConditionPath:
    "chrome://global/content/ml/security/ConditionEvaluator.sys.mjs",
  console: () =>
    console.createInstance({
      maxLogLevelPref: "browser.ml.logLevel",
      prefix: "PolicyEvaluator",
    }),
});

/**
 * Evaluates JSON-based security policies using "first deny wins" strategy.
 * Delegates condition evaluation to ConditionEvaluator.
 */

/**
 * Checks if a policy's match criteria applies to an action.
 * Supports exact matches, OR conditions (pipe separator), and wildcards (*).
 *
 * Match criteria use dot-notation paths and support:
 * - Exact matches: "get_page_content"
 * - OR conditions: "get_page_content|search_history"
 * - Wildcards: "*" (matches anything)
 *
 * All criteria must match for policy to apply.
 *
 * @example
 * // Exact match - Policy from tool-execution-policies.json:
 * // "match": { "action.type": "tool.call", "action.tool": "get_page_content" }
 * //
 * // Action from AI Window tool dispatch:
 * // { type: "tool.call", tool: "get_page_content", urls: [...], tabId: "tab-1" }
 * //
 * // checkPolicyMatch resolves "action.type" -> "tool.call" and
 * // "action.tool" -> "get_page_content", both match, so returns true.
 *
 * @example
 * // OR condition - Policy matching multiple tools:
 * // "match": { "action.tool": "get_page_content|search_history" }
 * //
 * // Action: { type: "tool.call", tool: "search_history", query: "..." }
 * //
 * // checkPolicyMatch resolves "action.tool" -> "search_history", which
 * // matches one of the OR options, so returns true.
 *
 * @example
 * // Wildcard - Policy matching all tools:
 * // "match": { "action.type": "tool.call", "action.tool": "*" }
 * //
 * // Action: { type: "tool.call", tool: "any_tool_name", ... }
 * //
 * // checkPolicyMatch resolves "action.tool" -> "any_tool_name", which
 * // matches the wildcard "*", so returns true.
 *
 * @param {object} matchCriteria - Match object from policy (e.g., { "action.type": "tool.call" })
 * @param {object} action - Action to check against (e.g., { type: "tool.call", tool: "get_page_content" })
 * @returns {boolean} True if policy applies to this action
 */
export function checkPolicyMatch(matchCriteria, action) {
  const startTime = ChromeUtils.now();
  let result = true;
  lazy.console.debug(
    "[PolicyEvaluator] checkPolicyMatch criteria:",
    JSON.stringify(matchCriteria),
    "action:",
    JSON.stringify(action)
  );

  let criterias = Object.entries(matchCriteria ?? []);
  if (!matchCriteria || typeof matchCriteria !== "object") {
    criterias = []; // disable loop
    result = false;
  }

  for (const [path, expectedValue] of criterias) {
    const actualValue = lazy.resolveConditionPath(path, action, {});

    // Handle OR conditions with pipe separator
    // e.g., "get_page_content|search_history" or "get_page_content|*"
    if (typeof expectedValue === "string" && expectedValue.includes("|")) {
      const options = expectedValue.split("|");

      const matches = options.some(
        option => option === "*" || option === actualValue
      );

      if (!matches) {
        result = false;
        break;
      }
    } else if (expectedValue === "*") {
      if (actualValue === undefined || actualValue === null) {
        result = false;
        break;
      }
    } else if (actualValue !== expectedValue) {
      // Exact match required
      result = false;
      break;
    }
  }

  ChromeUtils.addProfilerMarker(
    "ML.Security.PolicyEvaluator.checkPolicyMatch",
    { startTime },
    `checkPolicyMatch for action: ${JSON.stringify(action)}`
  );

  return result;
}

/**
 * Evaluates a single policy against an action.
 * Returns null if policy doesn't apply, otherwise allow/deny decision.
 *
 * Process:
 * 1. Check if policy is enabled
 * 2. Check if policy matches action (match criteria)
 * 3. If not, return null (policy doesn't apply)
 * 4. Evaluate conditions once:
 *    - DENY policies: failing a condition triggers denial; success => null
 *    - ALLOW policies: all conditions must pass to allow; failure => deny
 *
 * @param {object} policy - Policy object from JSON
 * @param {string} policy.id - Unique policy identifier
 * @param {boolean} policy.enabled - Whether policy is active
 * @param {object} policy.match - Match criteria
 * @param {Array} policy.conditions - Conditions to evaluate
 * @param {PolicyEffect} policy.effect - lazy.EFFECT_DENY or lazy.EFFECT_ALLOW
 * @param {object} policy.onDeny - Denial information for deny policies
 * @param {object} action - Action being evaluated
 * @param {object} context - Request context
 * @returns {object|null} Decision object or null if policy doesn't apply
 */
export function evaluatePolicy(policy, action, context) {
  if (!policy.enabled) {
    return null;
  }

  if (!checkPolicyMatch(policy.match, action)) {
    return null;
  }

  const conditions = policy.conditions || [];

  // Evaluate conditions once and remember the first failure (if any)
  let failedCondition = null;
  for (const condition of conditions) {
    const result = lazy.evaluateCondition(condition, action, context);
    if (!result) {
      failedCondition = condition;
      break;
    }
  }

  // No failed condition → all conditions passed
  if (!failedCondition) {
    if (policy.effect === lazy.EFFECT_DENY) {
      // DENY policy with all conditions passing => no denial applies
      return null;
    }

    // ALLOW policy with all conditions passing => explicit allow
    return lazy.createAllowDecision({
      policyId: policy.id,
      note: "All policy conditions satisfied",
    });
  }

  // At least one condition failed
  if (policy.effect === lazy.EFFECT_DENY) {
    // DENY policy: failing a condition triggers a deny with policy-specific info
    return lazy.createDenyDecision(policy.onDeny.code, policy.onDeny.reason, {
      policyId: policy.id,
      failedCondition: failedCondition.type,
      conditionDescription: failedCondition.description,
    });
  }

  // ALLOW policy: failing a condition means we can't allow
  return lazy.createDenyDecision(
    "POLICY_CONDITION_FAILED",
    "Policy condition not met",
    {
      policyId: policy.id,
      failedCondition: failedCondition.type,
    }
  );
}

/**
 * Evaluates all policies for a phase against an action.
 *
 * Strategy: First deny wins (short-circuit evaluation)
 * - Iterate through policies in order
 * - First policy that denies terminates evaluation
 * - If no policies deny, allow
 *
 * @param {Array} policies - Array of policy objects for this phase
 * @param {object} action - Action being evaluated
 * @param {object} context - Request context
 * @returns {object} Decision object (allow or deny)
 */
export function evaluatePhasePolicies(policies, action, context) {
  if (!policies || policies.length === 0) {
    lazy.console.warn("[PolicyEvaluator] No policies provided for evaluation");
    return lazy.createAllowDecision({ note: "No policies to evaluate" });
  }

  let appliedPolicies = 0;

  for (const policy of policies) {
    const decision = evaluatePolicy(policy, action, context);

    if (decision === null) {
      continue;
    }

    appliedPolicies++;

    if (decision.effect === lazy.EFFECT_DENY) {
      lazy.console.warn(
        `[PolicyEvaluator] Policy ${policy.id} denied action:`,
        decision.reason
      );
      return decision;
    }
  }

  if (appliedPolicies === 0) {
    lazy.console.warn(
      "[PolicyEvaluator] No policies applied to action:",
      action.type,
      action.tool || ""
    );
  }

  return lazy.createAllowDecision({
    note: `Evaluated ${appliedPolicies} policies, none denied`,
  });
}

/**
 * Validates a policy object structure.
 *
 * Checks for required fields and valid values.
 * Used during policy loading to catch configuration errors.
 *
 * @param {object} policy - Policy object to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validatePolicy(policy) {
  const errors = [];

  // Required fields
  if (!policy.id) {
    errors.push("Missing required field: id");
  }
  if (!policy.phase) {
    errors.push("Missing required field: phase");
  }
  if (!policy.match) {
    errors.push("Missing required field: match");
  }
  if (!policy.conditions) {
    errors.push("Missing required field: conditions");
  }
  if (!policy.effect) {
    errors.push("Missing required field: effect");
  }

  // Type validation
  if (policy.enabled !== undefined && typeof policy.enabled !== "boolean") {
    errors.push("Field 'enabled' must be boolean");
  }
  if (!Array.isArray(policy.conditions)) {
    errors.push("Field 'conditions' must be an array");
  }
  if (
    policy.effect !== lazy.EFFECT_DENY &&
    policy.effect !== lazy.EFFECT_ALLOW
  ) {
    errors.push("Field 'effect' must be 'deny' or 'allow'");
  }

  // Conditional requirements
  if (policy.effect === lazy.EFFECT_DENY && !policy.onDeny) {
    errors.push("Field 'onDeny' required when effect is 'deny'");
  }
  if (policy.onDeny && (!policy.onDeny.code || !policy.onDeny.reason)) {
    errors.push("Field 'onDeny' must have 'code' and 'reason'");
  }

  // Condition validation
  if (Array.isArray(policy.conditions)) {
    policy.conditions.forEach((condition, index) => {
      if (!condition.type) {
        errors.push(`Condition ${index}: missing 'type' field`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
