/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.steps

import org.mozilla.fenix.ui.efficiency.factory.logging.StepDescriptor

/**
 * Defines reusable **action steps** for toggling settings or interacting
 * with UI elements that represent feature state.
 *
 * Each action is modeled as a [TestStep] so it can be executed and logged
 * consistently within a factory sequence.
 *
 * Currently includes:
 * - [Toggle.PrivateBrowsing] — enables or disables Private Browsing mode.
 */
fun togglePrivateBrowsing(on: Boolean) = Toggle.PrivateBrowsing(on)

/**
 * Namespace for toggle-related steps.
 */
object Toggle {

    /**
     * Toggles the **Private Browsing** setting within the Settings screen.
     *
     * Flow:
     * 1. Navigate to the Private Browsing settings page.
     * 2. Toggle the state via [setPrivateBrowsing] on the page object.
     * 3. Emit step logs for start/end and mark result as PASS/FAIL.
     *
     * On failure, the exception is logged and a [StepResult.Fail] is returned.
     *
     * @param on Desired Private Browsing state (`true` = enable, `false` = disable).
     */
    class PrivateBrowsing(private val on: Boolean) : TestStep {
        override fun perform(ctx: StepContext): StepResult {
            val d = StepDescriptor("toggle-pb-$on", "Toggle.PrivateBrowsing", mapOf("on" to on))
            ctx.logger.stepStart(d)
            return try {
                ctx.on.settingsPrivateBrowsing.navigateToPage()
                // TODO: add test step in BasePage
                ctx.on.settingsPrivateBrowsing.setPrivateBrowsing(on)
                ctx.logger.stepEnd(d, StepResult.Ok); StepResult.Ok
            } catch (t: Throwable) {
                val r = StepResult.Fail("Toggle Private Browsing failed", t)
                ctx.logger.stepEnd(d, r); r
            }
        }
    }
}
