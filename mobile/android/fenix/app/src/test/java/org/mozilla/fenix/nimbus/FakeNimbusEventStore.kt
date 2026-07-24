/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.nimbus

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.mozilla.experiments.nimbus.NimbusEventStore

/**
 * A [NimbusEventStore] implementation for unit test. Allows asserting conditions on recorded events.
 */
class FakeNimbusEventStore : NimbusEventStore {
    private val recordedEvents = mutableListOf<String>()
    private val pastEvents = mutableListOf<PastEvent>()

    /**
     * @see [NimbusEventStore.recordEvent]
     */
    override fun recordEvent(count: Long, eventId: String) {
        repeat(count) {
            recordedEvents += eventId
        }
    }

    /**
     * Asserts that recorded events are exactly equal to [events] (including order).
     */
    fun assertEventsEqual(events: List<String>) {
        assertEquals(events, recordedEvents)
    }

    /**
     * Asserts that there was only a single event recorded and it's equal to [eventId].
     */
    fun assertSingleEventEquals(eventId: String) {
        assertEquals(eventId, recordedEvents.single())
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
