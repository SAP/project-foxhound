/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.summarize.content

import kotlinx.coroutines.suspendCancellableCoroutine
import mozilla.components.concept.engine.EngineSession
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Gets the content for a given engine session.
 */
internal suspend fun EngineSession.getPageContent(): Result<String> = runCatching {
    val content: String = suspendCancellableCoroutine { continuation ->
        getPageContent(
            onResult = { content ->
                continuation.resume(content)
            },
            onException = { error ->
                continuation.resumeWithException(error)
            },
        )
    }

    return Result.success(content)
}
