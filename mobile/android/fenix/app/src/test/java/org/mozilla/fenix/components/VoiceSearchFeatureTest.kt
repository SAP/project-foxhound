/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.result.ActivityResultLauncher
import io.mockk.every
import io.mockk.mockk
import io.mockk.spyk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.support.test.robolectric.testContext
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.components.appstate.VoiceSearchAction
import org.mozilla.fenix.components.appstate.VoiceSearchAction.VoiceInputRequested
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class VoiceSearchFeatureTest {
    private val testDispatcher = StandardTestDispatcher()
    private val appStore = spyk(AppStore())
    private val voiceSearchLauncher: ActivityResultLauncher<Intent> = mockk(relaxed = true)
    private val feature =
        VoiceSearchFeature(testContext, appStore, voiceSearchLauncher, testDispatcher)

    @Before
    fun setup() {
        feature.start()
    }

    @Test
    fun `GIVEN a voice input request WHEN no activity is available to handle it THEN dispatches return a null result`() = runTest(testDispatcher) {
        every { voiceSearchLauncher.launch(any()) } throws ActivityNotFoundException()

        appStore.dispatch(VoiceInputRequested)
        testDispatcher.scheduler.advanceUntilIdle()

        verify { appStore.dispatch(VoiceSearchAction.VoiceInputResultReceived(null)) }
    }

    @Test
    fun `GIVEN SecurityException WHEN launching voice search THEN dispatches VoiceInputResultReceived null`() = runTest(testDispatcher) {
        every { voiceSearchLauncher.launch(any()) } throws SecurityException()

        appStore.dispatch(VoiceSearchAction.VoiceInputRequested)
        testDispatcher.scheduler.advanceUntilIdle()

        verify { appStore.dispatch(VoiceSearchAction.VoiceInputResultReceived(null)) }
    }

    @Test
    fun `GIVEN successful result WHEN handleVoiceSearchResult is called THEN dispatches VoiceInputResultReceived with search terms`() = runTest(testDispatcher) {
        val intent = mockk<Intent>()
        val results = arrayListOf("search term")
        every { intent.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS) } returns results

        feature.handleVoiceSearchResult(Activity.RESULT_OK, intent)

        verify { appStore.dispatch(VoiceSearchAction.VoiceInputResultReceived("search term")) }
    }

    @Test
    fun `GIVEN cancelled or failed result WHEN handleVoiceSearchResult is called THEN dispatches VoiceInputResultReceived with null`() = runTest(testDispatcher) {
        feature.handleVoiceSearchResult(Activity.RESULT_CANCELED, null)
        verify { appStore.dispatch(VoiceSearchAction.VoiceInputResultReceived(null)) }
    }
}
