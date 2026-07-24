/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:Suppress("TooManyFunctions")

package org.mozilla.fenix.tabstray.syncedtabs

import android.content.res.Configuration
import androidx.annotation.VisibleForTesting
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import mozilla.components.browser.storage.sync.TabEntry
import mozilla.components.compose.base.button.FilledButton
import mozilla.components.compose.base.modifier.dashedBorder
import mozilla.components.feature.syncedtabs.view.SyncedTabsView
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.list.ExpandableListHeader
import org.mozilla.fenix.compose.list.FaviconListItem
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.theme.FirefoxTheme
import mozilla.components.browser.storage.sync.Tab as SyncTab
import mozilla.components.ui.icons.R as iconsR

/**
 * A lambda invoked when the user clicks on a synced tab in the [SyncedTabsList].
 */
typealias OnTabClick = (tab: SyncTab) -> Unit

/**
 * A lambda invoked when the user clicks a synced tab's close button in the [SyncedTabsList].
 */
typealias OnTabCloseClick = (deviceId: String, tab: SyncTab) -> Unit

/**
 * A lambda invoked when the expands a section in the [SyncedTabsList].
 */
typealias OnSectionExpansionToggled = (index: Int) -> Unit

/**
 * Top-level list UI for displaying Synced Tabs in the Tabs Tray.
 *
 * @param syncedTabs The tab UI items to be displayed.
 * @param onTabClick The lambda for handling clicks on synced tabs.
 * @param onTabCloseClick The lambda for handling clicks on a synced tab's close button.
 * @param expandedState A list of expanded state properties for the synced tabs.
 * @param onSectionExpansionToggled A lambda for handling section expansion/collapse.
 */
@SuppressWarnings("LongMethod", "CognitiveComplexMethod")
@Composable
fun SyncedTabsList(
    syncedTabs: List<SyncedTabsListItem>,
    onTabClick: OnTabClick,
    onTabCloseClick: OnTabCloseClick,
    expandedState: List<Boolean>,
    onSectionExpansionToggled: OnSectionExpansionToggled,
) {
    val listState = rememberLazyListState()
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag(TabsTrayTestTag.SYNCED_TABS_LIST),
        state = listState,
    ) {
        syncedTabs.forEachIndexed { index, syncedTabItem ->
            when (syncedTabItem) {
                is SyncedTabsListItem.DeviceSection -> {
                    val sectionExpanded = expandedState[index]

                    stickyHeader {
                        SyncedTabsSectionHeader(
                            headerText = syncedTabItem.displayName,
                            expanded = sectionExpanded,
                        ) {
                            onSectionExpansionToggled(index)
                        }
                    }

                    if (sectionExpanded) {
                        if (syncedTabItem.tabs.isNotEmpty()) {
                            items(syncedTabItem.tabs) { syncedTab ->
                                when (syncedTab.action) {
                                    is SyncedTabsListItem.Tab.Action.Close -> FaviconListItem(
                                        label = syncedTab.displayTitle,
                                        url = syncedTab.displayURL,
                                        description = syncedTab.displayURL,
                                        onClick = { onTabClick(syncedTab.tab) },
                                        iconDescription = stringResource(R.string.close_tab),
                                        iconPainter = painterResource(iconsR.drawable.mozac_ic_cross_24),
                                        onIconClick = { onTabCloseClick(syncedTab.action.deviceId, syncedTab.tab) },
                                    )
                                    is SyncedTabsListItem.Tab.Action.None -> FaviconListItem(
                                        label = syncedTab.displayTitle,
                                        url = syncedTab.displayURL,
                                        description = syncedTab.displayURL,
                                        onClick = { onTabClick(syncedTab.tab) },
                                    )
                                }
                            }
                        } else {
                            item { SyncedTabsNoTabsItem() }
                        }
                    }
                }

                is SyncedTabsListItem.Error -> {
                    item {
                        SyncedTabsErrorItem(
                            errorText = syncedTabItem.errorText,
                            errorButton = syncedTabItem.errorButton,
                        )
                    }
                }
                else -> {
                    // no-op
                }
            }
        }

        item {
            // The Spacer here is to act as a footer to add padding to the bottom of the list so
            // the FAB or any potential SnackBar doesn't overlap with the items at the end.
            Spacer(modifier = Modifier.height(240.dp))
        }
    }
}

/**
 * Collapsible header for sections of synced tabs
 *
 * @param headerText The section title for a group of synced tabs.
 * @param expanded Indicates whether the section of content is expanded. If null, the Icon will be hidden.
 * @param onClick Optional lambda for handling section header clicks.
 */
@Composable
fun SyncedTabsSectionHeader(
    headerText: String,
    expanded: Boolean? = null,
    onClick: () -> Unit = {},
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface),
    ) {
        ExpandableListHeader(
            headerText = headerText,
            expanded = expanded,
            expandActionContentDescription = stringResource(R.string.synced_tabs_expand_group),
            collapseActionContentDescription = stringResource(R.string.synced_tabs_collapse_group),
            onClick = onClick,
        )

        HorizontalDivider()
    }
}

