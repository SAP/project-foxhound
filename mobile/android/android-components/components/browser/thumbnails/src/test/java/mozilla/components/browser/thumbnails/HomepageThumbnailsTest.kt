/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.thumbnails

import android.graphics.Bitmap
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.lib.state.Middleware
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HomepageThumbnailsTest {
    private val testDispatcher = StandardTestDispatcher()

    private lateinit var store: BrowserStore
    private lateinit var thumbnails: HomepageThumbnails
    private lateinit var bitmap: Bitmap
    private lateinit var captureActionsMiddleware: CaptureActionsMiddleware<BrowserState, BrowserAction>
    private lateinit var middlewares: List<Middleware<BrowserState, BrowserAction>>
    private val tabId = "test-tab"
    private val homepageUrl = "about:home"

    @Before
    fun setup() {
        captureActionsMiddleware = CaptureActionsMiddleware()
        middlewares = listOf(captureActionsMiddleware, ThumbnailsMiddleware(mock()))
        store = BrowserStore(
            BrowserState(
                tabs = listOf(
                    createTab(homepageUrl, id = tabId),
                ),
                selectedTabId = tabId,
            ),
            middlewares,
        )
        bitmap = mock()
        thumbnails = HomepageThumbnails(testContext, store, homepageUrl, mainDispatcher = testDispatcher) { callback ->
            callback(bitmap)
        }
    }

    @Test
    fun `capture thumbnail when homepage is opened`() = runTest {
        thumbnails.start()

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertLastAction(ContentAction.UpdateThumbnailAction::class) {
            assertEquals(tabId, tabId)
            assertEquals(bitmap, bitmap)
        }
    }

    @Test
    fun `do not capture thumbnail when feature is started but homepage is not opened`() {
        val store = BrowserStore(BrowserState(), middlewares)
        val feature = HomepageThumbnails(testContext, store, homepageUrl) { callback ->
            callback(bitmap)
        }
        feature.start()

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertNotDispatched(ContentAction.UpdateThumbnailAction::class)
    }

    @Test
    fun `capture all thumbnails if multiple new tabs are opened`() {
        val store = BrowserStore(BrowserState(), middlewares)
        val bitmap: Bitmap = mock()
        val feature = HomepageThumbnails(testContext, store, homepageUrl, mainDispatcher = testDispatcher) { callback ->
            callback(bitmap)
        }
        feature.start()

        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(
            TabListAction.AddTabAction(
                createTab(homepageUrl, id = "1"),
            ),
        )

        store.dispatch(
            TabListAction.SelectTabAction(
                tabId = "1",
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertLastAction(ContentAction.UpdateThumbnailAction::class) {
            assertEquals("1", it.sessionId)
        }

        store.dispatch(
            TabListAction.AddTabAction(
                createTab(homepageUrl, id = "2"),
            ),
        )

        store.dispatch(
            TabListAction.SelectTabAction(
                "2",
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertLastAction(ContentAction.UpdateThumbnailAction::class) {
            assertEquals("2", it.sessionId)
        }

        store.dispatch(
            TabListAction.AddTabAction(
                createTab("www.google.com", id = "3"),
            ),
        )

        store.dispatch(
            TabListAction.SelectTabAction(
                tabId = "3",
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertLastAction(ContentAction.UpdateThumbnailAction::class) {
            assertEquals("2", it.sessionId)
        }

        store.dispatch(
            TabListAction.AddTabAction(
                createTab(homepageUrl, id = "4"),
            ),
        )

        store.dispatch(
            TabListAction.SelectTabAction(
                tabId = "4",
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertLastAction(ContentAction.UpdateThumbnailAction::class) {
            assertEquals("4", it.sessionId)
        }
    }

    @Test
    fun `do not capture thumbnail when feature has stopped and homepage is opened`() {
        val store = BrowserStore(BrowserState(), middlewares)
        val feature = HomepageThumbnails(testContext, store, homepageUrl) { callback ->
            callback(bitmap)
        }
        feature.start()
        feature.stop()

        store.dispatch(
            TabListAction.AddTabAction(
                createTab(homepageUrl, id = "1"),
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertNotDispatched(ContentAction.UpdateThumbnailAction::class)
    }

    @Test
    fun `feature never captures thumbnail if there is no callback to create bitmap`() = runTest {
        thumbnails = HomepageThumbnails(testContext, store, homepageUrl, mainDispatcher = testDispatcher)
        thumbnails.start()

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertNotDispatched(ContentAction.UpdateThumbnailAction::class)
    }

    @Test
    fun `feature never captures thumbnail if there is no selected tab ID`() = runTest {
        store = BrowserStore(
            BrowserState(
                tabs = listOf(
                    createTab(homepageUrl, id = tabId),
                ),
            ),
            middlewares,
        )

        val bitmap: Bitmap = mock()
        val feature = HomepageThumbnails(testContext, store, homepageUrl, mainDispatcher = testDispatcher) { callback ->
            callback(bitmap)
        }

        feature.start()

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertNotDispatched(ContentAction.UpdateThumbnailAction::class)
    }

    @Test
    fun `when homepage is opened and the os is in low memory condition thumbnail should not be captured`() = runTest {
        thumbnails.testLowMemory = true

        thumbnails.start()

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertNotDispatched(ContentAction.UpdateThumbnailAction::class)
    }
}
