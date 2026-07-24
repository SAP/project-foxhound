/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SettingsPrivateBrowsingSelectors {

    val ADD_PRIVATE_BROWSING_SHORTCUT = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_TEXT,
        value = "Add private browsing shortcut",
        description = "Add private browsing shortcut button",
        groups = listOf("requiredForPage"),
    )

    val all = listOf(
        ADD_PRIVATE_BROWSING_SHORTCUT,
    )
}
