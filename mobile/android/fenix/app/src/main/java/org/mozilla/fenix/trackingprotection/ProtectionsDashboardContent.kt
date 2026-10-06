/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.trackingprotection

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.CornerSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.traversalIndex
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.BottomSheetHandle
import mozilla.components.feature.protection.dashboard.TrackerCategory
import mozilla.components.feature.protection.dashboard.TrackerProtectionDashboard
import mozilla.components.feature.protection.dashboard.TrackersBlockedCategory
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import java.text.DateFormat
import java.util.Date
import mozilla.components.ui.icons.R as iconsR

/**
 * The trackers protections dashboard styled as a bottom sheet layout.
 *
 * @param totalTrackersBlocked The total number of trackers blocked across visited websites.
 * @param trackersBlockedThisWeek List of the trackers blocked this week.
 * @param earliestTrackingDate the earliest date for which we have information about blocked trackers
 * as a Unix time stamp.
 * @param onDismiss Callback for when the user dismisses this panel
 * (by pressing system back or from interacting with the bottom sheet handle).
 */
@Composable
fun ProtectionsDashboardContent(
    totalTrackersBlocked: Int,
    trackersBlockedThisWeek: List<TrackersBlockedCategory>,
    earliestTrackingDate: Long?,
    onDismiss: () -> Unit,
) {
    BackHandler {
        onDismiss()
    }

    val formattedEarliestDate = remember(earliestTrackingDate) {
        earliestTrackingDate?.let {
            DateFormat.getDateInstance(DateFormat.LONG).format(Date(it))
        }
    }

    FirefoxTheme {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(
                    MaterialTheme.shapes.extraLarge.copy(
                        bottomStart = CornerSize(0.dp),
                        bottomEnd = CornerSize(0.dp),
                    ),
                )
                .semantics { isTraversalGroup = true },
        ) {
            TrackerProtectionDashboard(
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { traversalIndex = 0f },
                appName = stringResource(R.string.firefox),
                totalTrackersBlockedAllTime = totalTrackersBlocked,
                trackingSinceDate = formattedEarliestDate,
                totalTrackersBlocked = trackersBlockedThisWeek.sumOf { it.count },
                sitesCount = 0, // We don't yet have an API to get this data from.
                dataSavedMB = null, // We don't yet have an API to get this data from.
                trackersBlocked = trackersBlockedThisWeek,
                contentPadding = PaddingValues(
                    top = FirefoxTheme.layout.size.static300, // handle height + its top padding
                ),
            )

            BottomSheetHandle(
                onRequestDismiss = onDismiss,
                contentDescription = "",
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .minimumInteractiveComponentSize()
                    .semantics { traversalIndex = 1f },
            )
        }
    }
}

@Preview
@Composable
private fun ProtectionsDashboardContentPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    val trackersBlocked = listOf(
        TrackersBlockedCategory(
            icon = iconsR.drawable.mozac_ic_cookies_24,
            name = R.plurals.trackers_blocked_panel_num_cross_site_cookies,
            count = 302,
            category = TrackerCategory.CROSS_SITE_COOKIES,
        ),
        TrackersBlockedCategory(
            icon = iconsR.drawable.mozac_ic_social_tracker_24,
            name = R.plurals.trackers_blocked_panel_num_social_media_trackers,
            count = 241,
            category = TrackerCategory.SOCIAL_MEDIA_TRACKERS,
        ),
        TrackersBlockedCategory(
            icon = iconsR.drawable.mozac_ic_fingerprinter_24,
            name = R.plurals.trackers_blocked_panel_num_fingerprinters,
            count = 0,
            category = TrackerCategory.FINGERPRINTERS,
        ),
        TrackersBlockedCategory(
            icon = iconsR.drawable.mozac_ic_image_24,
            name = R.plurals.trackers_blocked_panel_num_trackers_2,
            count = 2234,
            category = TrackerCategory.TRACKING_CONTENT,
        ),
    )

    FirefoxTheme(theme) {
        Surface {
            ProtectionsDashboardContent(
                totalTrackersBlocked = 12345,
                trackersBlockedThisWeek = trackersBlocked,
                earliestTrackingDate = 1771797600,
            ) {}
        }
    }
}
