/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.fenix.tabstray.ui

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onChildAt
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.mockk
import io.mockk.verify
import mozilla.components.browser.storage.sync.TabEntry
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.tabstray.TabsTrayTestTag.SYNCED_TABS_LIST
import org.mozilla.fenix.tabstray.syncedtabs.OnSectionExpansionToggled
import org.mozilla.fenix.tabstray.syncedtabs.SyncedTabsListItem
import org.mozilla.fenix.tabstray.ui.syncedtabs.SyncedTabsList
import mozilla.components.browser.storage.sync.Tab as SyncTab

@RunWith(AndroidJUnit4::class)
class SyncedTabListTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun testClickingSyncedTabHeaderInvokesCallback() {
        var expansionToggled = false

        val fakeTabs = generateFakeSyncedTabsList(3)
        composeTestRule.setContent {
            SyncedTabsList(
                syncedTabs = fakeTabs,
                onTabClick = { println("Tab clicked") },
                onTabCloseClick = { _, _ -> println("Tab closed") },
                onSectionExpansionToggled = { expansionToggled = true },
                expandedState = fakeTabs.map { true },
            )
        }

        composeTestRule.onNodeWithTag(SYNCED_TABS_LIST).onChildAt(0).performClick()

        assertTrue(expansionToggled)
    }

    private fun generateFakeSyncedTabsList(deviceCount: Int = 1): List<SyncedTabsListItem> =
        List(deviceCount) { index ->
            SyncedTabsListItem.DeviceSection(
                displayName = "Device $index",
                tabs = listOf(
                    generateFakeSyncedTab("Mozilla", "www.mozilla.org"),
                    generateFakeSyncedTab("Google", "www.google.com"),
                    generateFakeSyncedTab("", "www.google.com"),
                ),
            )
        }

    private fun generateFakeSyncedTab(
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
}
