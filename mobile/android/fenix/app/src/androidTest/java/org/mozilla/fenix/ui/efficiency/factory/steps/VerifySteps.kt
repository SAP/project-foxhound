/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.steps

import org.mozilla.fenix.ui.efficiency.factory.logging.StepDescriptor
import org.mozilla.fenix.ui.efficiency.helpers.BasePage
import org.mozilla.fenix.ui.efficiency.helpers.PageContext

/*
 * NOTE: This is for demo/explanation purposes only and can be
 * replaced with current custom commands, one that start with 'moz',
 * e.g. mozVerifyElementsByGroup.
 *
 * This module, and others like it merely allow for demoing this feature
 * without 'freeing' the factory methods to start creating every permutation
 * of possible tests.
 *
 * This will be removed or moved to a demo directory later.
 */

/**
 * Verifies that a named **selector group** is present on a resolved page.
 *
 * This step delegates to the page object's `mozVerifyElementsByGroup(groupId)`,
 * which is expected to assert that all elements in the group appear/are ready.
 *
 * @param groupId     Logical UI group identifier (e.g., `"emptyHistoryList"`).
 * @param resolvePage Function that selects the target [BasePage] from a [PageContext]
 *                    (e.g., `{ it.history }`, `{ it.home }`).
 */
class VerifyElementsByGroup(
    private val groupId: String,
    private val resolvePage: (PageContext) -> BasePage,
) : TestStep {
    override fun perform(ctx: StepContext): StepResult {
        val d = StepDescriptor("verify-$groupId", "Verify.ElementsByGroup", mapOf("groupId" to groupId))
        ctx.logger.stepStart(d)
        return try {
            resolvePage(ctx.on).mozVerifyElementsByGroup(groupId)
            ctx.logger.stepEnd(d, StepResult.Ok); StepResult.Ok
        } catch (t: Throwable) {
            val r = StepResult.Fail("Verify group failed: $groupId", t)
            ctx.logger.stepEnd(d, r); r
        }
    }
}

/**
 * DSL-friendly builder for [VerifyElementsByGroup].
 *
 * Enables concise usage in specs:
 * ```
 * verifyStep = mozVerifyElementsByGroup("emptyHistoryList") { it.history }
 * ```
 *
 * @param groupId     Logical UI group identifier to verify.
 * @param resolvePage Selector that maps a [PageContext] to a [BasePage].
 * @return A [TestStep] performing the group verification on the resolved page.
 */
fun mozVerifyElementsByGroup(
    groupId: String,
    resolvePage: (PageContext) -> BasePage,
): TestStep = VerifyElementsByGroup(groupId, resolvePage)
