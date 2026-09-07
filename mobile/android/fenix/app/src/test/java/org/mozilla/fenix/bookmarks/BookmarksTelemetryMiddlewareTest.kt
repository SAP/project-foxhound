/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.bookmarks

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.runTest
import mozilla.components.support.test.robolectric.testContext
import org.junit.Rule
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.BookmarksManagement
import org.mozilla.fenix.GleanMetrics.Metrics
import org.mozilla.fenix.helpers.FenixGleanTestRule
import kotlin.test.Test
import kotlin.test.assertEquals

@RunWith(AndroidJUnit4::class)
class BookmarksTelemetryMiddlewareTest {

    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    private val middleware = BookmarksTelemetryMiddleware()

    @Test
    fun `GIVEN import failed action is received, an import failed event is recorded`() = runTest {
        val store = middleware.makeStore()

        store.dispatch(ImportAction.ImportFailed)

        testScheduler.advanceUntilIdle()

        val events = BookmarksManagement.importFailed.testGetValue() ?: emptyList()

        assertEquals(1, events.size, "Expected 1 import failed event, but got ${events.size}")
    }

    @Test
    fun `GIVEN import file clicked from menu, an import file button clicked event is recorded`() =
        runTest {
            val store = middleware.makeStore()

            store.dispatch(ImportAction.ImportFileClicked.FromMenu)

            testScheduler.advanceUntilIdle()

            val events = BookmarksManagement.importFromFileMenuClick.testGetValue() ?: emptyList()

            assertEquals(1, events.size, "Expected 1 import file menu clicked event, but got ${events.size}")
        }

    @Test
    fun `GIVEN import succeeded action is received, an import succeeded event is recorded with the bookmarks count`() = runTest {
        val store = middleware.makeStore()

        store.dispatch(ImportAction.ImportSucceeded(count = 2))

        testScheduler.advanceUntilIdle()

        val events = BookmarksManagement.importSuccessful.testGetValue() ?: emptyList()

        assertEquals(1, events.size, "Expected 1 import succeeded event, but got ${events.size}")
        assertEquals(
            expected = "2",
            actual = events.first().extra?.get("bookmarks_count"),
            message = "Expected bookmarks_count extra to be 2",
        )
    }

    private fun BookmarksTelemetryMiddleware.makeStore(): BookmarksStore {
        return BookmarksStore(
            initialState = BookmarksState.default,
            middleware = listOf(this),
        )
    }
}
