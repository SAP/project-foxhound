/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.nimbus

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.mozilla.experiments.nimbus.NimbusEventStore
import org.mozilla.fenix.nimbus.RecordEventMode.Cancel
import org.mozilla.fenix.nimbus.RecordEventMode.CompleteSuccessfully
import org.mozilla.fenix.nimbus.RecordEventMode.ThrowException

enum class RecordEventMode {
    CompleteSuccessfully, ThrowException, Cancel
}

/**
 * A [NimbusEventStore] implementation for unit test. Allows asserting conditions on recorded events.
 */
class FakeNimbusEventStore : NimbusEventStore {
    var recordEventMode = CompleteSuccessfully
    private val recordedEvents = mutableListOf<String>()
    private val pastEvents = mutableListOf<PastEvent>()

    /**
     * @see [NimbusEventStore.recordEvent]
     */
    override fun recordEvent(count: Long, eventId: String) {
        if (recordEventMode == CompleteSuccessfully) {
            repeat(count) {
                recordedEvents += eventId
            }
        } else {
            // [NimbusEventStore.recordEvent] catches all errors and swallows them.
        }
    }

    override fun recordEventOrThrow(count: Long, eventId: String): Deferred<Unit> {
        recordEvent(count, eventId)
        return when (recordEventMode) {
            CompleteSuccessfully -> CompletableDeferred(Unit)
            ThrowException -> CompletableDeferred<Unit>().apply { completeExceptionally(RuntimeException()) }
            Cancel -> CompletableDeferred<Unit>().apply { cancel() }
        }
    }

    /**
     * Asserts that recorded events are exactly equal to [events] (including order).
     */
    fun assertRecorded(vararg events: String) {
        assertEquals(events.asList(), recordedEvents)
    }

    /**
     * @see [NimbusEventStore.recordPastEvent]
     */
    override fun recordPastEvent(count: Long, eventId: String, secondsAgo: Long) {
        repeat(count) {
            pastEvents += PastEvent(eventId, secondsAgo)
        }
    }

    /**
     * Asserts that there were no recorded past events.
     */
    fun assertNoPastEvents() {
        assertTrue(pastEvents.isEmpty())
    }

    /**
     * Records that there was only a single recorded past event and it matches [eventId] and [secondsAgo].
     */
    fun assertSinglePastEventEquals(eventId: String, secondsAgo: Long) {
        val event = pastEvents.single()
        assertEquals(eventId, event.eventId)
        assertEquals(secondsAgo, event.secondsAgo)
    }

    /**
     * Represents an event recorded with [recordPastEvent].
     */
    data class PastEvent(
        val eventId: String,
        val secondsAgo: Long,
    )

    /**
     * Like [kotlin.repeat], but accepts [Long].
     */
    private inline fun repeat(times: Long, action: (Long) -> Unit) {
        for (index in 0 until times) {
            action(index)
        }
    }
}
