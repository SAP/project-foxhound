/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs

import androidx.annotation.StringRes

/**
 * Value type that represents a Firefox Labs item.
 *
 * @property slug The Nimbus slug identifying this Labs item. Used as
 * the stable identifier for telemetry and enrollment.
 * @property title The string resource ID for the item's title.
 * @property description The string resource ID for the item's description.
 * @property enrolled Whether the user is currently enrolled in this Labs item.
 * @property requiresRestart Whether toggling this item requires an application
 * restart for the change to take effect.
 * @property feedbackUrl An optional URL for sharing feedback about this item.
 */
data class LabsItem(
    val slug: String,
    @param:StringRes val title: Int,
    @param:StringRes val description: Int,
    val enrolled: Boolean,
    val requiresRestart: Boolean,
    val feedbackUrl: String? = null,
)

/**
 * Known Firefox Labs item slugs.
 * Note: This is for work-in-progress purposes.
 * This will be removed in bug 2032111.
 */
object LabsItemSlugs {
    const val HOMEPAGE_AS_NEW_TAB = "homepage-as-new-tab"
}
