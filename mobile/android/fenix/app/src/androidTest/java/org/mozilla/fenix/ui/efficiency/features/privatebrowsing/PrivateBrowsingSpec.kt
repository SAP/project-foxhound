/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.features.privatebrowsing

import org.mozilla.fenix.ui.efficiency.factory.feature.BehaviorCheck
import org.mozilla.fenix.ui.efficiency.factory.feature.FeatureKey
import org.mozilla.fenix.ui.efficiency.factory.feature.FeatureSpec
import org.mozilla.fenix.ui.efficiency.factory.feature.InteractionCheck
import org.mozilla.fenix.ui.efficiency.factory.feature.SurfaceCheck
import org.mozilla.fenix.ui.efficiency.factory.steps.Navigate
import org.mozilla.fenix.ui.efficiency.factory.steps.Toggle
import org.mozilla.fenix.ui.efficiency.factory.steps.VerifyElementsByGroup

/**
 * Demonstration [FeatureSpec] showing how a concrete feature definition maps
 * onto the abstract factory structure.
 *
 * This file exists primarily as an **educational and reference example**
 * for developers learning how to author a feature specification.
 *
 * It illustrates how Presence, Interaction, and Behavior tiers are built
 * from combinations of [TestStep]s, and what kind of test cases the factories
 * will later generate and execute dynamically.
 *
 * **Note:** This is *not* intended as a permanent production test spec.
 * As the factory system matures, the Private Browsing spec (and other demo
 * examples) will likely be replaced by DSL-based or data-driven definitions.
 */
val PrivateBrowsingSpec = FeatureSpec(
    key = FeatureKey.PRIVATE_BROWSING,
    preconditions = listOf(Navigate.To.Home()),
    surfaces = listOf(
        SurfaceCheck(
            navigateStep = Navigate.To.Home(),
            verifyStep = VerifyElementsByGroup("privateHomeHeader") { it.home },
        ),
        SurfaceCheck(
            navigateStep = Navigate.To.History(),
            verifyStep = VerifyElementsByGroup("emptyHistoryList") { it.history },
        ),
    ),
    interactions = listOf(
        InteractionCheck(
            navigateStep = Navigate.To.Home(),
            actionStep = Toggle.PrivateBrowsing(true),
            verifyStep = VerifyElementsByGroup("privateHomeHeader") { it.home },
        ),
    ),
    sanity = listOf(
        BehaviorCheck(
            setupSteps = listOf(Toggle.PrivateBrowsing(true)),
            triggerSteps = listOf(Navigate.To.Url("https://mozilla-mobile.github.io/testapp/")),
            crossPageVerifySteps = listOf(
                Navigate.To.History(),
                VerifyElementsByGroup("emptyHistoryList") { it.history },
            ),
        ),
    ),
    cleanup = listOf(Toggle.PrivateBrowsing(false)),
)
