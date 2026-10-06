/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.ui.tabpage

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import mozilla.components.compose.base.button.TextButton
import org.mozilla.fenix.R
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.syncedtabs.OnSectionExpansionToggled
import org.mozilla.fenix.tabstray.syncedtabs.SyncedTabsListItem
import org.mozilla.fenix.tabstray.ui.syncedtabs.SyncedTabsList
import org.mozilla.fenix.theme.FirefoxTheme
import kotlin.Boolean
import mozilla.components.ui.icons.R as iconsR
import org.mozilla.fenix.tabstray.ui.syncedtabs.OnTabClick as OnSyncedTabClick
import org.mozilla.fenix.tabstray.ui.syncedtabs.OnTabCloseClick as OnSyncedTabClose

private val EmptyPageWidth = 200.dp

/**
 * UI for displaying the Synced Tabs Page in the Tab Manager.
 *
 * @param isSignedIn Whether the user is signed into their Firefox account.
 * @param syncedTabs The list of [SyncedTabsListItem] to display.
 * @param onTabClick Invoked when the user clicks on a tab.
 * @param onTabClose Invoked when the user clicks to close a tab.
 * @param onSignInClick Invoked when an unauthenticated user clicks to sign-in.
 * @param expandedState The list of [SyncedTabsListItem] expansion states.
 * @param onSectionExpansionToggled Invoked when a user toggles the section expansion.
 */
@Composable
internal fun SyncedTabsPage(
    isSignedIn: Boolean,
    syncedTabs: List<SyncedTabsListItem>,
    onTabClick: OnSyncedTabClick,
    onTabClose: OnSyncedTabClose,
    onSignInClick: () -> Unit,
    expandedState: List<Boolean>,
    onSectionExpansionToggled: OnSectionExpansionToggled,
) {
    if (isSignedIn) {
        SyncedTabsList(
            syncedTabs = syncedTabs,
            onTabClick = onTabClick,
            onTabCloseClick = onTabClose,
            expandedState = expandedState,
            onSectionExpansionToggled = onSectionExpansionToggled,
        )
    } else {
        UnauthenticatedSyncedTabsPage(onSignInClick = onSignInClick)
    }
}

/**
 * UI for the Synced Tabs Page when the user is not signed-in.
 *
 * @param modifier The [Modifier] to be applied to the layout.
 * @param onSignInClick Invoked when an unauthenticated user clicks to sign-in.
 */
@Composable
private fun UnauthenticatedSyncedTabsPage(
    modifier: Modifier = Modifier,
    onSignInClick: () -> Unit,
) {
    EmptyTabPage(
        modifier = modifier.testTag(TabsTrayTestTag.UNAUTHENTICATED_SYNCED_TABS_PAGE),
    ) {
        Column(
            modifier = Modifier.width(EmptyPageWidth),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                painter = painterResource(id = iconsR.drawable.mozac_ic_cloud_72),
                contentDescription = null,
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = stringResource(id = R.string.tab_manager_empty_synced_tabs_page_header),
                textAlign = TextAlign.Center,
                style = FirefoxTheme.typography.headline7,
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = stringResource(id = R.string.tab_manager_empty_synced_tabs_page_description),
                textAlign = TextAlign.Center,
                style = FirefoxTheme.typography.caption,
            )

            TextButton(
                text = stringResource(id = R.string.tab_manager_empty_synced_tabs_page_sign_in_cta),
                onClick = onSignInClick,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = LocalContentColor.current,
                ),
            )
        }
    }
}

@FlexibleWindowLightDarkPreview
@Composable
private fun UnauthenticatedSyncedTabsPagePreview() {
    FirefoxTheme {
        UnauthenticatedSyncedTabsPage(
            modifier = Modifier.background(color = MaterialTheme.colorScheme.surface),
            onSignInClick = {},
        )
    }
}
