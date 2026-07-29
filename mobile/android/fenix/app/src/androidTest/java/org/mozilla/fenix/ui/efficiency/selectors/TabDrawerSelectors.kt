/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object TabDrawerSelectors {

    val NORMAL_BROWSING_OPEN_TABS_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = TabsTrayTestTag.NORMAL_TABS_PAGE_BUTTON,
        description = "Normal browsing tabs tray button",
        groups = listOf("requiredForPage"),
    )

    val SYNCED_TABS_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = TabsTrayTestTag.SYNCED_TABS_PAGE_BUTTON,
        description = "Synced tabs button",
        groups = listOf("requiredForPage"),
    )

    val SIGN_IN_TO_SYNC_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.tab_manager_empty_synced_tabs_page_sign_in_cta),
        description = "Sign in to sync button",
        groups = listOf("tabDrawerUnauthenticatedSyncedTabs"),
    )

    val UNAUTHENTICATED_SYNCED_TABS_PAGE = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = TabsTrayTestTag.UNAUTHENTICATED_SYNCED_TABS_PAGE,
        description = "Unauthenticated synced tabs page",
        groups = listOf("tabDrawerUnauthenticatedSyncedTabs"),
    )

    val UNAUTHENTICATED_SYNCED_TABS_PAGE_HEADER = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT_CONTAINS,
        value = getStringResource(R.string.tab_manager_empty_synced_tabs_page_header),
        description = "Unauthenticated synced tabs page header",
        groups = listOf("tabDrawerUnauthenticatedSyncedTabs"),
    )

    val UNAUTHENTICATED_SYNCED_TABS_PAGE_DESCRIPTION = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT_CONTAINS,
        value = getStringResource(R.string.tab_manager_empty_synced_tabs_page_description),
        description = "Unauthenticated synced tabs page description",
        groups = listOf("tabDrawerUnauthenticatedSyncedTabs"),
    )

    val PRIVATE_TABS_PAGE_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = TabsTrayTestTag.PRIVATE_TABS_PAGE_BUTTON,
        description = "Private browsing tabs tray button",
        groups = listOf("requiredForPage"),
    )

    val TAB_GROUPS_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = TabsTrayTestTag.TAB_GROUPS_PAGE_BUTTON,
        description = "Tab groups button",
        groups = listOf("requiredForPage"),
    )

    val THREE_DOT_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = TabsTrayTestTag.THREE_DOT_BUTTON,
        description = "Three dot menu button",
        groups = listOf("requiredForPage"),
    )

    val FAB = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = TabsTrayTestTag.FAB,
        description = "Floating action button",
        groups = listOf("requiredForPage"),
    )

    val PRIVATE_TABS_LIST = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = TabsTrayTestTag.PRIVATE_TABS_LIST,
        description = "Private tabs list",
        groups = listOf("privateTabsList"),
    )

    val TAB_ITEM_CLOSE = Selector(
        strategy = SelectorStrategy.COMPOSE_ON_ALL_NODES_BY_TAG_ON_FIRST,
        value = TabsTrayTestTag.TAB_ITEM_CLOSE,
        description = "Tab close button",
        groups = listOf("tabItem"),
    )

    val TAB_ITEM_THUMBNAIL = Selector(
        strategy = SelectorStrategy.COMPOSE_ON_ALL_NODES_BY_TAG_ON_FIRST,
        value = TabsTrayTestTag.TAB_ITEM_THUMBNAIL,
        description = "Tab thumbnail",
        groups = listOf("tabItem"),
    )

    val all = listOf(
        NORMAL_BROWSING_OPEN_TABS_BUTTON,
        SYNCED_TABS_BUTTON,
        SIGN_IN_TO_SYNC_BUTTON,
        UNAUTHENTICATED_SYNCED_TABS_PAGE,
        UNAUTHENTICATED_SYNCED_TABS_PAGE_HEADER,
        UNAUTHENTICATED_SYNCED_TABS_PAGE_DESCRIPTION,
        PRIVATE_TABS_PAGE_BUTTON,
        TAB_GROUPS_BUTTON,
        THREE_DOT_BUTTON,
        FAB,
        PRIVATE_TABS_LIST,
        TAB_ITEM_CLOSE,
        TAB_ITEM_THUMBNAIL,
    )
}
