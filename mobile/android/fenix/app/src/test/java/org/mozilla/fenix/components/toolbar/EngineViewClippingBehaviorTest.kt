/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.toolbar

import android.view.View
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.toolbar.BrowserToolbar
import mozilla.components.concept.engine.EngineView
import mozilla.components.support.test.fakes.engine.FakeEngineView
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify
import org.mozilla.fenix.components.toolbar.navbar.EngineViewClippingBehavior

@RunWith(AndroidJUnit4::class)
class EngineViewClippingBehaviorTest {

    private lateinit var coordinatorLayout: CoordinatorLayout
    private lateinit var engineView: EngineView
    private lateinit var engineParentView: View
    private lateinit var toolbar: BrowserToolbar
    private lateinit var toolbarContainerView: ToolbarContainerView

    @Before
    fun setup() {
        coordinatorLayout = mock()
        engineView = spy(FakeEngineView(testContext))
        engineParentView = spy(View(testContext))
        toolbar = mock()
        toolbarContainerView = mock()
    }

    // Bottom toolbar position tests
    @Test
    fun `GIVEN the toolbar is at the bottom WHEN toolbar is being shifted THEN EngineView adjusts bottom clipping && EngineViewParent position doesn't change`() {
        doReturn(TOOLBAR_PARENT_HEIGHT).`when`(coordinatorLayout).height
        doReturn(TOOLBAR_TOP_WHEN_POSITIONED_AT_BOTTOM).`when`(toolbar).top
        doReturn(Y_DOWN_TRANSITION).`when`(toolbar).translationY

        assertEquals(0f, engineParentView.translationY)

        buildEngineViewClippingBehavior().onDependentViewChanged(coordinatorLayout, engineParentView, toolbar)

        // We want to position the engine view popup content
        // right above the bottom toolbar when the toolbar
        // is being shifted down. The top of the bottom toolbar
        // is either positive or zero, but for clipping
        // the values should be negative because the baseline
        // for clipping is bottom toolbar height.
        val bottomClipping = -Y_DOWN_TRANSITION.toInt()
        verify(engineView).setVerticalClipping(bottomClipping)

        assertEquals(0f, engineParentView.translationY)
    }

    @Test
    fun `GIVEN the toolbar is at the bottom && the navbar is enabled WHEN toolbar is being shifted THEN EngineView adjusts bottom clipping && EngineViewParent position doesn't change`() {
        doReturn(TOOLBAR_PARENT_HEIGHT).`when`(coordinatorLayout).height
        doReturn(TOOLBAR_TOP_WHEN_POSITIONED_AT_BOTTOM).`when`(toolbar).top
        doReturn(Y_DOWN_TRANSITION).`when`(toolbar).translationY

        assertEquals(0f, engineParentView.translationY)

        buildEngineViewClippingBehavior().onDependentViewChanged(coordinatorLayout, engineParentView, toolbar)

        // We want to position the engine view popup content
        // right above the bottom toolbar when the toolbar
        // is being shifted down. The top of the bottom toolbar
        // is either positive or zero, but for clipping
        // the values should be negative because the baseline
        // for clipping is bottom toolbar height.
        val bottomClipping = -Y_DOWN_TRANSITION.toInt()
        verify(engineView).setVerticalClipping(bottomClipping)

        assertEquals(0f, engineParentView.translationY)
    }

