/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.request.RequestInterceptor
import org.mozilla.fenix.utils.Stories.isUrlOfInternallyOpenedStory
import org.mozilla.fenix.utils.Stories.syncInternallyOpenedStoryMarker

/**
 * [RequestInterceptor] that will synchronize the application specific story UTM parameters
 * between previous and new loaded URL in case of redirect requests.
 */
class PersistStoryUTMRequestInterceptor : RequestInterceptor {
    override fun onLoadRequest(
        engineSession: EngineSession,
        uri: String,
        lastUri: String?,
        hasUserGesture: Boolean,
        isSameDomain: Boolean,
        isRedirect: Boolean,
        isDirectNavigation: Boolean,
        isSubframeRequest: Boolean,
    ): RequestInterceptor.InterceptionResponse? {
        val isInternalStory = lastUri?.isUrlOfInternallyOpenedStory() == true

        return when (isRedirect && !isSubframeRequest && isInternalStory) {
            true -> {
                val syncedUrl = uri.syncInternallyOpenedStoryMarker(lastUri)
                RequestInterceptor.InterceptionResponse.Url(syncedUrl)
            }

            else -> null
        }
    }
}
