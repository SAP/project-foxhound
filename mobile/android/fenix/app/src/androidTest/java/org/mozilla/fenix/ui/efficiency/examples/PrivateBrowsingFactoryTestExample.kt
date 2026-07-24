/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.examples

import org.junit.Test
import org.mozilla.fenix.ui.efficiency.factory.factories.BehaviorFactory
import org.mozilla.fenix.ui.efficiency.factory.factories.InteractionFactory
import org.mozilla.fenix.ui.efficiency.factory.factories.PresenceFactory
import org.mozilla.fenix.ui.efficiency.factory.logging.LoggerFactory
import org.mozilla.fenix.ui.efficiency.factory.steps.StepContext
import org.mozilla.fenix.ui.efficiency.features.privatebrowsing.PrivateBrowsingSpec
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest

/**
 * Demonstration test class that runs the real [PrivateBrowsingSpec] through
 * all three factory tiers: Presence, Interaction, and Behavior.
 *
 * This is primarily a **reference and educational example** to illustrate how
 * a concrete [FeatureSpec] is executed by the factories.
 *
 * - Executes the same feature data across different logical tiers.
 * - Useful for verifying that logging, artifact creation, and screenshot
 *   capture work end-to-end.
 * - Does not represent final production tests; will evolve or be removed
 *   once the team adopts DSL-driven or data-driven feature specs.
 */
class PrivateBrowsingFactoryTestExample : BaseTest() {

    @Test fun presence() {
        val logger = LoggerFactory.create()
        val ctx = StepContext(composeRule, on, logger)
        PresenceFactory.run(PrivateBrowsingSpec, ctx)
    }

    @Test fun interaction() {
        val logger = LoggerFactory.create()
        val ctx = StepContext(composeRule, on, logger)
        InteractionFactory.run(PrivateBrowsingSpec, ctx)
    }

    @Test fun behavior() {
        val logger = LoggerFactory.create()
        val ctx = StepContext(composeRule, on, logger)
        BehaviorFactory.run(PrivateBrowsingSpec, ctx)
    }
}
