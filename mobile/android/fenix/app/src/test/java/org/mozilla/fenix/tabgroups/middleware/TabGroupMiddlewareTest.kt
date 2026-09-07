/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups.middleware

import androidx.test.ext.junit.runners.AndroidJUnit4
import junit.framework.TestCase.assertEquals
import junit.framework.TestCase.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.TabListAction
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.tabgroups.fakes.FakeTabGroupRepository
import org.mozilla.fenix.tabgroups.storage.redux.middleware.TabGroupMiddleware

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class TabGroupMiddlewareTest {

    @Test
    fun `WHEN all normal tabs are deleted by the user THEN close all tab groups`() = runTest {
        var closedAllTabGroups = false
        val middleware = TabGroupMiddleware(
            tabGroupRepository = FakeTabGroupRepository(
                closeAllTabGroups = {
                    closedAllTabGroups = true
                },
            ),
            scope = this,
        )

        middleware.processAction(TabListAction.RemoveAllNormalTabsAction)

        advanceUntilIdle()

        assertTrue(closedAllTabGroups)
    }

    @Test
    fun `WHEN all tabs are deleted by the user THEN close all tab groups`() = runTest {
        var closedAllTabGroups = false
        val middleware = TabGroupMiddleware(
            tabGroupRepository = FakeTabGroupRepository(
                closeAllTabGroups = {
                    closedAllTabGroups = true
                },
            ),
            scope = this,
        )

        middleware.processAction(TabListAction.RemoveAllNormalTabsAction)

        advanceUntilIdle()

        assertTrue(closedAllTabGroups)
    }

    @Test
    fun `WHEN the user closes a grouped tab THEN remove the corresponding tab group assignment`() = runTest {
        val expectedTabId = "1"
        var closedTabId = ""
        val middleware = TabGroupMiddleware(
            tabGroupRepository = FakeTabGroupRepository(
                deleteTabGroupAssignmentById = {
                    closedTabId = it
                },
            ),
            scope = this,
        )

        middleware.processAction(TabListAction.RemoveTabAction(tabId = expectedTabId))

        advanceUntilIdle()

        assertEquals(expectedTabId, closedTabId)
    }

    @Test
    fun `WHEN the user closes multiple grouped tabs THEN remove the corresponding tab group assignments`() = runTest {
        val expectedTabIds = List(size = 10) { "$it" }
        var closedTabIds = emptyList<String>()
        val middleware = TabGroupMiddleware(
            tabGroupRepository = FakeTabGroupRepository(
                deleteTabGroupAssignmentsById = {
                    closedTabIds = it
                },
            ),
            scope = this,
        )

        middleware.processAction(TabListAction.RemoveTabsAction(tabIds = expectedTabIds))

        advanceUntilIdle()

        assertEquals(expectedTabIds, closedTabIds)
    }
}
