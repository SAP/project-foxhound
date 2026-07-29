/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SettingsPasswordsSelectors {

    val GO_BACK_BUTTON = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_CONTENT_DESC,
        value = "Navigate up",
        description = "the Back Arrow button",
        groups = listOf("requiredForPage"),
    )

    val SETTINGS_PASSWORDS_TITLE = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = "Passwords",
        description = "The Passwords Settings title",
        groups = listOf("requiredForPage"),
    )

    val SAVE_PASSWORDS_TOGGLE = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_ID,
        value = "save_passwords_toggle",
        description = "Save Passwords Toggle",
        groups = listOf("passwordSettings"),
    )

    val SAVE_PASSWORDS_OPTION = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_TEXT,
        value = "Save passwords",
        description = "Save Passwords Option",
        groups = listOf("requiredForPage"),
    )

    val SAVED_PASSWORDS_OPTION = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_TEXT,
        value = "Saved passwords",
        description = "Saved Passwords Option",
        groups = listOf("requiredForPage"),
    )

    val all = listOf(
        GO_BACK_BUTTON,
        SETTINGS_PASSWORDS_TITLE,
        SAVE_PASSWORDS_TOGGLE,
        SAVE_PASSWORDS_OPTION,
        SAVED_PASSWORDS_OPTION,
    )
}
