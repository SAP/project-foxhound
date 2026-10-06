/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.widgets.behavior

import android.view.View
import mozilla.components.concept.base.crash.CrashReporting
import mozilla.components.concept.engine.EngineView
import mozilla.components.ui.widgets.behavior.DependencyGravity.Bottom

/**
 * Factory for [EngineViewScrollingBehavior] instances.
 */
class EngineViewScrollingBehaviorFactory(
    private val useScrollData: Boolean = false,
) {
    /**
     * Create a new [EngineViewScrollingBehavior] instance.
     *
     * @param engineView [EngineView] to synchronize scrolling with.
     * @param dependency [View] that will be scrolled to match [engineView].
     * @param dependencyGravity whether [dependency] is placed on the top or bottom of the screen.
     * @param crashReporting [CrashReporting] to use for reporting crashes.
     */
    fun build(
        engineView: EngineView,
        dependency: View,
        dependencyGravity: DependencyGravity,
        crashReporting: CrashReporting? = null,
    ) = when (useScrollData && dependencyGravity is Bottom) {
        true -> EngineViewScrollingDataBehavior(
            engineView = engineView,
            dependency = dependency,
            dependencyGravity = dependencyGravity,
        )

        false -> EngineViewScrollingGesturesBehavior(
            engineView = engineView,
            dependency = dependency,
            dependencyGravity = dependencyGravity,
            crashReporting = crashReporting,
        )
    }
}
