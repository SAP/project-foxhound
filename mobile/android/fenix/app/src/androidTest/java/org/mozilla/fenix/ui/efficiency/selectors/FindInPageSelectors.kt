/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object FindInPageSelectors {

    val FIND_IN_PAGE_CLOSE_BUTTON = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_ID,
        value = "find_in_page_close_btn",
        description = "Find in page close button",
        groups = listOf("requiredForPage"),
    )

    val all = listOf(
        FIND_IN_PAGE_CLOSE_BUTTON,
    )
}
