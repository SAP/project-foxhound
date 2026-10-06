/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.trackingprotection

import androidx.annotation.MainThread
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.mapNotNull
import kotlinx.coroutines.withContext
import mozilla.components.browser.state.selector.findTabOrCustomTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent.Companion.FINGERPRINTERS
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent.Companion.SOCIAL
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent.Companion.SUSPICIOUS_FINGERPRINTERS
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent.Companion.TRACKERS
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent.Companion.TRACKING_COOKIES
import mozilla.components.feature.protection.dashboard.TrackerCategory
import mozilla.components.feature.protection.dashboard.TrackersBlockedCategory
import mozilla.components.feature.session.TrackingProtectionUseCases
import mozilla.components.lib.state.helpers.AbstractBinding
import mozilla.components.support.ktx.kotlinx.coroutines.flow.ifAnyChanged
import mozilla.components.support.utils.DefaultDateTimeProvider
import org.mozilla.fenix.R
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction.BlockedTrackersAction.UpdateEarliestTrackingDate
import org.mozilla.fenix.components.appstate.AppAction.BlockedTrackersAction.UpdateTrackersBlockedCount
import org.mozilla.fenix.components.appstate.AppAction.BlockedTrackersAction.UpdateTrackersBlockedThisWeek
import java.util.concurrent.TimeUnit
import kotlin.time.Duration.Companion.seconds
import mozilla.components.ui.icons.R as iconsR

/**
 * View-bound feature that dispatches tracker blocked changes from Gecko's blocked trackers database
 * to the [AppStore].
 *
 * @param browserStore The [BrowserStore] to observe for trackers blocked related events.
 * @param appStore The [AppStore] to dispatch actions to.
 * @param currentSessionId Optional id of a session to observe for tracker related updates.
 * which will trigger querying the blocked trackers database for new details.
 * @param trackingProtectionUseCases Use case to fetch details about blocked trackers.
 * @param ioDispatcher The [CoroutineDispatcher] for database operations. Defaults to [Dispatchers.IO].
 */
class TrackersBlockedFeature(
    private val browserStore: BrowserStore,
    private val appStore: AppStore,
    private val currentSessionId: String?,
    private val trackingProtectionUseCases: TrackingProtectionUseCases,
    ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : AbstractBinding<BrowserState>(browserStore, ioDispatcher) {

    override suspend fun onState(flow: Flow<BrowserState>) {
        // The tracker counts are read from Gecko's DB, not the tab state, so we always
        // perform one initial sync when the feature starts.
        // Subsequent changes to the tab's blocked trackers then trigger a refresh for dynamic updates.
        withContext(Dispatchers.Main) {
            syncTrackersBlockedDetails()
            syncEarliestData() // This cannot change for the lifetime of this class.
        }

        // The number of blocked trackers can change while a tab is being loaded in background.
        // Re-fetching this data whenever the blocked trackers callback fires (not always accurate)
        // allows for a dynamic update of the trackers blocked numbers.
        currentSessionId?.let {
            @OptIn(FlowPreview::class)
            flow.mapNotNull { state -> state.findTabOrCustomTab(it) }
                .ifAnyChanged { tab -> arrayOf(tab.trackingProtection.blockedTrackers) }
                .debounce(1.seconds)
                .collect {
                    withContext(Dispatchers.Main) {
                        syncTrackersBlockedDetails()
                    }
                }
        }
    }

    @MainThread // the Gecko queries need a Looper. Easiest is to do the queries on the main thread.
    private fun syncTrackersBlockedDetails() {
        syncTotalTrackerBlocked()
        syncTrackingEvents()
    }

    private fun syncTotalTrackerBlocked() {
        trackingProtectionUseCases.fetchTotalTrackersBlocked(
            onSuccess = {
                appStore.dispatch(UpdateTrackersBlockedCount(it))
            },
        )
    }

    private fun syncTrackingEvents() {
        val now = DefaultDateTimeProvider().currentTimeMillis()
        val oneWeekAgo = now - TimeUnit.DAYS.toMillis(7)
        trackingProtectionUseCases.fetchTrackingEvents(
            dateFrom = oneWeekAgo,
            dateTo = now,
            onSuccess = {
                appStore.dispatch(UpdateTrackersBlockedThisWeek(it.blockedTrackersCategories))
            },
        )
    }

    private fun syncEarliestData() {
        trackingProtectionUseCases.fetchEarliestTrackingDate(
            onSuccess = {
                appStore.dispatch(UpdateEarliestTrackingDate(it))
            },
        )
    }

    private val List<TrackingProtectionEvent>?.blockedTrackersCategories: List<TrackersBlockedCategory>
        get() {
            val events = this ?: return emptyList()
            val trackerCategories = listOf(
                CategoryConfig(
                    nameRes = R.plurals.trackers_blocked_panel_num_cross_site_cookies,
                    iconRes = iconsR.drawable.mozac_ic_cookies_24,
                    types = setOf(TRACKING_COOKIES),
                    category = TrackerCategory.CROSS_SITE_COOKIES,
                ),
                CategoryConfig(
                    nameRes = R.plurals.trackers_blocked_panel_num_social_media_trackers,
                    iconRes = iconsR.drawable.mozac_ic_social_tracker_24,
                    types = setOf(SOCIAL),
                    category = TrackerCategory.SOCIAL_MEDIA_TRACKERS,
                ),
                CategoryConfig(
                    nameRes = R.plurals.trackers_blocked_panel_num_fingerprinters,
                    iconRes = iconsR.drawable.mozac_ic_fingerprinter_24,
                    types = setOf(FINGERPRINTERS, SUSPICIOUS_FINGERPRINTERS),
                    category = TrackerCategory.FINGERPRINTERS,
                ),
                CategoryConfig(
                    nameRes = R.plurals.trackers_blocked_panel_num_trackers_2,
                    iconRes = iconsR.drawable.mozac_ic_image_24,
                    types = setOf(TRACKERS),
                    category = TrackerCategory.TRACKING_CONTENT,
                ),
            )
            return trackerCategories.map { config ->
                val count = events
                    .filter { it.type in config.types }
                    .sumOf { it.count }
                TrackersBlockedCategory(config.iconRes, config.nameRes, count, config.category)
            }
        }

    private data class CategoryConfig(
        val nameRes: Int,
        val iconRes: Int,
        val types: Set<Int>,
        val category: TrackerCategory,
    )
}
