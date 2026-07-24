/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.ADDRESSBAR_SEARCH_BOX
import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.SEARCH_SELECTOR
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SearchBarSelectors {
    val TOOLBAR_IN_EDIT_MODE = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = ADDRESSBAR_SEARCH_BOX,
        description = "Toolbar in edit mode",
        groups = listOf(),
    )

    val URL_TEXT = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID,
        value = "mozac_browser_toolbar_url_view",
        description = "Page URL",
        groups = listOf("requiredForBrowserPage"),
    )

    val SEARCH_ENGINE_SELECTOR = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = SEARCH_SELECTOR,
        description = "Search engine selector button",
        groups = listOf("requiredForPage"),
    )

    val all = listOf(
        TOOLBAR_IN_EDIT_MODE,
        URL_TEXT,
        SEARCH_ENGINE_SELECTOR,
    )
}
