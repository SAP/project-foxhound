/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SettingsAddonsManagerSelectors {

    val NAVIGATE_BACK_TOOLBAR_BUTTON = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_CONTENT_DESC,
        value = "Navigate up",
        description = "Navigate back toolbar button",
        groups = listOf("requiredForPage"),
    )

    val ENABLE_OR_DISABLE_EXTENSION_TOGGLE = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID,
        value = "enable_switch",
        description = "Enable or disable an extension toggle",
        groups = listOf("extensionDetails"),
    )

    val ADD_ONS_LIST = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID,
        value = "add_ons_list",
        description = "Add-ons List",
        groups = listOf("addOns"),
    )

    val all = listOf(
        NAVIGATE_BACK_TOOLBAR_BUTTON,
        ENABLE_OR_DISABLE_EXTENSION_TOGGLE,
        ADD_ONS_LIST,
    )
}
