/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy
import mozilla.components.feature.downloads.R as downloadsR

object DownloadsSelectors {

    val NAVIGATE_BACK_TOOLBAR_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_CONTENT_DESCRIPTION,
        value = getStringResource(R.string.download_navigate_back_description),
        description = "Navigate back toolbar button",
        groups = listOf("requiredForPage"),
    )

    val EMPTY_DOWNLOADS_MESSAGE = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.download_empty_message_2),
        description = "No downloads yet message",
        groups = listOf("emptyDownloads"),
    )

    val EMPTY_DOWNLOADS_DESCRIPTION = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.download_empty_description),
        description = "Files you download will appear here description",
        groups = listOf("emptyDownloads"),
    )

    val DOWNLOAD_DIALOG_CONFIRM_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(downloadsR.string.mozac_feature_downloads_dialog_download),
        description = "Download dialog confirm button",
        groups = listOf(),
    )

    val DOWNLOAD_COMPLETE_SNACKBAR = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.download_completed_snackbar),
        description = "Download complete snackbar",
        groups = listOf(),
    )

    val all = listOf(
        NAVIGATE_BACK_TOOLBAR_BUTTON,
        EMPTY_DOWNLOADS_MESSAGE,
        EMPTY_DOWNLOADS_DESCRIPTION,
    )
}
