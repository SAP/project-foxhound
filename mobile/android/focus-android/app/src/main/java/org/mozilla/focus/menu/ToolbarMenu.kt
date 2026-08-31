/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.menu

import mozilla.components.browser.menu.BrowserMenuBuilder
import mozilla.components.browser.menu.item.BrowserMenuItemToolbar

/**
 * Interface representing the toolbar menu in the application.
 *
 * This interface defines the structure and behavior of the toolbar menu,
 * including its items and related components.
 */
interface ToolbarMenu {
    /**
     * Interface representing an item in the Focus toolbar menu.
     *
     * This interface serves as a marker for items that can be included
     * in the Focus toolbar menu.
     */
    interface FocusMenuItem

    /**
     * Represents the items available in the toolbar menu.
     *
     * This sealed class defines all possible actions that can be
     * present in the browser tab toolbar menu.
     */
    sealed class Item : FocusMenuItem {
        /** Toggles desktop site mode. */
        data class RequestDesktop(val isChecked: Boolean) : Item()

        /** Reloads the current page. */
        object Reload : Item()

        /** Navigates to the previous page. */
        object Back : Item()

        /** Navigates to the next page. */
        object Forward : Item()

        /** Shares the current page. */
        object Share : Item()

        /** Adds the current page to shortcuts. */
        object AddToShortcuts : Item()

        /** Removes the current page from shortcuts. */
        object RemoveFromShortcuts : Item()

        /** Finds text within the current page. */
        object FindInPage : Item()

        /** Adds the current page to the home screen. */
        object AddToHomeScreen : Item()

        /** Opens the current page in an external app. */
        object OpenInApp : Item()

        /** Opens the application settings. */
        object Settings : Item()

        /** Stops the current page from loading. */
        object Stop : Item()
    }

    /**
     * Represents the menu items specific to the custom tab feature.
     *
     * This sealed class defines the available menu items when Focus is used
     * as a custom tab.
     */
    sealed class CustomTabItem : FocusMenuItem {
        /** Toggles desktop site mode for the custom tab. */
        data class RequestDesktop(val isChecked: Boolean) : CustomTabItem()

        /** Reloads the current page in the custom tab. */
        object Reload : CustomTabItem()

        /** Stops the current page from loading in the custom tab. */
        object Stop : CustomTabItem()

        /** Navigates to the previous page in the custom tab. */
        object Back : CustomTabItem()

        /** Navigates to the next page in the custom tab. */
        object Forward : CustomTabItem()

        /** Finds text within the current page in the custom tab. */
        object FindInPage : CustomTabItem()

        /** Adds the current page in the custom tab to the home screen. */
        object AddToHomeScreen : CustomTabItem()

        /** Opens the current page from the custom tab in the main browser. */
        object OpenInBrowser : CustomTabItem()

        /** Opens the current page from the custom tab in an external app. */
        object OpenInApp : CustomTabItem()
    }

    val menuBuilder: BrowserMenuBuilder
    val menuToolbar: BrowserMenuItemToolbar
}
