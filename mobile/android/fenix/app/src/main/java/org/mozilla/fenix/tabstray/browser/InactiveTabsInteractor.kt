/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.browser

import org.mozilla.fenix.tabstray.data.TabsTrayItem

/**
 * Interactor for all things related to inactive tabs in the tabs tray.
 */
interface InactiveTabsInteractor {
    /**
     * Invoked when the inactive tabs header is clicked.
     *
     * @param expanded true when the tap should expand the inactive section.
     */
    fun onInactiveTabsHeaderClicked(expanded: Boolean)

    /**
     * Invoked when an inactive tab is clicked.
     *
     * @param tab [TabsTrayItem.Tab] that was clicked.
     */
    fun onInactiveTabClicked(tab: TabsTrayItem.Tab)

    /**
     * Invoked when an inactive tab is closed.
     *
     * @param tab [TabsTrayItem.Tab] that was closed.
     */
    fun onInactiveTabClosed(tab: TabsTrayItem.Tab)

    /**
     * Invoked when the user clicks on the delete all inactive tabs button.
     */
    fun onDeleteAllInactiveTabsClicked()

    /**
     * Invoked when the user clicks the close button in the auto close dialog.
     */
    fun onAutoCloseDialogCloseButtonClicked()

    /**
     * Invoked when the user clicks to enable the inactive tab auto-close feature.
     */
    fun onEnableAutoCloseClicked()
}
