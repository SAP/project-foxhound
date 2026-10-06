/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object RecentlyClosedTabsSelectors {

    val EMPTY_RECENTLY_CLOSED_TABS_LIST = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_ID,
        value = "recently_closed_empty_view",
        description = "Recently closed tabs list",
        groups = listOf("requiredForPage"),
    )

    val all = listOf(
        EMPTY_RECENTLY_CLOSED_TABS_LIST,
    )
}
