/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.logging

import org.mozilla.fenix.ui.efficiency.factory.logging.LoggerFactory
import org.mozilla.fenix.ui.efficiency.factory.logging.StepLogger

/**
 * LoggingBridge
 *
 * Problem:
 * - We currently have two related (but not unified) logging systems:
 *   1) Factory / Feature.spec oriented logging (StepLogger + sinks)
 *   2) This new structured console logging focused on readability and fast debugging
 *
 * Why a bridge (instead of rewriting everything now):
 * - This structured logger is a PoC meant to validate log UX and value quickly.
 * - The Feature.spec/factory logger is production-oriented and already emits artifacts.
 * - Bridging lets us keep artifact generation while we iterate on the console experience.
 *
 * Long-term plan:
 * - Once the structured approach is proven and we converge on a single logging model,
 *   we should refactor so there's only one "logging contract" for:
 *     - Feature.spec execution
 *     - Factory-generated tests
 *     - Parameterized page/component tests
 *   …and multiple output adapters (console, JSONL, summary, etc.)
 */
object LoggingBridge {

    /**
     * Create a TimedReporter.
     *
     * - If the factory sinks are available, forward structured events to them.
     * - If anything fails (missing env, IO issues), degrade gracefully to console-only.
     *
     * Important:
     * - Logging must never cause tests to fail. This function is intentionally defensive.
     */
    fun createReporter(runId: String? = null): TimedReporter {
        val forwarder: StepLogger? = try {
            LoggerFactory.create(runId ?: System.currentTimeMillis().toString())
        } catch (_: Throwable) {
            null
        }
        return TimedReporter(forwarder)
    }
}
