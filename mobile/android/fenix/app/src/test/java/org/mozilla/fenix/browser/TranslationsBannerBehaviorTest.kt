/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser

import android.animation.ValueAnimator
import android.view.Gravity
import android.view.View
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.view.ViewCompat
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.spyk
import io.mockk.verify
import mozilla.components.concept.engine.EngineView
import mozilla.components.concept.engine.InputResultDetail
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class TranslationsBannerBehaviorTest {
    private val banner = mockk<View>(relaxed = true)
    private val dependency = View(testContext)
    private var layoutParams = CoordinatorLayout.LayoutParams(0, 0)
    private val parent = CoordinatorLayout(testContext)

    @Before
    fun setup() {
        every { banner.layoutParams } returns layoutParams
        every { banner.post(any()) } answers {
            // Immediately run the given Runnable argument
            val action: Runnable = firstArg()
            action.run()
            true
        }
        parent.addView(dependency)
    }

    @Test
    fun `WHEN a nested scroll starts THEN cancel ongoing snap animations`() {
        val behavior = spyk(TranslationsBannerBehavior<View>(testContext, false, false))
        every { behavior.shouldScroll } returns true

        val animator: ValueAnimator = mockk(relaxed = true)
        behavior.snapAnimator = animator

        val acceptsNestedScroll = behavior.onStartNestedScroll(
            coordinatorLayout = mockk(),
            child = mockk(),
            directTargetChild = mockk(),
            target = mockk(),
            axes = ViewCompat.SCROLL_AXIS_VERTICAL,
            type = ViewCompat.TYPE_TOUCH,
        )

        assertTrue(acceptsNestedScroll)

        verify { animator.cancel() }
    }

    @Test
    fun `WHEN the webpage is scrolled horizontally THEN don't react to scroll events`() {
        val behavior = TranslationsBannerBehavior<View>(testContext, false, false)

        val acceptsNestedScroll = behavior.onStartNestedScroll(
            coordinatorLayout = mockk(),
            child = mockk(),
            directTargetChild = mockk(),
            target = mockk(),
            axes = ViewCompat.SCROLL_AXIS_HORIZONTAL,
            type = ViewCompat.TYPE_TOUCH,
        )

        assertFalse(acceptsNestedScroll)
    }

    @Test
    fun `GIVEN the banner is shown more than half WHEN the webpage scroll stops THEN snap expanding it`() {
        val behavior = spyk(TranslationsBannerBehavior<View>(testContext, false, false))
        every { behavior.shouldScroll } returns true

        val animator: ValueAnimator = mockk(relaxed = true)
        behavior.snapAnimator = animator

        behavior.expanded = false

        val child = mockk<View> {
            every { height } returns 100
            every { translationY } returns 59f
        }

        behavior.onStartNestedScroll(
            coordinatorLayout = mockk(),
            child = child,
            directTargetChild = mockk(),
            target = mockk(),
            axes = ViewCompat.SCROLL_AXIS_VERTICAL,
            type = ViewCompat.TYPE_TOUCH,
        )

        assertTrue(behavior.shouldSnapAfterScroll)

        verify(exactly = 0) { animator.start() }

        behavior.onStopNestedScroll(
            coordinatorLayout = mockk(),
            child = child,
            target = mockk(),
            type = 0,
        )

        verify { behavior.animateSnap(child, TranslationsBannerBehavior.SnapDirection.DOWN) }

        verify { animator.start() }
    }

    @Test
    fun `GIVEN the banner is shown less than half WHEN the webpage scroll stops THEN snap collapsing it`() {
        val behavior = spyk(TranslationsBannerBehavior<View>(testContext, false, false))
        every { behavior.shouldScroll } returns true

        val animator: ValueAnimator = mockk(relaxed = true)
        behavior.snapAnimator = animator

        behavior.expanded = true

        val child = mockk<View> {
            every { height } returns 100
            every { translationY } returns 5f
        }

        behavior.onStartNestedScroll(
            coordinatorLayout = mockk(),
            child = child,
            directTargetChild = mockk(),
            target = mockk(),
            axes = ViewCompat.SCROLL_AXIS_VERTICAL,
            type = ViewCompat.TYPE_TOUCH,
        )

        assertTrue(behavior.shouldSnapAfterScroll)

        verify(exactly = 0) { animator.start() }

        behavior.onStopNestedScroll(
            coordinatorLayout = mockk(),
            child = child,
            target = mockk(),
            type = 0,
        )

        verify { behavior.animateSnap(child, TranslationsBannerBehavior.SnapDirection.DOWN) }

        verify { animator.start() }
    }

    @Test
    fun `WHEN the webpage is scrolled THEN translate the banner vertically`() {
        val behavior = spyk(TranslationsBannerBehavior<View>(testContext, false, false))
        every { behavior.shouldScroll } returns true

        val child = mockk<View> {
            every { height } returns 100
            every { translationY } returns 0f
            every { translationY = any() } returns Unit
        }

        behavior.onNestedPreScroll(
            coordinatorLayout = mockk(),
            child = child,
            target = mockk(),
            dx = 0,
            dy = 25,
            consumed = IntArray(0),
            type = 0,
        )

        verify { child.translationY = 25f }
    }

    @Test
    fun `WHEN asked to force expand the banner THEN animate expanding it`() {
        val behavior = spyk(TranslationsBannerBehavior<View>(testContext, false, false))
        val dynamicbannerView: View = mockk(relaxed = true)
        every { behavior.shouldScroll } returns true

        behavior.forceExpand(dynamicbannerView)

        verify {
            behavior.animateSnap(
                dynamicbannerView,
                TranslationsBannerBehavior.SnapDirection.UP,
            )
        }
    }

    @Test
    fun `GIVEN a null InputResultDetail from the EngineView WHEN shouldScroll is called THEN it returns false`() {
        val behavior = TranslationsBannerBehavior<View>(testContext, false, false)

        behavior.engineView = null
        assertFalse(behavior.shouldScroll)

        behavior.engineView = mockk()
        every { behavior.engineView?.getInputResultDetail() } returns null
        assertFalse(behavior.shouldScroll)
    }

    @Test
    fun `GIVEN an InputResultDetail with the right values WHEN shouldScroll is called THEN it returns true`() {
        val behavior = TranslationsBannerBehavior<View>(testContext, false, false)
        val engineView: EngineView = mockk()
        behavior.engineView = engineView
        val validInputResultDetail: InputResultDetail = mockk()
        every { engineView.getInputResultDetail() } returns validInputResultDetail

        every { validInputResultDetail.canScrollToBottom() } returns true
        every { validInputResultDetail.canScrollToTop() } returns false
        assertTrue(behavior.shouldScroll)

        every { validInputResultDetail.canScrollToBottom() } returns false
        every { validInputResultDetail.canScrollToTop() } returns true
        assertTrue(behavior.shouldScroll)

        every { validInputResultDetail.canScrollToBottom() } returns true
        every { validInputResultDetail.canScrollToTop() } returns true
        assertTrue(behavior.shouldScroll)
    }

    @Test
    fun `GIVEN a gesture that doesn't scroll the toolbar WHEN startNestedScroll THEN toolbar is expanded and nested scroll not accepted`() {
        val behavior = spyk(TranslationsBannerBehavior<View>(testContext, false, false))
        val engineView: EngineView = mockk()
        behavior.engineView = engineView
        val inputResultDetail: InputResultDetail = mockk()
        val animator: ValueAnimator = mockk(relaxed = true)
        behavior.snapAnimator = animator
        every { behavior.shouldScroll } returns false
        every { behavior.forceExpand(any()) } just Runs
        every { engineView.getInputResultDetail() } returns inputResultDetail
        every { inputResultDetail.isTouchUnhandled() } returns true

        val childView: View = mockk()
        val acceptsNestedScroll = behavior.onStartNestedScroll(
            coordinatorLayout = mockk(),
            child = childView,
            directTargetChild = mockk(),
            target = mockk(),
            axes = ViewCompat.SCROLL_AXIS_VERTICAL,
            type = ViewCompat.TYPE_TOUCH,
        )

        verify { behavior.forceExpand(childView) }
        verify { animator.cancel() }
        assertFalse(acceptsNestedScroll)
    }

    @Test
    fun `GIVEN just a toolbar shown at top WHEN the banner is shown THEN don't anchor it`() {
        dependency.id = R.id.toolbar
        val behavior = TranslationsBannerBehavior<View>(testContext, false, false)

        behavior.layoutDependsOn(parent, banner, dependency)

        assertBannerIsPlacedAtTheBottomOfTheScreen()
    }

    @Test
    fun `GIVEN just a toolbar layout shown at top WHEN the banner is shown THEN don't anchor it`() {
        dependency.id = R.id.toolbarLayout
        val behavior = TranslationsBannerBehavior<View>(testContext, false, false)

        behavior.layoutDependsOn(parent, banner, dependency)

        assertBannerIsPlacedAtTheBottomOfTheScreen()
    }

    @Test
    fun `GIVEN a bottom toolbar is shown WHEN the banner is shown THEN place the banner above the toolbar`() {
        dependency.id = R.id.toolbar
        val behavior = TranslationsBannerBehavior<View>(testContext, true, false)

        behavior.layoutDependsOn(parent, banner, dependency)

        assertBannerPlacementAboveAnchor()
    }

    @Test
    fun `GIVEN both the bottom toolbar and the navbar are shown WHEN the banner is shown THEN place the banner above the toolbar`() {
        dependency.id = R.id.toolbar
        val behavior = TranslationsBannerBehavior<View>(testContext, true, true)

        behavior.layoutDependsOn(parent, banner, dependency)

        assertBannerPlacementAboveAnchor()
    }

    @Test
    fun `GIVEN a bottom composable toolbar is shown WHEN the banner is shown THEN place the banner above the composable toolbar`() {
        dependency.id = R.id.composable_toolbar
        val behavior = TranslationsBannerBehavior<View>(testContext, true, false)

        behavior.layoutDependsOn(parent, banner, dependency)

        assertBannerPlacementAboveAnchor()
    }

    @Test
    fun `GIVEN both the bottom composable toolbar and the navbar are shown WHEN the banner is shown THEN place the banner above the composable toolbar`() {
        dependency.id = R.id.composable_toolbar
        val behavior = TranslationsBannerBehavior<View>(testContext, true, true)

        behavior.layoutDependsOn(parent, banner, dependency)

        assertBannerPlacementAboveAnchor()
    }

    @Test
    fun `GIVEN a top composable toolbar is shown WHEN the banner is shown THEN place the banner at the bottom of the screen`() {
        dependency.id = R.id.composable_toolbar
        val behavior = TranslationsBannerBehavior<View>(testContext, false, false)

        behavior.layoutDependsOn(parent, banner, dependency)

        assertBannerIsPlacedAtTheBottomOfTheScreen()
    }

    @Test
    fun `GIVEN a top composable toolbar and the navbar shown WHEN the banner is shown THEN place the banner on the top of the navbar`() {
        dependency.id = R.id.navigation_bar
        val behavior = TranslationsBannerBehavior<View>(testContext, true, true)

        behavior.layoutDependsOn(parent, banner, dependency)

        assertBannerIsPlacedAtTheBottomOfTheScreen()
    }

    @Test
    fun `GIVEN the banner is anchored to the logins bar and a top toolbar is shown WHEN the logins bar is not shown anymore THEN place the banner to the bottom`() {
        val loginsBar = View(testContext)
            .apply { id = R.id.loginSelectBar }
            .also { parent.addView(it) }
        View(testContext)
            .apply { id = R.id.toolbar }
            .also { parent.addView(it) }
        val behavior = TranslationsBannerBehavior<View>(testContext, false, false)

        behavior.layoutDependsOn(parent, banner, dependency)
        assertBannerPlacementAboveAnchor(loginsBar)

        loginsBar.visibility = View.GONE
        behavior.layoutDependsOn(parent, banner, dependency)
        assertBannerIsPlacedAtTheBottomOfTheScreen()
    }

    @Test
    fun `GIVEN the banner is anchored to the logins bar and a bottom toolbar is shown WHEN the logins bar is not shown anymore THEN place the banner on top of the toolbar`() {
        val loginsBar = View(testContext)
            .apply { id = R.id.loginSelectBar }
            .also { parent.addView(it) }
        val bottomToolbar = View(testContext)
            .apply { id = R.id.toolbar }
            .also { parent.addView(it) }
        val behavior = TranslationsBannerBehavior<View>(testContext, true, false)

        behavior.layoutDependsOn(parent, banner, dependency)
        assertBannerPlacementAboveAnchor(loginsBar)

        loginsBar.visibility = View.GONE
        behavior.layoutDependsOn(parent, banner, dependency)
        assertBannerPlacementAboveAnchor(bottomToolbar)
    }

    @Test
    fun `GIVEN the banner is anchored to the logins bar and navigation bar is shown WHEN the logins bar is not shown anymore THEN place the banner to the navigation bar`() {
        val loginsBar = View(testContext)
            .apply { id = R.id.loginSelectBar }
            .also { parent.addView(it) }
        val toolbar = View(testContext)
            .apply { id = R.id.toolbar }
            .also { parent.addView(it) }
        val behavior = TranslationsBannerBehavior<View>(testContext, true, true)

        behavior.layoutDependsOn(parent, banner, dependency)
        assertBannerPlacementAboveAnchor(loginsBar)

        loginsBar.visibility = View.GONE
        behavior.layoutDependsOn(parent, banner, dependency)
        assertBannerPlacementAboveAnchor(toolbar)
    }

    @Test
    fun `GIVEN the banner is anchored to the password bar and a top toolbar is shown WHEN the password bar is not shown anymore THEN place the banner to the bottom`() {
        val passwordBar = View(testContext)
            .apply { id = R.id.suggestStrongPasswordBar }
            .also { parent.addView(it) }
        View(testContext)
            .apply { id = R.id.toolbar }
            .also { parent.addView(it) }
        val behavior = TranslationsBannerBehavior<View>(testContext, false, false)

        behavior.layoutDependsOn(parent, banner, dependency)
        assertBannerPlacementAboveAnchor(passwordBar)

        passwordBar.visibility = View.GONE
        behavior.layoutDependsOn(parent, banner, dependency)
        assertBannerIsPlacedAtTheBottomOfTheScreen()
    }

    @Test
    fun `GIVEN the banner is anchored to the password bar and a bottom toolbar is shown WHEN the password bar is not shown anymore THEN place the banner on top of the toolbar`() {
        val loginsBar = View(testContext)
            .apply { id = R.id.suggestStrongPasswordBar }
            .also { parent.addView(it) }
        val bottomToolbar = View(testContext)
            .apply { id = R.id.toolbar }
            .also { parent.addView(it) }
        val behavior = TranslationsBannerBehavior<View>(testContext, true, false)

        behavior.layoutDependsOn(parent, banner, dependency)
        assertBannerPlacementAboveAnchor(loginsBar)

        loginsBar.visibility = View.GONE
        behavior.layoutDependsOn(parent, banner, dependency)
        assertBannerPlacementAboveAnchor(bottomToolbar)
    }

    @Test
    fun `GIVEN the banner is anchored to the password bar and navigation bar is shown WHEN the password bar is not shown anymore THEN place the banner to the navigation bar`() {
        val passwordBar = View(testContext)
            .apply { id = R.id.suggestStrongPasswordBar }
            .also { parent.addView(it) }
        val toolbar = View(testContext)
            .apply { id = R.id.toolbar }
            .also { parent.addView(it) }
        val behavior = TranslationsBannerBehavior<View>(testContext, true, true)

        behavior.layoutDependsOn(parent, banner, dependency)
        assertBannerPlacementAboveAnchor(passwordBar)

        passwordBar.visibility = View.GONE
        behavior.layoutDependsOn(parent, banner, dependency)
        assertBannerPlacementAboveAnchor(toolbar)
    }

    private fun assertBannerPlacementAboveAnchor(anchor: View = dependency) {
        assertEquals(anchor.id, layoutParams.anchorId)
        assertEquals(Gravity.TOP or Gravity.CENTER_HORIZONTAL, layoutParams.anchorGravity)
        assertEquals(Gravity.TOP or Gravity.CENTER_HORIZONTAL, layoutParams.gravity)
    }

    private fun assertBannerIsPlacedAtTheBottomOfTheScreen() {
        assertEquals(View.NO_ID, layoutParams.anchorId)
        assertEquals(Gravity.NO_GRAVITY, layoutParams.anchorGravity)
        assertEquals(Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL, layoutParams.gravity)
    }
}
