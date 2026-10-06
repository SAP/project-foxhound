/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.ADDRESSBAR_URL_BOX
import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.TABS_COUNTER
import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object ToolbarSelectors {
    val TOOLBAR = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID,
        value = "composable_toolbar",
        description = "Toolbar",
        groups = listOf("requiredForPage"),
    )

    val TAB_COUNTER = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = TABS_COUNTER,
        description = "Tab counter button",
        groups = listOf("requiredForPage"),
    )

    val TOOLBAR_URL_BOX = Selector(
        strategy = SelectorStrategy.COMPOSE_ON_ALL_NODES_BY_TAG_ON_FIRST,
        value = ADDRESSBAR_URL_BOX,
        description = "URL box",
        groups = listOf("requiredForPage"),
    )

    // Use UIAutomator when navigating from BrowserPage — avoids Compose sync hanging when GeckoView is active.
    val TOOLBAR_URL_BOX_UIAUTOMATOR = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_COMPOSE_TAG,
        value = ADDRESSBAR_URL_BOX,
        description = "URL box",
        groups = listOf(),
    )

    val TAB_COUNTER_UIAUTOMATOR = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_COMPOSE_TAG,
        value = TABS_COUNTER,
        description = "Tab counter button",
        groups = listOf(),
    )

    val NEW_TAB_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_DESCRIPTION_CONTAINS,
        value = "New tab",
        description = "New tab button",
        groups = listOf(),
    )

    @Suppress("ktlint:standard:function-naming", "FunctionName")
    fun SEARCH_ENGINE_SELECTOR_ICON(searchEngineName: String = "") = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_CONTENT_DESCRIPTION,
        value = getStringResource(R.string.search_engine_selector_content_description, searchEngineName),
        description = "Search engine selector icon",
        groups = listOf("homeScreenToolbar"),
    )

    val SITE_INFORMATION_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_CONTENT_DESCRIPTION,
        value = "Site information",
        description = "Site information button",
        groups = listOf("browserViewToolbarItems"),
    )

    val all = listOf(
        TOOLBAR,
        TAB_COUNTER,
        TAB_COUNTER_UIAUTOMATOR,
        TOOLBAR_URL_BOX,
        TOOLBAR_URL_BOX_UIAUTOMATOR,
        NEW_TAB_BUTTON,
        SEARCH_ENGINE_SELECTOR_ICON(),
        SITE_INFORMATION_BUTTON,
    )
}
