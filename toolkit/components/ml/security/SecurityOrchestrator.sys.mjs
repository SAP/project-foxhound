/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-nocheck - TODO - Remove this to type check this file.

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = XPCOMUtils.declareLazy({
  SessionLedger: "chrome://global/content/ml/security/SecurityUtils.sys.mjs",
  logSecurityEvent:
    "chrome://global/content/ml/security/SecurityLogger.sys.mjs",
  EFFECT_ALLOW: "chrome://global/content/ml/security/DecisionTypes.sys.mjs",
  createAllowDecision:
    "chrome://global/content/ml/security/DecisionTypes.sys.mjs",
  createDenyDecision:
    "chrome://global/content/ml/security/DecisionTypes.sys.mjs",
  validatePolicy: "chrome://global/content/ml/security/PolicyEvaluator.sys.mjs",
  evaluatePhasePolicies:
    "chrome://global/content/ml/security/PolicyEvaluator.sys.mjs",
  console: () =>
    console.createInstance({
      maxLogLevelPref: "browser.ml.logLevel",
      prefix: "SecurityOrchestrator",
    }),
});

/**
 * Dev/emergency kill-switch for security enforcement.
 * When false, all security checks are bypassed and allow is returned.
 * Should remain true in production. Consider restricting to debug builds in follow-up.
 */
const PREF_SECURITY_ENABLED = "browser.ml.security.enabled";

/**
 * Checks if Smart Window security enforcement is enabled.
 *
 * @returns {boolean} True if security is enabled, false otherwise
 */
function isSecurityEnabled() {
  return Services.prefs.getBoolPref(PREF_SECURITY_ENABLED, true);
}

/**
 * Central security orchestrator for Firefox AI features.
 *
 * This is a singleton service. Use getSecurityOrchestrator() to access the instance.
 * The orchestrator is lazily initialized on first access and shared across all callers.
 *
 * ## Evaluation Flow
 *
 * 1. Caller invokes evaluate() with an envelope containing:
 *    - phase: Security checkpoint (e.g., "tool.execution")
 *    - action: What's being attempted (tool name, URLs, etc.)
 *    - context: Request metadata (tabId, requestId, etc.)
 *
 * 2. Orchestrator checks preference flag (browser.ml.security.enabled)
 *    - If disabled: logs bypass and returns allow
 *
 * 3. Orchestrator looks up policies registered for the phase
 *    - If none: returns allow with note
 *
 * 4. Orchestrator builds context with session ledger (trusted URLs)
 *    - Merges ledgers from current tab and any @mentioned tabs
 *
 * 5. PolicyEvaluator evaluates policies using "first deny wins":
 *    - Each policy's match criteria checked against action
 *    - If match, conditions evaluated via ConditionEvaluator
 *    - First denial terminates evaluation
 *
 * 6. Decision logged via SecurityLogger and returned to caller
 *
 * ## Key Components
 *
 * - SessionLedger: Tracks trusted URLs per tab (seeded from page metadata)
 * - PolicyEvaluator: Evaluates JSON policies against actions
 * - ConditionEvaluator: Evaluates individual policy conditions
 * - SecurityLogger: Audit logging for all decisions
 */
export class SecurityOrchestrator {
  /**
   * Singleton instance promise.
   *
   * @type {Promise<SecurityOrchestrator>|null}
   */
  static #instancePromise = null;

  /**
   * Registry of security policies by phase.
   *
   * @type {Map<string, Array<object>>}
   */
  #policies = new Map();

  /**
   * Session ledgers keyed by sessionId.
   * Each AI Window session has its own isolated ledger.
   *
   * @type {Map<string, lazy.SessionLedger>}
   */
  #sessionLedgers = new Map();

  /**
   * Private constructor. Use getSecurityOrchestrator() to get the singleton instance.
   */
  constructor() {
    // Session ledgers are created via registerSession()
  }

  /**
   * Creates and initializes the singleton SecurityOrchestrator instance.
   * Called only once via getInstance().
   *
   * @returns {Promise<SecurityOrchestrator>} Initialized orchestrator instance
   * @private
   */
  static async #createInstance() {
    const instance = new SecurityOrchestrator();
    await instance.#loadPolicies();

    lazy.console.debug(
      `[Security] Orchestrator singleton initialized with ${Array.from(
        instance.#policies.values()
      ).reduce((sum, policies) => sum + policies.length, 0)} policies`
    );

