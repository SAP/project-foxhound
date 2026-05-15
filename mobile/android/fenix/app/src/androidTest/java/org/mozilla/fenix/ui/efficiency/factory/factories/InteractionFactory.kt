/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.factories

import org.mozilla.fenix.ui.efficiency.factory.debug.DebugControls
import org.mozilla.fenix.ui.efficiency.factory.feature.FeatureSpec
import org.mozilla.fenix.ui.efficiency.factory.logging.ScreenshotTaker
import org.mozilla.fenix.ui.efficiency.factory.logging.StepDescriptor
import org.mozilla.fenix.ui.efficiency.factory.logging.TestStatus
import org.mozilla.fenix.ui.efficiency.factory.steps.StepContext
import org.mozilla.fenix.ui.efficiency.factory.steps.StepResult

/**
 * Executes **Interaction** tier checks for a [FeatureSpec].
 *
 * The Interaction tier validates that UI elements are **responsive** and that
 * a simple action + verification sequence works as expected (without deep business logic).
 *
 * Example flow per check:
 * - Navigate to a page
 * - Perform an action (toggle, tap, menu selection)
 * - Verify a single expected UI artifact
 *
 * On failure of any step (navigate/action/verify), the suite fails fast and
 * captures a screenshot for triage. At suite end, [DebugControls] may export
 * artifacts or pause based on instrumentation args.
 */
object InteractionFactory {

    /**
     * Runs all Interaction checks for the provided [spec] in the given [ctx].
     *
     * @param spec The feature description to execute.
     * @param ctx  The active test context (rule, PageContext, logger).
     * @return [TestStatus.PASS] if all checks succeed, otherwise [TestStatus.FAIL].
     */
    fun run(spec: FeatureSpec, ctx: StepContext): TestStatus {
        val testId = "${spec.key}.Interaction"
        ctx.logger.testStart(testId)
        val flags = DebugControls.flags() // read once per suite

        try {
            for (p in spec.preconditions) if (p.perform(ctx) is StepResult.Fail) return endFail(ctx, testId)

            spec.interactions.forEachIndexed { i, c ->
                val leaf = "interaction-$i"
                val sd = StepDescriptor(leaf, "Interaction.Check")
                ctx.logger.stepStart(sd)
                if (c.navigateStep.perform(ctx) is StepResult.Fail) {
                    shot(ctx, testId, leaf, "nav-fail")
                    return endFail(ctx, testId)
                }
                if (c.actionStep.perform(ctx) is StepResult.Fail) {
                    shot(ctx, testId, leaf, "action-fail")
                    return endFail(ctx, testId)
                }
                val vr = c.verifyStep.perform(ctx)
                ctx.logger.stepEnd(sd, vr)
                if (vr is StepResult.Fail) {
                    shot(ctx, testId, leaf, "verify-fail")
                    return endFail(ctx, testId)
                }
            }

            for (c in spec.cleanup) c.perform(ctx)
            ctx.logger.testEnd(testId, TestStatus.PASS)
            DebugControls.onSuiteEnd(ctx.logger, flags)
            return TestStatus.PASS
        } catch (_: Throwable) {
            shot(ctx, testId, "exception", "uncaught")
            DebugControls.onSuiteEnd(ctx.logger, flags)
            return TestStatus.FAIL
        }
    }

    /**
     * Helper that captures a screenshot (if possible) and attaches it to the logger.
     */
    private fun shot(ctx: StepContext, testId: String, leaf: String, name: String) {
        ScreenshotTaker.capture(testId, leaf, name)?.let { path ->
            ctx.logger.attachScreenshot(StepDescriptor(leaf, "Interaction.Check"), path)
        }
    }

    /**
     * Ends the current suite with FAIL and returns the status.
     * Always emits a `testEnd(..., FAIL)` record.
     */
    private fun endFail(ctx: StepContext, testId: String): TestStatus {
        ctx.logger.testEnd(testId, TestStatus.FAIL); return TestStatus.FAIL
    }
}
