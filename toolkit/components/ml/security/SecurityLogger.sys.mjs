/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-nocheck - TODO - Remove this to type check this file.

/**
 * Security audit logger for AI Window policy decisions.
 * Outputs logs for debugging and development.
 *
 * ## Viewing Logs
 *
 * Logs appear in the Browser Console (Ctrl+Shift+J) and terminal.
 *
 * To enable debug-level output:
 *   ./mach run --setpref browser.ml.logLevel=Debug
 *
 * Then filter for "SecurityLogger".
 * For all security & ML/AI related messages filter for "[MLSecurity]".
 */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = XPCOMUtils.declareLazy({
  EFFECT_DENY: "chrome://global/content/ml/security/DecisionTypes.sys.mjs",
  console: () =>
    console.createInstance({
      maxLogLevelPref: "browser.ml.logLevel",
      prefix: "SecurityLogger",
    }),
});

/**
 * Logs a security decision event.
 *
 * @param {object} event - The security event to log
 * @param {string} event.requestId - Request identifier
 * @param {string} event.sessionId - Session identifier
 * @param {string} event.phase - Security phase (tool.execution, etc.)
 * @param {object} event.action - Action details (type, tool, urls, args)
 * @param {object} event.context - Context summary (tainted, trustedCount)
 * @param {object} event.decision - Policy decision (effect, policyId, code, reason)
 * @param {number} event.durationMs - Evaluation duration in milliseconds
 * @param {Error} [event.error] - Optional error if evaluation failed
 */
export function logSecurityEvent(event) {
  const { phase, decision, durationMs, error } = event;

  // Summary line for quick visibility
  if (error) {
    lazy.console.error(
      `[MLSecurity][${phase}] Security evaluation error:`,
      error.message || error
    );
  } else if (decision.effect === lazy.EFFECT_DENY) {
    lazy.console.warn(
      `[MLSecurity][${phase}] DENY: ${decision.code} - ${decision.reason} (${durationMs}ms)`
    );
  } else {
    lazy.console.debug(`[MLSecurity][${phase}] ALLOW (${durationMs}ms)`);
  }

  // Full event for detailed debugging (object for Browser Console interactivity)
  lazy.console.debug(`[MLSecurity][${phase}] Event:`, event);
}