    // Top toolbar position tests
    @Test
    fun `GIVEN the toolbar is at the top WHEN toolbar is being shifted THEN EngineView adjusts bottom clipping && EngineViewParent shifts as well`() {
        doReturn(TOOLBAR_PARENT_HEIGHT).`when`(coordinatorLayout).height
        doReturn(TOOLBAR_TOP_WHEN_POSITIONED_AT_TOP).`when`(toolbar).top
        doReturn(Y_UP_TRANSITION).`when`(toolbar).translationY

        assertEquals(0f, engineParentView.translationY)

        buildEngineViewClippingBehavior(
            topToolbarHeight = TOOLBAR_HEIGHT.toInt(),
        ).onDependentViewChanged(coordinatorLayout, engineParentView, toolbar)

        verify(engineView).setVerticalClipping(Y_UP_TRANSITION.toInt())

        // Here we are adjusting the vertical position of
        // the engine view container to be directly under
        // the toolbar. The top toolbar is shifting up, so
        // its translation will be either negative or zero.
        val bottomClipping = Y_UP_TRANSITION + TOOLBAR_HEIGHT
        assertEquals(bottomClipping, engineParentView.translationY)
    }

    // Combined toolbar position tests
    @Test
    fun `WHEN both of the toolbars are being shifted GIVEN the toolbar is at the top && the navbar is enabled THEN EngineView adjusts bottom clipping`() {
        doReturn(TOOLBAR_PARENT_HEIGHT).`when`(coordinatorLayout).height
        doReturn(TOOLBAR_TOP_WHEN_POSITIONED_AT_TOP).`when`(toolbar).top
        doReturn(TOOLBAR_TOP_WHEN_POSITIONED_AT_BOTTOM).`when`(toolbarContainerView).top
        doReturn(Y_UP_TRANSITION).`when`(toolbar).translationY
        doReturn(Y_DOWN_TRANSITION).`when`(toolbarContainerView).translationY

        buildEngineViewClippingBehavior(
            topToolbarHeight = TOOLBAR_HEIGHT.toInt(),
        ).run {
            onDependentViewChanged(coordinatorLayout, engineParentView, toolbar)
            onDependentViewChanged(coordinatorLayout, engineParentView, toolbarContainerView)
        }

        val doubleClipping = Y_UP_TRANSITION - Y_DOWN_TRANSITION
        verify(engineView).setVerticalClipping(doubleClipping.toInt())
    }

    @Test
    fun `WHEN both of the toolbars are being shifted GIVEN the toolbar is at the top && the navbar is enabled THEN EngineViewParent shifts as well`() {
        doReturn(TOOLBAR_PARENT_HEIGHT).`when`(coordinatorLayout).height
        doReturn(TOOLBAR_TOP_WHEN_POSITIONED_AT_TOP).`when`(toolbar).top
        doReturn(TOOLBAR_TOP_WHEN_POSITIONED_AT_BOTTOM).`when`(toolbarContainerView).top
        doReturn(Y_UP_TRANSITION).`when`(toolbar).translationY
        doReturn(Y_DOWN_TRANSITION).`when`(toolbarContainerView).translationY

        buildEngineViewClippingBehavior(
            topToolbarHeight = TOOLBAR_HEIGHT.toInt(),
        ).run {
            onDependentViewChanged(coordinatorLayout, engineParentView, toolbar)
            onDependentViewChanged(coordinatorLayout, engineParentView, toolbarContainerView)
        }

        // The top of the parent should be positioned right below the toolbar,
        // so when we are given the new Y position of the top of the toolbar,
        // which is always negative as the element is being "scrolled" out of
        // the screen, the bottom of the toolbar is just a toolbar height away
        // from it.
        val parentTranslation = Y_UP_TRANSITION + TOOLBAR_HEIGHT
        assertEquals(parentTranslation, engineParentView.translationY)
    }

    // Edge cases
    @Test
    fun `GIVEN top toolbar is much bigger than bottom WHEN bottom stopped shifting && top is shifting THEN bottom clipping && engineParentView shifting is still accurate`() {
        val largeYUpTransition = -500f
        val largeTopToolbarHeight = 500
        doReturn(TOOLBAR_PARENT_HEIGHT).`when`(coordinatorLayout).height
        doReturn(TOOLBAR_TOP_WHEN_POSITIONED_AT_TOP).`when`(toolbar).top
        doReturn(largeYUpTransition).`when`(toolbar).translationY

        buildEngineViewClippingBehavior(
            topToolbarHeight = largeTopToolbarHeight,
        ).run {
            this.recentBottomToolbarTranslation = Y_DOWN_TRANSITION
            onDependentViewChanged(coordinatorLayout, engineParentView, toolbar)
        }

        val doubleClipping = largeYUpTransition - Y_DOWN_TRANSITION
        verify(engineView).setVerticalClipping(doubleClipping.toInt())

        val parentTranslation = largeYUpTransition + largeTopToolbarHeight
        assertEquals(parentTranslation, engineParentView.translationY)
    }

