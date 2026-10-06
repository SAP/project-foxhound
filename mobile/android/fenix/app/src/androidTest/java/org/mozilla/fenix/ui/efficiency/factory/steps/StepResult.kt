/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.steps

/**
 * Outcome of executing a single [TestStep].
 *
 * Factories treat any [Fail] as **fail fast** at the current tier, after logging
 * and (usually) capturing a screenshot. [Ok] indicates the step completed
 * successfully and the flow may continue.
 */
sealed class StepResult {

    /** Step completed successfully. */
    object Ok : StepResult()

    /**
     * Step failed with a human-readable [reason] and optional [cause].
     *
     * The [reason] should be end-user friendly (appears in summary logs). The
     * [cause], when present, is captured into the JSON details for triage.
     */
    data class Fail(val reason: String, val cause: Throwable? = null) : StepResult()
}
