/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.readerview

import android.content.Context
import android.view.View
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.action.EngineAction
import mozilla.components.browser.state.action.ReaderAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.engine.EngineMiddleware
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.ReaderState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.Engine
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.webextension.MessageHandler
import mozilla.components.concept.engine.webextension.Port
import mozilla.components.concept.engine.webextension.WebExtension
import mozilla.components.feature.readerview.ReaderViewFeature.Companion.FONT_SIZE_DEFAULT
import mozilla.components.feature.readerview.ReaderViewFeature.Companion.READER_VIEW_ACTIVE_CONTENT_PORT
import mozilla.components.feature.readerview.ReaderViewFeature.Companion.READER_VIEW_CONTENT_PORT
import mozilla.components.feature.readerview.ReaderViewFeature.Companion.READER_VIEW_EXTENSION_ID
import mozilla.components.feature.readerview.ReaderViewFeature.Companion.READER_VIEW_EXTENSION_URL
import mozilla.components.feature.readerview.view.ReaderViewControlsBar
import mozilla.components.feature.readerview.view.ReaderViewControlsView
import mozilla.components.support.test.any
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.eq
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.test.whenever
import mozilla.components.support.webextensions.BuiltInWebExtensionController
import mozilla.ext.appCompatContext
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.Mockito.never
import org.mockito.Mockito.spy
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import java.util.Locale

@RunWith(AndroidJUnit4::class)
class ReaderViewFeatureTest {

    private val testDispatcher = StandardTestDispatcher()
    private val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()

    @Before
    fun setup() {
        BuiltInWebExtensionController.installedBuiltInExtensions.clear()
    }

    @Test
    fun `start installs webextension`() = runTest(testDispatcher) {
        val engine: Engine = mock()
        val store = BrowserStore()
        val readerViewFeature = ReaderViewFeature(testContext, engine, store, mock())

        readerViewFeature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        val onSuccess = argumentCaptor<((WebExtension) -> Unit)>()
        val onError = argumentCaptor<((Throwable) -> Unit)>()
        verify(engine, times(1)).installBuiltInWebExtension(
            eq(READER_VIEW_EXTENSION_ID),
            eq(READER_VIEW_EXTENSION_URL),
            onSuccess.capture(),
            onError.capture(),
        )

        onSuccess.value.invoke(mock())

        // Already installed, should not try to install again.
        readerViewFeature.start()
        verify(engine, times(1)).installBuiltInWebExtension(
            eq(READER_VIEW_EXTENSION_ID),
            eq(READER_VIEW_EXTENSION_URL),
            any(),
            any(),
        )
    }

