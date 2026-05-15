/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.widgets.behavior

import android.content.Context
import android.graphics.Bitmap
import android.view.MotionEvent.ACTION_DOWN
import android.view.MotionEvent.ACTION_MOVE
import android.view.View
import android.widget.FrameLayout
import androidx.core.view.ViewCompat
import androidx.core.view.isVisible
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.flow.flowOf
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.EngineView
import mozilla.components.concept.engine.InputResultDetail
import mozilla.components.concept.engine.selection.SelectionActionDelegate
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.ui.widgets.behavior.DependencyGravity.Bottom
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.anyFloat
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.never
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify

@RunWith(AndroidJUnit4::class)
class EngineViewScrollingGesturesBehaviorTest {
    @Test
    fun `onStartNestedScroll should attempt scrolling only if browserToolbar is valid`() {
        val browserToolbar: View = mock()
        val behavior = spy(EngineViewScrollingGesturesBehavior(createDummyEngineView(), browserToolbar, Bottom))
        doReturn(true).`when`(behavior).shouldScroll

        doReturn(View.GONE).`when`(browserToolbar).isVisible
        var acceptsNestedScroll = behavior.onStartNestedScroll(
            coordinatorLayout = mock(),
            child = mock(),
            directTargetChild = mock(),
            target = mock(),
            axes = ViewCompat.SCROLL_AXIS_VERTICAL,
            type = ViewCompat.TYPE_TOUCH,
        )
        assertFalse(acceptsNestedScroll)
        verify(behavior, never()).startNestedScroll(anyInt(), anyInt())

        doReturn(View.VISIBLE).`when`(browserToolbar).isVisible
        acceptsNestedScroll = behavior.onStartNestedScroll(
            coordinatorLayout = mock(),
            child = mock(),
            directTargetChild = mock(),
            target = mock(),
            axes = ViewCompat.SCROLL_AXIS_VERTICAL,
            type = ViewCompat.TYPE_TOUCH,
        )
        assertTrue(acceptsNestedScroll)
        verify(behavior).startNestedScroll(anyInt(), anyInt())
    }

    @Test
    fun `startNestedScroll should cancel an ongoing snap animation`() {
        val behavior = spy(EngineViewScrollingGesturesBehavior(createDummyEngineView(), mock(), Bottom))
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator
        doReturn(true).`when`(behavior).shouldScroll

        val acceptsNestedScroll = behavior.startNestedScroll(
            axes = ViewCompat.SCROLL_AXIS_VERTICAL,
            type = ViewCompat.TYPE_TOUCH,
        )

        assertTrue(acceptsNestedScroll)
        verify(yTranslator).cancelInProgressTranslation()
    }

    @Test
    fun `startNestedScroll should not accept nested scrolls on the horizontal axis`() {
        val behavior = spy(EngineViewScrollingGesturesBehavior(createDummyEngineView(), mock(), Bottom))
        doReturn(true).`when`(behavior).shouldScroll

        var acceptsNestedScroll = behavior.startNestedScroll(
            axes = ViewCompat.SCROLL_AXIS_VERTICAL,
            type = ViewCompat.TYPE_TOUCH,
        )
        assertTrue(acceptsNestedScroll)

        acceptsNestedScroll = behavior.startNestedScroll(
            axes = ViewCompat.SCROLL_AXIS_HORIZONTAL,
            type = ViewCompat.TYPE_TOUCH,
        )
        assertFalse(acceptsNestedScroll)
    }

    @Test
    fun `GIVEN a gesture that doesn't scroll the toolbar WHEN startNestedScroll THEN nested scroll is not accepted`() {
        val engineView = spy(createDummyEngineView())
        val behavior = spy(EngineViewScrollingGesturesBehavior(engineView, mock(), Bottom))
        val inputResultDetail: InputResultDetail = mock()
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator
        doReturn(false).`when`(behavior).shouldScroll
        doReturn(true).`when`(inputResultDetail).isTouchUnhandled()
        doReturn(inputResultDetail).`when`(engineView).getInputResultDetail()

        val acceptsNestedScroll = behavior.startNestedScroll(
            axes = ViewCompat.SCROLL_AXIS_VERTICAL,
            type = ViewCompat.TYPE_TOUCH,
        )

        assertFalse(acceptsNestedScroll)
    }

