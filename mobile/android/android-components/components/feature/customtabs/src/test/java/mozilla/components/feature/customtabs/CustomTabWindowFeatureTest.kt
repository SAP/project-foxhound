/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.customtabs

import android.app.Activity
import android.content.ActivityNotFoundException
import android.graphics.Color
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.ColorSchemeParams
import mozilla.components.browser.state.state.ColorSchemes
import mozilla.components.browser.state.state.CustomTabActionButtonConfig
import mozilla.components.browser.state.state.CustomTabConfig
import mozilla.components.browser.state.state.CustomTabMenuItem
import mozilla.components.browser.state.state.createCustomTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.window.WindowRequest
import mozilla.components.support.test.any
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.never
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify

@RunWith(AndroidJUnit4::class)
class CustomTabWindowFeatureTest {

    private lateinit var store: BrowserStore
    private val sessionId = "session-uuid"
    private lateinit var activity: Activity
    private lateinit var engineSession: EngineSession
    private val testDispatcher = StandardTestDispatcher()

    private val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()

    @Before
    fun setup() {
        activity = mock()
        engineSession = mock()

        store = BrowserStore(
            initialState = BrowserState(
                customTabs = listOf(
                    createCustomTab(
                        id = sessionId,
                        url = "https://www.mozilla.org",
                        engineSession = engineSession,
                    ),
                ),
            ),
            middleware = listOf(captureActionsMiddleware),
        )

        whenever(activity.packageName).thenReturn("org.mozilla.firefox")
    }

    @Test
    fun `given a request to open window, when the url can be handled, then the activity should start`() = runTest(testDispatcher) {
        val feature = CustomTabWindowFeature(activity, store, sessionId, testDispatcher)
        val windowRequest: WindowRequest = mock()

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        whenever(windowRequest.type).thenReturn(WindowRequest.Type.OPEN)
        whenever(windowRequest.url).thenReturn("https://www.firefox.com")
        store.dispatch(ContentAction.UpdateWindowRequestAction(sessionId, windowRequest))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(activity).startActivity(any(), any())
        captureActionsMiddleware.assertFirstAction(ContentAction.ConsumeWindowRequestAction::class) { action ->
            assertEquals(sessionId, action.sessionId)
        }
    }

    @Test
    fun `given a request to open window, when the url can't be handled, then handleError should be called`() = runTest(testDispatcher) {
        val exception = ActivityNotFoundException()
        val feature = CustomTabWindowFeature(activity, store, sessionId, testDispatcher)
        val windowRequest: WindowRequest = mock()

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        whenever(windowRequest.type).thenReturn(WindowRequest.Type.OPEN)
        whenever(windowRequest.url).thenReturn("blob:https://www.firefox.com")
        whenever(activity.startActivity(any(), any())).thenThrow(exception)
        store.dispatch(ContentAction.UpdateWindowRequestAction(sessionId, windowRequest))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(engineSession).loadUrl("blob:https://www.firefox.com")
    }

    @Test
    fun `creates intent based on default custom tab config`() = runTest(testDispatcher) {
        val feature = CustomTabWindowFeature(activity, store, sessionId, testDispatcher)
        val config = CustomTabConfig()
        val intent = feature.configToIntent(config)

        val newConfig = createCustomTabConfigFromIntent(intent.intent, null)
        assertEquals("org.mozilla.firefox", intent.intent.`package`)
        assertEquals(config, newConfig)
    }

    @Test
    fun `creates intent based on custom tab config`() = runTest(testDispatcher) {
        val feature = CustomTabWindowFeature(activity, store, sessionId, testDispatcher)
        val config = CustomTabConfig(
            colorSchemes = ColorSchemes(
                defaultColorSchemeParams = ColorSchemeParams(
                    toolbarColor = Color.RED,
                    navigationBarColor = Color.BLUE,
                ),
            ),
            enableUrlbarHiding = true,
            showShareMenuItem = true,
            titleVisible = true,
        )
        val intent = feature.configToIntent(config)

        val newConfig = createCustomTabConfigFromIntent(intent.intent, null)
        assertEquals("org.mozilla.firefox", intent.intent.`package`)
        assertEquals(config, newConfig)
    }

    @Test
    fun `creates intent with same menu items`() = runTest(testDispatcher) {
        val feature = CustomTabWindowFeature(activity, store, sessionId, testDispatcher)
        val config = CustomTabConfig(
            actionButtonConfig = CustomTabActionButtonConfig(
                description = "button",
                icon = mock(),
                pendingIntent = mock(),
            ),
            menuItems = listOf(
                CustomTabMenuItem("Item A", mock()),
                CustomTabMenuItem("Item B", mock()),
                CustomTabMenuItem("Item C", mock()),
            ),
        )
        val intent = feature.configToIntent(config)

        val newConfig = createCustomTabConfigFromIntent(intent.intent, null)
        assertEquals("org.mozilla.firefox", intent.intent.`package`)
        assertEquals(config, newConfig)
    }

    @Test
    fun `handles no requests when stopped`() = runTest(testDispatcher) {
        val feature = CustomTabWindowFeature(activity, store, sessionId, testDispatcher)
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        feature.stop()
        testDispatcher.scheduler.advanceUntilIdle()

        val windowRequest: WindowRequest = mock()
        whenever(windowRequest.type).thenReturn(WindowRequest.Type.OPEN)
        whenever(windowRequest.url).thenReturn("https://www.firefox.com")
        store.dispatch(ContentAction.UpdateWindowRequestAction(sessionId, windowRequest))
        verify(activity, never()).startActivity(any(), any())

        captureActionsMiddleware.assertNotDispatched(ContentAction.ConsumeWindowRequestAction::class)
    }
}
