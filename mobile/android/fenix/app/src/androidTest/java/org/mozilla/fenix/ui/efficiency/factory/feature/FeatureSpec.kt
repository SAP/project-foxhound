/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.feature

import org.mozilla.fenix.ui.efficiency.factory.steps.TestStep

/**
 * Describes the complete test specification for a feature under test.
 *
 * A [FeatureSpec] defines the ordered sets of checks and steps that the
 * test factories (Presence, Interaction, and Behavior) will execute.
 *
 * Structure:
 * - **preconditions** — steps to prepare the app before any suite runs
 * - **surfaces** — [SurfaceCheck]s for the Presence tier
 * - **interactions** — [InteractionCheck]s for the Interaction tier
 * - **sanity** — [BehaviorCheck]s for the Behavior tier
 * - **cleanup** — steps to restore app state after all checks complete
 *
 * The same [FeatureSpec] object can be reused across tiers. Factories will
 * automatically select the relevant portion (e.g., PresenceFactory uses only
 * [surfaces]).
 *
 * Example (conceptual):
 * ```
 * FeatureSpec(
 *   key = FeatureKey.PRIVATE_BROWSING,
 *   preconditions = listOf(Navigate.To.Home()),
 *   surfaces = [ ... ],
 *   interactions = [ ... ],
 *   sanity = [ ... ],
 *   cleanup = listOf(Toggle.PrivateBrowsing(false))
 * )
 * ```
 *
 * @property key           Unique [FeatureKey] for grouping generated tests.
 * @property preconditions Steps to ensure the app is in a valid starting state.
 * @property surfaces      Presence checks: navigation + verification pairs.
 * @property interactions  Interaction checks: navigation + action + verification.
 * @property sanity        Behavior checks: setup + trigger + cross-page verify.
 * @property cleanup        Steps to run after all tiers complete, even on failure.
 */
data class FeatureSpec(
    val key: FeatureKey,
    val preconditions: List<TestStep> = emptyList(),
    val surfaces: List<SurfaceCheck> = emptyList(),
    val interactions: List<InteractionCheck> = emptyList(),
    val sanity: List<BehaviorCheck> = emptyList(),
    val cleanup: List<TestStep> = emptyList(),
)
