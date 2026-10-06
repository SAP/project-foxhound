/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SiteSecuritySelectors {

    val CLEAR_COOKIES_AND_SITE_DATA_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID,
        value = "clearSiteData",
        description = "Clear cookies and site date quick settings sheet button",
        groups = listOf("requiredForPage"),
    )

    val ETP_QUICK_SETTINGS_SHEET = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID,
        value = "trackingProtectionLayout",
        description = "Enhanced tracking protection section from quick settings sheet",
        groups = listOf("requiredForPage"),
    )

    val all = listOf(
        CLEAR_COOKIES_AND_SITE_DATA_BUTTON,
        ETP_QUICK_SETTINGS_SHEET,
    )
}
