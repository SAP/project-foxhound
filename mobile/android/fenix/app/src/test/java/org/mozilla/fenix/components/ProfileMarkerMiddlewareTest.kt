/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.base.profiler.Profiler
import mozilla.components.lib.state.Action
import mozilla.components.lib.state.State
import mozilla.components.lib.state.Store
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfileMarkerMiddlewareTest {

    data object SState : State
    data class AAction(val arg: String = "") : Action

    @OptIn(ExperimentalCoroutinesApi::class) // advanceUntilIdle
    @Test
    fun `profile marker middleware creates markers for every action dispatched to store`() = runTest {
        val captured = mutableListOf<Pair<String, String?>>()
        val profiler = FakeProfiler(fakeAddMarker = { markerName, text ->
            captured.add(markerName to text)
        })
        val markerName = "hi, my name is"
        val store = Store<SState, AAction>(
            initialState = SState,
            reducer = { state, _ -> state },
            middleware = listOf(
                ProfileMarkerMiddleware(
                    markerName = markerName,
                    profiler = profiler,
                    scope = this,
                ),
            ),
        )

        val actionMessages = listOf("one!", "two!", "buckle my shoe!")
        actionMessages.forEach { message ->
            store.dispatch(AAction(message))
            this.advanceUntilIdle()
            assertTrue(captured.any { it.first == markerName && it.second!!.contains("AAction") })
        }
    }

    private class FakeProfiler(var fakeAddMarker: (markerName: String, text: String?) -> Unit) : Profiler {
        override fun isProfilerActive(): Boolean {
            TODO("Not yet implemented")
        }

        override fun getProfilerTime(): Double? {
            TODO("Not yet implemented")
        }

        override fun addMarker(
            markerName: String,
            startTime: Double?,
            endTime: Double?,
            text: String?,
        ) {
            TODO("Not yet implemented")
        }

        override fun addMarker(
            markerName: String,
            startTime: Double?,
            text: String?,
        ) {
            TODO("Not yet implemented")
        }

        override fun addMarker(markerName: String, startTime: Double?) {
            TODO("Not yet implemented")
        }

        override fun addMarker(markerName: String, text: String?) {
            fakeAddMarker(markerName, text)
        }

        override fun addMarker(markerName: String) {
            TODO("Not yet implemented")
        }

        override fun startProfiler(
            filters: Array<String>,
            features: Array<String>,
        ) {
            TODO("Not yet implemented")
        }

        override fun stopProfiler(
            onSuccess: (ByteArray?) -> Unit,
            onError: (Throwable) -> Unit,
        ) {
            TODO("Not yet implemented")
        }
    }
}
