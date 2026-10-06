/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.trustpanel.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalResources
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import org.mozilla.fenix.R
import org.mozilla.fenix.components.menu.compose.MenuGroup
import org.mozilla.fenix.components.menu.compose.MenuItem
import org.mozilla.fenix.components.menu.compose.MenuScaffold
import org.mozilla.fenix.components.menu.compose.header.SubmenuHeader
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.trackingprotection.TrackerBuckets
import org.mozilla.fenix.trackingprotection.TrackingProtectionCategory
import org.mozilla.fenix.trackingprotection.TrackingProtectionCategory.CROSS_SITE_TRACKING_COOKIES
import org.mozilla.fenix.trackingprotection.TrackingProtectionCategory.CRYPTOMINERS
import org.mozilla.fenix.trackingprotection.TrackingProtectionCategory.FINGERPRINTERS
import org.mozilla.fenix.trackingprotection.TrackingProtectionCategory.SOCIAL_MEDIA_TRACKERS
import org.mozilla.fenix.trackingprotection.TrackingProtectionCategory.TRACKING_CONTENT
import mozilla.components.ui.icons.R as iconsR

@Composable
internal fun TrackersBlockedPanel(
    title: String,
    numberOfTrackersBlocked: Int,
    numberOfTrackersBlockedThisWeek: Int,
    bucketedTrackers: TrackerBuckets,
    onTrackerCategoryClick: (TrackingProtectionCategory) -> Unit,
    onTrackersBlockedThisWeekClicked: () -> Unit,
    onBackButtonClick: () -> Unit,
) {
    MenuScaffold(
        header = {
            SubmenuHeader(
                header = title,
                onClick = onBackButtonClick,
            )
        },
    ) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = pluralStringResource(
                        R.plurals.trackers_blocked_panel_total_num_trackers_blocked_2,
                        numberOfTrackersBlocked,
                        numberOfTrackersBlocked,
                    ),
                    modifier = Modifier.weight(1f),
                    color = MaterialTheme.colorScheme.onSurface,
                    style = FirefoxTheme.typography.headline8,
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            MenuGroup {
                TrackingProtectionCategory.entries
                    .filter { bucketedTrackers.get(it, true).isNotEmpty() }
                    .forEach { trackingProtectionCategory ->
                        MenuItem(
                            label = trackingProtectionCategory.displayLabel(
                                bucketedTrackers.get(trackingProtectionCategory, true).size,
                            ),
                            beforeIconPainter = painterResource(id = trackingProtectionCategory.icon),
                            onClick = { onTrackerCategoryClick(trackingProtectionCategory) },
                        )
                    }
            }

            Spacer(Modifier.height(FirefoxTheme.layout.space.static200))

            MenuGroup {
                MenuItem(
                    label = pluralStringResource(
                        R.plurals.trackers_blocked_panel_num_trackers_blocked_this_week_2,
                        numberOfTrackersBlockedThisWeek,
                        numberOfTrackersBlockedThisWeek,
                    ),
                    beforeIconPainter = painterResource(iconsR.drawable.mozac_ic_shield_checkmark_24),
                    onClick = { onTrackersBlockedThisWeekClicked() },
                )
            }
        }
    }
}

@Composable
@ReadOnlyComposable
private fun TrackingProtectionCategory.displayLabel(count: Int): String = LocalResources.current.getQuantityString(
    when (this) {
        SOCIAL_MEDIA_TRACKERS -> R.plurals.trackers_blocked_panel_num_social_media_trackers
        CROSS_SITE_TRACKING_COOKIES -> R.plurals.trackers_blocked_panel_num_cross_site_cookies
        CRYPTOMINERS -> R.plurals.trackers_blocked_panel_num_cryptominers
        FINGERPRINTERS -> R.plurals.trackers_blocked_panel_num_fingerprinters
        TRACKING_CONTENT -> R.plurals.trackers_blocked_panel_num_trackers_2
    },
    count,
    count,
)

@PreviewLightDark
@Composable
private fun TrackersBlockedPanelPreview() {
    FirefoxTheme {
        Column(
            modifier = Modifier
                .background(color = MaterialTheme.colorScheme.surface),
        ) {
            TrackersBlockedPanel(
                title = "Mozilla",
                numberOfTrackersBlocked = 0,
                numberOfTrackersBlockedThisWeek = 33,
                bucketedTrackers = TrackerBuckets(),
                onTrackerCategoryClick = {},
                onTrackersBlockedThisWeekClicked = {},
                onBackButtonClick = {},
            )
        }
    }
}
