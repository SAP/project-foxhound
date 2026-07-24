/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object ReaderViewSelectors {

    val APPEARANCE_FONT_SANS_SERIF = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_ID,
        value = "mozac_feature_readerview_font_sans_serif",
        description = "Sans serif font button",
        groups = listOf("requiredForPage"),
    )

    val all = listOf(
        APPEARANCE_FONT_SANS_SERIF,
    )
}
