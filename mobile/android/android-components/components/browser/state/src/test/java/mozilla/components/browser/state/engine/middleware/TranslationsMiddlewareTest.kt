/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.engine.middleware

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.InitAction
import mozilla.components.browser.state.action.LocaleAction
import mozilla.components.browser.state.action.TranslationsAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.TranslationsBrowserState
import mozilla.components.browser.state.state.TranslationsState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.Engine
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.translate.DetectedLanguages
import mozilla.components.concept.engine.translate.Language
import mozilla.components.concept.engine.translate.LanguageModel
import mozilla.components.concept.engine.translate.LanguageSetting
import mozilla.components.concept.engine.translate.ModelManagementOptions
import mozilla.components.concept.engine.translate.ModelOperation
import mozilla.components.concept.engine.translate.ModelState
import mozilla.components.concept.engine.translate.OperationLevel
import mozilla.components.concept.engine.translate.TranslationDownloadSize
import mozilla.components.concept.engine.translate.TranslationEngineState
import mozilla.components.concept.engine.translate.TranslationError
import mozilla.components.concept.engine.translate.TranslationOperation
import mozilla.components.concept.engine.translate.TranslationPageSettingOperation
import mozilla.components.concept.engine.translate.TranslationPageSettings
import mozilla.components.concept.engine.translate.TranslationSupport
import mozilla.components.support.test.any
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.eq
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.ArgumentMatchers.anyBoolean
import org.mockito.Mockito.atLeastOnce
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import java.util.Locale

class TranslationsMiddlewareTest {
    private val testDispatcher = StandardTestDispatcher()
    private val scope = TestScope(testDispatcher)
    private lateinit var engine: Engine
    private lateinit var engineSession: EngineSession
    private lateinit var tab: TabSessionState
    private lateinit var translationsMiddleware: TranslationsMiddleware
    private lateinit var tabs: List<TabSessionState>
    private lateinit var state: BrowserState
    private lateinit var store: BrowserStore

    // Mock Variables
    private val mockFrom = Language(code = "es", localizedDisplayName = "Spanish")
    private val mockTo = Language(code = "en", localizedDisplayName = "English")
    private val mockSupportedLanguages = TranslationSupport(
        fromLanguages = listOf(mockFrom, mockTo),
        toLanguages = listOf(mockFrom, mockTo),
    )
    private val mockDownloaded = ModelState.DOWNLOADED
    private val mockSize: Long = 1234
    private val mockLanguage = Language(mockFrom.code, mockFrom.localizedDisplayName)
    private val mockLanguageModel = LanguageModel(mockLanguage, mockDownloaded, mockSize)
    private lateinit var mockLanguageModels: MutableList<LanguageModel>
    private val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()

    @Before
    fun setup() {
        engine = mock()
        engineSession = mock()
        tab = createTab(
            url = "https://www.firefox.com",
            title = "Firefox",
            id = "1",
            engineSession = engineSession,
        )
        tabs = listOf(tab)
        state = BrowserState(tabs = tabs, selectedTabId = tab.id)
        translationsMiddleware = TranslationsMiddleware(engine = engine, scope = scope)
        store = BrowserStore(
            initialState = state,
            middleware = listOf(captureActionsMiddleware, translationsMiddleware),
        )

        mockLanguageModels = mutableListOf(mockLanguageModel)
    }

    @After
    fun tearDown() {
        captureActionsMiddleware.reset()
    }

    /**
     * Use with tests that need a mock translations engine state and supported languages.
     */
    private fun setupMockState(): BrowserStore {
        val mockDetectedLanguages = DetectedLanguages(
            documentLangTag = mockFrom.code,
            supportedDocumentLang = true,
            userPreferredLangTag = mockTo.code,
        )
        val mockTranslationsState = TranslationsState(
            translationEngineState = TranslationEngineState(mockDetectedLanguages),
        )
        val mockTranslationEngine = TranslationsBrowserState(
            isEngineSupported = true,
            supportedLanguages = mockSupportedLanguages,
            languageModels = mockLanguageModels,
        )

        // Replace the TabSessionState/BrowserState with mocked translation engines
        tab = tab.copy(translationsState = mockTranslationsState)
        tabs = listOf(tab)
        state = state.copy(
            tabs = tabs,
            translationEngine = mockTranslationEngine,
        )

        return BrowserStore(
            initialState = state,
            middleware = listOf(captureActionsMiddleware, translationsMiddleware),
        )
    }

    @Test
    fun `WHEN OperationRequestedAction is dispatched for FETCH_SUPPORTED_LANGUAGES AND succeeds THEN SetSupportedLanguagesAction is dispatched`() = runTest(testDispatcher) {
        // Initial Action
        val action =
            TranslationsAction.OperationRequestedAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_SUPPORTED_LANGUAGES,
            )

        translationsMiddleware.invoke(store = store, next = {}, action = action)
        testDispatcher.scheduler.advanceUntilIdle()