/**
 * Error UI to show if there is one of the errors outlined in [SyncedTabsView.ErrorType].
 *
 * @param errorText The text to be displayed to the user.
 * @param errorButton Optional class to set up and handle any clicks in the Error UI.
 */
@Composable
fun SyncedTabsErrorItem(
    errorText: String,
    errorButton: SyncedTabsListItem.ErrorButton? = null,
) {
    Box(
        Modifier
            .padding(all = 8.dp)
            .height(IntrinsicSize.Min)
            .dashedBorder(
                color = MaterialTheme.colorScheme.outlineVariant,
                cornerRadius = 8.dp,
                dashHeight = 2.dp,
                dashWidth = 4.dp,
            ),
    ) {
        Column(
            Modifier
                .padding(all = 16.dp)
                .fillMaxWidth(),
        ) {
            Text(
                text = errorText,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.fillMaxWidth(),
                fontSize = 14.sp,
            )

            errorButton?.let {
                Spacer(modifier = Modifier.height(12.dp))

                FilledButton(
                    text = it.buttonText,
                    modifier = Modifier.fillMaxWidth(),
                    icon = painterResource(iconsR.drawable.mozac_ic_avatar_circle_fill_24),
                    onClick = it.onClick,
                )
            }
        }
    }
}

/**
 * UI to be displayed when a user's device has no synced tabs.
 */
@Composable
fun SyncedTabsNoTabsItem() {
    Text(
        text = stringResource(R.string.synced_tabs_no_open_tabs),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .fillMaxWidth(),
        fontSize = 16.sp,
        maxLines = 1,
    )
}

@Composable
@Preview(uiMode = Configuration.UI_MODE_NIGHT_YES)
private fun SyncedTabsListItemsPreview() {
    FirefoxTheme {
        Surface {
            SyncedTabsSectionHeader(headerText = "Google Pixel Pro Max +Ultra 5000")

            Spacer(modifier = Modifier.height(16.dp))

            SyncedTabsSectionHeader(
                headerText = "Collapsible Google Pixel Pro Max +Ultra 5000",
                expanded = true,
            ) { println("Clicked section header") }

            Spacer(modifier = Modifier.height(16.dp))

            FaviconListItem(
                label = "Mozilla",
                url = "www.mozilla.org",
                description = "www.mozilla.org",
                onClick = {},
            )

            Spacer(modifier = Modifier.height(16.dp))

            SyncedTabsErrorItem(errorText = stringResource(R.string.synced_tabs_reauth))

            Spacer(modifier = Modifier.height(16.dp))

            SyncedTabsNoTabsItem()

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
@Preview(uiMode = Configuration.UI_MODE_NIGHT_YES)
private fun SyncedTabsErrorPreview() {
    FirefoxTheme {
        Surface {
            SyncedTabsErrorItem(
                errorText = stringResource(R.string.synced_tabs_no_tabs),
                errorButton = SyncedTabsListItem.ErrorButton(
                    buttonText = stringResource(R.string.synced_tabs_sign_in_button),
                ) {
                    println("SyncedTabsErrorButton click")
                },
            )
        }
    }
}

@Composable
@Preview(uiMode = Configuration.UI_MODE_NIGHT_YES)
private fun SyncedTabsListPreview() {
    val syncedTabList = getFakeSyncedTabList()
    FirefoxTheme {
        Surface {
            SyncedTabsList(
                syncedTabs = syncedTabList,
                onTabClick = { println("Tab clicked") },
                onTabCloseClick = { _, _ -> println("Tab closed") },
                expandedState = syncedTabList.map { true },
                onSectionExpansionToggled = {},
            )
        }
    }
}

/**
 * Helper function to create a List of [SyncedTabsListItem] for previewing.
 */
@VisibleForTesting
internal fun getFakeSyncedTabList(): List<SyncedTabsListItem> = listOf(
    SyncedTabsListItem.DeviceSection(
        displayName = "Device 1",
        tabs = listOf(
            generateFakeTab("Mozilla", "www.mozilla.org"),
            generateFakeTab("Google", "www.google.com"),
            generateFakeTab("", "www.google.com"),
        ),
    ),
    SyncedTabsListItem.DeviceSection(
        displayName = "Device 2",
        tabs = listOf(
            generateFakeTab("Firefox", "www.getfirefox.org", SyncedTabsListItem.Tab.Action.Close("device2222")),
            generateFakeTab("Thunderbird", "www.getthunderbird.org", SyncedTabsListItem.Tab.Action.Close("device2222")),
        ),
    ),
    SyncedTabsListItem.DeviceSection("Device 3", emptyList()),
    SyncedTabsListItem.Error("Please re-authenticate"),
)

/**
 * Helper function to create a [SyncedTabsListItem.Tab] for previewing.
 */
@VisibleForTesting
internal fun generateFakeTab(
    tabName: String,
    tabUrl: String,
    action: SyncedTabsListItem.Tab.Action = SyncedTabsListItem.Tab.Action.None,
): SyncedTabsListItem.Tab =
    SyncedTabsListItem.Tab(
        tabName.ifEmpty { tabUrl },
        tabUrl,
        action,
        SyncTab(
            history = listOf(TabEntry(tabName, tabUrl, null)),
            active = 0,
            lastUsed = 0L,
            inactive = false,
        ),
    )
