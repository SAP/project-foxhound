/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.steps

/**
 * Contract for an executable step in the factory pipeline.
 *
 * Steps are small, composable units (navigate, toggle, verify, etc.) that:
 * - receive a [StepContext]
 * - perform work
 * - return a [StepResult] without throwing
 *
 * Implementations should handle exceptions internally and convert them to
 * [StepResult.Fail] so factories can log consistently and attach artifacts.
 */
interface TestStep {

    /**
     * Execute the step using the given [ctx]. Implementations should:
     * - write start/end records via [ctx.logger] (usually done by the step itself)
     * - avoid throwing (wrap errors into [StepResult.Fail])
     */
    fun perform(ctx: StepContext): StepResult

    /**
     * Convenience identifier for diagnostics; defaults to the simple class name.
     * Steps may override for more stable IDs if desired.
     */
    val id: String get() = this::class.simpleName ?: "UnnamedStep"
}
