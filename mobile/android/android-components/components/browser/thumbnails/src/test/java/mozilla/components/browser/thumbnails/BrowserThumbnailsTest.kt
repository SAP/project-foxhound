/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.thumbnails

import android.graphics.Bitmap
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.EngineView
import mozilla.components.support.test.any
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoMoreInteractions
import org.mockito.Mockito.`when`

@RunWith(AndroidJUnit4::class)
class BrowserThumbnailsTest {

    private lateinit var store: BrowserStore
    private lateinit var engineView: EngineView
    private lateinit var thumbnails: BrowserThumbnails
    private val tabId = "test-tab"
    private val tab = createTab("https://www.mozilla.org", id = tabId)

    private val testDispatcher = StandardTestDispatcher()
    private val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()

    @Before
    fun setup() {
        store = BrowserStore(
            BrowserState(
                tabs = listOf(tab),
                selectedTabId = tabId,
            ),
            middleware = listOf(
                captureActionsMiddleware,
                ThumbnailsMiddleware(mock()),
            ),
        )
        engineView = mock()
        thumbnails = BrowserThumbnails(testContext, engineView, store, testDispatcher)
    }

    @Test
    fun `do not capture thumbnail when feature is stopped and a site finishes loading`() {
        thumbnails.start()
        testDispatcher.scheduler.advanceUntilIdle()
        thumbnails.stop()

        store.dispatch(ContentAction.UpdateThumbnailAction(tabId, mock()))

        verifyNoMoreInteractions(engineView)
    }

    @Suppress("UNCHECKED_CAST")
    @Test
    fun `feature must capture thumbnail when a site finishes loading and first paint`() {
        val bitmap: Bitmap = mock()

        store.dispatch(ContentAction.UpdateLoadingStateAction(tabId, true))

        thumbnails.start()
        testDispatcher.scheduler.advanceUntilIdle()

        `when`(engineView.captureThumbnail(any()))
            .thenAnswer {
                // if engineView responds with a bitmap
                (it.arguments[0] as (Bitmap?) -> Unit).invoke(bitmap)
            }

        captureActionsMiddleware.assertNotDispatched(ContentAction.UpdateThumbnailAction::class)

        store.dispatch(ContentAction.UpdateLoadingStateAction(tabId, false))
        store.dispatch(ContentAction.UpdateFirstContentfulPaintStateAction(tabId, true))
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(ContentAction.UpdateThumbnailAction::class) { action ->
            assertEquals(tabId, action.sessionId)
            assertEquals(bitmap, action.thumbnail)
        }
    }

    @Suppress("UNCHECKED_CAST")
    @Test
    fun `feature never updates the store if there is no thumbnail bitmap`() {
        val store = BrowserStore(mock(), middleware = listOf(captureActionsMiddleware))

        // clear InitAction
        captureActionsMiddleware.reset()

        val engineView: EngineView = mock()
        val feature = BrowserThumbnails(testContext, engineView, store)

        `when`(engineView.captureThumbnail(any()))
            .thenAnswer {
                // if engineView responds with a bitmap
                (it.arguments[0] as (Bitmap?) -> Unit).invoke(null)
            }

        feature.requestScreenshot()

        captureActionsMiddleware.assertNoActionDispatched()
    }

    @Suppress("UNCHECKED_CAST")
    @Test
    fun `feature never updates the store if there is no tab ID`() {
        val store = BrowserStore(
            BrowserState(
                tabs = listOf(tab),
                selectedTabId = tabId,
            ),
            middleware = listOf(
                captureActionsMiddleware,
                ThumbnailsMiddleware(mock()),
            ),
        )

        val engineView: EngineView = mock()
        val feature = BrowserThumbnails(testContext, engineView, store)
        val bitmap: Bitmap = mock()

        `when`(engineView.captureThumbnail(any()))
            .thenAnswer {
                // if engineView responds with a bitmap
                (it.arguments[0] as (Bitmap?) -> Unit).invoke(bitmap)
            }

        feature.requestScreenshot()

        captureActionsMiddleware.assertFirstAction(ContentAction.UpdateThumbnailAction::class) { action ->
            assertEquals(tabId, action.sessionId)
            assertEquals(bitmap, action.thumbnail)
        }
    }

    @Test
    fun `when a page is loaded and the os is in low memory condition thumbnail should not be captured`() {
        store.dispatch(ContentAction.UpdateThumbnailAction(tabId, mock()))

        thumbnails.testLowMemory = true

        thumbnails.start()
        testDispatcher.scheduler.advanceUntilIdle()

        verify(engineView, never()).captureThumbnail(any())
    }
}
