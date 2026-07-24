/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SettingsDeleteBrowsingDataOnQuitSelectors {

    val DELETE_BROWSING_DATA_ON_QUIT_OPTION_SUMMARY = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_TEXT,
        value = "Automatically deletes browsing data when you select “Quit” from the main menu",
        description = "Delete browsing data on quit option summary",
        groups = listOf("requiredForPage"),
    )

    val all = listOf(
        DELETE_BROWSING_DATA_ON_QUIT_OPTION_SUMMARY,
    )
}
