/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.state.action.TranslationsAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.ReaderState
import mozilla.components.browser.state.state.TranslationsBrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.translate.DetectedLanguages
import mozilla.components.concept.engine.translate.Language
import mozilla.components.concept.engine.translate.TranslationEngineState
import mozilla.components.concept.engine.translate.TranslationError
import mozilla.components.concept.engine.translate.TranslationOperation
import mozilla.components.concept.engine.translate.TranslationPair
import mozilla.components.concept.engine.translate.TranslationSupport
import mozilla.components.support.test.ext.joinBlocking
import mozilla.components.support.test.rule.MainCoroutineRule
import mozilla.components.support.test.rule.runTestOnMain
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.never
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify

@RunWith(AndroidJUnit4::class)
class TranslationsBindingTest {
    @get:Rule
    val coroutineRule = MainCoroutineRule()

    lateinit var browserStore: BrowserStore

    private val tabId = "1"
    private val tab = createTab(url = tabId, id = tabId)
    private val onTranslationsActionUpdated: (TranslationsIconState) -> Unit = spy()

    private val onShowTranslationsDialog: () -> Unit = spy()

    @Test
    fun `GIVEN translationState WHEN translation status isTranslated THEN invoke onTranslationsActionUpdated callback`() =
        runTestOnMain {
            val englishLanguage = Language("en", "English")
            val spanishLanguage = Language("es", "Spanish")

            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(isEngineSupported = true),
                ),
            )

            val binding = TranslationsBinding(
                browserStore = browserStore,
                onTranslationsActionUpdated = onTranslationsActionUpdated,
                onShowTranslationsDialog = {},
            )
            binding.start()

            val detectedLanguages = DetectedLanguages(
                documentLangTag = englishLanguage.code,
                supportedDocumentLang = true,
                userPreferredLangTag = spanishLanguage.code,
            )

            val translationEngineState = TranslationEngineState(
                detectedLanguages = detectedLanguages,
                error = null,
                isEngineReady = true,
                hasVisibleChange = true,
                requestedTranslationPair = TranslationPair(
                    fromLanguage = englishLanguage.code,
                    toLanguage = spanishLanguage.code,
                ),
            )

            val supportLanguages = TranslationSupport(
                fromLanguages = listOf(englishLanguage),
                toLanguages = listOf(spanishLanguage),
            )

            browserStore.dispatch(
                TranslationsAction.SetSupportedLanguagesAction(
                    supportedLanguages = supportLanguages,
                ),
            ).joinBlocking()

            browserStore.dispatch(
                TranslationsAction.TranslateStateChangeAction(
                    tabId = tabId,
                    translationEngineState = translationEngineState,
                ),
            ).joinBlocking()

            browserStore.dispatch(
                TranslationsAction.TranslateAction(
                    tabId = tab.id,
                    fromLanguage = englishLanguage.code,
                    toLanguage = spanishLanguage.code,
                    options = null,
                ),
            ).joinBlocking()

            verify(onTranslationsActionUpdated).invoke(
                TranslationsIconState(
                    isVisible = true,
                    isTranslated = true,
                    isTranslateProcessing = true,
                    fromSelectedLanguage = englishLanguage,
                    toSelectedLanguage = spanishLanguage,
                ),
            )
        }

    @Test
    fun `GIVEN translationState WHEN translation status isExpectedTranslate THEN invoke onTranslationsActionUpdated callback`() =
        runTestOnMain {
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(isEngineSupported = true),
                ),
            )

            val binding = TranslationsBinding(
                browserStore = browserStore,
                onTranslationsActionUpdated = onTranslationsActionUpdated,
                onShowTranslationsDialog = {},
            )
            binding.start()

            browserStore.dispatch(
                TranslationsAction.TranslateExpectedAction(
                    tabId = tabId,
                ),
            ).joinBlocking()

            verify(onTranslationsActionUpdated).invoke(
                TranslationsIconState(
                    isVisible = true,
                    isTranslated = false,
                    isTranslateProcessing = false,
                ),
            )
        }

    @Test
    fun `GIVEN translationState WHEN translation status is not isExpectedTranslate or isTranslated THEN invoke onTranslationsActionUpdated callback`() =
        runTestOnMain {
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                ),
            )

            val binding = TranslationsBinding(
                browserStore = browserStore,
                onTranslationsActionUpdated = onTranslationsActionUpdated,
                onShowTranslationsDialog = {},
            )
            binding.start()

            verify(onTranslationsActionUpdated).invoke(
                TranslationsIconState(
                    isVisible = false,
                    isTranslated = false,
                    isTranslateProcessing = false,
                ),
            )
        }

    @Test
    fun `GIVEN translationState WHEN translation state isOfferTranslate is true THEN invoke onShowTranslationsDialog callback`() =
        runTestOnMain {
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(isEngineSupported = true),
                ),
            )

            val binding = TranslationsBinding(
                browserStore = browserStore,
                onTranslationsActionUpdated = onTranslationsActionUpdated,
                onShowTranslationsDialog = onShowTranslationsDialog,
            )
            binding.start()

            browserStore.dispatch(
                TranslationsAction.TranslateOfferAction(
                    tabId = tab.id,
                    isOfferTranslate = true,
                ),
            ).joinBlocking()

            verify(onShowTranslationsDialog).invoke()
        }

    @Test
    fun `GIVEN translationState WHEN readerState is active THEN invoke onTranslationsActionUpdated callback`() =
        runTestOnMain {
            val tabReaderStateActive = createTab(
                "https://www.firefox.com",
                id = "test-tab",
                readerState = ReaderState(active = true),
            )
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tabReaderStateActive),
                    selectedTabId = tabReaderStateActive.id,
                ),
            )

            val binding = TranslationsBinding(
                browserStore = browserStore,
                onTranslationsActionUpdated = onTranslationsActionUpdated,
                onShowTranslationsDialog = onShowTranslationsDialog,
            )
            binding.start()

            verify(onTranslationsActionUpdated).invoke(
                TranslationsIconState(
                    isVisible = false,
                    isTranslated = false,
                    isTranslateProcessing = false,
                ),
            )
        }

    @Test
    fun `GIVEN translationState WHEN translation state isOfferTranslate is false THEN do not invoke onShowTranslationsDialog callback`() =
        runTestOnMain {
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(isEngineSupported = true),
                ),
            )

            val binding = TranslationsBinding(
                browserStore = browserStore,
                onTranslationsActionUpdated = onTranslationsActionUpdated,
                onShowTranslationsDialog = onShowTranslationsDialog,
            )
            binding.start()

            browserStore.dispatch(
                TranslationsAction.TranslateOfferAction(
                    tabId = tab.id,
                    isOfferTranslate = false,
                ),
            ).joinBlocking()

            verify(onShowTranslationsDialog, never()).invoke()
        }

    @Test
    fun `GIVEN translationState WHEN translation state has an error THEN do invoke onShowTranslationsDialog callback`() =
        runTestOnMain {
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(
                        isEngineSupported = true,
                    ),
                ),
            )

            val binding = TranslationsBinding(
                browserStore = browserStore,
                onTranslationsActionUpdated = onTranslationsActionUpdated,
                onShowTranslationsDialog = onShowTranslationsDialog,
            )
            binding.start()

            browserStore.dispatch(
                TranslationsAction.TranslateExpectedAction(
                    tabId = tabId,
                ),
            ).joinBlocking()

            browserStore.dispatch(
                TranslationsAction.TranslateOfferAction(
                    tabId = tab.id,
                    isOfferTranslate = false,
                ),
            ).joinBlocking()

            browserStore.dispatch(
                TranslationsAction.TranslateExceptionAction(
                    tabId,
                    TranslationOperation.TRANSLATE,
                    TranslationError.CouldNotTranslateError(null),
                ),
            ).joinBlocking()

            verify(onShowTranslationsDialog).invoke()
        }
}
