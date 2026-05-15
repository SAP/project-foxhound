/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs

import androidx.annotation.StringRes

/**
 * Value type that represents a labs feature.
 *
 * @property key The [FeatureKey] of the feature.
 * @property name The string resource ID of the feature name.
 * @property description The string resource ID of the feature description.
 * @property enabled Whether or not the feature is enabled.
 */
data class LabsFeature(
    val key: FeatureKey,
    @param:StringRes val name: Int,
    @param:StringRes val description: Int,
    val enabled: Boolean,
)

/**
 * Enum that represents a labs feature.
 */
enum class FeatureKey {
    HOMEPAGE_AS_A_NEW_TAB,
}
