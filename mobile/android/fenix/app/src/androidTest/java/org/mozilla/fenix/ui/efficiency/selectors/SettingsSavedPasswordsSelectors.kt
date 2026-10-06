/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SettingsSavedPasswordsSelectors {

    val GO_BACK_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_CONTENT_DESCRIPTION,
        value = getStringResource(R.string.logins_navigate_back_button_content_description),
        description = "Go back toolbar button",
        groups = listOf("requiredForPage"),
    )

    val LOGINS_SECURITY_DIALOG_TITLE = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT_CONTAINS,
        value = getStringResource(R.string.logins_warning_dialog_title_2),
        description = "Logins security dialog title",
        groups = listOf("loginsSecurityDialog"),
    )

    val LOGINS_SECURITY_DIALOG_LATER_BUTTON = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_TEXT,
        value = getStringResource(R.string.logins_warning_dialog_later),
        description = "Logins security dialog later button",
        groups = listOf("loginsSecurityDialog"),
    )

    val EMPTY_SAVED_PASSWORDS_LIST_DESCRIPTION = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.preferences_passwords_saved_logins_description_empty_text_2),
        description = "Save Passwords Toggle",
        groups = listOf("emptySavedPasswordsList"),
    )

    val EMPTY_SAVED_PASSWORDS_LIST_LEARN_MORE_ABOUT_SYNC = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_CONTENT_DESCRIPTION,
        value = "Learn more about sync Links available",
        description = "Save Passwords Toggle",
        groups = listOf("emptySavedPasswordsList"),
    )

    val EMPTY_SAVED_PASSWORDS_LIST_ADD_PASSWORD_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.preferences_logins_add_login_2),
        description = "Add password button",
        groups = listOf("requiredForPage", "emptySavedPasswordsList"),
    )

    val all = listOf(
        GO_BACK_BUTTON,
        LOGINS_SECURITY_DIALOG_TITLE,
        LOGINS_SECURITY_DIALOG_LATER_BUTTON,
        EMPTY_SAVED_PASSWORDS_LIST_DESCRIPTION,
        EMPTY_SAVED_PASSWORDS_LIST_LEARN_MORE_ABOUT_SYNC,
        EMPTY_SAVED_PASSWORDS_LIST_ADD_PASSWORD_BUTTON,
    )
}
