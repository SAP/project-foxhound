/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.menu.home

/**
 * Represents the items in the home screen menu.
 */
sealed class HomeMenuItem {
    /**
     * Menu item for the help screen.
     */
    object Help : HomeMenuItem()

    /**
     * Menu item for the settings screen.
     */
    object Settings : HomeMenuItem()
}
