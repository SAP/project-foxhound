/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.bookmarks

import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.bookmarks.BookmarksUseCase

class BookmarksFeatureTest {

    private val middleware = CaptureActionsMiddleware<AppState, AppAction>()
    private val appStore = AppStore(middlewares = listOf(middleware))
    private val bookmarksUseCases: BookmarksUseCase = mockk(relaxed = true)
    private val bookmark = Bookmark(
        title = null,
        url = "https://www.example.com",
        previewImageUrl = null,
    )

    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        coEvery { bookmarksUseCases.retrieveRecentBookmarks() }.coAnswers { listOf(bookmark) }
    }

    @Test
    fun `GIVEN no bookmarks WHEN feature starts THEN fetch bookmarks and notify store`() =
        runTest(testDispatcher) {
            val feature = BookmarksFeature(
                appStore,
                bookmarksUseCases,
                this,
                testDispatcher,
            )

            assertEquals(emptyList<Bookmark>(), appStore.state.bookmarks)

            feature.start()

            testScheduler.advanceUntilIdle()

            coVerify {
                bookmarksUseCases.retrieveRecentBookmarks()
            }

            middleware.assertLastAction(AppAction.BookmarksChange::class) {
                assertEquals(listOf(bookmark), it.bookmarks)
            }
        }
}
