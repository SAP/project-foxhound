/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.toolbar

import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.ResolveInfo
import android.speech.RecognizerIntent
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.mockk
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarStore
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.metrics.MetricsUtils
import org.mozilla.fenix.home.toolbar.HomeToolbarComposable.Companion.DirectToSearchConfig
import org.robolectric.shadows.ShadowPackageManager

@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class) // for advanceTimeBy
class HomeToolbarComposableTest {
    val appStore = AppStore()
    val browserStore = BrowserStore()
    val toolbarStore = BrowserToolbarStore()
    val dispatcher = StandardTestDispatcher()

    @Test
    fun `GIVEN speech recognition is available WHEN should start to a voice search THEN start voice recognition and then search mode`() = runTest(dispatcher) {
        val htc = buildHomeToolbarComposable(
            directToSearchConfig = DirectToSearchConfig(
                startVoiceSearch = true,
                startSearch = true,
                source = MetricsUtils.Source.DIGITAL_ASSISTANT,
            ),
            coroutineScope = this,
        )
        stubSpeechRecognition()

        htc.build(false)

        assertTrue(appStore.state.voiceSearchState.isRequestingVoiceInput)
        assertFalse(appStore.state.searchState.isSearchActive)

        testScheduler.advanceTimeBy(EDIT_TOOLBAR_DELAY_AFTER_VOICE_REQUEST + 1)
        assertTrue(appStore.state.searchState.isSearchActive)
        assertNull(appStore.state.searchState.sourceTabId)
        assertEquals(MetricsUtils.Source.DIGITAL_ASSISTANT, appStore.state.searchState.searchAccessPoint)
    }

    @Test
    fun `GIVEN speech recognition is not available WHEN should start to a voice search THEN enter search mode`() = runTest(dispatcher) {
        val htc = buildHomeToolbarComposable(
            directToSearchConfig = DirectToSearchConfig(
                startVoiceSearch = true,
                startSearch = true,
                source = MetricsUtils.Source.DIGITAL_ASSISTANT,
            ),
        )

        htc.build(false)

        assertFalse(appStore.state.voiceSearchState.isRequestingVoiceInput)
        assertTrue(appStore.state.searchState.isSearchActive)
        assertNull(appStore.state.searchState.sourceTabId)
        assertEquals(MetricsUtils.Source.DIGITAL_ASSISTANT, appStore.state.searchState.searchAccessPoint)
    }

    @Test
    fun `GIVEN a specific tab WHEN should start a typed search from it THEN enter search mode with tab's URL prefilled`() {
        val tab = createTab("https://test.com")
        val browserStore = BrowserStore(
            BrowserState(tabs = listOf(tab)),
        )
        val htc = buildHomeToolbarComposable(
            directToSearchConfig = DirectToSearchConfig(
                startVoiceSearch = false,
                startSearch = true,
                sessionId = tab.id,
                source = MetricsUtils.Source.ACTION,
            ),
            browserStore = browserStore,
        )

        htc.build(false)

        assertFalse(appStore.state.voiceSearchState.isRequestingVoiceInput)
        assertTrue(appStore.state.searchState.isSearchActive)
        assertEquals(tab.id, appStore.state.searchState.sourceTabId)
        assertEquals(MetricsUtils.Source.ACTION, appStore.state.searchState.searchAccessPoint)
        assertEquals(tab.content.url, toolbarStore.state.editState.query.current)
        assertTrue(toolbarStore.state.editState.isQueryPrefilled)
    }

    @Test
    fun `WHEN should start a new typed search THEN enter search mode`() {
        val htc = buildHomeToolbarComposable(
            directToSearchConfig = DirectToSearchConfig(
                startVoiceSearch = false,
                startSearch = true,
                source = MetricsUtils.Source.WIDGET,
            ),
        )

        htc.build(false)

        assertFalse(appStore.state.voiceSearchState.isRequestingVoiceInput)
        assertTrue(appStore.state.searchState.isSearchActive)
        assertNull(appStore.state.searchState.sourceTabId)
        assertEquals(MetricsUtils.Source.WIDGET, appStore.state.searchState.searchAccessPoint)
        assertEquals("", toolbarStore.state.editState.query.current)
        assertFalse(toolbarStore.state.editState.isQueryPrefilled)
    }

    private fun buildHomeToolbarComposable(
        directToSearchConfig: DirectToSearchConfig,
        browserStore: BrowserStore = this.browserStore,
        coroutineScope: CoroutineScope = CoroutineScope(Dispatchers.Main),
    ) = HomeToolbarComposable(
        context = testContext,
        navController = mockk(),
        toolbarStore = toolbarStore,
        appStore = appStore,
        browserStore = browserStore,
        browsingModeManager = mockk(),
        settings = mockk(relaxed = true),
        directToSearchConfig = directToSearchConfig,
        coroutineScope = coroutineScope,
        tabStripContent = { },
        searchSuggestionsContent = { },
        navigationBarContent = { },
    )

    private fun stubSpeechRecognition() {
        val speechRecognitionIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)

        val info = ResolveInfo().apply {
            activityInfo = ActivityInfo().apply {
                packageName = "fake.voice.recognizer"
            }
        }

        @Suppress("Deprecation")
        ShadowPackageManager().addResolveInfoForIntent(speechRecognitionIntent, info)
    }
}
