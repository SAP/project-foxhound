/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.widgets.behavior

import android.view.View
import androidx.annotation.VisibleForTesting
import androidx.coordinatorlayout.widget.CoordinatorLayout
import mozilla.components.concept.engine.EngineView

/**
 * [CoordinatorLayout.Behavior] that will synchronize scrolling between [engineView] and [dependency].
 *
 * @param engineView [EngineView] to synchronize scrolling with.
 * @param dependency [View] that will be scrolled to match [engineView].
 * @param dependencyGravity whether [dependency] is placed on the top or bottom of the screen.
 */
abstract class EngineViewScrollingBehavior(
    engineView: EngineView,
    private val dependency: View,
    dependencyGravity: DependencyGravity,
) : CoordinatorLayout.Behavior<View>(engineView.asView().context, null) {
    var isScrollEnabled = false
        @VisibleForTesting set

    @VisibleForTesting(otherwise = VisibleForTesting.PROTECTED)
    internal var yTranslator = ViewYTranslator(dependencyGravity)

    /**
     * Used to expand the dependent View.
     */
    fun forceExpand() {
        yTranslator.expandWithAnimation(dependency)
    }

    /**
     * Used to collapse the dependent View.
     */
    fun forceCollapse() {
        yTranslator.collapseWithAnimation(dependency)
    }

    /**
     * Allow this view to be animated.
     *
     * @see disableScrolling
     */
    fun enableScrolling() {
        isScrollEnabled = true
    }

    /**
     * Disable scrolling of the view irrespective of the intrinsic checks.
     *
     * @see enableScrolling
     */
    fun disableScrolling() {
        isScrollEnabled = false
    }
}
