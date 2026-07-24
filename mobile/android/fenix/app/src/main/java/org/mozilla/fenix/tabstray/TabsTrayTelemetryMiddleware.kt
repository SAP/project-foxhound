/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import mozilla.telemetry.glean.private.NoExtras
import org.mozilla.experiments.nimbus.NimbusEventStore
import org.mozilla.fenix.GleanMetrics.Metrics
import org.mozilla.fenix.GleanMetrics.TabSearch
import org.mozilla.fenix.GleanMetrics.TabsTray
import org.mozilla.fenix.components.metrics.MetricsUtils
import org.mozilla.fenix.components.metrics.MetricsUtils.BookmarkAction.Source

/**
 * Middleware that records telemetry events for the Tabs Tray feature.
 *
 * @param nimbusEventStore [NimbusEventStore] for recording events to use in behavioral targeting.
 */
class TabsTrayTelemetryMiddleware(
    private val nimbusEventStore: NimbusEventStore,
) : Middleware<TabsTrayState, TabsTrayAction> {

    private var shouldReportInactiveTabMetrics: Boolean = true

    override fun invoke(
        store: Store<TabsTrayState, TabsTrayAction>,
        next: (TabsTrayAction) -> Unit,
        action: TabsTrayAction,
    ) {
        next(action)

        when (action) {
            is TabsTrayAction.UpdateInactiveTabs -> {
                if (shouldReportInactiveTabMetrics) {
                    shouldReportInactiveTabMetrics = false

                    TabsTray.hasInactiveTabs.record(TabsTray.HasInactiveTabsExtra(action.tabs.size))
                    Metrics.inactiveTabsCount.set(action.tabs.size.toLong())
                }
            }
            is TabsTrayAction.EnterSelectMode -> {
                TabsTray.enterMultiselectMode.record(TabsTray.EnterMultiselectModeExtra(false))
            }
            is TabsTrayAction.AddSelectTab -> {
                TabsTray.enterMultiselectMode.record(TabsTray.EnterMultiselectModeExtra(true))
            }
            is TabsTrayAction.TabAutoCloseDialogShown -> {
                TabsTray.autoCloseSeen.record(NoExtras())
            }
            is TabsTrayAction.ShareAllNormalTabs -> {
                TabsTray.shareAllTabs.record(NoExtras())
            }
            is TabsTrayAction.ShareAllPrivateTabs -> {
                TabsTray.shareAllTabs.record(NoExtras())
            }
            is TabsTrayAction.CloseAllNormalTabs -> {
                TabsTray.closeAllTabs.record(NoExtras())
            }
            is TabsTrayAction.CloseAllPrivateTabs -> {
                TabsTray.closeAllTabs.record(NoExtras())
            }
            is TabsTrayAction.BookmarkSelectedTabs -> {
                TabsTray.bookmarkSelectedTabs.record(TabsTray.BookmarkSelectedTabsExtra(tabCount = action.tabCount))
                MetricsUtils.recordBookmarkAddMetric(Source.TABS_TRAY, nimbusEventStore, count = action.tabCount)
            }

            is TabsTrayAction.ThreeDotMenuShown -> {
                TabsTray.menuOpened.record(NoExtras())
            }

            is TabsTrayAction.TabSearchClicked -> {
                TabSearch.tabSearchIconClicked.record(NoExtras())
            }

            is TabSearchAction.SearchResultClicked -> {
                TabSearch.resultClicked.record(NoExtras())
            }

            is TabsTrayAction.NavigateBackInvoked -> {
                TabSearch.navigateBackIconClicked.record(NoExtras())
            }

            else -> {
                // no-op
            }
        }
    }
}
