/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.protection.dashboard.db

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Entity representing daily tracker totals with one column per category.
 * Used for time-based queries (daily, weekly, monthly, yearly, all-time).
 */
@Entity(tableName = "tracker_totals")
internal data class TrackerTotalEntity(
    @PrimaryKey
    val date: Long,
    val adCount: Int = 0,
    val analyticsCount: Int = 0,
    val socialCount: Int = 0,
    val contentCount: Int = 0,
    val cryptominingCount: Int = 0,
    val fingerprintingCount: Int = 0,
    val mozillaSocialCount: Int = 0,
    val emailCount: Int = 0,
    val scriptsAndSubResourcesCount: Int = 0,
)

/**
 * Entity representing all-time tracker totals per host with one column per category.
 * Used for per-site statistics and "top blocked sites" queries.
 */
@Entity(tableName = "tracker_by_host")
internal data class TrackerByHostEntity(
    @PrimaryKey
    val host: String,
    val adCount: Int = 0,
    val analyticsCount: Int = 0,
    val socialCount: Int = 0,
    val contentCount: Int = 0,
    val cryptominingCount: Int = 0,
    val fingerprintingCount: Int = 0,
    val mozillaSocialCount: Int = 0,
    val emailCount: Int = 0,
    val scriptsAndSubResourcesCount: Int = 0,
)
