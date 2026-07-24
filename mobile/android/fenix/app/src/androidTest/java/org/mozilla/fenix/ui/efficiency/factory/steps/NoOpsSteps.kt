/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.steps

import org.mozilla.fenix.ui.efficiency.factory.logging.StepDescriptor

/*
 * Collection of minimal [TestStep]s used for dry-run or synthetic tests.
 *
 * These steps allow developers to validate logging and control flow
 * without invoking real UI interactions.
 */

/**
 * A step that simply logs and succeeds.
 *
 * Useful for verifying logging output and execution ordering.
 */
class NoOpStep(private val name: String = "NoOp") : TestStep {
    override fun perform(ctx: StepContext): StepResult {
        val d = StepDescriptor("noop-$name", "NoOp", mapOf("name" to name))
        ctx.logger.stepStart(d)
        ctx.logger.info("running no-op step", mapOf("name" to name))
        ctx.logger.stepEnd(d, StepResult.Ok)
        return StepResult.Ok
    }
}

/**
 * A step that pauses for [millis] milliseconds before succeeding.
 *
 * Helps visualize timing or simulate slow operations.
 */
class SleepStep(private val millis: Long, private val name: String = "Sleep") : TestStep {
    override fun perform(ctx: StepContext): StepResult {
        val d = StepDescriptor("sleep-$millis", "Sleep", mapOf("ms" to millis, "name" to name))
        ctx.logger.stepStart(d)
        Thread.sleep(millis)
        ctx.logger.stepEnd(d, StepResult.Ok)
        return StepResult.Ok
    }
}

/**
 * A step that always fails with the provided [reason].
 *
 * Used to test failure handling, logging, and screenshot capture paths.
 */
class FailStep(private val reason: String, private val name: String = "Fail") : TestStep {
    override fun perform(ctx: StepContext): StepResult {
        val d = StepDescriptor("fail-$name", "Fail", mapOf("reason" to reason))
        ctx.logger.stepStart(d)
        val r = StepResult.Fail(reason)
        ctx.logger.stepEnd(d, r)
        return r
    }
}
