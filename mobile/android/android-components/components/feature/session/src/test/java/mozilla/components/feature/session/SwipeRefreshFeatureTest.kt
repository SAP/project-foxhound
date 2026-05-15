/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.session

import android.content.Context
import android.graphics.Bitmap
import android.widget.FrameLayout
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.selector.findCustomTabOrSelectedTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.EngineView
import mozilla.components.concept.engine.InputResultDetail
import mozilla.components.concept.engine.selection.SelectionActionDelegate
import mozilla.components.support.test.mock
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.reset
import org.mockito.Mockito.times
import org.mockito.Mockito.verify

class SwipeRefreshFeatureTest {

    private lateinit var store: BrowserStore
    private lateinit var refreshFeature: SwipeRefreshFeature
    private val mockLayout = mock<SwipeRefreshLayout>()
    private val useCase = mock<SessionUseCases.ReloadUrlUseCase>()
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        store = BrowserStore(
            BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "A"),
                    createTab("https://www.firefox.com", id = "B"),
                ),
                selectedTabId = "B",
            ),
        )

        refreshFeature = SwipeRefreshFeature(store, useCase, mockLayout, mainDispatcher = testDispatcher)
    }

    @Test
    fun `sets the onRefreshListener and onChildScrollUpCallback`() {
        verify(mockLayout).setOnRefreshListener(refreshFeature)
        verify(mockLayout).setOnChildScrollUpCallback(refreshFeature)
    }

    @Test
    fun `gesture should only work if the content can be overscrolled`() {
        val engineView: DummyEngineView = mock()
        val inputResultDetail: InputResultDetail = mock()
        doReturn(inputResultDetail).`when`(engineView).getInputResultDetail()

        doReturn(true).`when`(inputResultDetail).canOverscrollTop()
        assertFalse(refreshFeature.canChildScrollUp(mockLayout, engineView))

        doReturn(false).`when`(inputResultDetail).canOverscrollTop()
        assertTrue(refreshFeature.canChildScrollUp(mockLayout, engineView))
    }

    @Test
    fun `onRefresh should refresh the active session`() = runTest(testDispatcher) {
        refreshFeature.start()
        testDispatcher.scheduler.advanceUntilIdle()
        refreshFeature.onRefresh()

        verify(useCase).invoke("B")
    }

    @Test
    fun `feature MUST reset refreshCanceled after is used`() = runTest(testDispatcher) {
        refreshFeature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        val selectedTab = store.state.findCustomTabOrSelectedTab()!!

        store.dispatch(ContentAction.UpdateRefreshCanceledStateAction(selectedTab.id, true))

        assertFalse(selectedTab.content.refreshCanceled)
    }

    @Test
    fun `feature clears the swipeRefreshLayout#isRefreshing when tab fishes loading or a refreshCanceled`() = runTest(testDispatcher) {
        refreshFeature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        val selectedTab = store.state.findCustomTabOrSelectedTab()!!

        // Ignoring the first event from the initial state.
        reset(mockLayout)

        store.dispatch(ContentAction.UpdateRefreshCanceledStateAction(selectedTab.id, true))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(mockLayout, times(2)).isRefreshing = false

        // To trigger to an event we have to change loading from its previous value (false to true).
        // As if we dispatch with loading = false, none event will be trigger.
        store.dispatch(ContentAction.UpdateLoadingStateAction(selectedTab.id, true))
        store.dispatch(ContentAction.UpdateLoadingStateAction(selectedTab.id, false))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(mockLayout, times(3)).isRefreshing = false
    }

    private open class DummyEngineView(context: Context) : FrameLayout(context), EngineView {
        override val verticalScrollPosition = flowOf(0f)
        override val verticalScrollDelta = flowOf(0f)
        override fun setVerticalClipping(clippingHeight: Int) {}
        override fun setDynamicToolbarMaxHeight(height: Int) {}
        override fun setActivityContext(context: Context?) {}
        override fun captureThumbnail(onFinish: (Bitmap?) -> Unit) = Unit
        override fun clearSelection() {}
        override fun render(session: EngineSession) {}
        override fun release() {}
        override var selectionActionDelegate: SelectionActionDelegate? = null
        override fun addWindowInsetsListener(
            key: String,
            listener: androidx.core.view.OnApplyWindowInsetsListener?,
        ) {}
        override fun removeWindowInsetsListener(key: String) {}
    }
}
