/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser

import android.animation.ValueAnimator
import android.content.Context
import android.view.Gravity
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.annotation.VisibleForTesting
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.view.ViewCompat
import androidx.core.view.children
import androidx.core.view.isVisible
import mozilla.components.concept.engine.EngineView
import mozilla.components.support.ktx.android.view.findViewInHierarchy
import org.mozilla.fenix.R
import kotlin.math.max
import kotlin.math.min

private const val SNAP_ANIMATION_DURATION = 150L

/**
 * A [CoordinatorLayout.Behavior] implementation to be used for placing the translations banner
 * at the bottom of the screen.
 * The translations banner will be anchored to any bottom toolbar or other banners and be scrollable
 * depending on when the webpage is scrolled.
 *
 * @param context [Context] needed for various Android interactions.
 * @param isAddressBarAtBottom Whether the address bar is at the bottom of the screen.
 * @param isNavBarShown Whether the navigation bar is shown.
 */
class TranslationsBannerBehavior<V : View>(
    context: Context,
    private val isAddressBarAtBottom: Boolean,
    private val isNavBarShown: Boolean,
) : CoordinatorLayout.Behavior<V>(context, null) {
    private var scrollableDependency: View? = null
    private var currentAnchorId: Int? = View.NO_ID

    // Priority list of possible anchors for the translations banner.
    private val anchoringDependenciesIds = buildList {
        add(R.id.loginSelectBar)
        add(R.id.suggestStrongPasswordBar)
        add(R.id.creditCardSelectBar)
        add(R.id.addressSelectBar)
        add(R.id.findInPageView)
        if (isAddressBarAtBottom) {
            add(R.id.toolbarLayout)
            add(R.id.toolbar)
            add(R.id.composable_toolbar)
        } else if (isNavBarShown) {
            add(R.id.navigation_bar)
        }
    }

    private val scrollableDependenciesIds = buildList {
        if (!isAddressBarAtBottom && isNavBarShown) {
            add(R.id.navigation_bar)
        }
        add(R.id.toolbarLayout)
        add(R.id.toolbar)
        add(R.id.composable_toolbar)
    }

    private val scrollableDependencyHeight: Float
        get() {
            val dependency = scrollableDependency
            return when (dependency?.isVisible == true) {
                true -> dependency.height.toFloat()
                else -> 0f
            }
        }

    @VisibleForTesting()
    internal var expanded: Boolean = true

    @VisibleForTesting()
    internal var shouldSnapAfterScroll: Boolean = false

    @VisibleForTesting()
    internal var snapAnimator: ValueAnimator = ValueAnimator()
        .apply {
            interpolator = DecelerateInterpolator()
            duration = SNAP_ANIMATION_DURATION
        }

    @VisibleForTesting
    internal var engineView: EngineView? = null

    @VisibleForTesting()
    internal val shouldScroll: Boolean
        get() = engineView?.getInputResultDetail()?.let {
            (it.canScrollToBottom() || it.canScrollToTop())
        } ?: false

    override fun onStartNestedScroll(
        coordinatorLayout: CoordinatorLayout,
        child: V,
        directTargetChild: View,
        target: View,
        axes: Int,
        type: Int,
    ): Boolean {
        return if (shouldScroll && axes == ViewCompat.SCROLL_AXIS_VERTICAL) {
            shouldSnapAfterScroll = type == ViewCompat.TYPE_TOUCH
            snapAnimator.cancel()
            true
        } else if (engineView?.getInputResultDetail()?.isTouchUnhandled() == true) {
            // Force expand the banner if event is unhandled, otherwise user could get stuck in a
            // state where they cannot show it again.
            forceExpand(child)
            snapAnimator.cancel()
            false
        } else {
            false
        }
    }

    override fun onStopNestedScroll(
        coordinatorLayout: CoordinatorLayout,
        child: V,
        target: View,
        type: Int,
    ) {
        if (shouldSnapAfterScroll || type == ViewCompat.TYPE_NON_TOUCH) {
            if (expanded) {
                if (child.translationY > scrollableDependencyHeight / 2) {
                    animateSnap(child, SnapDirection.DOWN)
                } else {
                    animateSnap(child, SnapDirection.UP)
                }
            } else {
                if (child.translationY < (scrollableDependencyHeight + child.height.toFloat() / 2)) {
                    animateSnap(child, SnapDirection.UP)
                } else {
                    animateSnap(child, SnapDirection.DOWN)
                }
            }
        }
    }

    override fun onNestedPreScroll(
        coordinatorLayout: CoordinatorLayout,
        child: V,
        target: View,
        dx: Int,
        dy: Int,
        consumed: IntArray,
        type: Int,
    ) {
        if (shouldScroll) {
            super.onNestedPreScroll(coordinatorLayout, child, target, dx, dy, consumed, type)
            child.translationY = max(
                0f,
                min(
                    child.height.toFloat() + scrollableDependencyHeight,
                    child.translationY + dy,
                ),
            )
        }
    }

    override fun layoutDependsOn(
        parent: CoordinatorLayout,
        child: V,
        dependency: View,
    ): Boolean {
        if (engineView == null) {
            engineView = parent.findViewInHierarchy { it is EngineView } as? EngineView
        }
        // Scrollable dependencies only need to be set once as they don't change while browsing in the same tab.
        if (scrollableDependency == null) {
            scrollableDependency = parent.children.firstOrNull { it.isVisible && it.id in scrollableDependenciesIds }
        }

        val anchorId = anchoringDependenciesIds
            .intersect(parent.children.filter { it.isVisible }.map { it.id }.toSet())
            .firstOrNull()

        // It is possible that previous anchor's visibility is changed.
        // We have to check here if a new anchor is available and reparent the logins bar.
        if (anchorId != currentAnchorId) {
            currentAnchorId = anchorId
            placeBanner(
                banner = child,
                dependency = parent.children.firstOrNull { it.id == currentAnchorId },
            )
        }

        return super.layoutDependsOn(parent, child, dependency)
    }

    internal fun forceExpand(view: View) {
        animateSnap(view, SnapDirection.UP)
    }

    @VisibleForTesting()
    internal fun animateSnap(child: View, direction: SnapDirection) = with(snapAnimator) {
        expanded = direction == SnapDirection.UP
        addUpdateListener { child.translationY = it.animatedValue as Float }
        setFloatValues(
            child.translationY,
            if (direction == SnapDirection.UP) {
                0f
            } else {
                child.height.toFloat() + scrollableDependencyHeight
            },
        )
        start()
    }

    private fun placeBanner(banner: V, dependency: View?) {
        banner.post {
            when (dependency == null) {
                true -> placeAtBottom(banner)
                false -> placeAboveAnchor(banner, dependency)
            }
        }
    }

    private fun placeAtBottom(banner: View) {
        val params = banner.layoutParams as CoordinatorLayout.LayoutParams

        params.anchorId = View.NO_ID
        params.anchorGravity = Gravity.NO_GRAVITY
        params.gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
        banner.layoutParams = params
    }

    private fun placeAboveAnchor(banner: View, anchor: View) {
        val params = banner.layoutParams as CoordinatorLayout.LayoutParams

        params.anchorId = anchor.id
        params.anchorGravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
        params.gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
        banner.layoutParams = params
    }

    @VisibleForTesting()
    internal enum class SnapDirection {
        UP,
        DOWN,
    }
}
