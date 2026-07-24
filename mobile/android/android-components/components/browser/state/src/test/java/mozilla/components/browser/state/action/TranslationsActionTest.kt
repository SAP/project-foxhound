/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.selector.findTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
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
import mozilla.components.concept.engine.translate.TranslationPair
import mozilla.components.concept.engine.translate.TranslationSupport
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class TranslationsActionTest {
    private lateinit var tab: TabSessionState
    private lateinit var state: BrowserState

    @Before
    fun setUp() {
        tab = createTab("https://www.mozilla.org")

        state = BrowserState(
            tabs = listOf(tab),
        )
    }

    private fun tabState(): TabSessionState = state.findTab(tab.id)!!

    @Test
    fun `WHEN a TranslateExpectedAction is dispatched THEN update translation expected status`() {
        assertEquals(false, tabState().translationsState.isExpectedTranslate)

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateExpectedAction(tabId = tab.id),
        )

        assertEquals(true, tabState().translationsState.isExpectedTranslate)
    }

    @Test
    fun `WHEN a TranslateOfferAction is dispatched THEN update translation expected status`() {
        assertEquals(false, tabState().translationsState.isOfferTranslate)

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateOfferAction(tabId = tab.id, isOfferTranslate = true),
        )

        assertEquals(true, tabState().translationsState.isOfferTranslate)

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateOfferAction(tabId = tab.id, isOfferTranslate = false),
        )

        assertFalse(tabState().translationsState.isOfferTranslate)
    }

    @Test
    fun `WHEN a TranslateStateChangeAction is dispatched THEN update translation expected status`() {
        assertEquals(null, tabState().translationsState.translationEngineState)

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateStateChangeAction(tabId = tab.id, mock()),
        )

        assertEquals(true, tabState().translationsState.translationEngineState != null)
    }

    @Test
    fun `WHEN a TranslateStateChangeAction is dispatched THEN the translation status updates accordingly`() {
        assertNull(tabState().translationsState.translationEngineState)
        assertFalse(tabState().translationsState.isTranslated)
        assertFalse(tabState().translationsState.isExpectedTranslate)
        assertFalse(tabState().translationsState.isTranslateProcessing)

        // Set an initial state for is translate processing via a translation request:
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateAction(tabId = tab.id, "en", "es", null),
        )

        assertTrue(tabState().translationsState.isTranslateProcessing)

        val translatedEngineState = TranslationEngineState(
            detectedLanguages = DetectedLanguages(
                documentLangTag = "es",
                supportedDocumentLang = true,
                userPreferredLangTag = "en",
            ),
            error = null,
            isEngineReady = true,
            requestedTranslationPair = TranslationPair(fromLanguage = "es", toLanguage = "en"),
            hasVisibleChange = true,
        )

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateStateChangeAction(
                tabId = tab.id,
                translationEngineState = translatedEngineState,
            ),
        )

        // Translated state
        assertEquals(translatedEngineState, tabState().translationsState.translationEngineState)
        assertTrue(tabState().translationsState.isTranslated)
        assertFalse(tabState().translationsState.isExpectedTranslate)
        assertFalse(tabState().translationsState.isTranslateProcessing)

        val nonTranslatedEngineState = TranslationEngineState(
            detectedLanguages = DetectedLanguages(
                documentLangTag = "es",
                supportedDocumentLang = true,
                userPreferredLangTag = "en",
            ),
            error = null,
            isEngineReady = true,
            requestedTranslationPair = TranslationPair(fromLanguage = null, toLanguage = null),
            hasVisibleChange = false,
        )

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateStateChangeAction(tabId = tab.id, nonTranslatedEngineState),
        )

        // Non-translated state
        assertEquals(nonTranslatedEngineState, tabState().translationsState.translationEngineState)
        assertFalse(tabState().translationsState.isTranslated)
        assertFalse(tabState().translationsState.isExpectedTranslate)
    }

    @Test
    fun `GIVEN isOfferTranslate is true WHEN a TranslateAction is dispatched THEN isOfferTranslate should be set to false`() {
        // Initial State
        assertFalse(tabState().translationsState.isOfferTranslate)

        // Initial Offer State
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateOfferAction(tabId = tab.id, true),
        )
        assertTrue(tabState().translationsState.isOfferTranslate)

        // Action
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateAction(
                tabId = tab.id,
                fromLanguage = "en",
                toLanguage = "en",
                options = null,
            ),
        )

        // Should revert to false
        assertFalse(tabState().translationsState.isOfferTranslate)
    }

    @Test
    fun `WHEN a TranslateStateChangeAction is dispatched THEN the isExpectedTranslate status updates accordingly`() {
        // Initial State
        assertNull(tabState().translationsState.translationEngineState)

        // Sending an initial request to set state; however, the engine hasn't decided if it is an
        // expected state
        var translatedEngineState = TranslationEngineState(
            detectedLanguages = DetectedLanguages(
                documentLangTag = "es",
                supportedDocumentLang = true,
                userPreferredLangTag = "en",
            ),
            error = null,
            isEngineReady = true,
            requestedTranslationPair = TranslationPair(fromLanguage = "es", toLanguage = "en"),
        )
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateStateChangeAction(
                tabId = tab.id,
                translationEngineState = translatedEngineState,
            ),
        )

        assertFalse(tabState().translationsState.isExpectedTranslate)

        // Engine is sending a translation expected action
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateExpectedAction(tabId = tab.id),
        )

        // Initial expected translation state
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateStateChangeAction(
                tabId = tab.id,
                translationEngineState = translatedEngineState,
            ),
        )

        assertTrue(tabState().translationsState.isExpectedTranslate)

        // Not expected translation state, because it is no longer supported
        translatedEngineState = TranslationEngineState(
            detectedLanguages = DetectedLanguages(
                documentLangTag = "es",
                supportedDocumentLang = false,
                userPreferredLangTag = "en",
            ),
            error = null,
            isEngineReady = true,
            requestedTranslationPair = TranslationPair(fromLanguage = "es", toLanguage = "en"),
        )

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateStateChangeAction(
                tabId = tab.id,
                translationEngineState = translatedEngineState,
            ),
        )

        assertFalse(tabState().translationsState.isExpectedTranslate)
    }

    @Test
    fun `WHEN a TranslateStateChangeAction is dispatched THEN the isOfferTranslate status updates accordingly`() {
        // Initial State
        assertNull(tabState().translationsState.translationEngineState)

        // Sending an initial request to set state; however, the engine hasn't decided if it is an
        // offered state
        var translatedEngineState = TranslationEngineState(
            detectedLanguages = DetectedLanguages(
                documentLangTag = "es",
                supportedDocumentLang = true,
                userPreferredLangTag = "en",
            ),
            error = null,
            isEngineReady = true,
            requestedTranslationPair = TranslationPair(fromLanguage = "es", toLanguage = "en"),
        )
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateStateChangeAction(
                tabId = tab.id,
                translationEngineState = translatedEngineState,
            ),
        )

        assertFalse(tabState().translationsState.isOfferTranslate)

        // Engine is sending a translation offer action
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateOfferAction(tabId = tab.id, isOfferTranslate = true),
        )

        // Initial expected translation state
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateStateChangeAction(
                tabId = tab.id,
                translationEngineState = translatedEngineState,
            ),
        )

        assertTrue(tabState().translationsState.isOfferTranslate)

        // Not in an offer translation state, because it is no longer supported
        translatedEngineState = TranslationEngineState(
            detectedLanguages = DetectedLanguages(
                documentLangTag = "es",
                supportedDocumentLang = false,
                userPreferredLangTag = "en",
            ),
            error = null,
            isEngineReady = true,
            requestedTranslationPair = TranslationPair(fromLanguage = "es", toLanguage = "en"),
        )

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateStateChangeAction(
                tabId = tab.id,
                translationEngineState = translatedEngineState,
            ),
        )

        assertFalse(tabState().translationsState.isOfferTranslate)
    }

    @Test
    fun `WHEN a TranslateStateChangeAction is dispatched THEN the translationError status updates accordingly`() {
        // Initial State
        assertNull(tabState().translationsState.translationEngineState)
        assertNull(tabState().translationsState.translationError)

        // Sending an initial request to set state, notice the supportedDocumentLang isn't supported
        val noSupportedState = TranslationEngineState(
            detectedLanguages = DetectedLanguages(
                documentLangTag = "unknown",
                supportedDocumentLang = false,
                userPreferredLangTag = "en",
            ),
            error = null,
            isEngineReady = true,
            requestedTranslationPair = null,
        )
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateStateChangeAction(
                tabId = tab.id,
                translationEngineState = noSupportedState,
            ),
        )

        // Response state
        assertEquals(noSupportedState, tabState().translationsState.translationEngineState)
        assertNotNull(tabState().translationsState.translationError)

        // Sending a request to show state change, notice the supportedDocumentLang is now supported
        val supportedState = TranslationEngineState(
            detectedLanguages = DetectedLanguages(
                documentLangTag = "es",
                supportedDocumentLang = true,
                userPreferredLangTag = "en",
            ),
            error = null,
            isEngineReady = true,
            requestedTranslationPair = null,
        )
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateStateChangeAction(
                tabId = tab.id,
                translationEngineState = supportedState,
            ),
        )

        // Response state
        assertEquals(supportedState, tabState().translationsState.translationEngineState)
        assertNull(tabState().translationsState.translationError)
    }

    @Test
    fun `WHEN a TranslateAction is dispatched AND successful THEN update translation processing status`() {
        // Initial
        assertEquals(false, tabState().translationsState.isTranslateProcessing)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateAction(tabId = tab.id, "en", "es", null),
        )

        assertEquals(true, tabState().translationsState.isTranslateProcessing)

        // Action success
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateSuccessAction(
                tabId = tab.id,
                operation = TranslationOperation.TRANSLATE,
            ),
        )

        assertEquals(null, tabState().translationsState.translationError)
    }

    @Test
    fun `WHEN a TranslateAction is dispatched AND fails THEN update translation processing status`() {
        // Initial
        assertEquals(false, tabState().translationsState.isTranslateProcessing)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateAction(tabId = tab.id, "en", "es", null),
        )

        assertEquals(true, tabState().translationsState.isTranslateProcessing)

        // Action failure
        val error = TranslationError.UnknownError(Exception())
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateExceptionAction(
                tabId = tab.id,
                operation = TranslationOperation.TRANSLATE,
                error,
            ),
        )

        assertEquals(false, tabState().translationsState.isTranslateProcessing)
        assertEquals(false, tabState().translationsState.isTranslated)
        assertEquals(error, tabState().translationsState.translationError)
    }

    @Test
    fun `WHEN a TranslateRestoreAction is dispatched AND successful THEN update translation processing status`() {
        // Initial
        assertEquals(false, tabState().translationsState.isRestoreProcessing)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateRestoreAction(tabId = tab.id),
        )

        assertEquals(true, tabState().translationsState.isRestoreProcessing)

        // Action success
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateSuccessAction(
                tabId = tab.id,
                operation = TranslationOperation.RESTORE,
            ),
        )

        assertEquals(false, tabState().translationsState.isRestoreProcessing)
        assertEquals(false, tabState().translationsState.isTranslated)
        assertEquals(null, tabState().translationsState.translationError)
    }

    @Test
    fun `WHEN a TranslateRestoreAction is dispatched AND fails THEN update translation processing status`() {
        // Initial
        assertEquals(false, tabState().translationsState.isRestoreProcessing)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateRestoreAction(tabId = tab.id),
        )

        assertEquals(true, tabState().translationsState.isRestoreProcessing)

        // Action failure
        val error = TranslationError.UnknownError(Exception())
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateExceptionAction(
                tabId = tab.id,
                operation = TranslationOperation.RESTORE,
                error,
            ),
        )

        assertEquals(false, tabState().translationsState.isRestoreProcessing)
        assertEquals(false, tabState().translationsState.isTranslated)
        assertEquals(error, tabState().translationsState.translationError)
    }

    @Test
    fun `WHEN a SetSupportedLanguagesAction is dispatched AND successful THEN update supportedLanguages`() {
        // Initial
        assertNull(state.translationEngine.supportedLanguages)

        // Action started
        val toLanguage = Language("de", "German")
        val fromLanguage = Language("es", "Spanish")
        val supportedLanguages = TranslationSupport(listOf(fromLanguage), listOf(toLanguage))
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetSupportedLanguagesAction(
                supportedLanguages = supportedLanguages,
            ),
        )

        // Action success
        assertEquals(supportedLanguages, state.translationEngine.supportedLanguages)
    }

    @Test
    fun `WHEN a SetNeverTranslateSitesAction is dispatched AND successful THEN update neverTranslateSites`() {
        // Initial
        assertNull(state.translationEngine.neverTranslateSites)

        // Action started
        val neverTranslateSites = listOf("google.com")
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetNeverTranslateSitesAction(
                neverTranslateSites = neverTranslateSites,
            ),
        )

        // Action success
        assertEquals(neverTranslateSites, state.translationEngine.neverTranslateSites)
    }

    @Test
    fun `WHEN a RemoveNeverTranslateSiteAction is dispatched AND successful THEN update neverTranslateSites`() {
        // Initial add to neverTranslateSites
        assertNull(state.translationEngine.neverTranslateSites)
        val neverTranslateSites = listOf("google.com")
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetNeverTranslateSitesAction(
                neverTranslateSites = neverTranslateSites,
            ),
        )
        assertEquals(neverTranslateSites, state.translationEngine.neverTranslateSites)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.RemoveNeverTranslateSiteAction(
                origin = "google.com",
            ),
        )

        // Action success
        assertEquals(listOf<String>(), state.translationEngine.neverTranslateSites)
    }

    @Test
    fun `WHEN a TranslateExceptionAction is dispatched due to an error THEN update the error condition according to the operation`() {
        // Initial state
        assertEquals(null, tabState().translationsState.translationError)
        assertFalse(tabState().translationsState.isTranslateProcessing)

        // Set an initial state for is translate processing via a translation request:
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateAction(tabId = tab.id, "en", "es", null),
        )

        assertTrue(tabState().translationsState.isTranslateProcessing)

        // TRANSLATE usage
        val translateError = TranslationError.CouldNotLoadLanguagesError(null)
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateExceptionAction(
                tabId = tab.id,
                operation = TranslationOperation.TRANSLATE,
                translationError = translateError,
            ),
        )
        assertEquals(translateError, tabState().translationsState.translationError)
        // A translate error should clear this state
        assertFalse(tabState().translationsState.isTranslateProcessing)

        // RESTORE usage
        val restoreError = TranslationError.CouldNotRestoreError(null)
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateExceptionAction(
                tabId = tab.id,
                operation = TranslationOperation.RESTORE,
                translationError = restoreError,
            ),
        )
        assertEquals(restoreError, tabState().translationsState.translationError)

        // FETCH_LANGUAGES usage
        val fetchLanguagesError = TranslationError.CouldNotLoadLanguagesError(null)

        // Testing setting tab level error
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateExceptionAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_SUPPORTED_LANGUAGES,
                translationError = fetchLanguagesError,
            ),
        )
        assertEquals(fetchLanguagesError, tabState().translationsState.translationError)

        // Testing setting browser level error
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.EngineExceptionAction(
                error = fetchLanguagesError,
            ),
        )
        assertEquals(fetchLanguagesError, state.translationEngine.engineError)
    }

    @Test
    fun `WHEN a TranslateSuccessAction is dispatched THEN update the condition according to the operation`() {
        // Initial state
        assertEquals(null, tabState().translationsState.translationError)
        assertEquals(false, tabState().translationsState.isTranslated)
        assertEquals(false, tabState().translationsState.isTranslateProcessing)

        // TRANSLATE usage
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateSuccessAction(
                tabId = tab.id,
                operation = TranslationOperation.TRANSLATE,
            ),
        )
        assertEquals(null, tabState().translationsState.translationError)
        assertEquals(false, tabState().translationsState.isTranslateProcessing)

        // RESTORE usage
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateSuccessAction(
                tabId = tab.id,
                operation = TranslationOperation.RESTORE,
            ),
        )
        assertEquals(null, tabState().translationsState.translationError)
        assertEquals(false, tabState().translationsState.isTranslated)
        assertEquals(false, tabState().translationsState.isRestoreProcessing)

        // FETCH_LANGUAGES usage
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateSuccessAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_SUPPORTED_LANGUAGES,
            ),
        )
        assertEquals(null, tabState().translationsState.translationError)
        assertEquals(false, tabState().translationsState.isTranslated)
    }

    @Test
    fun `WHEN a SetPageSettingsAction is dispatched THEN set pageSettings`() {
        // Initial
        assertNull(tabState().translationsState.pageSettings)

        // Action started
        val pageSettings = TranslationPageSettings(
            alwaysOfferPopup = true,
            alwaysTranslateLanguage = true,
            neverTranslateLanguage = true,
            neverTranslateSite = true,
        )
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetPageSettingsAction(
                tabId = tab.id,
                pageSettings = pageSettings,
            ),
        )

        // Action success
        assertEquals(pageSettings, tabState().translationsState.pageSettings)
    }

    @Test
    fun `WHEN a SetTranslateProcessingAction is dispatched THEN set isTranslateProcessing`() {
        // Initial
        assertFalse(tabState().translationsState.isTranslateProcessing)

        // Action started
        val isProcessing = true
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetTranslateProcessingAction(
                tabId = tab.id,
                isProcessing = isProcessing,
            ),
        )

        // Action success
        assertEquals(isProcessing, tabState().translationsState.isTranslateProcessing)
    }

    @Test
    fun `WHEN a SetTranslationDownloadSize is dispatched THEN set translationSize is set`() {
        // Initial
        assertNull(tabState().translationsState.translationDownloadSize)

        // Action started
        val translationSize = TranslationDownloadSize(
            fromLanguage = Language("en", "English"),
            toLanguage = Language("fr", "French"),
            size = 10000L,
            error = null,
        )
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetTranslationDownloadSizeAction(
                tabId = tab.id,
                translationSize = translationSize,
            ),
        )

        // Action success
        assertEquals(translationSize, tabState().translationsState.translationDownloadSize)
    }

    @Test
    fun `WHEN a FetchTranslationDownloadSize is dispatched THEN translationSize is cleared`() {
        // Initial setting size for a more robust test
        val translationSize = TranslationDownloadSize(
            fromLanguage = Language("en", "English"),
            toLanguage = Language("fr", "French"),
            size = 10000L,
            error = null,
        )
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetTranslationDownloadSizeAction(
                tabId = tab.id,
                translationSize = translationSize,
            ),
        )

        assertEquals(translationSize, tabState().translationsState.translationDownloadSize)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.FetchTranslationDownloadSizeAction(
                tabId = tab.id,
                fromLanguage = Language("en", "English"),
                toLanguage = Language("fr", "French"),
            ),
        )

        // Action success
        assertNull(tabState().translationsState.translationDownloadSize)
    }

    @Test
    fun `WHEN a OperationRequestedAction is dispatched for FETCH_PAGE_SETTINGS THEN clear pageSettings`() {
        // Setting first to have a more robust initial state
        assertNull(tabState().translationsState.pageSettings)

        val pageSettings = TranslationPageSettings(
            alwaysOfferPopup = true,
            alwaysTranslateLanguage = true,
            neverTranslateLanguage = true,
            neverTranslateSite = true,
        )

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetPageSettingsAction(
                tabId = tab.id,
                pageSettings = pageSettings,
            ),
        )

        assertEquals(pageSettings, tabState().translationsState.pageSettings)
        assertNull(tabState().translationsState.settingsError)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.OperationRequestedAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_PAGE_SETTINGS,
            ),
        )

        // Action success
        assertNull(tabState().translationsState.pageSettings)
    }

    @Test
    fun `WHEN a OperationRequestedAction is dispatched for FETCH_SUPPORTED_LANGUAGES THEN clear supportLanguages`() {
        // Setting first to have a more robust initial state
        assertNull(state.translationEngine.supportedLanguages)

        val supportLanguages = TranslationSupport(
            fromLanguages = listOf(Language("en", "English")),
            toLanguages = listOf(Language("en", "English")),
        )

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetSupportedLanguagesAction(
                supportedLanguages = supportLanguages,
            ),
        )

        assertEquals(supportLanguages, state.translationEngine.supportedLanguages)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.OperationRequestedAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_SUPPORTED_LANGUAGES,
            ),
        )

        // Action success
        assertNull(state.translationEngine.supportedLanguages)
    }

    @Test
    fun `WHEN a UpdatePageSettingAction is dispatched for UPDATE_ALWAYS_OFFER_POPUP THEN set page settings for alwaysOfferPopup `() {
        // Initial State
        assertNull(tabState().translationsState.pageSettings?.alwaysOfferPopup)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_ALWAYS_OFFER_POPUP,
                setting = true,
            ),
        )

        // Action success
        assertTrue(tabState().translationsState.pageSettings?.alwaysOfferPopup!!)
    }

    @Test
    fun `WHEN a UpdatePageSettingAction is dispatched for UPDATE_ALWAYS_TRANSLATE_LANGUAGE THEN set page settings for alwaysTranslateLanguage `() {
        // Initial State
        assertNull(tabState().translationsState.pageSettings?.alwaysTranslateLanguage)
        assertNull(tabState().translationsState.pageSettings?.neverTranslateLanguage)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_ALWAYS_TRANSLATE_LANGUAGE,
                setting = true,
            ),
        )

        // Action success
        assertTrue(tabState().translationsState.pageSettings?.alwaysTranslateLanguage!!)
        assertFalse(tabState().translationsState.pageSettings?.neverTranslateLanguage!!)
    }

    @Test
    fun `WHEN a UpdatePageSettingAction is dispatched for UPDATE_NEVER_TRANSLATE_LANGUAGE THEN set page settings for alwaysTranslateLanguage `() {
        // Initial State
        assertNull(tabState().translationsState.pageSettings?.neverTranslateLanguage)
        assertNull(tabState().translationsState.pageSettings?.alwaysTranslateLanguage)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_NEVER_TRANSLATE_LANGUAGE,
                setting = true,
            ),
        )

        // Action success
        assertTrue(tabState().translationsState.pageSettings?.neverTranslateLanguage!!)
        assertFalse(tabState().translationsState.pageSettings?.alwaysTranslateLanguage!!)
    }

    @Test
    fun `WHEN a UpdatePageSettingAction is dispatched for UPDATE_NEVER_TRANSLATE_SITE THEN set page settings for neverTranslateSite`() {
        // Initial State
        assertNull(tabState().translationsState.pageSettings?.neverTranslateLanguage)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_NEVER_TRANSLATE_SITE,
                setting = true,
            ),
        )

        // Action success
        assertTrue(tabState().translationsState.pageSettings?.neverTranslateSite!!)
    }

    @Test
    fun `WHEN an UpdatePageSettingAction is dispatched for UPDATE_ALWAYS_TRANSLATE_LANGUAGE AND UPDATE_ALWAYS_TRANSLATE_LANGUAGE THEN must be opposites of each other or both must be false `() {
        // Initial state
        assertNull(tabState().translationsState.pageSettings?.alwaysTranslateLanguage)
        assertNull(tabState().translationsState.pageSettings?.neverTranslateLanguage)

        // Action started to update the always offer setting to true
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_ALWAYS_TRANSLATE_LANGUAGE,
                setting = true,
            ),
        )

        // When always is true, never should be false
        assertTrue(tabState().translationsState.pageSettings?.alwaysTranslateLanguage!!)
        assertFalse(tabState().translationsState.pageSettings?.neverTranslateLanguage!!)

        // Action started to update the never offer setting to true
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_NEVER_TRANSLATE_LANGUAGE,
                setting = true,
            ),
        )

        // When never is true, always should be false
        assertFalse(tabState().translationsState.pageSettings?.alwaysTranslateLanguage!!)
        assertTrue(tabState().translationsState.pageSettings?.neverTranslateLanguage!!)

        // Action started to update the never language setting to false
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_NEVER_TRANSLATE_LANGUAGE,
                setting = false,
            ),
        )

        // When never is false, always may also be false
        assertFalse(tabState().translationsState.pageSettings?.alwaysTranslateLanguage!!)
        assertFalse(tabState().translationsState.pageSettings?.neverTranslateLanguage!!)
    }

    @Test
    fun `WHEN a UpdatePageSettingAction is dispatched for each option THEN the page setting is consistent`() {
        // Initial State
        assertNull(tabState().translationsState.pageSettings?.alwaysOfferPopup)
        assertNull(tabState().translationsState.pageSettings?.alwaysTranslateLanguage)
        assertNull(tabState().translationsState.pageSettings?.neverTranslateLanguage)
        assertNull(tabState().translationsState.pageSettings?.neverTranslateSite)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_ALWAYS_OFFER_POPUP,
                setting = true,
            ),
        )

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_ALWAYS_TRANSLATE_LANGUAGE,
                setting = true,
            ),
        )

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_NEVER_TRANSLATE_LANGUAGE,
                setting = true,
            ),
        )

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdatePageSettingAction(
                tabId = tab.id,
                operation = TranslationPageSettingOperation.UPDATE_NEVER_TRANSLATE_SITE,
                setting = true,
            ),
        )

        // Action success
        assertTrue(tabState().translationsState.pageSettings?.alwaysOfferPopup!!)
        // neverTranslateLanguage was posted last and will prevent a contradictory state on the alwaysTranslateLanguage state.
        assertFalse(tabState().translationsState.pageSettings?.alwaysTranslateLanguage!!)
        assertTrue(tabState().translationsState.pageSettings?.neverTranslateLanguage!!)
        assertTrue(tabState().translationsState.pageSettings?.neverTranslateSite!!)
    }

    @Test
    fun `WHEN a SetLanguageSettingsAction is dispatched THEN the browser store is updated to match`() {
        // Initial state
        assertNull(state.translationEngine.languageSettings)

        // Dispatch
        val languageSetting = mapOf("es" to LanguageSetting.OFFER)
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetLanguageSettingsAction(
                languageSettings = languageSetting,
            ),
        )

        // Final state
        assertEquals(state.translationEngine.languageSettings!!, languageSetting)
    }

    @Test
    fun `WHEN a OperationRequestedAction is dispatched for FETCH_AUTOMATIC_LANGUAGE_SETTINGS THEN clear languageSettings`() {
        // Setting first to have a more robust initial state
        val languageSetting = mapOf("es" to LanguageSetting.OFFER)
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetLanguageSettingsAction(
                languageSettings = languageSetting,
            ),
        )
        assertEquals(state.translationEngine.languageSettings, languageSetting)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.OperationRequestedAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_AUTOMATIC_LANGUAGE_SETTINGS,
            ),
        )

        // Action success
        assertNull(state.translationEngine.languageSettings)
    }

    @Test
    fun `WHEN a TranslateExceptionAction is dispatched for FETCH_AUTOMATIC_LANGUAGE_SETTINGS THEN set the error`() {
        // Action started
        val error = TranslationError.UnknownError(IllegalStateException())
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.TranslateExceptionAction(
                tabId = tab.id,
                operation = TranslationOperation.FETCH_AUTOMATIC_LANGUAGE_SETTINGS,
                translationError = error,
            ),
        )

        // Action success
        assertEquals(error, tabState().translationsState.translationError)
    }

    @Test
    fun `WHEN a SetEngineSupportAction is dispatched THEN the browser store is updated to match`() {
        // Initial state
        assertNull(state.translationEngine.isEngineSupported)

        // Dispatch
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetEngineSupportedAction(
                isEngineSupported = true,
            ),
        )

        // Final state
        assertTrue(state.translationEngine.isEngineSupported!!)
    }

    @Test
    fun `WHEN an EngineExceptionAction is dispatched THEN the browser store is updated to match`() {
        // Initial state
        assertNull(state.translationEngine.engineError)

        // Dispatch
        val error = TranslationError.UnknownError(Throwable())
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.EngineExceptionAction(
                error = error,
            ),
        )

        // Final state
        assertEquals(state.translationEngine.engineError!!, error)
    }

    @Test
    fun `WHEN a SetLanguageModelsAction is dispatched and successful THEN the browser store is updated to match`() {
        // Initial state
        assertNull(state.translationEngine.languageModels)

        val code = "es"
        val localizedDisplayName = "Spanish"
        val downloaded = ModelState.DOWNLOADED
        val size: Long = 1234
        val language = Language(code, localizedDisplayName)
        val languageModel = LanguageModel(language, downloaded, size)
        val languageModels = mutableListOf(languageModel)

        // Dispatch
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetLanguageModelsAction(
                languageModels = languageModels,
            ),
        )

        // Final state
        assertEquals(languageModels, state.translationEngine.languageModels)
    }

    @Test
    fun `WHEN a ManageLanguageModelsAction is dispatched and successful THEN the browser store is updated to match`() {
        // Initial state
        assertNull(state.translationEngine.languageModels)

        // Test Operation
        val options = ModelManagementOptions(
            languageToManage = "es",
            operation = ModelOperation.DOWNLOAD,
            operationLevel = OperationLevel.LANGUAGE,
        )

        // Dispatch a request when state is not setup
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.ManageLanguageModelsAction(
                options = options,
            ),
        )

        // We don't have an initial state, so nothing should change.
        assertNull(state.translationEngine.languageModels)

        // Setting up an initial test state.
        val code = "es"
        val localizedDisplayName = "Spanish"
        val processState = ModelState.NOT_DOWNLOADED
        val size: Long = 1234
        val language = Language(code, localizedDisplayName)
        val languageModel = LanguageModel(language, processState, size)
        val languageModels = mutableListOf(languageModel)
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetLanguageModelsAction(
                languageModels = languageModels,
            ),
        )

        // Dispatch a valid request
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.ManageLanguageModelsAction(
                options = options,
            ),
        )

        // Expectations based on operation
        val expectedLanguageModel = LanguageModel(language, ModelState.DOWNLOAD_IN_PROGRESS, size)
        val expectedLanguageModels = mutableListOf(expectedLanguageModel)
        assertEquals(expectedLanguageModels, state.translationEngine.languageModels)

        // Dispatch a language not listed
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.ManageLanguageModelsAction(
                options = ModelManagementOptions(
                    languageToManage = "de",
                    operation = ModelOperation.DOWNLOAD,
                    operationLevel = OperationLevel.LANGUAGE,
                ),
            ),
        )

        // Nothing should change, since it isn't a known option
        assertEquals(expectedLanguageModels, state.translationEngine.languageModels)
    }

    @Test
    fun `WHEN SetOfferTranslateSettingAction is called then set offerToTranslate`() {
        // Initial State
        assertNull(state.translationEngine.offerTranslation)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetGlobalOfferTranslateSettingAction(
                offerTranslation = false,
            ),
        )

        // Action success
        assertFalse(state.translationEngine.offerTranslation!!)
    }

    @Test
    fun `WHEN UpdateOfferTranslateSettingAction is called then set offerToTranslate`() {
        // Initial State
        assertNull(state.translationEngine.offerTranslation)

        // Action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdateGlobalOfferTranslateSettingAction(
                offerTranslation = false,
            ),
        )

        // Action success
        assertFalse(state.translationEngine.offerTranslation!!)
    }

    @Test
    fun `WHEN UpdateGlobalLanguageSettingAction is called then update languageSettings`() {
        // Initial State
        assertNull(state.translationEngine.languageSettings)

        // No-op null test
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdateLanguageSettingsAction(
                languageCode = "fr",
                setting = LanguageSetting.ALWAYS,
            ),
        )

        assertNull(state.translationEngine.languageSettings)

        // Setting Initial State
        val languageSettings = mapOf<String, LanguageSetting>(
            "en" to LanguageSetting.OFFER,
            "es" to LanguageSetting.NEVER,
            "de" to LanguageSetting.ALWAYS,
        )

        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.SetLanguageSettingsAction(
                languageSettings = languageSettings,
            ),
        )

        assertEquals(languageSettings, state.translationEngine.languageSettings)

        // No-op update test
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdateLanguageSettingsAction(
                languageCode = "fr",
                setting = LanguageSetting.ALWAYS,
            ),
        )

        assertEquals(languageSettings, state.translationEngine.languageSettings)

        // Main action started
        state = BrowserStateReducer.reduce(
            state,
            TranslationsAction.UpdateLanguageSettingsAction(
                languageCode = "es",
                setting = LanguageSetting.ALWAYS,
            ),
        )

        // Action success
        assertEquals(LanguageSetting.ALWAYS, state.translationEngine.languageSettings!!["es"])
    }
}
