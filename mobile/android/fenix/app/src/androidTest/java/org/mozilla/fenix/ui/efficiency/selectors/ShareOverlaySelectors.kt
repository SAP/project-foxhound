/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object ShareOverlaySelectors {

    val SAVE_AS_PDF_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID,
        value = "Save as PDF",
        description = "Save as PDF share overlay button",
        groups = listOf("saveAsPDF"),
    )

    val all = listOf(
        SAVE_AS_PDF_BUTTON,
    )
}
