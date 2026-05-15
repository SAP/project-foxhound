/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.widgets.behavior

/**
 * Where the dynamic view dependent on webpage scrolls is placed on the screen.
 */
sealed interface DependencyGravity {
    /**
     * The view is placed at the top of the screen.
     */
    data object Top : DependencyGravity

    /**
     * The view is placed at the bottom of the screen.
     */
    data object Bottom : DependencyGravity
}
