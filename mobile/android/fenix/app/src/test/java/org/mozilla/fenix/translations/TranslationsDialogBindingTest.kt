/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.translations

import io.mockk.spyk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.TranslationsAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.translate.DetectedLanguages
import mozilla.components.concept.engine.translate.Language
import mozilla.components.concept.engine.translate.TranslationDownloadSize
import mozilla.components.concept.engine.translate.TranslationEngineState
import mozilla.components.concept.engine.translate.TranslationError
import mozilla.components.concept.engine.translate.TranslationOperation
import mozilla.components.concept.engine.translate.TranslationPair
import mozilla.components.concept.engine.translate.TranslationSupport
import org.junit.Test

class TranslationsDialogBindingTest {

    private val testDispatcher = StandardTestDispatcher()
    lateinit var browserStore: BrowserStore
    private lateinit var translationsDialogStore: TranslationsDialogStore

    private val tabId = "1"
    private val tab = createTab(url = tabId, id = tabId)

    private val titleProvider: (String?, String?) -> String = { from, to ->
        "Translated from $from to $to"
    }

    @Test
    fun `WHEN fromLanguage and toLanguage get updated in the browserStore THEN translations dialog actions dispatched with the update`() =
        runTest(testDispatcher) {
            val englishLanguage = Language("en", "English")
            val spanishLanguage = Language("es", "Spanish")
            translationsDialogStore = spyk(TranslationsDialogStore(TranslationsDialogState()))
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                ),
            )

            val binding = TranslationsDialogBinding(
                browserStore = browserStore,
                translationsDialogStore = translationsDialogStore,
                getTranslatedPageTitle = titleProvider,
                mainDispatcher = testDispatcher,
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
            )
            testDispatcher.scheduler.advanceUntilIdle()

            browserStore.dispatch(
                TranslationsAction.TranslateStateChangeAction(
                    tabId = tabId,
                    translationEngineState = translationEngineState,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            verify {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.UpdateFromSelectedLanguage(
                        englishLanguage,
                    ),
                )
            }
            verify {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.UpdateToSelectedLanguage(
                        spanishLanguage,
                    ),
                )
            }
            verify {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.UpdateTranslatedPageTitle(
                        "Translated from ${englishLanguage.localizedDisplayName} to ${spanishLanguage.localizedDisplayName}",
                    ),
                )
            }
        }

    @Test
    fun `WHEN translate action is sent to the browserStore THEN update translation dialog store based on operation`() =
        runTest(testDispatcher) {
            val englishLanguage = Language("en", "English")
            val spanishLanguage = Language("es", "Spanish")
            translationsDialogStore = spyk(TranslationsDialogStore(TranslationsDialogState()))
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                ),
            )

            val binding = TranslationsDialogBinding(
                browserStore = browserStore,
                translationsDialogStore = translationsDialogStore,
                getTranslatedPageTitle = titleProvider,
                mainDispatcher = testDispatcher,
            )
            binding.start()

            browserStore.dispatch(
                TranslationsAction.TranslateAction(
                    tabId = tabId,
                    fromLanguage = englishLanguage.code,
                    toLanguage = spanishLanguage.code,
                    null,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            verify {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.UpdateTranslationInProgress(
                        true,
                    ),
                )
            }
            verify {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.DismissDialog(
                        dismissDialogState = DismissDialogState.WaitingToBeDismissed,
                    ),
                )
            }
        }

    @Test
    fun `WHEN translate from languages list and translate to languages list are sent to the browserStore THEN update translation dialog store based on operation`() =
        runTest(testDispatcher) {
            translationsDialogStore = spyk(TranslationsDialogStore(TranslationsDialogState()))
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                ),
            )

            val binding = TranslationsDialogBinding(
                browserStore = browserStore,
                translationsDialogStore = translationsDialogStore,
                getTranslatedPageTitle = titleProvider,
                mainDispatcher = testDispatcher,
            )
            binding.start()

            val toLanguage = Language("de", "German")
            val fromLanguage = Language("es", "Spanish")
            val supportedLanguages = TranslationSupport(listOf(fromLanguage), listOf(toLanguage))
            browserStore.dispatch(
                TranslationsAction.SetSupportedLanguagesAction(
                    supportedLanguages = supportedLanguages,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            verify {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.UpdateTranslateFromLanguages(
                        listOf(fromLanguage),
                    ),
                )
            }
            verify {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.UpdateTranslateToLanguages(
                        listOf(toLanguage),
                    ),
                )
            }
        }

    @Test
    fun `WHEN translate action success is sent to the browserStore THEN update translation dialog store based on operation`() =
        runTest(testDispatcher) {
            translationsDialogStore =
                spyk(TranslationsDialogStore(TranslationsDialogState(dismissDialogState = DismissDialogState.WaitingToBeDismissed)))
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                ),
            )

            val binding = TranslationsDialogBinding(
                browserStore = browserStore,
                translationsDialogStore = translationsDialogStore,
                getTranslatedPageTitle = titleProvider,
                mainDispatcher = testDispatcher,
            )
            binding.start()

            browserStore.dispatch(
                TranslationsAction.TranslateSuccessAction(
                    tabId = tab.id,
                    operation = TranslationOperation.TRANSLATE,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            // Simulate success response post-translate
            val detectedLanguages = DetectedLanguages(
                documentLangTag = "en",
                supportedDocumentLang = true,
                userPreferredLangTag = "es",
            )

            val translationEngineState = TranslationEngineState(
                detectedLanguages = detectedLanguages,
                error = null,
                isEngineReady = true,
                hasVisibleChange = true,
                requestedTranslationPair = TranslationPair(
                    fromLanguage = "en",
                    toLanguage = "es",
                ),
            )

            browserStore.dispatch(
                TranslationsAction.TranslateStateChangeAction(
                    tabId = tabId,
                    translationEngineState = translationEngineState,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            verify {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.UpdateTranslated(
                        true,
                    ),
                )
            }
            verify(exactly = 2) {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.UpdateTranslationInProgress(
                        false,
                    ),
                )
            }
            verify {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.DismissDialog(
                        dismissDialogState = DismissDialogState.Dismiss,
                    ),
                )
            }
        }

    @Test
    fun `WHEN translate fetch error is sent to the browserStore THEN update translation dialog store based on operation`() =
        runTest(testDispatcher) {
            translationsDialogStore =
                spyk(TranslationsDialogStore(TranslationsDialogState()))
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                ),
            )

            val binding = TranslationsDialogBinding(
                browserStore = browserStore,
                translationsDialogStore = translationsDialogStore,
                getTranslatedPageTitle = titleProvider,
                mainDispatcher = testDispatcher,
            )
            binding.start()

            val fetchError = TranslationError.CouldNotLoadLanguagesError(null)
            browserStore.dispatch(
                TranslationsAction.TranslateExceptionAction(
                    tabId = tab.id,
                    operation = TranslationOperation.FETCH_SUPPORTED_LANGUAGES,
                    translationError = fetchError,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            verify {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.UpdateTranslationError(fetchError),
                )
            }
        }

    @Test
    fun `WHEN a non-displayable error is sent to the browserStore THEN the translation dialog store is not updated`() =
        runTest(testDispatcher) {
            translationsDialogStore =
                spyk(TranslationsDialogStore(TranslationsDialogState()))
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                ),
            )

            val binding = TranslationsDialogBinding(
                browserStore = browserStore,
                translationsDialogStore = translationsDialogStore,
                getTranslatedPageTitle = titleProvider,
                mainDispatcher = testDispatcher,
            )
            binding.start()

            val fetchError = TranslationError.UnknownEngineSupportError(null)
            browserStore.dispatch(
                TranslationsAction.EngineExceptionAction(
                    error = fetchError,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            verify(exactly = 0) {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.UpdateTranslationError(fetchError),
                )
            }
        }

    @Test
    fun `WHEN a browser and session error is sent to the browserStore THEN the session error takes priority and the translation dialog store is updated`() =
        runTest(testDispatcher) {
            translationsDialogStore =
                spyk(TranslationsDialogStore(TranslationsDialogState()))
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                ),
            )

            val binding = TranslationsDialogBinding(
                browserStore = browserStore,
                translationsDialogStore = translationsDialogStore,
                getTranslatedPageTitle = titleProvider,
                mainDispatcher = testDispatcher,
            )
            binding.start()

            val sessionError = TranslationError.CouldNotLoadLanguagesError(null)
            browserStore.dispatch(
                TranslationsAction.TranslateExceptionAction(
                    tabId = tab.id,
                    operation = TranslationOperation.FETCH_SUPPORTED_LANGUAGES,
                    translationError = sessionError,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            verify {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.UpdateTranslationError(sessionError),
                )
            }

            val engineError = TranslationError.UnknownError(IllegalStateException())
            browserStore.dispatch(
                TranslationsAction.EngineExceptionAction(
                    error = engineError,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            verify(exactly = 0) {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.UpdateTranslationError(engineError),
                )
            }
        }

    @Test
    fun `WHEN set translation download size action sent to the browserStore THEN update translation dialog store based on operation`() =
        runTest(testDispatcher) {
            translationsDialogStore =
                spyk(TranslationsDialogStore(TranslationsDialogState()))
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                ),
            )

            val binding = TranslationsDialogBinding(
                browserStore = browserStore,
                translationsDialogStore = translationsDialogStore,
                getTranslatedPageTitle = titleProvider,
                mainDispatcher = testDispatcher,
            )
            binding.start()

            val toLanguage = Language("de", "German")
            val fromLanguage = Language("es", "Spanish")
            val translationDownloadSize = TranslationDownloadSize(
                fromLanguage = fromLanguage,
                toLanguage = toLanguage,
                size = 1000L,
            )
            browserStore.dispatch(
                TranslationsAction.SetTranslationDownloadSizeAction(
                    tabId = tab.id,
                    translationSize = translationDownloadSize,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            verify {
                translationsDialogStore.dispatch(
                    TranslationsDialogAction.UpdateDownloadTranslationDownloadSize(
                        translationDownloadSize,
                    ),
                )
            }
        }
}