    @Test
    fun `Behavior should not accept nested scrolls on the horizontal axis`() {
        val behavior = spy(EngineViewScrollingGesturesBehavior(createDummyEngineView(), mock(), Bottom))
        doReturn(true).`when`(behavior).shouldScroll

        var acceptsNestedScroll = behavior.onStartNestedScroll(
            coordinatorLayout = mock(),
            child = mock(),
            directTargetChild = mock(),
            target = mock(),
            axes = ViewCompat.SCROLL_AXIS_VERTICAL,
            type = ViewCompat.TYPE_TOUCH,
        )
        assertTrue(acceptsNestedScroll)

        acceptsNestedScroll = behavior.onStartNestedScroll(
            coordinatorLayout = mock(),
            child = mock(),
            directTargetChild = mock(),
            target = mock(),
            axes = ViewCompat.SCROLL_AXIS_HORIZONTAL,
            type = ViewCompat.TYPE_TOUCH,
        )
        assertFalse(acceptsNestedScroll)
    }

    @Test
    fun `Behavior should delegate the onStartNestedScroll logic`() {
        val dependency: View = mock()
        val behavior = spy(EngineViewScrollingGesturesBehavior(createDummyEngineView(), dependency, Bottom))
        val inputType = ViewCompat.TYPE_TOUCH
        val axes = ViewCompat.SCROLL_AXIS_VERTICAL

        behavior.onStartNestedScroll(
            coordinatorLayout = mock(),
            child = dependency,
            directTargetChild = mock(),
            target = mock(),
            axes = axes,
            type = inputType,
        )

        verify(behavior).startNestedScroll(axes, inputType)
    }

    @Test
    fun `onStopNestedScroll should attempt stopping nested scrolling only if browserToolbar is valid`() {
        val dependency: View = mock()
        val behavior = spy(EngineViewScrollingGesturesBehavior(createDummyEngineView(), dependency, Bottom))

        doReturn(View.GONE).`when`(dependency).visibility
        behavior.onStopNestedScroll(
            coordinatorLayout = mock(),
            child = mock(),
            target = mock(),
            type = 0,
        )
        verify(behavior, never()).stopNestedScroll(anyInt(), any())

        doReturn(View.VISIBLE).`when`(dependency).visibility
        behavior.onStopNestedScroll(
            coordinatorLayout = mock(),
            child = mock(),
            target = mock(),
            type = 0,
        )
        verify(behavior).stopNestedScroll(anyInt(), any())
    }

    @Test
    fun `Behavior should delegate the onStopNestedScroll logic`() {
        val dependency: View = mock()
        val behavior = spy(EngineViewScrollingGesturesBehavior(createDummyEngineView(), dependency, Bottom))
        val inputType = ViewCompat.TYPE_TOUCH

        doReturn(View.GONE).`when`(dependency).visibility
        behavior.onStopNestedScroll(
            coordinatorLayout = mock(),
            child = dependency,
            target = mock(),
            type = inputType,
        )
        verify(behavior, never()).stopNestedScroll(inputType, dependency)
    }

    @Test
    fun `stopNestedScroll will snap toolbar up if toolbar is more than 50 percent visible`() {
        val behavior = spy(EngineViewScrollingGesturesBehavior(createDummyEngineView(), mock(), Bottom))
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator
        doReturn(true).`when`(behavior).shouldScroll

        val child = mock<View>()
        doReturn(100).`when`(child).height
        doReturn(10f).`when`(child).translationY

        behavior.onStartNestedScroll(
            coordinatorLayout = mock(),
            child = child,
            directTargetChild = mock(),
            target = mock(),
            axes = ViewCompat.SCROLL_AXIS_VERTICAL,
            type = ViewCompat.TYPE_TOUCH,
        )

        assertTrue(behavior.shouldSnapAfterScroll)
        verify(yTranslator).cancelInProgressTranslation()
        verify(yTranslator, never()).expandWithAnimation(any())
        verify(yTranslator, never()).collapseWithAnimation(any())

        behavior.stopNestedScroll(0, child)

        verify(yTranslator).snapWithAnimation(child)
    }

