/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.compose

import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import mozilla.components.browser.state.state.TabSessionState

/**
 * Data class containing only the necessary data from
 * [TabSessionState] to display a tab's thumbnail so the entire [TabSessionState] need not be passed.
 *
 * @property tabId: The tab's id
 * @property isPrivate: Is the tab private?
 * @property tabUrl: The tab's URL
 * @property tabIcon: The tab's icon
 */
data class TabThumbnailImageData(
    val tabId: String,
    val isPrivate: Boolean,
    val tabUrl: String,
    val tabIcon: ImageBitmap?,
)

/**
 * Extension function that returns a subset of [TabSessionState] containing
 * only the necessary data to display a tab's thumbnail image data.
 */
fun TabSessionState.thumbnailImageData(): TabThumbnailImageData {
    return TabThumbnailImageData(
        tabId = this.id,
        isPrivate = this.content.private,
        tabUrl = this.content.url,
        tabIcon = this.content.icon?.asImageBitmap(),
    )
}
