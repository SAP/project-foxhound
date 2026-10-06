/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.protection.dashboard

import android.content.Context
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import mozilla.components.concept.engine.EngineSession.TrackingProtectionPolicy.TrackingCategory
import mozilla.components.feature.protection.dashboard.db.TrackerByHostEntity
import mozilla.components.feature.protection.dashboard.db.TrackerTotalEntity
import mozilla.components.feature.protection.dashboard.db.TrackersDatabase
import java.time.LocalDate
import kotlin.time.Duration.Companion.days

private val DAYS_IN_WEEK = 7.days.inWholeDays
private val DAYS_IN_MONTH = 30.days.inWholeDays
private val DAYS_IN_YEAR = 365.days.inWholeDays

/**
 * A storage implementation for tracker protection statistics.
 *
 * @param context Android context.
 */
class ProtectionsStorage(context: Context) {

    internal var database: Lazy<TrackersDatabase> = lazy { TrackersDatabase.get(context) }

    private val dao by lazy { database.value.trackerDao() }

    /**
     * Records a blocked tracker event.
     *
     * @param host The host of the page where the tracker was blocked.
     * @param categories The tracking categories of the blocked tracker.
     */
    suspend fun recordTrackerBlocked(
        host: String,
        categories: List<TrackingCategory>,
    ) {
        val today = todayAsEpochDay()

        // Update daily totals
        val currentTotal = dao.getTotal(today) ?: TrackerTotalEntity(date = today)
        dao.upsertTotal(currentTotal.incrementCategories(categories))

        // Update per-host totals
        val currentByHost = dao.getByHost(host) ?: TrackerByHostEntity(host = host)
        dao.upsertByHost(currentByHost.incrementCategories(categories))
    }

    /**
     * Returns the total count of trackers blocked since the given start date.
     *
     * @param startDate The start date as epoch day (days since Unix epoch).
     * @return A [Flow] emitting the total count, or 0 if no data exists.
     */
    fun getTotalCountSince(startDate: Long): Flow<Int> {
        return dao.getTotalCountSince(startDate).map { it ?: 0 }
    }

    /**
     * Returns the total count of trackers blocked today.
     */
    fun getTotalCountToday(): Flow<Int> = getTotalCountSince(todayAsEpochDay())

    /**
     * Returns the total count of trackers blocked in the last 7 days.
     */
    fun getTotalCountWeek(): Flow<Int> = getTotalCountSince(todayAsEpochDay() - DAYS_IN_WEEK)

    /**
     * Returns the total count of trackers blocked in the last 30 days.
     */
    fun getTotalCountMonth(): Flow<Int> = getTotalCountSince(todayAsEpochDay() - DAYS_IN_MONTH)

    /**
     * Returns the total count of trackers blocked in the last 365 days.
     */
    fun getTotalCountYear(): Flow<Int> = getTotalCountSince(todayAsEpochDay() - DAYS_IN_YEAR)

    /**
     * Returns the total count of all trackers ever blocked.
     */
    fun getTotalCountAllTime(): Flow<Int> = getTotalCountSince(0)

    /**
     * Returns the top blocked hosts.
     *
     * @param limit Maximum number of hosts to return.
     */
    fun getTopBlockedHosts(limit: Int = 10): Flow<List<HostStats>> {
        return dao.getTopBlockedHosts(limit).map { list ->
            list.map { entity -> entity.toHostStats() }
        }
    }

    /**
     * Deletes all stored tracker data.
     */
    suspend fun deleteAll() {
        dao.deleteAllTotals()
        dao.deleteAllByHost()
    }

    private fun todayAsEpochDay(): Long = LocalDate.now().toEpochDay()

    private fun TrackerTotalEntity.incrementCategories(
        categories: List<TrackingCategory>,
    ): TrackerTotalEntity = categories.fold(this) { entity, category ->
        when (category) {
            TrackingCategory.AD -> entity.copy(adCount = entity.adCount + 1)
            TrackingCategory.ANALYTICS -> entity.copy(analyticsCount = entity.analyticsCount + 1)
            TrackingCategory.SOCIAL -> entity.copy(socialCount = entity.socialCount + 1)
            TrackingCategory.CONTENT -> entity.copy(contentCount = entity.contentCount + 1)
            TrackingCategory.CRYPTOMINING -> entity.copy(cryptominingCount = entity.cryptominingCount + 1)
            TrackingCategory.FINGERPRINTING -> entity.copy(fingerprintingCount = entity.fingerprintingCount + 1)
            TrackingCategory.MOZILLA_SOCIAL -> entity.copy(mozillaSocialCount = entity.mozillaSocialCount + 1)
            TrackingCategory.SCRIPTS_AND_SUB_RESOURCES ->
                entity.copy(scriptsAndSubResourcesCount = entity.scriptsAndSubResourcesCount + 1)
            else -> entity
        }
    }

    private fun TrackerByHostEntity.incrementCategories(
        categories: List<TrackingCategory>,
    ): TrackerByHostEntity = categories.fold(this) { entity, category ->
        when (category) {
            TrackingCategory.AD -> entity.copy(adCount = entity.adCount + 1)
            TrackingCategory.ANALYTICS -> entity.copy(analyticsCount = entity.analyticsCount + 1)
            TrackingCategory.SOCIAL -> entity.copy(socialCount = entity.socialCount + 1)
            TrackingCategory.CONTENT -> entity.copy(contentCount = entity.contentCount + 1)
            TrackingCategory.CRYPTOMINING -> entity.copy(cryptominingCount = entity.cryptominingCount + 1)
            TrackingCategory.FINGERPRINTING -> entity.copy(fingerprintingCount = entity.fingerprintingCount + 1)
            TrackingCategory.MOZILLA_SOCIAL -> entity.copy(mozillaSocialCount = entity.mozillaSocialCount + 1)
            TrackingCategory.SCRIPTS_AND_SUB_RESOURCES ->
                entity.copy(scriptsAndSubResourcesCount = entity.scriptsAndSubResourcesCount + 1)
            else -> entity
        }
    }

    private fun TrackerByHostEntity.toHostStats(): HostStats {
        return HostStats(
            host = host,
            totalCount = adCount + analyticsCount + socialCount + contentCount +
                cryptominingCount + fingerprintingCount + mozillaSocialCount +
                emailCount + scriptsAndSubResourcesCount,
        )
    }
}

/**
 * Statistics for a single host.
 *
 * @property host The hostname.
 * @property totalCount Total number of trackers blocked from this host.
 */
data class HostStats(
    val host: String,
    val totalCount: Int,
)
