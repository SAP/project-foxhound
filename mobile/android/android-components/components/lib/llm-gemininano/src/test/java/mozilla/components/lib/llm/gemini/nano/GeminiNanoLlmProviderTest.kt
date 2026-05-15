/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.llm.gemini.nano

import com.google.mlkit.genai.common.DownloadStatus
import com.google.mlkit.genai.common.FeatureStatus
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.llm.LocalLlmProvider.State
import mozilla.components.lib.llm.gemini.nano.fakes.FakeGenerativeModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class GeminiNanoLlmProviderTest {
    @Test
    fun `provider goes into an unavailable state if model is unavailable`() = runTest {
        val fakeModel = FakeGenerativeModel(
            status = sequenceOf(FeatureStatus.UNAVAILABLE),
            responseMap = mapOf(),
        )

        val provider = GeminiNanoLlmProvider({ fakeModel })
        assertEquals(State.Idle, provider.state.value)
        provider.checkAvailability()
        assertEquals(State.Unavailable, provider.state.value)
    }

    @Test
    fun `provider goes into an ReadyToDownload state if model is available but not downloaded`() = runTest {
        val fakeModel = FakeGenerativeModel(
            status = sequenceOf(FeatureStatus.DOWNLOADABLE),
            responseMap = mapOf(),
        )

        val provider = GeminiNanoLlmProvider({ fakeModel })
        assertEquals(State.Idle, provider.state.value)
        provider.checkAvailability()
        assertEquals(State.ReadyToDownload, provider.state.value)
    }

    @Test
    fun `provider transitions into a ready state state if model is available and downloaded`() = runTest {
        val fakeModel = FakeGenerativeModel(
            status = sequenceOf(FeatureStatus.AVAILABLE),
            responseMap = mapOf(),
        )

        val provider = GeminiNanoLlmProvider({ fakeModel })
        assertEquals(State.Idle, provider.state.value)
        provider.checkAvailability()
        assertTrue(provider.state.value is State.Ready)
    }

    @Test
    fun `provider transitions into a downloading state state if model is downloading`() = runTest {
        val fakeModel = FakeGenerativeModel(
            status = sequenceOf(FeatureStatus.DOWNLOADING),
            responseMap = mapOf(),
        )

        val provider = GeminiNanoLlmProvider({ fakeModel })
        assertEquals(State.Idle, provider.state.value)
        provider.checkAvailability()
        assertEquals(State.Downloading(0L, 0L), provider.state.value)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun `that we can download a model`() = runTest {
        val fakeModel = FakeGenerativeModel(
            downloadFlow = flowOf(
                DownloadStatus.DownloadStarted(100L),
                DownloadStatus.DownloadProgress(10),
                DownloadStatus.DownloadProgress(90),
                DownloadStatus.DownloadCompleted,
            ),
            status = sequenceOf(FeatureStatus.DOWNLOADABLE),
            responseMap = mapOf(),
        )

        val provider = GeminiNanoLlmProvider({ fakeModel })

        val states = mutableListOf<State>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            provider.state.toList(states)
        }

        provider.downloadIfNeeded()

        assertEquals(State.Idle, states[0])
        assertEquals(State.ReadyToDownload, states[1])
        assertEquals(State.Downloading(100L, 0L), states[2])
        assertEquals(State.Downloading(100L, 10L), states[3])
        assertEquals(State.Downloading(100L, 90L), states[4])
        assertTrue(states[5] is State.Ready)
    }
}
