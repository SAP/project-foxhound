/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.toolbar.concept

import mozilla.components.compose.browser.toolbar.BrowserToolbar

/**
 * Test tags for the [BrowserToolbar] composable.
 */
object BrowserToolbarTestTags {
    const val MINIMAL_ADDRESS_BAR = "MINIMAL_ADDRESS_BAR"

    /**
     * Test tag for the website origin box while in "display" mode.
     */
    const val ADDRESSBAR_URL_BOX = "ADDRESSBAR_URL_BOX"

    /**
     * Test tag for the title shown while in "display" mode.
     * Webpage title is shown (if available) in custom tabs.
     */
    const val ADDRESSBAR_TITLE = "ADDRESSBAR_TITLE"

    /**
     * Test tag for the search term / URL shown while in "display" mode.
     */
    const val ADDRESSBAR_URL = "ADDRESSBAR_URL"

    /**
     * Test tag for the page load progress bar.
     */
    const val ADDRESSBAR_PROGRESSBAR = "ADDRESSBAR_PROGRESSBAR"

    /**
     * Test tag for the unified search selector.
     */
    const val SEARCH_SELECTOR = "SEARCH_SELECTOR"

    /**
     * Test tag for tabs counter button shown in the toolbar while in "display" mode.
     */
    const val TABS_COUNTER = "ADDRESSBAR_TABS_COUNTER"

    /**
     * Test tag for the toolbar while in "edit" mode.
     * Useful for entering text to search or an URL to load.
     */
    const val ADDRESSBAR_SEARCH_BOX = "ADDRESSBAR_SEARCH_BOX"
}
