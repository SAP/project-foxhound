/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.state

/**
 * The different pages in the Tab Manager.
 */
enum class Page {

    /**
     * The page that displays normal tabs.
     */
    NormalTabs,

    /**
     * The page that displays private tabs.
     */
    PrivateTabs,

    /**
     * The page that displays Tab Groups.
     */
    TabGroups,

    /**
     * The page that displays Synced Tabs.
     */
    SyncedTabs,
    ;

    companion object {
        /**
         * Returns the visible [Page]s in tray order.
         *
         * @param shouldShowTabGroupsPage Whether the tab groups page should be included.
         */
        fun visiblePages(shouldShowTabGroupsPage: Boolean): List<Page> =
            listOfNotNull(
                PrivateTabs,
                NormalTabs,
                TabGroups.takeIf { shouldShowTabGroupsPage },
                SyncedTabs,
            )

        /**
         * Returns the [Page] that corresponds to the [position].
         *
         * @param position The index of the page.
         * @param shouldShowTabGroupsPage Whether the tab groups page should be included.
         */
        fun positionToPage(position: Int, shouldShowTabGroupsPage: Boolean = false): Page {
            return when {
                position == 0 -> PrivateTabs
                position == 1 -> NormalTabs
                shouldShowTabGroupsPage && position == 2 -> TabGroups
                else -> SyncedTabs
            }
        }

        /**
         * Returns the visual index that corresponds to the [page].
         *
         * @param page The [Page] whose visual index is being looked-up.
         * @param shouldShowTabGroupsPage Whether the tab groups page should be included.
         */
        fun pageToPosition(page: Page, shouldShowTabGroupsPage: Boolean = false): Int {
            return when (page) {
                PrivateTabs -> 0
                NormalTabs -> 1
                TabGroups -> if (shouldShowTabGroupsPage) 2 else 1
                SyncedTabs -> visiblePages(shouldShowTabGroupsPage).lastIndex
            }
        }
    }
}
