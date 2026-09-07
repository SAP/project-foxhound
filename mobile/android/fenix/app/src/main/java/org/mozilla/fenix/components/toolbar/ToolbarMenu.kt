/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.toolbar

interface ToolbarMenu {
    sealed class Item {
        object Settings : Item()
        data class RequestDesktop(val isChecked: Boolean) : Item()

        /**
         * Opens the current private tabs in a regular tab.
         */
        object OpenInRegularTab : Item()
        object FindInPage : Item()

        /**
         * Opens the translations flow.
         */
        object Translate : Item()
        object Share : Item()
        data class Back(
            val viewHistory: Boolean,
            val isOnToolbar: Boolean = false,
            val isCustomTab: Boolean = false,
        ) : Item()
        data class Forward(
            val viewHistory: Boolean,
            val isOnToolbar: Boolean = false,
            val isCustomTab: Boolean = false,
        ) : Item()
        data class Reload(val bypassCache: Boolean) : Item()
        object Stop : Item()
        data class OpenInFenix(
            val isOnToolbar: Boolean = false,
        ) : Item()
        object SaveToCollection : Item()

        /**
         * Prints the currently displayed page content.
         */
        object PrintContent : Item()
        object AddToTopSites : Item()
        object RemoveFromTopSites : Item()
        object InstallPwaToHomeScreen : Item()
        object AddToHomeScreen : Item()
        object AddonsManager : Item()
        object Quit : Item()
        object OpenInApp : Item()
        object SetDefaultBrowser : Item()
        object Bookmark : Item()
        object CustomizeReaderView : Item()
        object Bookmarks : Item()
        object History : Item()

        /**
         * Opens the Web Compat Reporter feature.
         */
        object ReportBrokenSite : Item()

        /**
         * The Passwords menu item
         */
        object Passwords : Item()
        object Downloads : Item()
        object NewTab : Item()
    }
}
