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
 * Executes **Presence** tier checks for a [FeatureSpec].
 *
 * The Presence tier answers: *do the expected UI elements render in the right places?*
 * It does not interact with elements beyond navigation + verification. This gives a fast,
 * high-signal read on “does the UI show up?” for a feature.
 *
 * Logging & artifacts:
 * - Starts/ends a test scope with ID: `<FEATURE>.Presence`
 * - Emits step start/end records
 * - Captures screenshots on failures
 * - Invokes [DebugControls] at end for optional public export and pause
 */
object PresenceFactory {

    /**
     * Runs all Presence checks for the provided [spec] in the given [ctx].
     *
     * @param spec The feature description to execute.
     * @param ctx  The active test context (rule, PageContext, logger).
     * @return [TestStatus.PASS] if all checks succeed, otherwise [TestStatus.FAIL].
     */
    fun run(spec: FeatureSpec, ctx: StepContext): TestStatus {
        val testId = "${spec.key}.Presence"
        ctx.logger.testStart(testId)
        val flags = DebugControls.flags() // read once per suite

        try {
            for (p in spec.preconditions) if (p.perform(ctx) is StepResult.Fail) return endFail(ctx, testId)

            spec.surfaces.forEachIndexed { i, s ->
                val leaf = "presence-$i"
                val sd = StepDescriptor(leaf, "Presence.SurfaceCheck")
                ctx.logger.stepStart(sd)
                if (s.navigateStep.perform(ctx) is StepResult.Fail) {
                    shot(ctx, testId, leaf, "nav-fail")
                    return endFail(ctx, testId)
                }
                val vr = s.verifyStep.perform(ctx)
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
            ctx.logger.testEnd(testId, TestStatus.FAIL)
            DebugControls.onSuiteEnd(ctx.logger, flags)
            return TestStatus.FAIL
        }
    }

    /**
     * Helper that captures a screenshot (if possible) and attaches it to the logger.
     */
    private fun shot(ctx: StepContext, testId: String, leaf: String, name: String) {
        ScreenshotTaker.capture(testId, leaf, name)?.let { path ->
            ctx.logger.attachScreenshot(StepDescriptor(leaf, "Presence.SurfaceCheck"), path)
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
