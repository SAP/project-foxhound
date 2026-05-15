/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.toolbar

import android.content.Context
import android.view.View
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.view.isVisible
import org.mozilla.fenix.R

/**
 * A [CoordinatorLayout.Behavior] implementation that synchronizes the navbar's y-translation
 * with the top toolbar. This ensures that when the top toolbar scrolls, the navbar at the
 * bottom follows the same translation behavior.
 *
 * @param context [Context] needed for behavior initialization.
 */
class NavbarToolbarSyncBehavior(
    context: Context,
) : CoordinatorLayout.Behavior<View>(context, null) {

    override fun layoutDependsOn(
        parent: CoordinatorLayout,
        child: View,
        dependency: View,
    ): Boolean {
        return dependency.id == R.id.composable_toolbar
    }

    override fun onDependentViewChanged(
        parent: CoordinatorLayout,
        child: View,
        dependency: View,
    ): Boolean {
        if (!child.isVisible) {
            return false
        }

        child.translationY = -dependency.translationY
        return true
    }
}
