/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.widgets.behavior

import android.view.View
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.view.isVisible
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import mozilla.components.concept.engine.EngineView
import mozilla.components.support.ktx.android.view.toScope

/**
 * A [CoordinatorLayout.Behavior] implementation to be used for moving [dependency] up/down
 * depending on scroll data exposed by [engineView].
 *
 * This is safe to use even if [dependency] has it's visibility modified.
 *
 * This implementation will:
 * - Show/Hide the [View] automatically when scrolling vertically.
 * - Snap the [View] to be hidden or visible when the user stops scrolling.
 */
class EngineViewScrollingDataBehavior(
    private val engineView: EngineView,
    private val dependency: View,
    dependencyGravity: DependencyGravity,
    private val scrollListenerScope: CoroutineScope = engineView.asView().toScope(),
) : EngineViewScrollingBehavior(engineView, dependency, dependencyGravity) {
    private var scrollUpdatesJob: Job? = null

    override fun onStartNestedScroll(
        coordinatorLayout: CoordinatorLayout,
        child: View,
        directTargetChild: View,
        target: View,
        axes: Int,
        type: Int,
    ): Boolean = when (dependency.isVisible && isScrollEnabled) {
        true -> {
            yTranslator.cancelInProgressTranslation()

            scrollUpdatesJob = scrollListenerScope.launch {
                engineView.verticalScrollDelta.collect {
                    if (isActive) { yTranslator.translate(dependency, it) }
                }
            }
            true
        }
        false -> false // not interested in subsequent scroll events
    }

    override fun onStopNestedScroll(
        coordinatorLayout: CoordinatorLayout,
        child: View,
        target: View,
        type: Int,
    ) {
        scrollUpdatesJob?.cancel()

        if (dependency.isVisible) {
            yTranslator.snapWithAnimation(dependency)
        }
    }
}
