/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.llm.mlpa.service.ext

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.channelFlow
import kotlinx.coroutines.flow.filterNot
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import mozilla.components.concept.fetch.Response
import mozilla.components.concept.llm.Llm
import mozilla.components.lib.llm.mlpa.service.BudgetExceeded
import mozilla.components.lib.llm.mlpa.service.ChatService
import mozilla.components.lib.llm.mlpa.service.RateLimitResponseParseError
import mozilla.components.lib.llm.mlpa.service.RateLimited
import mozilla.components.lib.llm.mlpa.service.ServerError
import kotlin.collections.joinToString

private const val DATA_PREFIX = "data: "
private const val END_OF_STREAM_MARKER = "[DONE]"

/**
 * A [Flow] of content strings parsed from a server-sent events (SSE) stream in this [Response].
 *
 * Lines are filtered, stripped of the `data: ` prefix, deserialized as [Event] objects, and
 * mapped to their text content.
 */
internal fun Response.contentFlow(retryAfter: Long?): Flow<String> = lineFlow
        .filterNot { it.isEmpty() || it.contains(END_OF_STREAM_MARKER) }
        .map { it.drop(DATA_PREFIX.length) }
        .events(retryAfter)
        .content()

private val Response.lineFlow get() = channelFlow {
    body.useBufferedReader { reader ->
        reader.lineSequence().forEach { line ->
            trySend(line)
        }
    }
}

private fun Flow<String>.events(retryAfter: Long?): Flow<Event> {
    val json = Json {
        ignoreUnknownKeys = true
    }
    return map { line ->
        try {
            json.decodeFromString(line)
        } catch (e: SerializationException) {
            throw json.rateLimitDetailedError(line, retryAfter)
        }
    }
}

private fun Flow<Event>.content() = map {
    it.choices.joinToString { choice -> choice.content }
}

internal fun Json.rateLimitDetailedError(serialized: String, retryAfter: Long?): Llm.Exception = try {
    val rateLimitStatus = 429
    when (this.decodeFromString<ChatService.ResponseErrorCode>(serialized).error) {
        1 -> BudgetExceeded(retryAfter)
        2 -> RateLimited(retryAfter)
        else -> ServerError(rateLimitStatus)
    }
} catch (e: SerializationException) {
    RateLimitResponseParseError(e)
}

@Serializable
private data class Event(val id: String, val created: Long, val choices: List<Choice>) {
    @Serializable
    data class Choice(val index: Int, val delta: Delta) {
        val content get() = delta.content

        @Serializable
        data class Delta(val content: String = "")
    }
}
