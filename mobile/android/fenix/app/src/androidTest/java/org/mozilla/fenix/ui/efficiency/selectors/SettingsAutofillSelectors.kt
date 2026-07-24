/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SettingsAutofillSelectors {
    val SETTINGS_AUTOFILL_TITLE = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR2_BY_TEXT,
        value = "Autofill",
        description = "The Autofill Settings title",
        groups = listOf("requiredForPage"),
    )

    val AUTOFILL_ADDRESSES_TOGGLE = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_ID,
        value = "autofill_addresses_toggle",
        description = "Autofill Addresses Toggle",
        groups = listOf("autofillSettings"),
    )

    val all = listOf(
        SETTINGS_AUTOFILL_TITLE,
        AUTOFILL_ADDRESSES_TOGGLE,
    )
}
