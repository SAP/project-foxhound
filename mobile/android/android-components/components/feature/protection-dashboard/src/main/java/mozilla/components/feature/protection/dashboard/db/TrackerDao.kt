/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.protection.dashboard.db

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/**
 * Internal DAO for accessing and modifying tracker statistics in the database.
 */
@Dao
internal interface TrackerDao {

    // TABLE 1: Daily totals

    @Upsert
    suspend fun upsertTotal(entity: TrackerTotalEntity)

    @Query("SELECT * FROM tracker_totals WHERE date = :date LIMIT 1")
    suspend fun getTotal(date: Long): TrackerTotalEntity?

    @Query("SELECT * FROM tracker_totals WHERE date >= :startDate")
    fun getTotalsSince(startDate: Long): Flow<List<TrackerTotalEntity>>

    @Query(
        """
        SELECT SUM(adCount + analyticsCount + socialCount + contentCount + cryptominingCount +
            fingerprintingCount + mozillaSocialCount + emailCount + scriptsAndSubResourcesCount)
        FROM tracker_totals WHERE date >= :startDate
        """,
    )
    fun getTotalCountSince(startDate: Long): Flow<Int?>

    // TABLE 2: Per-host all-time totals

    @Upsert
    suspend fun upsertByHost(entity: TrackerByHostEntity)

    @Query("SELECT * FROM tracker_by_host WHERE host = :host LIMIT 1")
    suspend fun getByHost(host: String): TrackerByHostEntity?

    @Query(
        """
        SELECT * FROM tracker_by_host
        ORDER BY (adCount + analyticsCount + socialCount + contentCount + cryptominingCount +
            fingerprintingCount + mozillaSocialCount + emailCount + scriptsAndSubResourcesCount) DESC
        LIMIT :limit
        """,
    )
    fun getTopBlockedHosts(limit: Int = 10): Flow<List<TrackerByHostEntity>>

    // Delete data

    @Query("DELETE FROM tracker_totals")
    suspend fun deleteAllTotals()

    @Query("DELETE FROM tracker_by_host")
    suspend fun deleteAllByHost()
}