    @Test
    fun `stopNestedScroll will snap toolbar down if toolbar is less than 50 percent visible`() {
        val dependency: View = mock()
        val behavior = spy(EngineViewScrollingGesturesBehavior(createDummyEngineView(), dependency, Bottom))
        doReturn(true).`when`(behavior).shouldScroll
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator

        doReturn(100).`when`(dependency).height
        doReturn(90f).`when`(dependency).translationY

        behavior.onStartNestedScroll(
            coordinatorLayout = mock(),
            child = dependency,
            directTargetChild = mock(),
            target = mock(),
            axes = ViewCompat.SCROLL_AXIS_VERTICAL,
            type = ViewCompat.TYPE_TOUCH,
        )

        assertTrue(behavior.shouldSnapAfterScroll)
        verify(yTranslator).cancelInProgressTranslation()
        verify(yTranslator, never()).expandWithAnimation(any())
        verify(yTranslator, never()).collapseWithAnimation(any())

        behavior.stopNestedScroll(0, dependency)

        verify(yTranslator).snapWithAnimation(dependency)
    }

    @Test
    fun `onStopNestedScroll should snap the toolbar only if browserToolbar is valid`() {
        val dependency: View = mock()
        val behavior = spy(EngineViewScrollingGesturesBehavior(createDummyEngineView(), dependency, Bottom))
        doReturn(View.GONE).`when`(dependency).visibility

        behavior.onStopNestedScroll(
            coordinatorLayout = mock(),
            child = mock(),
            target = mock(),
            type = ViewCompat.TYPE_TOUCH,
        )

        verify(behavior, never()).stopNestedScroll(anyInt(), any())
    }

    @Test
    fun `Behavior will intercept MotionEvents and pass them to the custom gesture detector`() {
        val behavior = EngineViewScrollingGesturesBehavior(createDummyEngineView(), mock(), Bottom)
        val gestureDetector: BrowserGestureDetector = mock()
        behavior.gesturesDetector = gestureDetector
        val downEvent = TestUtils.getMotionEvent(ACTION_DOWN)

        behavior.onInterceptTouchEvent(mock(), mock(), downEvent)

        verify(gestureDetector).handleTouchEvent(downEvent)
    }

    @Test
    fun `Behavior should only dispatch MotionEvents to the gesture detector only if browserToolbar is valid`() {
        val dependency: View = mock()
        doReturn(View.GONE).`when`(dependency).isVisible
        val behavior = EngineViewScrollingGesturesBehavior(createDummyEngineView(), dependency, Bottom)
        val gestureDetector: BrowserGestureDetector = mock()
        behavior.gesturesDetector = gestureDetector
        val downEvent = TestUtils.getMotionEvent(ACTION_DOWN)

        behavior.onInterceptTouchEvent(mock(), mock(), downEvent)

        verify(gestureDetector, never()).handleTouchEvent(downEvent)
    }

