/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.widgets.behavior

import android.content.Context
import android.graphics.Bitmap
import android.view.View
import android.widget.FrameLayout
import androidx.core.view.ViewCompat
import androidx.core.view.isVisible
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.plus
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.EngineView
import mozilla.components.concept.engine.selection.SelectionActionDelegate
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.ui.widgets.behavior.DependencyGravity.Bottom
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoMoreInteractions

@RunWith(AndroidJUnit4::class)
class EngineViewScrollingDataBehaviorTest {
    @Test
    fun `GIVEN dependency is not valid WHEN scrolling starts THEN don't do anything`() {
        val dependency: View = mock()
        val behavior = EngineViewScrollingDataBehavior(createDummyEngineView(), dependency, Bottom)
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator

        doReturn(View.GONE).`when`(dependency).visibility
        val acceptsNestedScroll = behavior.onStartNestedScroll(
            coordinatorLayout = mock(),
            child = mock(),
            directTargetChild = mock(),
            target = mock(),
            axes = ViewCompat.SCROLL_AXIS_VERTICAL,
            type = ViewCompat.TYPE_TOUCH,
        )

        assertFalse(acceptsNestedScroll)
        verify(yTranslator, never()).cancelInProgressTranslation()
    }

    @Test
    fun `GIVEN dependency is valid WHEN scrolling ends THEN snap the dependency`() {
        val dependency: View = mock()
        val behavior = EngineViewScrollingDataBehavior(createDummyEngineView(), dependency, Bottom)
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator

        doReturn(View.VISIBLE).`when`(dependency).visibility
        behavior.onStopNestedScroll(
            coordinatorLayout = mock(),
            child = mock(),
            target = mock(),
            type = 0,
        )

        verify(yTranslator).snapWithAnimation(any())
    }

    @Test
    fun `GIVEN dependency is not valid WHEN scrolling ends THEN don't to anything`() {
        val dependency: View = mock()
        val behavior = EngineViewScrollingDataBehavior(createDummyEngineView(), dependency, Bottom)
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator

        doReturn(View.GONE).`when`(dependency).visibility
        behavior.onStopNestedScroll(
            coordinatorLayout = mock(),
            child = mock(),
            target = mock(),
            type = 0,
        )

        verify(yTranslator, never()).snapWithAnimation(any())
    }

    @Test
    fun `WHEN called to expand the dependency THEN do this through the y translator`() {
        val dependency: View = mock()
        val behavior = EngineViewScrollingDataBehavior(createDummyEngineView(), dependency, Bottom)
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator

        behavior.forceExpand()

        verify(yTranslator).expandWithAnimation(dependency)
    }

    @Test
    fun `WHEN called to collapse the dependency THEN do this through the y translator`() {
        val dependency: View = mock()
        val behavior = EngineViewScrollingDataBehavior(createDummyEngineView(), dependency, Bottom)
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator

        behavior.forceCollapse()

        verify(yTranslator).collapseWithAnimation(dependency)
    }

    @Test
    fun `WHEN scrolling is enabled THEN remember this internally`() {
        val behavior = EngineViewScrollingDataBehavior(createDummyEngineView(), mock(), Bottom)

        assertFalse(behavior.isScrollEnabled)
        behavior.enableScrolling()

        assertTrue(behavior.isScrollEnabled)
    }

    @Test
    fun `GIVEN scrolling is disabled THEN remember this internally`() {
        val behavior = EngineViewScrollingDataBehavior(createDummyEngineView(), mock(), Bottom)
        behavior.isScrollEnabled = true

        assertTrue(behavior.isScrollEnabled)
        behavior.disableScrolling()

        assertFalse(behavior.isScrollEnabled)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun `GIVEN dependency is valid and scrolling is enabled WHEN receiving vertical scroll data THEN translate the dependency`() = runTest {
        val scrollDeltaUpdates = MutableStateFlow(0f)
        val engineView = object : EngineView by createDummyEngineView() {
            override val verticalScrollDelta = scrollDeltaUpdates
        }
        val scrollUpdatesJob = Job()
        val dependency: View = mock()
        doReturn(View.VISIBLE).`when`(dependency).isVisible
        val behavior = EngineViewScrollingDataBehavior(engineView, dependency, Bottom, this + scrollUpdatesJob)
        behavior.enableScrolling()
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator

        behavior.onStartNestedScroll(mock(), mock(), mock(), mock(), 2, 2)
        scrollDeltaUpdates.emit(8f)
        advanceUntilIdle()
        scrollDeltaUpdates.emit(9f)
        advanceUntilIdle()

        verify(yTranslator).cancelInProgressTranslation()
        verify(yTranslator).translate(dependency, 8f)
        verify(yTranslator).translate(dependency, 9f)
        verifyNoMoreInteractions(yTranslator)

        behavior.onStopNestedScroll(mock(), mock(), mock(), 2)
        verify(yTranslator).snapWithAnimation(dependency)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun `GIVEN scrolling is disabled WHEN receiving vertical scroll data THEN don't translate the dependency`() = runTest {
        val scrollDeltaUpdates = MutableStateFlow(0f)
        val engineView = object : EngineView by createDummyEngineView() {
            override val verticalScrollDelta = scrollDeltaUpdates
        }
        val dependency: View = mock()
        doReturn(View.VISIBLE).`when`(dependency).isVisible
        val behavior = EngineViewScrollingDataBehavior(engineView, dependency, Bottom, this + Job())
        behavior.disableScrolling()
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator

        behavior.onStartNestedScroll(mock(), mock(), mock(), mock(), 2, 2)
        scrollDeltaUpdates.emit(8f)
        advanceUntilIdle()
        scrollDeltaUpdates.emit(9f)
        advanceUntilIdle()
        verifyNoMoreInteractions(yTranslator)

        behavior.onStopNestedScroll(mock(), mock(), mock(), 2)
        verify(yTranslator).snapWithAnimation(dependency)
    }

    private fun createDummyEngineView(): EngineView = DummyEngineView(testContext)

    open class DummyEngineView(context: Context) : FrameLayout(context), EngineView {
        override val verticalScrollPosition = flowOf(0f)
        override val verticalScrollDelta = flowOf(0f)
        override fun setVerticalClipping(clippingHeight: Int) {}
        override fun setDynamicToolbarMaxHeight(height: Int) {}
        override fun setActivityContext(context: Context?) {}
        override fun captureThumbnail(onFinish: (Bitmap?) -> Unit) = Unit
        override fun render(session: EngineSession) {}
        override fun release() {}
        override var selectionActionDelegate: SelectionActionDelegate? = null
        override fun addWindowInsetsListener(
            key: String,
            listener: androidx.core.view.OnApplyWindowInsetsListener?,
        ) {}
        override fun removeWindowInsetsListener(key: String) {}
        override fun asView() = View(context)
    }
}
