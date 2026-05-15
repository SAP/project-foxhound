/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.examples

import org.junit.Test
import org.mozilla.fenix.ui.efficiency.factory.factories.BehaviorFactory
import org.mozilla.fenix.ui.efficiency.factory.factories.InteractionFactory
import org.mozilla.fenix.ui.efficiency.factory.factories.PresenceFactory
import org.mozilla.fenix.ui.efficiency.factory.feature.BehaviorCheck
import org.mozilla.fenix.ui.efficiency.factory.feature.FeatureKey
import org.mozilla.fenix.ui.efficiency.factory.feature.FeatureSpec
import org.mozilla.fenix.ui.efficiency.factory.feature.InteractionCheck
import org.mozilla.fenix.ui.efficiency.factory.feature.SurfaceCheck
import org.mozilla.fenix.ui.efficiency.factory.logging.LoggerFactory
import org.mozilla.fenix.ui.efficiency.factory.steps.FailStep
import org.mozilla.fenix.ui.efficiency.factory.steps.NoOpStep
import org.mozilla.fenix.ui.efficiency.factory.steps.SleepStep
import org.mozilla.fenix.ui.efficiency.factory.steps.StepContext
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest

/**
 * Demonstration test class that runs the factory tiers using **synthetic steps only**.
 *
 * This serves as an *educational* example of what the generated tests will
 * look and behave like over the wire, without touching any real UI.
 *
 * - Uses [NoOpStep], [SleepStep], and [FailStep] to simulate flow.
 * - Allows developers to inspect logging format, test order, and artifact output.
 * - Safe to run on any emulator; no dependencies on app state.
 *
 * **Important:** This test is for demonstration and learning purposes only.
 * It will be removed or heavily refactored once the team is comfortable
 * authoring and running factory-based specs for real features.
 */
class FactoryDryRunTestExample : BaseTest() {

    /** Builds a synthetic [FeatureSpec] purely for logging/demo purposes. */
    private fun drySpec(): FeatureSpec = FeatureSpec(
        key = FeatureKey.PRIVATE_BROWSING, // any key, we just want logging shape
        preconditions = listOf(
            NoOpStep("precondition-start"),
            SleepStep(150, "precondition-wait"),
        ),
        surfaces = listOf(
            SurfaceCheck(
                navigateStep = NoOpStep("navigate-surface-1"),
                verifyStep = NoOpStep("verify-surface-1"),
            ),
            SurfaceCheck(
                navigateStep = SleepStep(100, "navigate-surface-2"),
                verifyStep = NoOpStep("verify-surface-2"),
            ),
        ),
        interactions = listOf(
            InteractionCheck(
                navigateStep = NoOpStep("navigate-interaction-1"),
                actionStep = NoOpStep("action-interaction-1"),
                verifyStep = NoOpStep("verify-interaction-1"),
            ),
        ),
        sanity = listOf(
            BehaviorCheck(
                setupSteps = listOf(NoOpStep("setup-1"), SleepStep(120, "setup-wait")),
                triggerSteps = listOf(NoOpStep("trigger-1")),
                crossPageVerifySteps = listOf(NoOpStep("verify-1")),
            ),
            // include a failing behavior to see FAIL logging
            BehaviorCheck(
                setupSteps = listOf(NoOpStep("setup-2")),
                triggerSteps = listOf(FailStep("synthetic failure in trigger")),
                crossPageVerifySteps = listOf(NoOpStep("verify-never-reached")),
            ),
        ),
        cleanup = listOf(
            NoOpStep("cleanup-1"),
        ),
    )

    /** Executes Presence tier demo with synthetic steps. */
    @Test
    fun dryrun_presence_logs() {
        val logger = LoggerFactory.create()
        val ctx = StepContext(composeRule, on, logger)
        PresenceFactory.run(drySpec(), ctx)
    }

    /** Executes Interaction tier demo with synthetic steps. */
    @Test
    fun dryrun_interaction_logs() {
        val logger = LoggerFactory.create()
        val ctx = StepContext(composeRule, on, logger)
        InteractionFactory.run(drySpec(), ctx)
    }

    /** Executes Behavior tier demo with synthetic steps. */
    @Test
    fun dryrun_behavior_logs() {
        val logger = LoggerFactory.create()
        val ctx = StepContext(composeRule, on, logger)
        BehaviorFactory.run(drySpec(), ctx)
    }
}
