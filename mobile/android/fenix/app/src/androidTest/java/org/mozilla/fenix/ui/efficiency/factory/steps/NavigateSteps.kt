/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.steps

import org.mozilla.fenix.ui.efficiency.factory.logging.StepDescriptor

/**
 * NOTE: This is for demo/explanation purposes only and is a way
 * to visualize what the factories do over-the-wire.
 *
 * Everything here can be replaced with <Page>.navigateToPage()
 *
 * This module, and others like it merely allow for demoing this feature
 * without 'freeing' the factory methods to start creating every permutation
 * of possible tests.
 *
 * This will be removed or moved to a demo directory later.
 */

// --- tiny stubs to satisfy "single top-level declaration" lint
typealias UrlString = String

fun navigateToHome() = Navigate.To.Home()
fun navigateToSettings() = Navigate.To.Settings()
fun navigateToHistory() = Navigate.To.History()
fun navigateToUrl(url: UrlString) = Navigate.To.Url(url)
// --- end stubs

/**
 * Defines navigation-related [TestStep]s for common app surfaces.
 *
 * Each navigation step encapsulates:
 * - Logging (start / end)
 * - Exception handling with [StepResult.Fail] on error
 * - Page-object call for the actual transition
 *
 * Steps are grouped under [Navigate.To] for consistent naming and grouping
 * with the DSL (`Navigate.To.Home`, `Navigate.To.Settings`, etc.).
 */
object Navigate {

    /** Namespace grouping the actual navigation steps. */
    object To {

        /** Navigates to the Home page. */
        class Home : TestStep {
            override fun perform(ctx: StepContext): StepResult {
                val d = StepDescriptor("navigate-home", "Navigate.To.Home")
                ctx.logger.stepStart(d)
                return try {
                    ctx.on.home.navigateToPage()
                    ctx.logger.stepEnd(d, StepResult.Ok); StepResult.Ok
                } catch (t: Throwable) {
                    val r = StepResult.Fail("Navigate Home failed", t)
                    ctx.logger.stepEnd(d, r); r
                }
            }
        }

        /** Navigates to the main Settings page. */
        class Settings : TestStep {
            override fun perform(ctx: StepContext): StepResult {
                val d = StepDescriptor("navigate-settings", "Navigate.To.Settings")
                ctx.logger.stepStart(d)
                return try {
                    ctx.on.settings.navigateToPage()
                    ctx.logger.stepEnd(d, StepResult.Ok); StepResult.Ok
                } catch (t: Throwable) {
                    val r = StepResult.Fail("Navigate Settings failed", t)
                    ctx.logger.stepEnd(d, r); r
                }
            }
        }

        /** Navigates to the History page. */
        class History : TestStep {
            override fun perform(ctx: StepContext): StepResult {
                val d = StepDescriptor("navigate-history", "Navigate.To.History")
                ctx.logger.stepStart(d)
                return try {
                    ctx.on.history.navigateToPage()
                    ctx.logger.stepEnd(d, StepResult.Ok); StepResult.Ok
                } catch (t: Throwable) {
                    val r = StepResult.Fail("Navigate History failed", t)
                    ctx.logger.stepEnd(d, r); r
                }
            }
        }

        /**
         * Navigates to the given URL via the omnibox on the Home page.
         *
         * This combines a navigation to Home followed by a call to
         * [visitWebsite] on the [HomePage] object.
         */
        class Url(private val url: String) : TestStep {
            override fun perform(ctx: StepContext): StepResult {
                val d = StepDescriptor("navigate-url", "Navigate.To.Url", mapOf("url" to url))
                ctx.logger.stepStart(d)
                return try {
                    ctx.on.home.navigateToPage() // omnibox entry is on home
                    ctx.on.home.visitWebsite(url)
                    ctx.logger.stepEnd(d, StepResult.Ok); StepResult.Ok
                } catch (t: Throwable) {
                    val r = StepResult.Fail("Navigate Url failed: $url", t)
                    ctx.logger.stepEnd(d, r); r
                }
            }
        }
    }
}