        // Verify results
        val languageCallback = argumentCaptor<((TranslationSupport) -> Unit)>()
        // Verifying at least once because `InitAction` also occurred
        verify(engine, atLeastOnce()).getSupportedTranslationLanguages(onSuccess = languageCallback.capture(), onError = any())
        val supportedLanguages = TranslationSupport(
            fromLanguages = listOf(Language("en", "English")),
            toLanguages = listOf(Language("en", "English")),
        )
        languageCallback.value.invoke(supportedLanguages)

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetSupportedLanguagesAction::class) { action ->
            assertEquals(supportedLanguages, action.supportedLanguages)
        }

        captureActionsMiddleware.assertFirstAction(TranslationsAction.TranslateSuccessAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals(TranslationOperation.FETCH_SUPPORTED_LANGUAGES, action.operation)
        }
    }

    @Test
    fun `WHEN OperationRequestedAction is dispatched for FETCH_SUPPORTED_LANGUAGES AND fails THEN EngineExceptionAction is dispatched`() {
        // Initial Action
        val action =
            TranslationsAction.OperationRequestedAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_SUPPORTED_LANGUAGES,
            )

        translationsMiddleware.invoke(store = store, next = {}, action = action)
        testDispatcher.scheduler.advanceUntilIdle()

        // Verify results
        val errorCaptor = argumentCaptor<((Throwable) -> Unit)>()
        // Verifying at least once because `InitAction` also occurred
        verify(engine, atLeastOnce()).getSupportedTranslationLanguages(onSuccess = any(), onError = errorCaptor.capture())
        errorCaptor.value.invoke(Throwable())

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.TranslateExceptionAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals(TranslationOperation.FETCH_SUPPORTED_LANGUAGES, action.operation)
            assertTrue(action.translationError is TranslationError.CouldNotLoadLanguagesError)
        }
    }

    @Test
    fun `WHEN InitAction is dispatched THEN InitTranslationsBrowserState is also dispatched`() = runTest(testDispatcher) {
        // Send Action
        // Note: Will cause a double InitAction
        translationsMiddleware.invoke(store = store, next = {}, action = InitAction)
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.InitTranslationsBrowserState::class)
    }

    @Test
    fun `GIVEN automaticallyInitialize is false WHEN InitAction is dispatched THEN do nothing`() = runTest(testDispatcher) {
        val middleware = TranslationsMiddleware(
            engine = engine,
            automaticallyInitialize = false,
            scope = this,
        )
        captureActionsMiddleware.reset()

        middleware.invoke(store = store, next = {}, action = InitAction)
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertNotDispatched(TranslationsAction.InitTranslationsBrowserState::class)
    }

    @Test
    fun `WHEN InitTranslationsBrowserState is dispatched AND the engine is supported THEN SetSupportedLanguagesAction is also dispatched`() = runTest(testDispatcher) {
        // Send Action
        translationsMiddleware.invoke(store = store, next = {}, action = TranslationsAction.InitTranslationsBrowserState)
        testDispatcher.scheduler.advanceUntilIdle()

        // Set the engine to support
        val engineSupportedCallback = argumentCaptor<((Boolean) -> Unit)>()
        // At least once, since InitAction also will trigger this
        verify(engine, atLeastOnce()).isTranslationsEngineSupported(
            onSuccess = engineSupportedCallback.capture(),
            onError = any(),
        )
        engineSupportedCallback.value.invoke(true)
        testDispatcher.scheduler.advanceUntilIdle()

        // Verify results for language query
        val languageCallback = argumentCaptor<((TranslationSupport) -> Unit)>()
        verify(engine, atLeastOnce()).getSupportedTranslationLanguages(onSuccess = languageCallback.capture(), onError = any())
        val supportedLanguages = TranslationSupport(
            fromLanguages = listOf(Language("en", "English")),
            toLanguages = listOf(Language("en", "English")),
        )
        languageCallback.value.invoke(supportedLanguages)

        testDispatcher.scheduler.advanceUntilIdle()

        // Verifying at least once
        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetSupportedLanguagesAction::class) { action ->
            assertEquals(supportedLanguages, action.supportedLanguages)
        }
    }

    @Test
    fun `WHEN InitTranslationsBrowserState is dispatched AND the engine is supported THEN SetLanguageSettingsAction is also dispatched`() = runTest(testDispatcher) {
        // Send Action
        translationsMiddleware.invoke(store = store, next = {}, action = TranslationsAction.InitTranslationsBrowserState)
        testDispatcher.scheduler.advanceUntilIdle()

        // Set the engine to support
        val engineSupportedCallback = argumentCaptor<((Boolean) -> Unit)>()
        // At least once, since InitAction also will trigger this
        verify(engine, atLeastOnce()).isTranslationsEngineSupported(
            onSuccess = engineSupportedCallback.capture(),
            onError = any(),
        )
        engineSupportedCallback.value.invoke(true)
        testDispatcher.scheduler.advanceUntilIdle()

        // Check expectations
        val languageSettingsCallback = argumentCaptor<((Map<String, LanguageSetting>) -> Unit)>()
        verify(engine, atLeastOnce()).getLanguageSettings(
            onSuccess = languageSettingsCallback.capture(),
            onError = any(),
        )
        val mockLanguageSetting = mapOf("en" to LanguageSetting.OFFER)
        languageSettingsCallback.value.invoke(mockLanguageSetting)
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetLanguageSettingsAction::class) { action ->
            assertEquals(mockLanguageSetting, action.languageSettings)
        }
    }

    @Test
    fun `WHEN InitTranslationsBrowserState is dispatched AND an error occurs THEN TranslateExceptionAction is dispatched for language settings`() = runTest(testDispatcher) {
        // Send Action
        translationsMiddleware.invoke(store = store, next = {}, action = TranslationsAction.InitTranslationsBrowserState)
        testDispatcher.scheduler.advanceUntilIdle()

        // Set the engine to support
        val engineSupportedCallback = argumentCaptor<((Boolean) -> Unit)>()
        // At least once, since InitAction also will trigger this
        verify(engine, atLeastOnce()).isTranslationsEngineSupported(
            onSuccess = engineSupportedCallback.capture(),
            onError = any(),
        )
        engineSupportedCallback.value.invoke(true)
        testDispatcher.scheduler.advanceUntilIdle()

        // Check expectations
        val errorCallback = argumentCaptor<((Throwable) -> Unit)>()
        verify(engine, atLeastOnce()).getLanguageSettings(
            onSuccess = any(),
            onError = errorCallback.capture(),
        )
        errorCallback.value.invoke(Throwable())
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.EngineExceptionAction::class) { action ->
            assertTrue(action.error is TranslationError.CouldNotLoadLanguageSettingsError)
        }
    }

    @Test
    fun `WHEN InitTranslationsBrowserState is dispatched AND the engine is supported THEN SetLanguageModelsAction is also dispatched`() = runTest(testDispatcher) {
        // Send Action
        translationsMiddleware.invoke(store = store, next = {}, action = TranslationsAction.InitTranslationsBrowserState)
        testDispatcher.scheduler.advanceUntilIdle()
        // Set the engine to support
        val engineSupportedCallback = argumentCaptor<((Boolean) -> Unit)>()
        // At least once, since InitAction also will trigger this
        verify(engine, atLeastOnce()).isTranslationsEngineSupported(
            onSuccess = engineSupportedCallback.capture(),
            onError = any(),
        )
        engineSupportedCallback.value.invoke(true)
        testDispatcher.scheduler.advanceUntilIdle()

        val languageCallback = argumentCaptor<((List<LanguageModel>) -> Unit)>()
        verify(engine, atLeastOnce()).getTranslationsModelDownloadStates(onSuccess = languageCallback.capture(), onError = any())
        languageCallback.value.invoke(mockLanguageModels)

        // Verifying at least once
        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetLanguageModelsAction::class) { action ->
            assertEquals(mockLanguageModels, action.languageModels)
        }
    }

    @Test
    fun `WHEN InitTranslationsBrowserState is dispatched AND the engine is supported THEN SetNeverTranslateSitesAction is also dispatched`() = runTest(testDispatcher) {
        // Send Action
        translationsMiddleware.invoke(store = store, next = {}, action = TranslationsAction.InitTranslationsBrowserState)
        testDispatcher.scheduler.advanceUntilIdle()

        // Set the engine to support
        val engineSupportedCallback = argumentCaptor<((Boolean) -> Unit)>()
        // At least once, since InitAction also will trigger this
        verify(engine, atLeastOnce()).isTranslationsEngineSupported(
            onSuccess = engineSupportedCallback.capture(),
            onError = any(),
        )
        engineSupportedCallback.value.invoke(true)
        testDispatcher.scheduler.advanceUntilIdle()

        val neverTranslateSitesCallBack = argumentCaptor<((List<String>) -> Unit)>()
        verify(engine, atLeastOnce()).getNeverTranslateSiteList(onSuccess = neverTranslateSitesCallBack.capture(), onError = any())
        val mockNeverTranslate = listOf("www.mozilla.org")
        neverTranslateSitesCallBack.value.invoke(mockNeverTranslate)
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetNeverTranslateSitesAction::class) { action ->
            assertEquals(mockNeverTranslate, action.neverTranslateSites)
        }
    }

    @Test
    fun `WHEN InitTranslationsBrowserState is dispatched AND has an issue with the engine THEN EngineExceptionAction is dispatched`() = runTest(testDispatcher) {
        // Send Action
        // Note: Implicitly called once due to connection with InitAction
        translationsMiddleware.invoke(store = store, next = {}, action = TranslationsAction.InitTranslationsBrowserState)
        testDispatcher.scheduler.advanceUntilIdle()

        // Check expectations
        val errorCallback = argumentCaptor<((Throwable) -> Unit)>()
        verify(engine, atLeastOnce()).isTranslationsEngineSupported(
            onSuccess = any(),
            onError = errorCallback.capture(),
        )
        errorCallback.value.invoke(IllegalStateException())
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.EngineExceptionAction::class) { action ->
            assertTrue(action.error is TranslationError.UnknownEngineSupportError)
        }
    }

    @Test
    fun `WHEN InitTranslationsBrowserState is dispatched AND the engine is not supported THEN SetSupportedLanguagesAction and SetLanguageModelsAction are NOT dispatched`() = runTest(testDispatcher) {
        // Send Action
        // Will invoke a double InitAction
        translationsMiddleware.invoke(store = store, next = {}, action = TranslationsAction.InitTranslationsBrowserState)
        testDispatcher.scheduler.advanceUntilIdle()

        // Set the engine to not support
        val engineNotSupportedCallback = argumentCaptor<((Boolean) -> Unit)>()
        verify(engine, atLeastOnce()).isTranslationsEngineSupported(
            onSuccess = engineNotSupportedCallback.capture(),
            onError = any(),
        )
        engineNotSupportedCallback.value.invoke(false)

        // Verify language query was never called
        verify(engine, never()).getSupportedTranslationLanguages(onSuccess = any(), onError = any())
    }

    @Test
    fun `WHEN TranslateExpectedAction is dispatched THEN FetchTranslationDownloadSizeAction is also dispatched`() = runTest(testDispatcher) {
        // Set up the state of defaults on the engine.
        val store = setupMockState()

        // Action
        translationsMiddleware.invoke(store = store, next = {}, action = TranslationsAction.TranslateExpectedAction(tab.id))

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.FetchTranslationDownloadSizeAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals(mockFrom, action.fromLanguage)
            assertEquals(mockTo, action.toLanguage)
        }
    }

    @Test
    fun `WHEN TranslateExpectedAction is dispatched AND the defaults are NOT available THEN FetchTranslationDownloadSizeAction is NOT dispatched`() = runTest(testDispatcher) {
        // Note, no state is set on the engine, so no default values are available.
        // Action
        translationsMiddleware.invoke(store = store, next = {}, action = TranslationsAction.TranslateExpectedAction(tab.id))

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertNotDispatched(TranslationsAction.FetchTranslationDownloadSizeAction::class)

        testDispatcher.scheduler.advanceUntilIdle()

        // Verify language query was never called
        verify(engine, never()).getTranslationsModelDownloadStates(onSuccess = any(), onError = any())
    }

    @Test
    fun `WHEN OperationRequestedAction is dispatched WITH FETCH_PAGE_SETTINGS AND fetching settings is successful THEN TranslationPageSettings is dispatched`() = runTest(testDispatcher) {
        // Setup
        val store = setupMockState()

        val mockPageSettings = TranslationPageSettings(
            alwaysOfferPopup = true,
            alwaysTranslateLanguage = true,
            neverTranslateLanguage = false,
            neverTranslateSite = true,
        )

        whenever(engine.getTranslationsOfferPopup()).thenAnswer { mockPageSettings.alwaysOfferPopup }

        // Send Action
        val action =
            TranslationsAction.OperationRequestedAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_PAGE_SETTINGS,
            )
        translationsMiddleware.invoke(store = store, {}, action)
        testDispatcher.scheduler.advanceUntilIdle()

        // Check Behavior
        // Popup always offer behavior
        verify(engine).getTranslationsOfferPopup()

        // Page language behavior
        val languageSettingCallback = argumentCaptor<((LanguageSetting) -> Unit)>()
        verify(engine).getLanguageSetting(
            languageCode = any(),
            onSuccess = languageSettingCallback.capture(),
            onError = any(),
        )
        val languageResponse = LanguageSetting.ALWAYS
        languageSettingCallback.value.invoke(languageResponse)
        testDispatcher.scheduler.advanceUntilIdle()

        // Never translate site behavior behavior
        val neverTranslateSiteCallback = argumentCaptor<((Boolean) -> Unit)>()
        verify(engineSession).getNeverTranslateSiteSetting(
            onResult = neverTranslateSiteCallback.capture(),
            onException = any(),
        )
        neverTranslateSiteCallback.value.invoke(mockPageSettings.neverTranslateSite!!)
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetPageSettingsAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals(mockPageSettings, action.pageSettings)
        }
    }

    @Test
    fun `WHEN OperationRequestedAction WITH FETCH_PAGE_SETTINGS AND fetching settings fails THEN TranslateExceptionAction is dispatched`() {
        // Setup
        val store = setupMockState()
        whenever(engine.getTranslationsOfferPopup()).thenAnswer { false }

        // Send Action
        val action =
            TranslationsAction.OperationRequestedAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_PAGE_SETTINGS,
            )
        translationsMiddleware.invoke(store = store, {}, action)
        testDispatcher.scheduler.advanceUntilIdle()

        // Check Behavior
        // Page language behavior
        val languageErrorCallback = argumentCaptor<((Throwable) -> Unit)>()
        verify(engine).getLanguageSetting(
            languageCode = any(),
            onSuccess = any(),
            onError = languageErrorCallback.capture(),
        )
        languageErrorCallback.value.invoke(Throwable())
        testDispatcher.scheduler.advanceUntilIdle()

        // Never translate site behavior behavior
        val neverTranslateSiteErrorCallback = argumentCaptor<((Throwable) -> Unit)>()
        verify(engineSession).getNeverTranslateSiteSetting(
            onResult = any(),
            onException = neverTranslateSiteErrorCallback.capture(),
        )
        neverTranslateSiteErrorCallback.value.invoke(Throwable())
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.TranslateExceptionAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals(TranslationOperation.FETCH_PAGE_SETTINGS, action.operation)
            assertTrue(action.translationError is TranslationError.CouldNotLoadPageSettingsError)
        }
    }

    @Test
    fun `WHEN UpdatePageSettingAction is dispatched WITH UPDATE_ALWAYS_TRANSLATE_LANGUAGE AND updating the setting is unsuccessful THEN OperationRequestedAction with FETCH_PAGE_SETTINGS is dispatched`() = runTest(testDispatcher) {
        // Setup
        val store = setupMockState()
        val errorCallback = argumentCaptor<((Throwable) -> Unit)>()
        whenever(
            engine.setLanguageSetting(
                languageCode = any(),
                languageSetting = any(),
                onSuccess = any(),
                onError = errorCallback.capture(),
            ),
        ).thenAnswer { errorCallback.value.invoke(Throwable()) }

        // Send Action
        val action =
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_ALWAYS_TRANSLATE_LANGUAGE,
                setting = true,
            )
        translationsMiddleware.invoke(store = store, {}, action)
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.OperationRequestedAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals(TranslationOperation.FETCH_PAGE_SETTINGS, action.operation)
        }
    }

    @Test
    fun `WHEN an Operation to FETCH_AUTOMATIC_LANGUAGE_SETTINGS is dispatched THEN SetLanguageSettingsAction is dispatched`() = runTest(testDispatcher) {
        // Send Action
        val action =
            TranslationsAction.OperationRequestedAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_AUTOMATIC_LANGUAGE_SETTINGS,
            )
        translationsMiddleware.invoke(store = store, next = {}, action = action)
        testDispatcher.scheduler.advanceUntilIdle()

        // Check expectations
        val languageSettingsCallback = argumentCaptor<((Map<String, LanguageSetting>) -> Unit)>()
        // Checking atLeastOnce, because InitAction is also implicitly called earlier
        verify(engine, atLeastOnce()).getLanguageSettings(
            onSuccess = languageSettingsCallback.capture(),
            onError = any(),
        )
        val mockLanguageSetting = mapOf("en" to LanguageSetting.OFFER)
        languageSettingsCallback.value.invoke(mockLanguageSetting)
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetLanguageSettingsAction::class) { action ->
            assertEquals(mockLanguageSetting, action.languageSettings)
        }
    }

    @Test
    fun `WHEN an Operation to UpdatePageSettings for UPDATE_ALWAYS_TRANSLATE_LANGUAGE is dispatched THEN SetLanguageSettingsAction is dispatched`() = runTest(testDispatcher) {
        // Page settings needs additional setup
        val store = setupMockState()
        val pageSettingCallback = argumentCaptor<(() -> Unit)>()

        // This is going to execute onSuccess callback when setLanguageSetting is called
        whenever(
            engine.setLanguageSetting(
                languageCode = any(),
                languageSetting = any(),
                onSuccess = pageSettingCallback.capture(),
                onError = any(),
            ),
        ).thenAnswer { pageSettingCallback.value.invoke() }

        // Send Action
        val action =
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_ALWAYS_TRANSLATE_LANGUAGE,
                setting = true,
            )
        translationsMiddleware.invoke(store = store, next = {}, action = action)
        testDispatcher.scheduler.advanceUntilIdle()

        // Check expectations

        verify(engine).setLanguageSetting(
            languageCode = eq("es"),
            languageSetting = eq(LanguageSetting.ALWAYS),
            onSuccess = pageSettingCallback.capture(),
            onError = any(),
        )

        // the success callback is going to be executed, which will trigger a FETCH_AUTOMATIC_LANGUAGE_SETTINGS action
        captureActionsMiddleware.assertFirstAction(TranslationsAction.OperationRequestedAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals(TranslationOperation.FETCH_AUTOMATIC_LANGUAGE_SETTINGS, action.operation)
        }

        testDispatcher.scheduler.advanceUntilIdle()

        verify(engine).getLanguageSettings(
            onSuccess = any(),
            onError = any(),
        )
    }

    @Test
    fun `WHEN an Operation to FETCH_AUTOMATIC_LANGUAGE_SETTINGS has an error THEN EngineExceptionAction and TranslateExceptionAction are dispatched for language setting`() = runTest(testDispatcher) {
        // Send Action
        val action =
            TranslationsAction.OperationRequestedAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_AUTOMATIC_LANGUAGE_SETTINGS,
            )
        translationsMiddleware.invoke(store = store, next = {}, action = action)
        testDispatcher.scheduler.advanceUntilIdle()

        // Check expectations
        val errorCallback = argumentCaptor<((Throwable) -> Unit)>()
        verify(engine, atLeastOnce()).getLanguageSettings(
            onSuccess = any(),
            onError = errorCallback.capture(),
        )
        errorCallback.value.invoke(Throwable())
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.EngineExceptionAction::class) { action ->
            assertTrue(action.error is TranslationError.CouldNotLoadLanguageSettingsError)
        }

        captureActionsMiddleware.assertFirstAction(TranslationsAction.TranslateExceptionAction::class) { action ->
            assertTrue(action.translationError is TranslationError.CouldNotLoadLanguageSettingsError)
            assertEquals(tab.id, action.tabId)
            assertEquals(TranslationOperation.FETCH_AUTOMATIC_LANGUAGE_SETTINGS, action.operation)
        }
    }

    @Test
    fun `WHEN UpdatePageSettingAction is dispatched WITH UPDATE_NEVER_TRANSLATE_LANGUAGE AND updating the setting is unsuccessful THEN OperationRequestedAction with FETCH_PAGE_SETTINGS is dispatched`() = runTest(testDispatcher) {
        // Setup
        val store = setupMockState()
        val errorCallback = argumentCaptor<((Throwable) -> Unit)>()
        whenever(
            engine.setLanguageSetting(
                languageCode = any(),
                languageSetting = any(),
                onSuccess = any(),
                onError = errorCallback.capture(),
            ),
        )
            .thenAnswer { errorCallback.value.invoke(Throwable()) }

        // Send Action
        val action =
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_NEVER_TRANSLATE_LANGUAGE,
                setting = true,
            )
        translationsMiddleware.invoke(store = store, {}, action)
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.OperationRequestedAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals(TranslationOperation.FETCH_PAGE_SETTINGS, action.operation)
        }
    }

    @Test
    fun `WHEN UpdatePageSettingAction is dispatched WITH UPDATE_NEVER_TRANSLATE_SITE AND updating the setting is unsuccessful THEN OperationRequestedAction with FETCH_PAGE_SETTINGS is dispatched`() = runTest(testDispatcher) {
        // Setup
        val store = setupMockState()
        val errorCallback = argumentCaptor<((Throwable) -> Unit)>()
        whenever(
            engineSession.setNeverTranslateSiteSetting(
                setting = anyBoolean(),
                onResult = any(),
                onException = errorCallback.capture(),
            ),
        )
            .thenAnswer { errorCallback.value.invoke(Throwable()) }

        // Send Action
        val action =
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_NEVER_TRANSLATE_SITE,
                setting = true,
            )
        translationsMiddleware.invoke(store = store, {}, action)
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.OperationRequestedAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals(TranslationOperation.FETCH_PAGE_SETTINGS, action.operation)
        }
    }

    @Test
    fun `WHEN OperationRequestedAction is dispatched to fetch never translate sites AND succeeds THEN SetNeverTranslateSitesAction is dispatched`() = runTest(testDispatcher) {
        val neverTranslateSites = listOf("google.com")
        val sitesCallback = argumentCaptor<((List<String>) -> Unit)>()
        val action =
            TranslationsAction.OperationRequestedAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_NEVER_TRANSLATE_SITES,
            )
        translationsMiddleware.invoke(store = store, {}, action)
        testDispatcher.scheduler.advanceUntilIdle()

        verify(engine).getNeverTranslateSiteList(onSuccess = sitesCallback.capture(), onError = any())
        sitesCallback.value.invoke(neverTranslateSites)

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetNeverTranslateSitesAction::class) { action ->
            assertEquals(action.neverTranslateSites, neverTranslateSites)
        }
    }

    @Test
    fun `WHEN OperationRequestedAction is dispatched to fetch never translate sites AND fails THEN TranslateExceptionAction is dispatched`() = runTest(testDispatcher) {
        val action = TranslationsAction.OperationRequestedAction(
            tabId = tab.id,
            operation = TranslationOperation.FETCH_NEVER_TRANSLATE_SITES,
        )
        val errorCallback = argumentCaptor<(Throwable) -> Unit>()

        translationsMiddleware.invoke(store = store, {}, action)
        testDispatcher.scheduler.advanceUntilIdle()

        verify(engine).getNeverTranslateSiteList(onSuccess = any(), onError = errorCallback.capture())
        errorCallback.value.invoke(Exception())

        captureActionsMiddleware.assertFirstAction(TranslationsAction.TranslateExceptionAction::class) { action ->
            assertTrue(action.translationError is TranslationError.CouldNotLoadNeverTranslateSites)
            assertEquals(tab.id, action.tabId)
            assertEquals(TranslationOperation.FETCH_NEVER_TRANSLATE_SITES, action.operation)
        }
    }

    @Test
    fun `WHEN FetchTranslationDownloadSize is requested AND succeeds THEN SetTranslationDownloadSize is dispatched`() = runTest(testDispatcher) {
        val translationSize = TranslationDownloadSize(
            fromLanguage = Language("en", "English"),
            toLanguage = Language("fr", "French"),
            size = 10000L,
            error = null,
        )

        val action =
            TranslationsAction.FetchTranslationDownloadSizeAction(
                tabId = tab.id,
                fromLanguage = translationSize.fromLanguage,
                toLanguage = translationSize.toLanguage,
            )
        translationsMiddleware.invoke(store = store, next = {}, action = action)
        testDispatcher.scheduler.advanceUntilIdle()

        val sizeCaptor = argumentCaptor<((Long) -> Unit)>()
        verify(engine).getTranslationsPairDownloadSize(
            fromLanguage = any(),
            toLanguage = any(),
            onSuccess = sizeCaptor.capture(),
            onError = any(),
        )
        sizeCaptor.value.invoke(translationSize.size!!)

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetTranslationDownloadSizeAction::class) { action ->
            assertEquals(action.tabId, tab.id)
            assertEquals(action.translationSize, translationSize)
        }
    }

    @Test
    fun `WHEN FetchTranslationDownloadSize is requested AND fails THEN SetTranslationDownloadSize is dispatched`() = runTest(testDispatcher) {
        val action =
            TranslationsAction.FetchTranslationDownloadSizeAction(
                tabId = tab.id,
                fromLanguage = Language("en", "English"),
                toLanguage = Language("fr", "French"),
            )
        translationsMiddleware.invoke(store = store, next = {}, action = action)
        testDispatcher.scheduler.advanceUntilIdle()

        val errorCaptor = argumentCaptor<((Throwable) -> Unit)>()
        verify(engine).getTranslationsPairDownloadSize(
            fromLanguage = any(),
            toLanguage = any(),
            onSuccess = any(),
            onError = errorCaptor.capture(),
        )
        errorCaptor.value.invoke(TranslationError.CouldNotDetermineDownloadSizeError(cause = null))
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetTranslationDownloadSizeAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertNull(action.translationSize.size)
            assertEquals(Language("en", "English"), action.translationSize.fromLanguage)
            assertEquals(Language("fr", "French"), action.translationSize.toLanguage)
        }
    }

    @Test
    fun `WHEN RemoveNeverTranslateSiteAction is dispatched AND removing is unsuccessful THEN SetNeverTranslateSitesAction is dispatched`() = runTest(testDispatcher) {
        val errorCallback = argumentCaptor<((Throwable) -> Unit)>()
        whenever(
            engine.setNeverTranslateSpecifiedSite(
                origin = any(),
                setting = anyBoolean(),
                onSuccess = any(),
                onError = errorCallback.capture(),
            ),
        ).thenAnswer { errorCallback.value.invoke(Throwable()) }

        val action =
            TranslationsAction.RemoveNeverTranslateSiteAction(
                origin = "google.com",
            )
        translationsMiddleware.invoke(store = store, {}, action)
        testDispatcher.scheduler.advanceUntilIdle()

        val neverTranslateSitesCallBack = argumentCaptor<((List<String>) -> Unit)>()
        verify(engine, atLeastOnce()).getNeverTranslateSiteList(onSuccess = neverTranslateSitesCallBack.capture(), onError = any())
        val mockNeverTranslate = listOf("www.mozilla.org")
        neverTranslateSitesCallBack.value.invoke(mockNeverTranslate)

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetNeverTranslateSitesAction::class) { action ->
            assertEquals(mockNeverTranslate, action.neverTranslateSites)
        }
    }

    @Test
    fun `WHEN OperationRequestedAction is dispatched to FETCH_LANGUAGE_MODELS AND succeeds THEN SetLanguageModelsAction is dispatched`() = runTest(testDispatcher) {
        val languageCallback = argumentCaptor<((List<LanguageModel>) -> Unit)>()

        // Initial Action
        val action =
            TranslationsAction.OperationRequestedAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_LANGUAGE_MODELS,
            )
        translationsMiddleware.invoke(store = store, {}, action)
        testDispatcher.scheduler.advanceUntilIdle()

        // Verify results
        verify(engine, atLeastOnce()).getTranslationsModelDownloadStates(onSuccess = languageCallback.capture(), onError = any())
        languageCallback.value.invoke(mockLanguageModels)

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetLanguageModelsAction::class) { action ->
            assertEquals(mockLanguageModels, action.languageModels)
        }
    }

    @Test
    fun `WHEN OperationRequestedAction is dispatched to FETCH_LANGUAGE_MODELS AND fails THEN TranslateExceptionAction is dispatched`() = runTest(testDispatcher) {
        val errorCallback = argumentCaptor<((Throwable) -> Unit)>()
        whenever(
            engine.getTranslationsModelDownloadStates(
                onSuccess = any(),
                onError = errorCallback.capture(),
            ),
        ).thenAnswer { errorCallback.value.invoke(Throwable()) }

        val action =
            TranslationsAction.OperationRequestedAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_LANGUAGE_MODELS,
            )
        translationsMiddleware.invoke(store = store, {}, action)
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.EngineExceptionAction::class) { action ->
            assertTrue(action.error is TranslationError.ModelCouldNotRetrieveError)
        }

        captureActionsMiddleware.assertFirstAction(TranslationsAction.TranslateExceptionAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals(TranslationOperation.FETCH_LANGUAGE_MODELS, action.operation)
            assertTrue(action.translationError is TranslationError.ModelCouldNotRetrieveError)
        }
    }

    @Test
    fun `WHEN InitTranslationsBrowserState is dispatched AND the engine is supported THEN SetOfferTranslateSettingAction is also dispatched`() = runTest(testDispatcher) {
        // Send Action
        translationsMiddleware.invoke(store = store, next = {}, action = TranslationsAction.InitTranslationsBrowserState)
        testDispatcher.scheduler.advanceUntilIdle()

        // Set the engine to support
        val engineSupportedCallback = argumentCaptor<((Boolean) -> Unit)>()
        // At least once, since InitAction also will trigger this
        verify(engine, atLeastOnce()).isTranslationsEngineSupported(
            onSuccess = engineSupportedCallback.capture(),
            onError = any(),
        )
        engineSupportedCallback.value.invoke(true)
        testDispatcher.scheduler.advanceUntilIdle()

        // Verify results for offer
        verify(engine, atLeastOnce()).getTranslationsOfferPopup()
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetGlobalOfferTranslateSettingAction::class) { action ->
            assertFalse(action.offerTranslation)
        }
    }

    @Test
    fun `WHEN FETCH_OFFER_SETTING is dispatched with a tab id THEN SetOfferTranslateSettingAction and SetPageSettingsAction are also dispatched`() = runTest(testDispatcher) {
        // Set the mock offer value
        whenever(
            engine.getTranslationsOfferPopup(),
        ).thenAnswer { true }

        val pageSettings = TranslationPageSettings(
            alwaysOfferPopup = true,
            alwaysTranslateLanguage = true,
            neverTranslateLanguage = false,
            neverTranslateSite = true,
        )

        val store = setupMockState()
        // Send Action
        val action =
            TranslationsAction.OperationRequestedAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_OFFER_SETTING,
            )
        translationsMiddleware.invoke(store = store, {}, action)
        testDispatcher.scheduler.advanceUntilIdle()

        val languageSettingCallback = argumentCaptor<((LanguageSetting) -> Unit)>()
        verify(engine).getLanguageSetting(
            languageCode = any(),
            onSuccess = languageSettingCallback.capture(),
            onError = any(),
        )
        val languageResponse = LanguageSetting.ALWAYS
        languageSettingCallback.value.invoke(languageResponse)
        testDispatcher.scheduler.advanceUntilIdle()

        val neverTranslateSiteCallback = argumentCaptor<((Boolean) -> Unit)>()

        verify(engineSession).getNeverTranslateSiteSetting(
            onResult = neverTranslateSiteCallback.capture(),
            onException = any(),
        )
        neverTranslateSiteCallback.value.invoke(pageSettings.neverTranslateSite!!)
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetGlobalOfferTranslateSettingAction::class) { action ->
            assertTrue(action.offerTranslation)
        }

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetPageSettingsAction::class) { action ->
            assertEquals(pageSettings, action.pageSettings)
            assertEquals(tab.id, action.tabId)
        }
    }

    @Test
    fun `WHEN UpdateOfferTranslateSettingAction is called then setTranslationsOfferPopup is called on the engine`() = runTest(testDispatcher) {
        // Send Action
        val action =
            TranslationsAction.UpdateGlobalOfferTranslateSettingAction(
                offerTranslation = true,
            )
        translationsMiddleware.invoke(store = store, {}, action)
        testDispatcher.scheduler.advanceUntilIdle()

        // Verify offer was set
        verify(engine, atLeastOnce()).setTranslationsOfferPopup(offer = true)
    }

    @Test
    fun `WHEN UpdateLanguageSettingsAction is dispatched and fails THEN SetLanguageSettingsAction is dispatched`() = runTest(testDispatcher) {
        // Send Action
        val action =
            TranslationsAction.UpdateLanguageSettingsAction(
                languageCode = "es",
                setting = LanguageSetting.ALWAYS,
            )
        translationsMiddleware.invoke(store = store, {}, action)

        testDispatcher.scheduler.advanceUntilIdle()

        // Mock engine error
        val updateLanguagesErrorCallback = argumentCaptor<((Throwable) -> Unit)>()
        verify(engine).setLanguageSetting(
            languageCode = any(),
            languageSetting = any(),
            onSuccess = any(),
            onError = updateLanguagesErrorCallback.capture(),
        )
        updateLanguagesErrorCallback.value.invoke(Throwable())

        testDispatcher.scheduler.advanceUntilIdle()

        // Verify Dispatch
        val languageSettingsCallback = argumentCaptor<((Map<String, LanguageSetting>) -> Unit)>()
        verify(engine, atLeastOnce()).getLanguageSettings(
            onSuccess = languageSettingsCallback.capture(),
            onError = any(),
        )
        val mockLanguageSetting = mapOf("en" to LanguageSetting.OFFER)
        languageSettingsCallback.value.invoke(mockLanguageSetting)
    }

    @Test
    fun `WHEN ManageLanguageModelsAction is dispatched and is successful THEN SetLanguageModelsAction is dispatched with the new state`() = runTest(testDispatcher) {
        val store = setupMockState()
        // Send Action
        val options = ModelManagementOptions(languageToManage = "es", operation = ModelOperation.DOWNLOAD, operationLevel = OperationLevel.LANGUAGE)
        val action =
            TranslationsAction.ManageLanguageModelsAction(
                options,
            )
        translationsMiddleware.invoke(store = store, {}, action)

        testDispatcher.scheduler.advanceUntilIdle()

        // Mock success from engine
        val updateModelsErrorCallback = argumentCaptor<(() -> Unit)>()
        verify(engine).manageTranslationsLanguageModel(
            options = any(),
            onSuccess = updateModelsErrorCallback.capture(),
            onError = any(),
        )
        updateModelsErrorCallback.value.invoke()

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetLanguageModelsAction::class) { action ->
            assertEquals(mockLanguageModels, action.languageModels)
        }
    }

    @Test
    fun `WHEN ManageLanguageModelsAction is dispatched and fails THEN SetLanguageModelsAction is dispatched and an error is dispatched`() = runTest(testDispatcher) {
        val store = setupMockState()
        // Send Action
        val options = ModelManagementOptions(
            languageToManage = "es",
            operation = ModelOperation.DELETE,
            operationLevel = OperationLevel.LANGUAGE,
        )
        val action =
            TranslationsAction.ManageLanguageModelsAction(
                options,
            )
        translationsMiddleware.invoke(store = store, {}, action)

        testDispatcher.scheduler.advanceUntilIdle()

        // Mock failure from engine
        val updateModelsErrorCallback = argumentCaptor<((Throwable) -> Unit)>()
        verify(engine).manageTranslationsLanguageModel(
            options = any(),
            onSuccess = any(),
            onError = updateModelsErrorCallback.capture(),
        )
        updateModelsErrorCallback.value.invoke(Throwable())

        // Verify expected error state set
        val responseLanguageModels = mutableListOf(
            LanguageModel(language = mockLanguage, status = ModelState.ERROR_DELETION, size = mockSize),
        )

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetLanguageModelsAction::class) { action ->
            assert(responseLanguageModels == action.languageModels)
        }

        captureActionsMiddleware.assertFirstAction(TranslationsAction.EngineExceptionAction::class) { action ->
            assert(action.error is TranslationError.LanguageModelUpdateError)
        }
    }

    @Test
    fun `WHEN UpdateLocaleAction is dispatched THEN SetLanguageSettingsAction AND SetLanguageModelsAction are also dispatched`() = runTest(testDispatcher) {
        // Send Action
        translationsMiddleware.invoke(store = store, next = {}, action = LocaleAction.UpdateLocaleAction(locale = Locale.forLanguageTag("es")))
        testDispatcher.scheduler.advanceUntilIdle()

        // Mock responses
        val languageCallback = argumentCaptor<((TranslationSupport) -> Unit)>()
        verify(engine, atLeastOnce()).getSupportedTranslationLanguages(onSuccess = languageCallback.capture(), onError = any())
        val supportedLanguages = TranslationSupport(
            fromLanguages = listOf(Language("en", "English")),
            toLanguages = listOf(Language("en", "English")),
        )
        languageCallback.value.invoke(supportedLanguages)

        val modelCallback = argumentCaptor<((List<LanguageModel>) -> Unit)>()
        verify(engine, atLeastOnce()).getTranslationsModelDownloadStates(onSuccess = modelCallback.capture(), onError = any())
        modelCallback.value.invoke(mockLanguageModels)

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetSupportedLanguagesAction::class) { action ->
            assertEquals(supportedLanguages, action.supportedLanguages)
        }

        captureActionsMiddleware.assertFirstAction(TranslationsAction.SetLanguageModelsAction::class) { action ->
            assertEquals(mockLanguageModels, action.languageModels)
        }
    }
}
