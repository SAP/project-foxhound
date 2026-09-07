/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate.lens

/**
 * The state of the Google Lens image search feature.
 *
 * @property isRequesting Whether a Lens image upload has been requested.
 * @property inProgress Whether a Lens image upload is currently in progress.
 * @property resultUrl The URL of the Lens results page, if available.
 * @property pendingImageUrl When non-null, a Lens request was initiated with an already-known
 * image URL (e.g. from the image context menu) rather than via the camera flow.
 */
data class LensState(
    val isRequesting: Boolean,
    val inProgress: Boolean,
    val resultUrl: String?,
    val pendingImageUrl: String? = null,
) {
    companion object {
        val DEFAULT = LensState(
            isRequesting = false,
            inProgress = false,
            resultUrl = null,
            pendingImageUrl = null,
        )
    }
}
