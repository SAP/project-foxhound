/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SettingsTurnOnSyncSelectors {

    val USE_EMAIL_INSTEAD_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID,
        value = "signInEmailButton",
        description = "Use email instead button",
        groups = listOf("requiredForPage"),
    )

    val READY_TO_SCAN_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID,
        value = "signInScanButton",
        description = "Use email instead button",
        groups = listOf("requiredForPage"),
    )

    val all = listOf(
        USE_EMAIL_INSTEAD_BUTTON,
        READY_TO_SCAN_BUTTON,
    )
}