    @Test
    fun `Behavior will apply translation to toolbar only for vertical scrolls`() {
        val dependency: View = mock()
        val engineView = spy(createDummyEngineView())
        val behavior = EngineViewScrollingGesturesBehavior(engineView, dependency, Bottom)
        val yTranslator: ViewYTranslator = mock()
        behavior.isScrollEnabled = true
        behavior.startedScroll = true
        behavior.yTranslator = yTranslator
        val validInputResultDetail: InputResultDetail = mock()
        doReturn(true).`when`(validInputResultDetail).canScrollToBottom()
        doReturn(validInputResultDetail).`when`(engineView).getInputResultDetail()
        val downEvent = TestUtils.getMotionEvent(ACTION_DOWN, 0f, 0f)
        val moveEvent = TestUtils.getMotionEvent(ACTION_MOVE, 0f, 100f, downEvent)

        behavior.onInterceptTouchEvent(mock(), mock(), downEvent)
        behavior.onInterceptTouchEvent(mock(), mock(), moveEvent)

        verify(yTranslator).translate(dependency, -100f)
    }

    @Test
    fun `GIVEN an InputResultDetail with the right values and scroll enabled WHEN shouldScroll is called THEN it returns true`() {
        val engineView = spy(createDummyEngineView())
        val behavior = EngineViewScrollingGesturesBehavior(engineView, mock(), Bottom)
        behavior.isScrollEnabled = true
        val validInputResultDetail: InputResultDetail = mock()
        doReturn(validInputResultDetail).`when`(engineView).getInputResultDetail()

        doReturn(true).`when`(validInputResultDetail).canScrollToBottom()
        doReturn(false).`when`(validInputResultDetail).canScrollToTop()
        assertTrue(behavior.shouldScroll)

        doReturn(false).`when`(validInputResultDetail).canScrollToBottom()
        doReturn(true).`when`(validInputResultDetail).canScrollToTop()
        assertTrue(behavior.shouldScroll)

        doReturn(true).`when`(validInputResultDetail).canScrollToBottom()
        doReturn(true).`when`(validInputResultDetail).canScrollToTop()
        assertTrue(behavior.shouldScroll)
    }

    @Test
    fun `GIVEN an InputResultDetail with the right values but with scroll disabled WHEN shouldScroll is called THEN it returns false`() {
        val engineView = spy(createDummyEngineView())
        val behavior = EngineViewScrollingGesturesBehavior(engineView, mock(), Bottom)
        behavior.isScrollEnabled = false
        val validInputResultDetail: InputResultDetail = mock()
        doReturn(true).`when`(validInputResultDetail).canScrollToBottom()
        doReturn(true).`when`(validInputResultDetail).canScrollToTop()

        assertFalse(behavior.shouldScroll)
    }

    @Test
    fun `GIVEN scroll enabled but EngineView cannot scroll to bottom WHEN shouldScroll is called THEN it returns false`() {
        val behavior = EngineViewScrollingGesturesBehavior(createDummyEngineView(), mock(), Bottom)
        behavior.isScrollEnabled = true
        val validInputResultDetail: InputResultDetail = mock()
        doReturn(false).`when`(validInputResultDetail).canScrollToBottom()
        doReturn(true).`when`(validInputResultDetail).canScrollToTop()

        assertFalse(behavior.shouldScroll)
    }

    @Test
    fun `GIVEN scroll enabled but EngineView cannot scroll to top WHEN shouldScroll is called THEN it returns false`() {
        val behavior = EngineViewScrollingGesturesBehavior(createDummyEngineView(), mock(), Bottom)
        behavior.isScrollEnabled = true
        val validInputResultDetail: InputResultDetail = mock()
        doReturn(true).`when`(validInputResultDetail).canScrollToBottom()
        doReturn(false).`when`(validInputResultDetail).canScrollToTop()

        assertFalse(behavior.shouldScroll)
    }

    @Test
    fun `Behavior will vertically scroll nested scroll started and EngineView handled the event`() {
        val dependency = spy(View(testContext, null, 0))
        val behavior = spy(EngineViewScrollingGesturesBehavior(createDummyEngineView(), dependency, Bottom))
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator
        doReturn(true).`when`(behavior).shouldScroll
        doReturn(100).`when`(dependency).height
        doReturn(0f).`when`(dependency).translationY
        behavior.startedScroll = true

        behavior.tryToScrollVertically(25f)

        verify(yTranslator).translate(dependency, 25f)
    }

