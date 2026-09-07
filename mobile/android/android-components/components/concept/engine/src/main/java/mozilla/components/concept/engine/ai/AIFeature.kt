/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.engine.ai

/**
 * Represents an AI feature and its current state.
 *
 * @property id The unique identifier for this feature.
 * @property isEnabled Whether the feature is actively in use.
 * @property isAllowed Whether the feature is possible to use.
 * @property isBlocked Whether the feature is blocked from being used.
 */
data class AIFeature(
    val id: String,
    val isEnabled: Boolean,
    val isAllowed: Boolean,
    val isBlocked: Boolean,
)
