/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray

internal object TabsTrayTraceTag {
    // Trace for the animation from TabManager -> BrowserFragment
    const val TRACE_NAME_ANIMATION_TAB_MANAGER_TO_THUMBNAIL = "TabManagerAnimationState.TabManagerToThumbnail"

    // Trace for the animation from BrowserFragment -> TabManager
    const val TRACE_NAME_ANIMATION_THUMBNAIL_TO_TAB_MANAGER = "TabManagerAnimationState.ThumbnailToTabManager"

    // Trace for Thumbnail image creation
    const val TRACE_THUMBNAIL_IMAGE_CREATION = "ThumbnailImageCreation"
}