    @Test
    fun `Behavior will not scroll vertically if startedScroll is false`() {
        val dependency = spy(View(testContext, null, 0))
        val behavior = spy(EngineViewScrollingGesturesBehavior(createDummyEngineView(), dependency, Bottom))
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator
        doReturn(true).`when`(behavior).shouldScroll
        val child = spy(View(testContext, null, 0))
        doReturn(100).`when`(child).height
        doReturn(0f).`when`(child).translationY
        behavior.startedScroll = false

        behavior.tryToScrollVertically(25f)

        verify(yTranslator, never()).translate(any(), anyFloat())
    }

    @Test
    fun `Behavior will not scroll vertically if EngineView did not handled the event`() {
        val dependency = spy(View(testContext, null, 0))
        val behavior = spy(EngineViewScrollingGesturesBehavior(createDummyEngineView(), dependency, Bottom))
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator
        doReturn(false).`when`(behavior).shouldScroll
        val child = spy(View(testContext, null, 0))
        doReturn(100).`when`(child).height
        doReturn(0f).`when`(child).translationY

        behavior.tryToScrollVertically(25f)

        verify(yTranslator, never()).translate(any(), anyFloat())
    }

    @Test
    fun `forceExpand should delegate the translator`() {
        val dependency: View = mock()
        val behavior = EngineViewScrollingGesturesBehavior(createDummyEngineView(), dependency, Bottom)
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator

        behavior.forceExpand()

        verify(yTranslator).expandWithAnimation(dependency)
    }

    @Test
    fun `forceCollapse should delegate the translator`() {
        val dependency: View = mock()
        val behavior = EngineViewScrollingGesturesBehavior(createDummyEngineView(), dependency, Bottom)
        val yTranslator: ViewYTranslator = mock()
        behavior.yTranslator = yTranslator

        behavior.forceCollapse()

        verify(yTranslator).collapseWithAnimation(dependency)
    }

    @Test
    fun `Behavior will not forceExpand when scrolling up and !shouldScroll if the touch was not yet handled in the browser`() {
        val dependency: View = mock()
        val engineView = spy(createDummyEngineView())
        val behavior = EngineViewScrollingGesturesBehavior(engineView, dependency, Bottom)
        val yTranslator: ViewYTranslator = mock()
        behavior.isScrollEnabled = true
        behavior.startedScroll = true
        behavior.yTranslator = yTranslator
        val validInputResultDetail: InputResultDetail = mock()
        doReturn(true).`when`(validInputResultDetail).canScrollToBottom()
        doReturn(validInputResultDetail).`when`(engineView).getInputResultDetail()

        doReturn(100).`when`(dependency).height
        doReturn(100f).`when`(dependency).translationY

        val downEvent = TestUtils.getMotionEvent(ACTION_DOWN, 0f, 0f)
        val moveEvent = TestUtils.getMotionEvent(ACTION_MOVE, 0f, 30f, downEvent)

        behavior.onInterceptTouchEvent(mock(), mock(), downEvent)
        behavior.onInterceptTouchEvent(mock(), mock(), moveEvent)

        verify(yTranslator).translate(dependency, -30f)
        verify(yTranslator, never()).forceExpandIfNotAlready(dependency, -30f)
    }

    @Test
    fun `enableScrolling sets isScrollEnabled to true`() {
        val behavior = EngineViewScrollingGesturesBehavior(createDummyEngineView(), mock(), Bottom)

        assertFalse(behavior.isScrollEnabled)
        behavior.enableScrolling()

        assertTrue(behavior.isScrollEnabled)
    }

    @Test
    fun `disableScrolling sets isScrollEnabled to false`() {
        val behavior = EngineViewScrollingGesturesBehavior(createDummyEngineView(), mock(), Bottom)
        behavior.isScrollEnabled = true

        assertTrue(behavior.isScrollEnabled)
        behavior.disableScrolling()

        assertFalse(behavior.isScrollEnabled)
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
