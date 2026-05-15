/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.navigation

import org.mozilla.fenix.tabstray.ui.tabsearch.TabSearchScreen
import org.mozilla.fenix.tabstray.ui.tabstray.TabsTray

/**
 * Destinations the user can visit within the Tab Manager
 */
sealed interface TabManagerNavDestination {

    /**
     * [TabManagerNavDestination] representing the root screen of the Tab Manager, [TabsTray], where
     * users access their tabs.
     */
    data object Root : TabManagerNavDestination

    /**
     * [TabManagerNavDestination] representing the [TabSearchScreen].
     */
    data object TabSearch : TabManagerNavDestination
}