    return instance;
  }

  /**
   * Gets the singleton SecurityOrchestrator instance.
   *
   * The orchestrator is lazily initialized on first call. Subsequent calls
   * return the same instance. If initialization fails, the error is thrown
   * and the next call will retry initialization.
   *
   * @returns {Promise<SecurityOrchestrator>} The singleton orchestrator instance
   * @throws {Error} If policy loading or initialization fails
   */
  static async getInstance() {
    if (!SecurityOrchestrator.#instancePromise) {
      SecurityOrchestrator.#instancePromise =
        SecurityOrchestrator.#createInstance().catch(error => {
          // Reset so next call can retry
          SecurityOrchestrator.#instancePromise = null;
          lazy.console.error(
            "[Security] Orchestrator initialization failed:",
            error
          );
          throw error;
        });
    }
    return SecurityOrchestrator.#instancePromise;
  }

  /**
   * Registers a new session with its own isolated ledger.
   * Called when an AI Window opens.
   *
   * This method is idempotent - calling it multiple times with the same
   * sessionId will not create duplicate ledgers.
   *
   * @param {string} sessionId - Unique identifier for the session
   */
  registerSession(sessionId) {
    if (!sessionId || typeof sessionId !== "string") {
      throw new TypeError(
        "registerSession requires a non-empty string sessionId"
      );
    }
    if (this.#sessionLedgers.has(sessionId)) {
      lazy.console.debug(`[Security] Session ${sessionId} already registered`);
      return;
    }
    this.#sessionLedgers.set(sessionId, new lazy.SessionLedger(sessionId));
    lazy.console.debug(`[Security] Registered session ${sessionId}`);
  }

  /**
   * Cleans up a session and removes its ledger.
   * Called when an AI Window closes.
   *
   * This method is idempotent - calling it with a non-existent sessionId
   * will not throw an error.
   *
   * @param {string} sessionId - Unique identifier for the session
   */
  cleanupSession(sessionId) {
    const deleted = this.#sessionLedgers.delete(sessionId);
    if (deleted) {
      lazy.console.debug(`[Security] Cleaned up session ${sessionId}`);
    }
  }

  /**
   * Clears internal state for testing purposes.
   * Called by resetForTesting() to clean up instance data.
   */
  clearForTesting() {
    this.#sessionLedgers.clear();
  }

  /**
   * Resets the orchestrator state for testing purposes.
   * Only available in automation (tests).
   *
   * This clears all session ledgers and resets the singleton instance,
   * allowing tests to start with a clean state.
   *
   * @returns {Promise<void>}
   * @throws {Error} If called outside of automation
   */
  static async resetForTesting() {
    if (!Cu.isInAutomation) {
      throw new Error("resetForTesting() only available in automation");
    }

    const instancePromise = SecurityOrchestrator.#instancePromise;
    if (instancePromise) {
      await instancePromise.then(instance => instance.clearForTesting());
    }
    SecurityOrchestrator.#instancePromise = null;

    lazy.console.debug("[Security] Orchestrator reset for testing");
  }

  /**
   * Loads and validates policies from JSON files.
   *
   * @private
   */
  async #loadPolicies() {
    const policyFiles = ["tool-execution-policies.json"];

    for (const file of policyFiles) {
      const response = await fetch(
        `chrome://global/content/ml/security/policies/${file}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch policy file ${file}: ${response.status}`
        );
      }

      const data = await response.json();

      // Validate policy file structure
      if (!data.policies || !Array.isArray(data.policies)) {
        throw new Error(
          `Invalid policy file structure in ${file}: missing 'policies' array`
        );
      }

      // Validate each policy
      for (const policy of data.policies) {
        const validation = lazy.validatePolicy(policy);
        if (!validation.valid) {
          throw new Error(
            `Invalid policy '${policy.id}' in ${file}: ${validation.errors.join(", ")}`
          );
        }

        // Group by phase
        if (!this.#policies.has(policy.phase)) {
          this.#policies.set(policy.phase, []);
        }
        this.#policies.get(policy.phase).push(policy);
      }

      lazy.console.debug(
        `[Security] Loaded ${data.policies.length} policies from ${file}`
      );
    }

    lazy.console.debug(
      `[Security] Policy loading complete: ${this.#policies.size} phases`
    );
  }

  /**
   * Gets the session ledger for a specific session.
   *
   * @param {string} sessionId - The session identifier
   * @returns {lazy.SessionLedger|undefined} The session ledger, or undefined if not found
   */
  getSessionLedger(sessionId) {
    return this.#sessionLedgers.get(sessionId);
  }

  /**
   * Main entry point for all security checks.
   *
   * The envelope wraps a security check request, containing all information
   * needed to evaluate policies: which phase is being checked, what action
   * is being attempted, and the context in which it's occurring.
   *
   * @example
   * // AI Window dispatching a tool call:
   * const decision = await orchestrator.evaluate("session-123", {
   *   phase: "tool.execution",
   *   action: {
   *     type: "tool.call",
   *     tool: "get_page_content",
   *     urls: ["https://example.com"],
   *     tabId: "tab-1"
   *   },
   *   context: {
   *     currentTabId: "tab-1",
   *     mentionedTabIds: ["tab-2"],
   *     requestId: "req-123"
   *   }
   * });
   * // Returns: { effect: "allow" } or { effect: "deny", code: "UNSEEN_LINK", ... }
   *
   * @param {string} sessionId - The session identifier
   * @param {object} envelope - Security check request
   * @param {string} envelope.phase - Security phase ("tool.execution", etc.)
   * @param {object} envelope.action - Action being checked (type, tool, urls, etc.)
   * @param {object} envelope.context - Request context (tabId, requestId, etc.)
   * @returns {Promise<object>} Decision object with effect (allow/deny), code, reason
   * @throws {Error} If session is not registered or envelope is invalid
   */
  async evaluate(sessionId, envelope) {
    const startTime = ChromeUtils.now();

    // Check for valid session first
    const sessionLedger = this.#sessionLedgers.get(sessionId);
    if (!sessionLedger) {
      throw new Error(`Session ${sessionId} is not registered`);
    }

    if (!envelope || typeof envelope !== "object") {
      throw new Error("Security envelope is null or invalid");
    }

    const { phase, action, context } = envelope;
    if (!phase || !action || !context) {
      throw new Error(
        "Security envelope missing required fields (phase, action, or context)"
      );
    }

    const requestId = context.requestId;
    try {
      if (!isSecurityEnabled()) {
        lazy.logSecurityEvent({
          requestId,
          sessionId,
          phase,
          action,
          context: {
            tainted: context.tainted ?? false,
            trustedCount: 0,
          },
          decision: {
            effect: lazy.EFFECT_ALLOW,
            reason: "Security disabled via preference flag",
          },
          durationMs: ChromeUtils.now() - startTime,
          prefSwitchBypass: true,
        });
        return { effect: lazy.EFFECT_ALLOW };
      }
      const policies = this.#policies.get(phase);
      if (!policies || policies.length === 0) {
        const decision = lazy.createAllowDecision({
          reason: "No policies for phase",
        });
        lazy.logSecurityEvent({
          requestId,
          sessionId,
          phase,
          action,
          context: {
            tainted: context.tainted ?? false,
            trustedCount: 0,
          },
          decision,
          durationMs: ChromeUtils.now() - startTime,
        });
        return decision;
      }
      const fullContext = {
        ...context,
        sessionLedger,
        sessionId,
        timestamp: ChromeUtils.now(),
      };
      const { currentTabId, mentionedTabIds = [] } = context;
      const tabsToCheck = [currentTabId, ...mentionedTabIds];
      const linkLedger = sessionLedger.merge(tabsToCheck);
      fullContext.linkLedger = linkLedger;
      const decision = lazy.evaluatePhasePolicies(
        policies,
        action,
        fullContext
      );
      lazy.logSecurityEvent({
        requestId,
        sessionId,
        phase,
        action,
        context: {
          tainted: context.tainted ?? false,
          trustedCount: linkLedger?.size() ?? 0,
        },
        decision,
        durationMs: ChromeUtils.now() - startTime,
      });
      return decision;
    } catch (error) {
      const errorDecision = lazy.createDenyDecision(
        "EVALUATION_ERROR",
        "Security evaluation failed with unexpected error",
        { error: error.message || String(error) }
      );
      lazy.logSecurityEvent({
        requestId,
        sessionId,
        phase,
        action,
        context: {
          tainted: context.tainted ?? false,
          trustedCount: 0,
        },
        decision: errorDecision,
        durationMs: ChromeUtils.now() - startTime,
        error,
      });
      return errorDecision;
    } finally {
      ChromeUtils.addProfilerMarker(
        "ML.Security.SecurityOrchestrator.evaluate",
        { startTime },
        `Evaluate security for action: ${JSON.stringify(envelope?.action)}, phase: ${envelope?.phase}, sessionId: ${sessionId}`
      );
    }
  }

  /**
   * Removes all policies for a phase.
   *
   * @param {string} phase - Phase identifier to remove
   * @returns {boolean} True if policies were removed, false if not found
   */
  removePolicy(phase) {
    return this.#policies.delete(phase);
  }

  /**
   * Gets statistics about the orchestrator state.
   *
   * @returns {object} Stats object with registered policies, session info, etc.
   */
  getStats() {
    const totalPolicies = Array.from(this.#policies.values()).reduce(
      (sum, policies) => sum + policies.length,
      0
    );

    const policyBreakdown = {};
    for (const [phase, policies] of this.#policies.entries()) {
      policyBreakdown[phase] = {
        count: policies.length,
        policies: policies.map(p => ({
          id: p.id,
          enabled: p.enabled !== false,
        })),
      };
    }

    const sessionStats = {};
    for (const [sessionId, ledger] of this.#sessionLedgers.entries()) {
      sessionStats[sessionId] = {
        tabCount: ledger.tabCount(),
        totalUrls: Array.from(ledger.tabs.values()).reduce(
          (sum, tabLedger) => sum + tabLedger.size(),
          0
        ),
      };
    }

    return {
      initialized: this.#policies.size > 0,
      registeredPhases: Array.from(this.#policies.keys()),
      totalPolicies,
      policyBreakdown,
      sessionCount: this.#sessionLedgers.size,
      sessionStats,
    };
  }
}

/**
 * Gets the singleton SecurityOrchestrator instance.
 *
 * This is the preferred way to access the SecurityOrchestrator.
 * The orchestrator is lazily initialized on first call.
 *
 * @returns {Promise<SecurityOrchestrator>} The singleton orchestrator instance
 * @throws {Error} If policy loading or initialization fails
 */
export async function getSecurityOrchestrator() {
  return SecurityOrchestrator.getInstance();
}