    @Test
    fun `start registers content message handlers for selected session`() = runTest(testDispatcher) {
        val engine: Engine = mock()
        val view: ReaderViewControlsView = mock()
        val engineSession: EngineSession = mock()
        val controller = spy(
            BuiltInWebExtensionController(
                READER_VIEW_EXTENSION_ID,
                READER_VIEW_EXTENSION_URL,
                READER_VIEW_CONTENT_PORT,
            ),
        )
        val tab = createTab(
            url = "https://www.mozilla.org",
            id = "test-tab",
            engineSession = engineSession,
        )
        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab),
                selectedTabId = tab.id,
            ),
        )

        val readerViewFeature = ReaderViewFeature(testContext, engine, store, view)
        readerViewFeature.extensionController = controller
        readerViewFeature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        val onSuccess = argumentCaptor<((WebExtension) -> Unit)>()
        val onError = argumentCaptor<((Throwable) -> Unit)>()
        verify(engine, times(1)).installBuiltInWebExtension(
            eq(READER_VIEW_EXTENSION_ID),
            eq(READER_VIEW_EXTENSION_URL),
            onSuccess.capture(),
            onError.capture(),
        )
        onSuccess.value.invoke(mock())
        verify(controller).registerContentMessageHandler(eq(engineSession), any(), eq(READER_VIEW_ACTIVE_CONTENT_PORT))
        verify(controller).registerContentMessageHandler(eq(engineSession), any(), eq(READER_VIEW_CONTENT_PORT))
    }

    @Test
    fun `start also starts controls interactor`() = runTest(testDispatcher) {
        val engine: Engine = mock()
        val store = BrowserStore()
        val view: ReaderViewControlsView = ReaderViewControlsBar(appCompatContext)

        val readerViewFeature = spy(ReaderViewFeature(testContext, engine, store, view))
        readerViewFeature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertNotNull(view.listener)
    }

    @Test
    fun `stop also stops controls interactor`() = runTest(testDispatcher) {
        val engine: Engine = mock()
        val store = BrowserStore()
        val view: ReaderViewControlsView = ReaderViewControlsBar(appCompatContext)

        val readerViewFeature = spy(ReaderViewFeature(testContext, engine, store, view))
        readerViewFeature.stop()

        assertNull(view.listener)
    }

    @Test
    fun `showControls invokes the controls presenter`() = runTest(testDispatcher) {
        val view: ReaderViewControlsView = mock()
        val feature = spy(ReaderViewFeature(testContext, mock(), BrowserStore(), view))

        feature.showControls()

        verify(view).setColorScheme(any())
        verify(view).setFont(any())
        verify(view).setFontSize(anyInt())
        verify(view).showControls()
    }

    @Test
    fun `hideControls invokes the controls presenter`() = runTest(testDispatcher) {
        val view: ReaderViewControlsView = mock()
        val feature = spy(ReaderViewFeature(testContext, mock(), BrowserStore(), view))

        feature.hideControls()

        verify(view).hideControls()
    }

    @Test
    fun `triggers readerable check when required`() = runTest(testDispatcher) {
        val engine: Engine = mock()
        val tab = createTab("https://www.mozilla.org", id = "test-tab")
        val store = BrowserStore(initialState = BrowserState(tabs = listOf(tab)))
        val readerViewFeature = spy(ReaderViewFeature(testContext, engine, store, mock(), testDispatcher))
        readerViewFeature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(ReaderAction.UpdateReaderableCheckRequiredAction(tab.id, true))
        testDispatcher.scheduler.advanceUntilIdle()

        val tabCaptor = argumentCaptor<TabSessionState>()
        verify(readerViewFeature).checkReaderState(tabCaptor.capture())
        assertEquals(tab.id, tabCaptor.value.id)
    }

    @Test
    fun `connects content script port when required`() = runTest(testDispatcher) {
        val engine: Engine = mock()
        val tab = createTab("https://www.mozilla.org", id = "test-tab")
        val store = BrowserStore(initialState = BrowserState(tabs = listOf(tab), selectedTabId = tab.id))
        val readerViewFeature = spy(ReaderViewFeature(testContext, engine, store, mock(), testDispatcher))

        readerViewFeature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(ReaderAction.UpdateReaderConnectRequiredAction(tab.id, true))
        testDispatcher.scheduler.advanceUntilIdle()

        val tabCaptor = argumentCaptor<TabSessionState>()
        verify(readerViewFeature).connectReaderViewContentScript(tabCaptor.capture())
        assertEquals(tab.id, tabCaptor.value.id)
    }

    @Test
    fun `notifies readerable state changes of selected tab`() = runTest(testDispatcher) {
        val readerViewStatusChanges = mutableListOf<Pair<Boolean, Boolean>>()
        val onReaderViewStatusChange: onReaderViewStatusChange = { readerable, active ->
            readerViewStatusChanges.add(Pair(readerable, active))
        }

        val engine: Engine = mock()
        val tab = createTab("https://www.mozilla.org", id = "test-tab")
        val store = BrowserStore(initialState = BrowserState(tabs = listOf(tab)))
        val readerViewFeature = spy(
            ReaderViewFeature(
                testContext,
                engine,
                store,
                mock(),
                testDispatcher,
                { "test-uuid" },
                onReaderViewStatusChange,
            ),
        )
        readerViewFeature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(readerViewStatusChanges.isEmpty())

        store.dispatch(TabListAction.SelectTabAction(tab.id))
        store.dispatch(ReaderAction.UpdateReaderableAction(tab.id, true))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(1, readerViewStatusChanges.size)
        assertEquals(Pair(true, false), readerViewStatusChanges[0])

        store.dispatch(ReaderAction.UpdateReaderActiveAction(tab.id, true))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(2, readerViewStatusChanges.size)
        assertEquals(Pair(true, true), readerViewStatusChanges[1])

        store.dispatch(ReaderAction.UpdateReaderableAction(tab.id, true))
        testDispatcher.scheduler.advanceUntilIdle()

        // No change -> No notification should have been sent
        assertEquals(2, readerViewStatusChanges.size)

        store.dispatch(ReaderAction.UpdateReaderActiveAction(tab.id, false))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(3, readerViewStatusChanges.size)
        assertEquals(Pair(true, false), readerViewStatusChanges[2])

        store.dispatch(ReaderAction.UpdateReaderableAction(tab.id, false))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(4, readerViewStatusChanges.size)
        assertEquals(Pair(false, false), readerViewStatusChanges[3])
    }

    @Test
    fun `show reader view sends message to web extension`() = runTest(testDispatcher) {
        val port = mock<Port>()
        val message = argumentCaptor<JSONObject>()
        val readerViewFeature = prepareFeatureForTest(port, createUUID = { "test-uuid" })

        readerViewFeature.showReaderView()
        verify(port).postMessage(message.capture())
        assertEquals(ReaderViewFeature.ACTION_CACHE_PAGE, message.value[ReaderViewFeature.ACTION_MESSAGE_KEY])
        assertEquals("test-uuid", message.value[ReaderViewFeature.ACTION_VALUE_ID])
    }

    @Test
    fun `show reader view dispatches LoadUrlAction and UpdateReaderActiveAction`() = runTest(testDispatcher) {
        val engine: Engine = mock()
        val engineSession: EngineSession = mock()
        val tab = createTab(
            url = "https://www.mozilla.org",
            id = "test-tab",
            engineSession = engineSession,
        )
        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab),
                selectedTabId = tab.id,
            ),
            middleware = listOf(captureActionsMiddleware) + EngineMiddleware.create(engine),
        )

        val readerViewFeature = ReaderViewFeature(
            testContext,
            engine,
            store,
            mock(),
            testDispatcher,
            { "bbbbf5ce-3b0f-4f74-8a1f-986d89bffea7" },
        )
        readerViewFeature.readerBaseUrl = "moz-extension://012345/"
        readerViewFeature.showReaderView()

        captureActionsMiddleware.assertFirstAction(EngineAction.LoadUrlAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals(
                "moz-extension://012345/readerview.html?url=https%3A%2F%2Fwww.mozilla.org&id=bbbbf5ce-3b0f-4f74-8a1f-986d89bffea7&colorScheme=light",
                action.url,
            )
        }
        captureActionsMiddleware.assertLastAction(ReaderAction.UpdateReaderActiveAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertTrue(action.active)
        }
    }

    @Test
    fun `default values used for showing reader view if no config is present`() = runTest(testDispatcher) {
        val message = ReaderViewFeature.createShowReaderMessage(null)
        assertEquals(ReaderViewFeature.ACTION_SHOW, message[ReaderViewFeature.ACTION_MESSAGE_KEY])
        val config = message[ReaderViewFeature.ACTION_VALUE] as JSONObject?
        assertNotNull(config)
        assertEquals(FONT_SIZE_DEFAULT, config!![ReaderViewFeature.ACTION_VALUE_SHOW_FONT_SIZE])
        assertEquals(
            ReaderViewFeature.FontType.SERIF.value.lowercase(Locale.ROOT),
            config[ReaderViewFeature.ACTION_VALUE_SHOW_FONT_TYPE],
        )
        assertEquals(
            ReaderViewFeature.ColorScheme.LIGHT.name.lowercase(Locale.ROOT),
            config[ReaderViewFeature.ACTION_VALUE_SHOW_COLOR_SCHEME],
        )
        assertFalse(config.has(ReaderViewFeature.ACTION_VALUE_SCROLLY))
    }

    @Test
    fun `pass scrollY for showing reader view`() = runTest(testDispatcher) {
        val message = ReaderViewFeature.createShowReaderMessage(null, 1234)
        assertEquals(ReaderViewFeature.ACTION_SHOW, message[ReaderViewFeature.ACTION_MESSAGE_KEY])
        val config = message[ReaderViewFeature.ACTION_VALUE] as JSONObject?
        assertNotNull(config)
        assertEquals(1234, config!![ReaderViewFeature.ACTION_VALUE_SCROLLY])
    }

    @Test
    fun `hide reader view navigates back if possible`() = runTest(testDispatcher) {
        val engine: Engine = mock()
        val engineSession: EngineSession = mock()
        val tab = createTab("https://www.mozilla.org", id = "test-tab", readerState = ReaderState(active = true))
        val store = BrowserStore(initialState = BrowserState(tabs = listOf(tab)))
        val readerViewFeature = ReaderViewFeature(testContext, engine, store, mock())
        store.dispatch(EngineAction.LinkEngineSessionAction(tab.id, engineSession))
        store.dispatch(TabListAction.SelectTabAction(tab.id))
        store.dispatch(ContentAction.UpdateBackNavigationStateAction(tab.id, true))

        readerViewFeature.hideReaderView()
        verify(engineSession).goBack(false)
    }

    @Test
    fun `hide reader view sends message to web extension`() = runTest(testDispatcher) {
        val port = mock<Port>()
        val message = argumentCaptor<JSONObject>()
        val readerViewFeature = prepareFeatureForTest(
            readerActivePort = port,
            tab = createTab("https://www.mozilla.org", id = "test-tab", readerState = ReaderState(active = true)),
        )

        readerViewFeature.hideReaderView()
        verify(port, times(1)).postMessage(message.capture())
        assertEquals(ReaderViewFeature.ACTION_HIDE, message.value[ReaderViewFeature.ACTION_MESSAGE_KEY])
    }

    @Test
    fun `hide reader view updates state`() = runTest(testDispatcher) {
        val engine: Engine = mock()
        val tab = createTab(
            url = "https://www.mozilla.org",
            id = "test-tab",
            readerState = ReaderState(active = true),
        )

        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab),
                selectedTabId = tab.id,
            ),
            middleware = EngineMiddleware.create(engine) + listOf(captureActionsMiddleware),
        )

        val readerViewFeature = ReaderViewFeature(testContext, engine, store, mock())
        readerViewFeature.hideReaderView()

        captureActionsMiddleware.assertFirstAction(ReaderAction.UpdateReaderActiveAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertFalse(action.active)
        }

        captureActionsMiddleware.assertFirstAction(ReaderAction.UpdateReaderableAction::class) {
            assertEquals(tab.id, it.tabId)
            assertFalse(it.readerable)
        }

        captureActionsMiddleware.assertFirstAction(ReaderAction.ClearReaderActiveUrlAction::class) { action ->
            assertEquals(tab.id, action.tabId)
        }
    }

    @Test
    fun `reader state check sends message to web extension`() = runTest(testDispatcher) {
        val port = mock<Port>()
        val message = argumentCaptor<JSONObject>()
        val readerViewFeature = prepareFeatureForTest(port)

        readerViewFeature.checkReaderState()
        verify(port, times(1)).postMessage(message.capture())
        assertEquals(ReaderViewFeature.ACTION_CHECK_READER_STATE, message.value[ReaderViewFeature.ACTION_MESSAGE_KEY])
    }

    @Test
    fun `color scheme config change persists and is sent to web extension`() = runTest(testDispatcher) {
        val port = mock<Port>()
        val message = argumentCaptor<JSONObject>()

        val readerViewFeature = prepareFeatureForTest(readerActivePort = port)
        val prefs = testContext.getSharedPreferences(ReaderViewFeature.SHARED_PREF_NAME, Context.MODE_PRIVATE)

        readerViewFeature.config.colorScheme = ReaderViewFeature.ColorScheme.DARK
        assertEquals(ReaderViewFeature.ColorScheme.DARK.name, prefs.getString(ReaderViewFeature.COLOR_SCHEME_KEY, null))

        verify(port, times(1)).postMessage(message.capture())
        assertEquals(ReaderViewFeature.ACTION_SET_COLOR_SCHEME, message.value[ReaderViewFeature.ACTION_MESSAGE_KEY])
        assertEquals(ReaderViewFeature.ColorScheme.DARK.name, message.value[ReaderViewFeature.ACTION_VALUE])

        // Setting to the same value should not cause another message to be sent
        readerViewFeature.config.colorScheme = ReaderViewFeature.ColorScheme.DARK
        verify(port, times(1)).postMessage(message.capture())
    }

    @Test
    fun `font type config change persists and is sent to web extension`() = runTest(testDispatcher) {
        val port = mock<Port>()
        val message = argumentCaptor<JSONObject>()

        val readerViewFeature = prepareFeatureForTest(readerActivePort = port)
        val prefs = testContext.getSharedPreferences(ReaderViewFeature.SHARED_PREF_NAME, Context.MODE_PRIVATE)

        readerViewFeature.config.fontType = ReaderViewFeature.FontType.SANSSERIF
        assertEquals(ReaderViewFeature.FontType.SANSSERIF.name, prefs.getString(ReaderViewFeature.FONT_TYPE_KEY, null))

        verify(port, times(1)).postMessage(message.capture())
        assertEquals(ReaderViewFeature.ACTION_SET_FONT_TYPE, message.value[ReaderViewFeature.ACTION_MESSAGE_KEY])
        assertEquals(ReaderViewFeature.FontType.SANSSERIF.value, message.value[ReaderViewFeature.ACTION_VALUE])

        // Setting to the same value should not cause another message to be sent
        readerViewFeature.config.fontType = ReaderViewFeature.FontType.SANSSERIF
        verify(port, times(1)).postMessage(message.capture())
    }

    @Test
    fun `font size config change persists and is sent to web extension`() = runTest(testDispatcher) {
        val port = mock<Port>()
        val message = argumentCaptor<JSONObject>()

        val readerViewFeature = prepareFeatureForTest(readerActivePort = port)
        val prefs = testContext.getSharedPreferences(ReaderViewFeature.SHARED_PREF_NAME, Context.MODE_PRIVATE)

        readerViewFeature.config.fontSize = 4
        assertEquals(4, prefs.getInt(ReaderViewFeature.FONT_SIZE_KEY, 0))

        verify(port, times(1)).postMessage(message.capture())
        assertEquals(ReaderViewFeature.ACTION_CHANGE_FONT_SIZE, message.value[ReaderViewFeature.ACTION_MESSAGE_KEY])
        assertEquals(1, message.value[ReaderViewFeature.ACTION_VALUE])

        // Setting to the same value should not cause another message to be sent
        readerViewFeature.config.fontSize = 4
        verify(port, times(1)).postMessage(message.capture())
    }

    @Test
    fun `on back pressed hides controls`() = runTest(testDispatcher) {
        val engine: Engine = mock()
        val engineSession: EngineSession = mock()

        val tab = createTab("https://www.mozilla.org", id = "test-tab")
        val store = BrowserStore(BrowserState(tabs = listOf(tab)))
        store.dispatch(EngineAction.LinkEngineSessionAction(tab.id, engineSession))
        store.dispatch(TabListAction.SelectTabAction(tab.id))

        val controlsView: ReaderViewControlsView = mock()
        val view: View = mock()
        whenever(controlsView.asView()).thenReturn(view)

        val readerViewFeature = spy(ReaderViewFeature(testContext, engine, store, controlsView))
        assertFalse(readerViewFeature.onBackPressed())

        store.dispatch(ReaderAction.UpdateReaderActiveAction(tab.id, true))
        whenever(view.visibility).thenReturn(View.VISIBLE)
        assertTrue(readerViewFeature.onBackPressed())
        verify(readerViewFeature, never()).hideReaderView(any())
        verify(readerViewFeature, times(1)).hideControls()

        whenever(view.visibility).thenReturn(View.GONE)
        assertTrue(readerViewFeature.onBackPressed())
        verify(readerViewFeature, times(1)).hideReaderView(any())
        verify(readerViewFeature, times(1)).hideControls()
    }

    @Test
    fun `state is updated when reader state arrives`() = runTest(testDispatcher) {
        val engine: Engine = mock()
        val view: ReaderViewControlsView = mock()
        val engineSession: EngineSession = mock()
        val ext: WebExtension = mock()
        val controller: BuiltInWebExtensionController = mock()
        val tab = createTab(
            url = "https://www.mozilla.org",
            id = "test-tab",
            engineSession = engineSession,
        )
        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab),
                selectedTabId = tab.id,
            ),
            middleware = listOf(captureActionsMiddleware),
        )

        BuiltInWebExtensionController.installedBuiltInExtensions[READER_VIEW_EXTENSION_ID] = ext

        val port: Port = mock()
        whenever(port.engineSession).thenReturn(engineSession)
        whenever(ext.getConnectedPort(any(), any())).thenReturn(port)

        whenever(controller.portConnected(any(), any())).thenReturn(true)
        val readerViewFeature = spy(ReaderViewFeature(testContext, engine, store, view, testDispatcher))
        readerViewFeature.extensionController = controller

        val messageHandler = argumentCaptor<MessageHandler>()
        val message = argumentCaptor<JSONObject>()
        readerViewFeature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(ReaderAction.UpdateReaderConnectRequiredAction(tab.id, true))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(controller).registerContentMessageHandler(
            eq(engineSession),
            messageHandler.capture(),
            eq(READER_VIEW_ACTIVE_CONTENT_PORT),
        )

        messageHandler.value.onPortConnected(port)
        verify(port).postMessage(message.capture())
        assertEquals(ReaderViewFeature.ACTION_CHECK_READER_STATE, message.value[ReaderViewFeature.ACTION_MESSAGE_KEY])

        val readerStateMessage = JSONObject()
            .put("readerable", true)
            .put("baseUrl", "moz-extension://")
            .put("activeUrl", "http://mozilla.org/article")
        messageHandler.value.onPortMessage(readerStateMessage, port)

        captureActionsMiddleware.assertFirstAction(ReaderAction.UpdateReaderableAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertTrue(action.readerable)
        }

        captureActionsMiddleware.assertFirstAction(ReaderAction.UpdateReaderBaseUrlAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals("moz-extension://", action.baseUrl)
        }

        captureActionsMiddleware.assertFirstAction(ReaderAction.UpdateReaderActiveUrlAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals("http://mozilla.org/article", action.activeUrl)
        }
    }

    @Test
    fun `reader is shown when state arrives from reader page`() = runTest(testDispatcher) {
        val engine: Engine = mock()
        val view: ReaderViewControlsView = mock()
        val engineSession: EngineSession = mock()
        val ext: WebExtension = mock()
        val controller: BuiltInWebExtensionController = mock()
        val tab = createTab(
            url = "https://www.mozilla.org",
            id = "test-tab",
            engineSession = engineSession,
        )
        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab),
                selectedTabId = tab.id,
            ),
        )

        BuiltInWebExtensionController.installedBuiltInExtensions[READER_VIEW_EXTENSION_ID] = ext

        val port: Port = mock()
        whenever(port.engineSession).thenReturn(engineSession)
        whenever(ext.getConnectedPort(any(), any())).thenReturn(port)

        whenever(controller.portConnected(any(), any())).thenReturn(true)
        val readerViewFeature = spy(ReaderViewFeature(testContext, engine, store, view, testDispatcher))
        readerViewFeature.extensionController = controller

        val messageHandler = argumentCaptor<MessageHandler>()
        val message = argumentCaptor<JSONObject>()

        readerViewFeature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(ReaderAction.UpdateReaderConnectRequiredAction(tab.id, true))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(controller).registerContentMessageHandler(
            eq(engineSession),
            messageHandler.capture(),
            eq(READER_VIEW_ACTIVE_CONTENT_PORT),
        )
        messageHandler.value.onPortConnected(port)

        val readerStateMessage = JSONObject()
            .put("readerable", true)
            .put("baseUrl", "moz-extension://")
            .put("activeUrl", "http://mozilla.org/article")
        messageHandler.value.onPortMessage(readerStateMessage, port)
        verify(port, times(2)).postMessage(message.capture())
        assertEquals(ReaderViewFeature.ACTION_CHECK_READER_STATE, message.allValues[0][ReaderViewFeature.ACTION_MESSAGE_KEY])
        assertEquals(ReaderViewFeature.ACTION_SHOW, message.allValues[1][ReaderViewFeature.ACTION_MESSAGE_KEY])
    }

    private fun prepareFeatureForTest(
        contentPort: Port? = null,
        readerActivePort: Port? = null,
        tab: TabSessionState = createTab("https://www.mozilla.org", id = "test-tab"),
        engineSession: EngineSession = mock(),
        controller: BuiltInWebExtensionController? = null,
        createUUID: UUIDCreator = { "" },
    ): ReaderViewFeature {
        val engine: Engine = mock()

        val store = BrowserStore(BrowserState(tabs = listOf(tab)))
        store.dispatch(EngineAction.LinkEngineSessionAction(tab.id, engineSession))
        store.dispatch(TabListAction.SelectTabAction(tab.id))

        val ext: WebExtension = mock()
        contentPort?.let {
            whenever(ext.getConnectedPort(eq(READER_VIEW_CONTENT_PORT), any()))
                .thenReturn(contentPort)
        }
        readerActivePort?.let {
            whenever(ext.getConnectedPort(eq(READER_VIEW_ACTIVE_CONTENT_PORT), any()))
                .thenReturn(readerActivePort)
        }
        BuiltInWebExtensionController.installedBuiltInExtensions[READER_VIEW_EXTENSION_ID] = ext

        val feature = ReaderViewFeature(testContext, engine, store, mock(), testDispatcher, createUUID)
        if (controller != null) {
            feature.extensionController = controller
        }
        return feature
    }
}
