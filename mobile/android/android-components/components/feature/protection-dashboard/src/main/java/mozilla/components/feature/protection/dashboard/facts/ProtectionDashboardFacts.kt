/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.protection.dashboard.facts

import mozilla.components.feature.protection.dashboard.TrackerCategory
import mozilla.components.support.base.Component
import mozilla.components.support.base.facts.Action
import mozilla.components.support.base.facts.Fact
import mozilla.components.support.base.facts.collect

/**
 * Facts emitted for telemetry related to the protections dashboard.
 */
class ProtectionDashboardFacts {
    /**
     * Items that specify which portion of the dashboard was interacted with.
     */
    object Items {
        const val TRACKER_CATEGORY = "tracker_category"
    }
}

/**
 * Emits a fact when one of the tracker breakdown categories is tapped. The tapped [category] is
 * carried in the fact value so the consuming application can map it to its own telemetry.
 */
internal fun emitTrackerCategoryTappedFact(category: TrackerCategory) {
    Fact(
        Component.FEATURE_PROTECTION_DASHBOARD,
        Action.CLICK,
        ProtectionDashboardFacts.Items.TRACKER_CATEGORY,
        value = category.name,
    ).collect()
}