    @Test
    fun `GIVEN bottom toolbar is much bigger than top WHEN top stopped shifting && bottom is shifting THEN bottom clipping && engineParentView shifting is still accurate`() {
        val largeYBottomTransition = 500f
        val largeBottomToolbarTop = TOOLBAR_PARENT_HEIGHT - 500
        doReturn(TOOLBAR_PARENT_HEIGHT).`when`(coordinatorLayout).height
        doReturn(largeBottomToolbarTop).`when`(toolbarContainerView).top
        doReturn(largeYBottomTransition).`when`(toolbarContainerView).translationY

        buildEngineViewClippingBehavior(
            topToolbarHeight = TOOLBAR_HEIGHT.toInt(),
        ).run {
            this.recentTopToolbarTranslation = Y_UP_TRANSITION
            onDependentViewChanged(coordinatorLayout, engineParentView, toolbarContainerView)
        }

        val doubleClipping = Y_UP_TRANSITION - largeYBottomTransition
        verify(engineView).setVerticalClipping(doubleClipping.toInt())

        val parentTranslation = Y_UP_TRANSITION + TOOLBAR_HEIGHT
        assertEquals(parentTranslation, engineParentView.translationY)
    }

    @Test
    fun `GIVEN a bottom toolbar WHEN translation returns NaN THEN no exception thrown`() {
        doReturn(100).`when`(toolbar).height
        doReturn(Float.NaN).`when`(toolbar).translationY

        buildEngineViewClippingBehavior().onDependentViewChanged(coordinatorLayout, engineParentView, toolbar)

        assertEquals(0f, engineView.asView().translationY)
    }

    // General tests
    @Test
    fun `WHEN layoutDependsOn receives a class that isn't a ScrollableToolbar THEN it ignores it`() {
        val behavior = buildEngineViewClippingBehavior()

        assertFalse(behavior.layoutDependsOn(mock(), mock(), TextView(testContext)))
        assertFalse(behavior.layoutDependsOn(mock(), mock(), EditText(testContext)))
        assertFalse(behavior.layoutDependsOn(mock(), mock(), ImageView(testContext)))
    }

    @Test
    fun `WHEN layoutDependsOn receives a class that is a ScrollableToolbar THEN it recognizes it as a dependency`() {
        val behavior = buildEngineViewClippingBehavior()

        assertTrue(behavior.layoutDependsOn(mock(), mock(), BrowserToolbar(testContext)))
        assertTrue(behavior.layoutDependsOn(mock(), mock(), ToolbarContainerView(testContext)))
    }

    private fun buildEngineViewClippingBehavior(
        topToolbarHeight: Int = 0,
    ): EngineViewClippingBehavior {
        return EngineViewClippingBehavior(
            context = mock(),
            attrs = null,
            engineViewParent = engineParentView,
            topToolbarHeight = topToolbarHeight,
        ).apply {
            engineView = this@EngineViewClippingBehaviorTest.engineView
        }
    }
}

private const val TOOLBAR_PARENT_HEIGHT = 2200
private const val TOOLBAR_HEIGHT = 100f
private const val TOOLBAR_TOP_WHEN_POSITIONED_AT_TOP = 0
private const val TOOLBAR_TOP_WHEN_POSITIONED_AT_BOTTOM = 2100
private const val Y_UP_TRANSITION = -42f
private const val Y_DOWN_TRANSITION = -42f
