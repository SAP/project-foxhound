/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.session

import android.view.WindowManager
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.ArgumentMatchers
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.never
import org.mockito.Mockito.verify

class FullScreenFeatureTest {

    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `Starting without tabs`() = runTest(testDispatcher) {
        var viewPort: Int? = null
        var fullscreen: Boolean? = null

        val store = BrowserStore()
        val feature = FullScreenFeature(
            store = store,
            sessionUseCases = mock(),
            tabId = null,
            mainDispatcher = testDispatcher,
            viewportFitChanged = { value -> viewPort = value },
            fullScreenChanged = { value -> fullscreen = value },
        )

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(viewPort)
        assertNull(fullscreen)
    }

    @Test
    fun `Starting with selected tab will not invoke callbacks with default state`() = runTest(testDispatcher) {
        var viewPort: Int? = null
        var fullscreen: Boolean? = null

        val store = BrowserStore(
            BrowserState(
                tabs = listOf(createTab("https://www.mozilla.org", id = "A")),
                selectedTabId = "A",
            ),
        )

        val feature = FullScreenFeature(
            store = store,
            sessionUseCases = mock(),
            tabId = null,
            mainDispatcher = testDispatcher,
            viewportFitChanged = { value -> viewPort = value },
            fullScreenChanged = { value -> fullscreen = value },
        )

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(viewPort)
        assertNull(fullscreen)
    }

    @Test
    fun `Starting with selected tab`() = runTest(testDispatcher) {
        var viewPort: Int? = null
        var fullscreen: Boolean? = null

        val store = BrowserStore(
            BrowserState(
                tabs = listOf(createTab("https://www.mozilla.org", id = "A")),
                selectedTabId = "A",
            ),
        )

        store.dispatch(
            ContentAction.FullScreenChangedAction(
                "A",
                true,
            ),
        )

        store.dispatch(
            ContentAction.ViewportFitChangedAction(
                "A",
                42,
            ),
        )

        val feature = FullScreenFeature(
            store = store,
            sessionUseCases = mock(),
            tabId = null,
            mainDispatcher = testDispatcher,
            viewportFitChanged = { value -> viewPort = value },
            fullScreenChanged = { value -> fullscreen = value },
        )

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(42, viewPort)
        assertTrue(fullscreen!!)
    }

    @Test
    fun `Selected tab switching to fullscreen mode`() = runTest(testDispatcher) {
        var viewPort: Int? = null
        var fullscreen: Boolean? = null

        val store = BrowserStore(
            BrowserState(
                tabs = listOf(createTab("https://www.mozilla.org", id = "A")),
                selectedTabId = "A",
            ),
        )

        val feature = FullScreenFeature(
            store = store,
            sessionUseCases = mock(),
            tabId = null,
            mainDispatcher = testDispatcher,
            viewportFitChanged = { value -> viewPort = value },
            fullScreenChanged = { value -> fullscreen = value },
        )

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(
            ContentAction.FullScreenChangedAction(
                "A",
                true,
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(viewPort)
        assertTrue(fullscreen!!)
    }

    @Test
    fun `Selected tab changing viewport`() = runTest(testDispatcher) {
        var viewPort: Int? = null
        var fullscreen: Boolean? = null

        val store = BrowserStore(
            BrowserState(
                tabs = listOf(createTab("https://www.mozilla.org", id = "A")),
                selectedTabId = "A",
            ),
        )

        val feature = FullScreenFeature(
            store = store,
            sessionUseCases = mock(),
            tabId = null,
            mainDispatcher = testDispatcher,
            viewportFitChanged = { value -> viewPort = value },
            fullScreenChanged = { value -> fullscreen = value },
        )

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(
            ContentAction.FullScreenChangedAction(
                "A",
                true,
            ),
        )

        store.dispatch(
            ContentAction.ViewportFitChangedAction(
                "A",
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES,
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertNotEquals(0, viewPort)
        assertEquals(WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES, viewPort)
        assertTrue(fullscreen!!)
    }

    @Test
    fun `Fixed tab switching to fullscreen mode and back`() = runTest(testDispatcher) {
        var viewPort: Int? = null
        var fullscreen: Boolean? = null

        val store = BrowserStore(
            BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "A"),
                    createTab("https://www.firefox.com", id = "B"),
                    createTab("https://getpocket.com", id = "C"),
                ),
                selectedTabId = "A",
            ),
        )

        val feature = FullScreenFeature(
            store = store,
            sessionUseCases = mock(),
            tabId = "B",
            mainDispatcher = testDispatcher,
            viewportFitChanged = { value -> viewPort = value },
            fullScreenChanged = { value -> fullscreen = value },
        )

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(
            ContentAction.FullScreenChangedAction(
                "B",
                true,
            ),
        )

        store.dispatch(
            ContentAction.ViewportFitChangedAction(
                "B",
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES,
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES, viewPort)
        assertTrue(fullscreen!!)

        store.dispatch(
            ContentAction.FullScreenChangedAction(
                "B",
                false,
            ),
        )

        store.dispatch(
            ContentAction.ViewportFitChangedAction(
                "B",
                0,
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(0, viewPort)
        assertFalse(fullscreen)
    }

    @Test
    fun `Callback functions no longer get invoked when stopped, but get new value on next start`() = runTest(testDispatcher) {
        var viewPort: Int? = null
        var fullscreen: Boolean? = null

        val store = BrowserStore(
            BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "A"),
                    createTab("https://www.firefox.com", id = "B"),
                    createTab("https://getpocket.com", id = "C"),
                ),
                selectedTabId = "A",
            ),
        )

        val feature = FullScreenFeature(
            store = store,
            sessionUseCases = mock(),
            tabId = "B",
            mainDispatcher = testDispatcher,
            viewportFitChanged = { value -> viewPort = value },
            fullScreenChanged = { value -> fullscreen = value },
        )

        store.dispatch(
            ContentAction.FullScreenChangedAction(
                "B",
                true,
            ),
        )

        store.dispatch(
            ContentAction.ViewportFitChangedAction(
                "B",
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER,
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER, viewPort)
        assertTrue(fullscreen!!)

        feature.stop()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(
            ContentAction.FullScreenChangedAction(
                "B",
                false,
            ),
        )

        store.dispatch(
            ContentAction.ViewportFitChangedAction(
                "B",
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES,
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER, viewPort)
        assertTrue(fullscreen)

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES, viewPort)
        assertFalse(fullscreen)
    }

    @Test
    fun `onBackPressed will invoke usecase for active fullscreen mode`() = runTest(testDispatcher) {
        val store = BrowserStore(
            BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "A"),
                    createTab("https://www.firefox.com", id = "B"),
                    createTab("https://getpocket.com", id = "C"),
                ),
                selectedTabId = "A",
            ),
        )

