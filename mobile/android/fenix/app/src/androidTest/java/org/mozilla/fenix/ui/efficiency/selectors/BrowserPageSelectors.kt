/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.R
import org.mozilla.fenix.compose.snackbar.SNACKBAR_BUTTON_TEST_TAG
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object BrowserPageSelectors {
    val ENGINE_VIEW = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID,
        value = "engineView",
        description = "Engine view",
        groups = listOf("requiredForPage"),
    )

    val PAGE_CONTENT = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = "mozilla",
        description = "Page content",
        groups = listOf(""),
    )

    val SNACKBAR_EDIT_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = SNACKBAR_BUTTON_TEST_TAG,
        description = "Snackbar Edit button",
        groups = listOf("snackbar"),
    )

    val MAIN_MENU_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_DESCRIPTION_CONTAINS,
        value = getStringResource(R.string.content_description_menu),
        description = "Three Dot Menu",
        groups = listOf("requiredForPage"),
    )

    val all = listOf(
        ENGINE_VIEW,
        PAGE_CONTENT,
        SNACKBAR_EDIT_BUTTON,
        MAIN_MENU_BUTTON,
    )
}
