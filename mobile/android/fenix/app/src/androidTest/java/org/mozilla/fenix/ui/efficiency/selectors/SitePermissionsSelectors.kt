/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SitePermissionsSelectors {

    val PAGE_PERMISSION_DIALOG_ALLOW_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID,
        value = "allow_button",
        description = "Permission dialog allow button",
        groups = listOf("requiredForPage"),
    )

    val MICROPHONE_PERMISSION_PROMPT = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT_CONTAINS,
        value = "to use your microphone?",
        description = "Microphone permission prompt",
        groups = listOf(),
    )

    val PAGE_PERMISSION_REMEMBER_DECISION_CHECKBOX = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID,
        value = "do_not_ask_again",
        description = "Remember permission decision checkbox",
        groups = listOf(),
    )

    val PAGE_PERMISSION_DIALOG_DENY_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID,
        value = "deny_button",
        description = "Permission dialog deny button",
        groups = listOf(),
    )

    val all = listOf(
        PAGE_PERMISSION_DIALOG_ALLOW_BUTTON,
    )
}