        val exitUseCase: SessionUseCases.ExitFullScreenUseCase = mock()
        val useCases: SessionUseCases = mock()
        doReturn(exitUseCase).`when`(useCases).exitFullscreen

        val feature = FullScreenFeature(
            store = store,
            sessionUseCases = useCases,
            tabId = "B",
            mainDispatcher = testDispatcher,
            fullScreenChanged = {},
        )

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(
            ContentAction.FullScreenChangedAction(
                "B",
                true,
            ),
        )

        store.dispatch(
            ContentAction.ViewportFitChangedAction(
                "B",
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES,
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(feature.onBackPressed())

        verify(exitUseCase).invoke("B")
    }

    @Test
    fun `Fullscreen tab gets removed`() = runTest(testDispatcher) {
        var viewPort: Int? = null
        var fullscreen: Boolean? = null

        val store = BrowserStore(
            BrowserState(
                tabs = listOf(createTab("https://www.mozilla.org", id = "A")),
                selectedTabId = "A",
            ),
        )

        val feature = FullScreenFeature(
            store = store,
            sessionUseCases = mock(),
            tabId = null,
            mainDispatcher = testDispatcher,
            viewportFitChanged = { value -> viewPort = value },
            fullScreenChanged = { value -> fullscreen = value },
        )

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(
            ContentAction.FullScreenChangedAction(
                "A",
                true,
            ),
        )

        store.dispatch(
            ContentAction.ViewportFitChangedAction(
                "A",
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES,
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES, viewPort)
        assertTrue(fullscreen!!)

        store.dispatch(
            TabListAction.RemoveTabAction(tabId = "A"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(0, viewPort)
        assertFalse(fullscreen)
    }

    @Test
    fun `onBackPressed will not invoke usecase if not in fullscreen mode`() = runTest(testDispatcher) {
        val store = BrowserStore(
            BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "A"),
                    createTab("https://www.firefox.com", id = "B"),
                    createTab("https://getpocket.com", id = "C"),
                ),
                selectedTabId = "A",
            ),
        )

        val exitUseCase: SessionUseCases.ExitFullScreenUseCase = mock()
        val useCases: SessionUseCases = mock()
        doReturn(exitUseCase).`when`(useCases).exitFullscreen

        val feature = FullScreenFeature(
            store = store,
            sessionUseCases = useCases,
            mainDispatcher = testDispatcher,
            fullScreenChanged = {},
        )

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(feature.onBackPressed())

        verify(exitUseCase, never()).invoke("B")
    }

    @Test
    fun `onBackPressed getting invoked without any tabs to observe`() = runTest(testDispatcher) {
        val exitUseCase: SessionUseCases.ExitFullScreenUseCase = mock()
        val useCases: SessionUseCases = mock()
        doReturn(exitUseCase).`when`(useCases).exitFullscreen

        val feature = FullScreenFeature(
            store = BrowserStore(),
            sessionUseCases = useCases,
            mainDispatcher = testDispatcher,
            fullScreenChanged = {},
        )

        // Invoking onBackPressed without fullscreen mode
        assertFalse(feature.onBackPressed())
        testDispatcher.scheduler.advanceUntilIdle()

        verify(exitUseCase, never()).invoke(ArgumentMatchers.anyString())
    }

    @Test
    fun `GIVEN fullscreen changes WHEN informing about this THEN ensure the isFullscreen property has the right value`() = runTest(testDispatcher) {
        val store = BrowserStore(
            BrowserState(
                tabs = listOf(createTab("https://www.mozilla.org", id = "A")),
                selectedTabId = "A",
            ),
        )
        var feature: FullScreenFeature? = null
        feature = FullScreenFeature(
            store = store,
            sessionUseCases = mock(),
            tabId = null,
            mainDispatcher = testDispatcher,
            viewportFitChanged = { },
            fullScreenChanged = { value ->
                assertTrue(value)
                assertTrue(feature?.isFullScreen ?: false)
            },
        )

        store.dispatch(
            ContentAction.FullScreenChangedAction(
                "A",
                true,
            ),
        )

        feature.start()
    }
}
