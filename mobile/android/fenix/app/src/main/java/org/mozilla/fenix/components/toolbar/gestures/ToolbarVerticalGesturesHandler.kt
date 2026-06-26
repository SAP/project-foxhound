/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.toolbar.gestures

import android.graphics.PointF
import android.view.View
import android.view.ViewConfiguration
import androidx.core.graphics.contains
import androidx.core.graphics.toPoint
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.navigation.NavController
import mozilla.telemetry.glean.private.NoExtras
import org.mozilla.fenix.GleanMetrics.Events
import org.mozilla.fenix.NavGraphDirections
import org.mozilla.fenix.R
import org.mozilla.fenix.browser.SwipeGestureListener
import org.mozilla.fenix.browser.browsingmode.BrowsingMode.Normal
import org.mozilla.fenix.browser.browsingmode.BrowsingMode.Private
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.toolbar.ToolbarPosition
import org.mozilla.fenix.components.toolbar.ToolbarPosition.BOTTOM
import org.mozilla.fenix.components.toolbar.ToolbarPosition.TOP
import org.mozilla.fenix.ext.getRectWithScreenLocation
import org.mozilla.fenix.ext.nav
import org.mozilla.fenix.tabstray.redux.state.Page
import kotlin.math.abs

private const val TOOLBAR_HEIGHT_MAXIMUM_SWIPE_FACTOR = 0.8f

/**
 * Toolbars (address bar + navigation bar) specific gesture handler that will
 * show the tabs tray for the appropriate swip up/down gesture.
 *
 * @param appStore The [AppStore] containing the application state.
 * @param toolbarLayout The address bar layout.
 * @param navBarLayout The navigation bar layout.
 * @param toolbarPosition Where the address bar is shown on the screen.
 * @param navController [NavController] used for navigation to the tabs tray.
 */
class ToolbarVerticalGesturesHandler(
    private val appStore: AppStore,
    private val toolbarLayout: View,
    private val navBarLayout: View?,
    private val toolbarPosition: ToolbarPosition,
    private val navController: NavController,
) : SwipeGestureListener {
    private val scaledTouchSlop = ViewConfiguration.get(toolbarLayout.context).scaledTouchSlop * 2
    private var currentSwipeXDistance = 0f
    private var currentSwipeYDistance = 0f
    private var startTouchPoint = PointF(0f, 0f)

    override fun onSwipeStarted(
        start: PointF,
        next: PointF,
    ): Boolean {
        startTouchPoint = start
        currentSwipeXDistance = next.x - start.x
        currentSwipeYDistance = next.y - start.y

        return maybeShowTabsOnSwipe()
    }

    override fun onSwipeUpdate(distanceX: Float, distanceY: Float) {
        currentSwipeXDistance -= distanceX
        currentSwipeYDistance -= distanceY

        maybeShowTabsOnSwipe()
    }

    override fun onSwipeFinished(velocityX: Float, velocityY: Float) {
        // no-op
    }

    private fun maybeShowTabsOnSwipe(): Boolean {
        val currentDestinationId = navController.currentDestination?.id
        // Avoid negative side effects of the race between navigation and swipe callbacks
        val isCurrentDestinationValid =
            currentDestinationId == R.id.browserFragment || currentDestinationId == R.id.homeFragment

        @Suppress("ComplexCondition")
        if (!isCurrentDestinationValid ||
            appStore.state.searchState.isSearchActive ||
            startTouchPoint.isInSystemGestureInset() ||
            !startTouchPoint.isSwipeValid(currentSwipeYDistance)
        ) {
            return false
        }

        if (isSwipeValid()) {
            Events.toolbarTabstraySwipe.record(NoExtras())

            navController.nav(
                navController.currentDestination?.id,
                NavGraphDirections.actionGlobalTabManagementFragment(
                    page = when (appStore.state.mode) {
                        Normal -> Page.NormalTabs
                        Private -> Page.PrivateTabs
                    },
                ),
            )
            return false
        } else {
            return true
        }
    }

    /**
     * Check if a vertical swipe with the minimum accepted distance happened.
     */
    private fun isSwipeValid(): Boolean {
        val target = getTargetView() ?: return false

        // Ensure that the minimum swipe distance is still smaller than the toolbar height.
        val maximumToolbarSwipeNeeded = target.height / TOOLBAR_HEIGHT_MAXIMUM_SWIPE_FACTOR
        val minimumSwipeDistance = scaledTouchSlop.coerceAtMost(maximumToolbarSwipeNeeded.toInt())

        return abs(currentSwipeYDistance) >= minimumSwipeDistance &&
            abs(currentSwipeXDistance) < minimumSwipeDistance &&
            startTouchPoint.isSwipeValid(currentSwipeYDistance)
    }

    /**
     * Check if the swipe originated from the toolbar or navigation bar.
     */
    private fun PointF.isSwipeValid(distanceY: Float): Boolean {
        val isSwipeUpOverNavbar = distanceY.isSwipeUp && isInTarget(navBarLayout)
        if (isSwipeUpOverNavbar) return true

        val isToolbarSwipeDirectionValid = when (toolbarPosition) {
            TOP -> distanceY.isSwipeDown
            BOTTOM -> distanceY.isSwipeUp
        }
        return isToolbarSwipeDirectionValid && isInTarget(toolbarLayout)
    }

    /**
     * Check if the swipe started inside the bottom system gesture inset - the screen-edge region
     * the OS reserves for the "swipe up to go home/background the app" gesture when gesture-based
     * navigation is used.
     * A bottom toolbar/navbar overlaps this region, so swipes originating there
     * must be ignored to avoid mistaking the system gesture for a tabs tray swipe.
     */
    private fun PointF.isInSystemGestureInset(): Boolean {
        val bottomInsets = ViewCompat.getRootWindowInsets(toolbarLayout)
            ?.getInsets(WindowInsetsCompat.Type.systemGestures())
            ?.bottom ?: 0

        if (bottomInsets <= 0) return false

        val rootView = toolbarLayout.rootView
        val screenBottom = IntArray(2).apply { rootView.getLocationOnScreen(this) }[1] + rootView.height
        return y >= screenBottom - bottomInsets
    }

    private fun getTargetView() = when ((navBarLayout?.height ?: 0) > 0) {
        true -> navBarLayout
        else -> toolbarLayout
    }

    private fun PointF.isInTarget(target: View?) =
        target?.getRectWithScreenLocation()?.contains(toPoint()) == true

    private val Float.isSwipeUp
        get() = this < 0f

    private val Float.isSwipeDown
        get() = this > 0f
}
