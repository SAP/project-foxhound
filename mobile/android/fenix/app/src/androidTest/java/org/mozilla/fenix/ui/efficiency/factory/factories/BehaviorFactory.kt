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
 * Executes **Behavior** tier checks for a [FeatureSpec].
 *
 * The Behavior tier verifies minimal “business logic” outcomes across page boundaries.
 * Typical pattern:
 * 1) **setup** steps (e.g., toggle a setting),
 * 2) **trigger** steps (e.g., visit a URL),
 * 3) **cross-page verify** steps (e.g., assert a History page group is empty).
 *
 * Logging & artifacts:
 * - Starts/ends a test scope with ID: `<FEATURE>.Behavior`
 * - Emits step start/end records to the logger.
 * - On any failure, captures a screenshot into the artifacts directory and attaches its path.
 * - Defers to [DebugControls] at suite end to optionally export/publicly mirror artifacts and pause.
 */
object BehaviorFactory {

    /**
     * Runs all Behavior checks for the provided [spec] in the given [ctx].
     *
     * Flow:
     * - Run [FeatureSpec.preconditions]
     * - For each behavior check:
     *   - run `setupSteps`, then `triggerSteps`
     *   - run each `crossPageVerifySteps`; **first failure aborts** the suite with FAIL
     * - Run [FeatureSpec.cleanup] regardless of pass or fail path
     *
     * @param spec The feature description to execute.
     * @param ctx  The active test context (rule, PageContext, logger).
     * @return [TestStatus.PASS] if all checks succeed, otherwise [TestStatus.FAIL].
     */
    fun run(spec: FeatureSpec, ctx: StepContext): TestStatus {
        val testId = "${spec.key}.Behavior"
        ctx.logger.testStart(testId)
        val flags = DebugControls.flags() // read once per suite

        try {
            for (p in spec.preconditions) if (p.perform(ctx) is StepResult.Fail) return endFail(ctx, testId)

            spec.sanity.forEachIndexed { i, b ->
                val leaf = "behavior-$i"
                val sd = StepDescriptor(leaf, "Behavior.Check")
                ctx.logger.stepStart(sd)

                for (s in b.setupSteps) {
                    if (s.perform(ctx) is StepResult.Fail) {
                        shot(ctx, testId, leaf, "setup-fail"); return endFail(ctx, testId)
                    }
                }

                for (t in b.triggerSteps) {
                    if (t.perform(ctx) is StepResult.Fail) {
                        shot(ctx, testId, leaf, "trigger-fail"); return endFail(ctx, testId)
                    }
                }

                for (v in b.crossPageVerifySteps) {
                    val vr = v.perform(ctx)
                    if (vr is StepResult.Fail) {
                        ctx.logger.stepEnd(sd, vr)
                        shot(ctx, testId, leaf, "verify-fail")
                        return endFail(ctx, testId)
                    }
                }
                ctx.logger.stepEnd(sd, StepResult.Ok)
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
     *
     * @param ctx    Active test context.
     * @param testId Current suite test ID, e.g. `"FEATURE.Behavior"`.
     * @param leaf   Leaf step/scope identifier (e.g., `"behavior-0"`).
     * @param name   Screenshot filename stem (e.g., `"verify-fail"`).
     */
    private fun shot(ctx: StepContext, testId: String, leaf: String, name: String) {
        ScreenshotTaker.capture(testId, leaf, name)?.let { path ->
            ctx.logger.attachScreenshot(StepDescriptor(leaf, "Behavior.Check"), path)
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
