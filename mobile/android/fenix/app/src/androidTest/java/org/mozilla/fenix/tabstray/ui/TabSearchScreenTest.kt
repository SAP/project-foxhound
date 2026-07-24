/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.fenix.tabstray.ui

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.state.state.createTab
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.tabstray.TabsTrayState
import org.mozilla.fenix.tabstray.TabsTrayStore
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.redux.middleware.TabSearchNavigationMiddleware
import org.mozilla.fenix.tabstray.redux.state.TabSearchState
import org.mozilla.fenix.tabstray.ui.tabsearch.TabSearchScreen

@RunWith(AndroidJUnit4::class)
class TabSearchScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun tabSearchResultClickedTest() {
        var tabSearchInvoked = false

        val store = TabsTrayStore(
            middlewares = listOf(TabSearchNavigationMiddleware(onSearchResultClicked = { tabSearchInvoked = true })),
            initialState = TabsTrayState(
                tabSearchState = TabSearchState(
                    query = "mozilla",
                    listOf(
                        createTab(url = "www.mozilla.com", id = "1"),
                    ),
                ),
            ),
        )

        composeTestRule.setContent {
            TabSearchScreen(store = store)
        }

        composeTestRule.onNodeWithTag(TabsTrayTestTag.TAB_ITEM_ROOT).performClick()

        assertTrue(tabSearchInvoked)
    }
}
