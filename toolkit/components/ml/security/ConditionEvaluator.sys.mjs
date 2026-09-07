/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-nocheck - TODO - Remove this to type check this file.

/**
 * Safe condition evaluator for JSON-based security policies.
 * Evaluates policy conditions against action and context.
 */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = XPCOMUtils.declareLazy({
  console: () =>
    console.createInstance({
      maxLogLevelPref: "browser.ml.logLevel",
      prefix: "ConditionEvaluator",
    }),
});

/**
 * Resolves a dot-notation path (e.g., "action.urls") in action or context.
 *
 * @param {string} path - Dot-notation path
 * @param {object} action - Action object
 * @param {object} context - Context object
 * @returns {*} Resolved value or undefined
 */
export function resolveConditionPath(path, action, context) {
  if (!path || typeof path !== "string") {
    lazy.console.error("[ConditionEvaluator] Invalid path:", path);
    return undefined;
  }

  const parts = path.split(".");

  let obj;
  if (parts[0] === "action") {
    obj = action;
  } else if (parts[0] === "context") {
    obj = context;
  } else {
    lazy.console.error(
      "[ConditionEvaluator] Path must start with 'action' or 'context':",
      path
    );
    return undefined;
  }

  for (let i = 1; i < parts.length; i++) {
    if (obj === undefined || obj === null) {
      return undefined;
    }
    obj = obj[parts[i]];
  }

  return obj;
}

/**
 * Evaluates a condition against action and context. Fails closed on unknown types.
 *
 * @param {object} condition - Condition object with type property
 * @param {object} action - Action being evaluated
 * @param {object} context - Request context
 * @returns {boolean} True if condition passes
 */
export function evaluateCondition(condition, action, context) {
  if (!condition || !condition.type) {
    lazy.console.error(
      "[ConditionEvaluator] Invalid condition object:",
      condition
    );
    return false;
  }

  try {
    switch (condition.type) {
      case "allUrlsIn":
        return evaluateAllUrlsIn(condition, action, context);

      case "equals":
        return evaluateEquals(condition, action, context);

      case "matches":
        return evaluateMatches(condition, action, context);

      case "noPatternInParams":
        return evaluateNoPatternInParams(condition, action, context);

      default:
        lazy.console.error(
          `[ConditionEvaluator] Unknown condition type: ${condition.type}`
        );
        return false;
    }
  } catch (error) {
    lazy.console.error(
      `[ConditionEvaluator] Error evaluating condition ${condition.type}:`,
      error
    );
    return false;
  }
}

/**
 * Evaluates allUrlsIn condition.
 *
 * Checks that all URLs in an array are present in a ledger.
 *
 * @param {object} condition - Condition configuration
 * @param {string} condition.urls - Path to URL array
 * @param {string} condition.ledger - Path to ledger object
 * @param {object} action - Action object
 * @param {object} context - Context object
 * @returns {boolean} True if all URLs in ledger or no URLs
 */
function evaluateAllUrlsIn(condition, action, context) {
  const urls = resolveConditionPath(condition.urls, action, context);
  const ledger = resolveConditionPath(condition.ledger, action, context);

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return true;
  }

  if (!ledger || typeof ledger.lookup !== "function") {
    lazy.console.error(
      "[ConditionEvaluator] Ledger not found or invalid:",
      condition.ledger
    );
    return false;
  }

  const result = urls.every(url => ledger.lookup(url));

  if (!result) {
    const failedUrl = urls.find(url => !ledger.lookup(url));
    lazy.console.warn(
      `[ConditionEvaluator] URL not in ledger: ${failedUrl}`,
      condition.description || ""
    );
  }

  return result;
}

/**
 * Evaluates equals condition.
 *
 * Checks exact equality between actual and expected values.
 *
 * @param {object} condition - Condition configuration
 * @param {string} condition.actual - Path to actual value
 * @param {*} condition.expected - Expected value (literal)
 * @param {object} action - Action object
 * @param {object} context - Context object
 * @returns {boolean} True if values are equal
 */
function evaluateEquals(condition, action, context) {
  const actualValue = resolveConditionPath(condition.actual, action, context);
  const expectedValue = condition.expected;

  const result = actualValue === expectedValue;

  if (!result) {
    lazy.console.warn(
      `[ConditionEvaluator] Equality check failed: expected ${expectedValue}, got ${actualValue}`
    );
  }

  return result;
}

/**
 * Evaluates matches condition.
 *
 * Checks if a value matches a regex pattern.
 *
 * @param {object} condition - Condition configuration
 * @param {string} condition.value - Path to value
 * @param {string} condition.pattern - Regex pattern (string)
 * @param {object} action - Action object
 * @param {object} context - Context object
 * @returns {boolean} True if value matches pattern
 */
function evaluateMatches(condition, action, context) {
  const value = resolveConditionPath(condition.value, action, context);

  if (value === undefined || value === null) {
    return false;
  }

  try {
    const pattern = new RegExp(condition.pattern);
    const result = pattern.test(String(value));

    if (!result) {
      lazy.console.warn(
        `[ConditionEvaluator] Pattern match failed: ${value} does not match ${condition.pattern}`
      );
    }

    return result;
  } catch (error) {
    lazy.console.error(
      `[ConditionEvaluator] Invalid regex pattern: ${condition.pattern}`,
      error
    );
    return false;
  }
}

/**
 * Evaluates noPatternInParams condition.
 *
 * Checks that a regex pattern does NOT appear in parameters.
 * Useful for blocking PII like email addresses.
 *
 * @param {object} condition - Condition configuration
 * @param {string} condition.params - Path to params object
 * @param {string} condition.pattern - Regex pattern to block
 * @param {object} action - Action object
 * @param {object} context - Context object
 * @returns {boolean} True if pattern NOT found in params
 */
function evaluateNoPatternInParams(condition, action, context) {
  const params = resolveConditionPath(condition.params, action, context);

  if (!params) {
    return true;
  }

  try {
    const pattern = new RegExp(condition.pattern);
    const paramsStr = JSON.stringify(params);
    const found = pattern.test(paramsStr);

    if (found) {
      lazy.console.warn(
        `[ConditionEvaluator] Blocked pattern found in params: ${condition.pattern}`,
        condition.description || ""
      );
    }

    return !found;
  } catch (error) {
    lazy.console.error(
      `[ConditionEvaluator] Error checking pattern: ${condition.pattern}`,
      error
    );
    return false;
  }
}
