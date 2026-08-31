/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.data

import android.graphics.Bitmap
import androidx.compose.ui.graphics.asImageBitmap
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.isActive
import mozilla.components.compose.base.theme.layout.AcornWindowSize
import mozilla.components.concept.engine.utils.ABOUT_HOME_URL
import org.mozilla.fenix.compose.TabThumbnailImageData
import org.mozilla.fenix.ext.maxActiveTime
import org.mozilla.fenix.tabstray.ext.toDisplayTitle
import java.util.UUID

private const val SMALL_WINDOW_FULL_EXPAND_TAB_COUNT = 4
private const val MEDIUM_LARGE_WINDOW_FULL_EXPAND_TAB_COUNT = 8

/**
 * Data entity representing items in the Tabs Tray.
 *
 * @property id The ID of the item.
 * @property isHomepageItem Whether the entity represents a Homepage item.
 * @property isFocused Whether the entity is focused.
 */
sealed class TabsTrayItem(
    open val id: String,
    val isHomepageItem: Boolean,
    open val isFocused: Boolean,
) {
    /**
     * Data entity representing a tab in the Tabs Tray.
     *
     * @property id The ID of the item.
     * @property url The URL of the tab.
     * @property title The tab's display-friendly title.
     * @property inactive Whether the tab is inactive.
     * @property private Whether the tab is private.
     * @property icon The bitmap of the tab's favicon.
     * @property lastAccess The last time this tab was accessed.
     * @property isFocused Whether the tab is focused. This is only set when the tab data model is generated.
     */
    data class Tab(
        override val id: String,
        val url: String,
        val title: String,
        val inactive: Boolean,
        val private: Boolean,
        val icon: Bitmap?,
        val lastAccess: Long,
        override val isFocused: Boolean,
    ) : TabsTrayItem(
        id = id,
        isFocused = isFocused,
        isHomepageItem = url.equals(ABOUT_HOME_URL, ignoreCase = true),
    ) {
        constructor(
            tab: TabSessionState,
            isFocused: Boolean = false,
        ) : this(
            id = tab.id,
            url = tab.content.url,
            title = tab.toDisplayTitle(),
            inactive = !tab.isActive(maxActiveTime = maxActiveTime),
            private = tab.content.private,
            icon = tab.content.icon,
            lastAccess = tab.lastAccess,
            isFocused = isFocused,
        )

        /**
         * Constructs a [TabThumbnailImageData] from the given tab data
         */
        fun toThumbnailImageData(): TabThumbnailImageData = TabThumbnailImageData(
            tabId = id,
            isPrivate = private,
            tabUrl = url,
            tabIcon = icon?.asImageBitmap(),
        )
    }

    /**
     * Data entity representing a tab group in the Tabs Tray.
     *
     * @property id The group's ID.
     * @property title The group's display title.
     * @property theme The group's [TabGroupTheme].
     * @property tabs The set of [Tab]s within the group.
     * @property closed Whether the group is closed and does not appear in the main tab item list.
     * @property lastModified Timestamp indicating the last time this group was updated.
     * @property isFocused Whether the tab is focused. This is only set when the tab data model is generated.
     * @property initialScrollIndex The index to open the tab group to when first expanded. This is only set when the
     * tab data model is generated.
     */
    data class TabGroup(
        override val id: String = UUID.randomUUID().toString(),
        val title: String,
        val theme: TabGroupTheme,
        val tabs: MutableList<Tab>,
        val closed: Boolean = false,
        val lastModified: Long = 0L,
        override var isFocused: Boolean = false,
        var initialScrollIndex: Int = 0,
    ) : TabsTrayItem(
        id = id,
        isHomepageItem = false,
        isFocused = isFocused,
    ) {
        /**
         * Retrieves the thumbnail image data for the first 4 tabs in the group's tab collection.
         */
        val thumbnails by lazy {
            tabs.take(4).map { it.toThumbnailImageData() }
        }

        /**
         * Helper function to determine whether to fully expand a tab group.
         *
         * @param windowSize The [AcornWindowSize] of the app window.
         */
        fun shouldFullyExpandOnFirstOpen(windowSize: AcornWindowSize): Boolean =
            (windowSize == AcornWindowSize.Small && tabs.size >= SMALL_WINDOW_FULL_EXPAND_TAB_COUNT) ||
                (windowSize.isNotSmall() && tabs.size >= MEDIUM_LARGE_WINDOW_FULL_EXPAND_TAB_COUNT)
    }

    /**
     * @param text The text to search for.
     *
     * @return true if the item contains the given text.
     */
    fun contains(text: String): Boolean {
        return when (this) {
            is Tab -> {
                url.contains(text, ignoreCase = true) ||
                        title.contains(text, ignoreCase = true)
            }
            is TabGroup -> false
        }
    }
}

internal fun createTab(
    url: String,
    id: String = UUID.randomUUID().toString(),
    title: String = "",
    inactive: Boolean = false,
    private: Boolean = false,
    lastAccess: Long = 0L,
    isFocused: Boolean = false,
): TabsTrayItem.Tab = TabsTrayItem.Tab(
    id = id,
    url = url,
    title = title,
    inactive = inactive,
    private = private,
    icon = null,
    lastAccess = lastAccess,
    isFocused = isFocused,
)

internal fun createTabGroup(
    id: String = UUID.randomUUID().toString(),
    title: String = "",
    theme: TabGroupTheme = TabGroupTheme.default,
    tabs: MutableList<TabsTrayItem.Tab> = mutableListOf(),
    closed: Boolean = false,
    lastModified: Long = 0L,
    isFocused: Boolean = false,
    initialScrollIndex: Int = 0,
): TabsTrayItem.TabGroup = TabsTrayItem.TabGroup(
    id = id,
    title = title,
    theme = theme,
    tabs = tabs,
    closed = closed,
    lastModified = lastModified,
    isFocused = isFocused,
    initialScrollIndex = initialScrollIndex,
)

internal fun List<TabsTrayItem>.toTabList(): List<TabsTrayItem.Tab> = flatMap {
    when (it) {
        is TabsTrayItem.Tab -> listOf(it)
        is TabsTrayItem.TabGroup -> it.tabs
    }
}
