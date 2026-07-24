/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SettingsHTTPSOnlyModeSelectors {

    val HTTPS_MODE_OPTION_SUMMARY = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_TEXT,
        value = "Automatically attempts to connect to sites using HTTPS encryption protocol for increased security. Learn more",
        description = "HTTPS only mode option summary",
        groups = listOf("requiredForPage"),
    )

    val all = listOf(
        HTTPS_MODE_OPTION_SUMMARY,
    )
}
