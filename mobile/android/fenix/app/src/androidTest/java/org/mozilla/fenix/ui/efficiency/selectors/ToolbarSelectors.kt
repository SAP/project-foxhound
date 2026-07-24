/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.ADDRESSBAR_URL_BOX
import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.TABS_COUNTER
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
        strategy = SelectorStrategy.COMPOSE_ON_ALL_NODES_BY_TAG_ON_LAST,
        value = ADDRESSBAR_URL_BOX,
        description = "URL box",
        groups = listOf("requiredForPage"),
    )

    val all = listOf(
        TOOLBAR,
        TAB_COUNTER,
        TOOLBAR_URL_BOX,
    )
}
