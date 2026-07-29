/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser

import androidx.navigation.NavController
import androidx.navigation.NavDestination
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.spyk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.TranslationsAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.ReaderState
import mozilla.components.browser.state.state.TranslationsBrowserState
import mozilla.components.browser.state.state.TranslationsState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.translate.DetectedLanguages
import mozilla.components.concept.engine.translate.Language
import mozilla.components.concept.engine.translate.TranslationEngineState
import mozilla.components.concept.engine.translate.TranslationError
import mozilla.components.concept.engine.translate.TranslationOperation
import mozilla.components.concept.engine.translate.TranslationPair
import mozilla.components.concept.engine.translate.TranslationSupport
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.R
import org.mozilla.fenix.browser.store.BrowserScreenAction.PageTranslationStatusUpdated
import org.mozilla.fenix.browser.store.BrowserScreenStore
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction.SnackbarAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.appstate.snackbar.SnackbarState.None
import org.mozilla.fenix.components.appstate.snackbar.SnackbarState.TranslationInProgress

class TranslationsBindingTest {
    private val testDispatcher = StandardTestDispatcher()

    lateinit var browserStore: BrowserStore
    val browserScreenStore: BrowserScreenStore = mockk()
    val appState: AppState = mockk(relaxed = true)
    val appStore: AppStore = mockk(relaxed = true) {
        every { state } returns appState
    }

    private val tabId = "1"
    private val tab = createTab(url = tabId, id = tabId)
    private val onTranslationsActionUpdatedCalls = mutableListOf<PageTranslationStatus>()
    private val onTranslationsActionUpdated: (PageTranslationStatus) -> Unit = { onTranslationsActionUpdatedCalls.add(it) }

    private var onShowTranslationsDialogCount = 0
    private val onShowTranslationsDialog: () -> Unit = { onShowTranslationsDialogCount++ }

    @Test
    fun `GIVEN translationState WHEN translation status isTranslated THEN inform about translation changes`() =
        runTest {
            every { browserScreenStore.dispatch(any()) } just runs
            every { appStore.dispatch(any()) } just runs

            val englishLanguage = Language("en", "English")
            val spanishLanguage = Language("es", "Spanish")
            val expectedTranslationStatus = PageTranslationStatus(
                isTranslationPossible = true,
                isTranslated = true,
                isTranslateProcessing = true,
                fromSelectedLanguage = englishLanguage,
                toSelectedLanguage = spanishLanguage,
            )

            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(isEngineSupported = true),
                ),
            )

            val binding = TranslationsBinding(
                browserStore = browserStore,
                browserScreenStore = browserScreenStore,
                appStore = appStore,
                onTranslationStatusUpdate = onTranslationsActionUpdated,
                onShowTranslationsDialog = {},
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

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
            )

            browserStore.dispatch(
                TranslationsAction.TranslateStateChangeAction(
                    tabId = tabId,
                    translationEngineState = translationEngineState,
                ),
            )

            browserStore.dispatch(
                TranslationsAction.TranslateAction(
                    tabId = tab.id,
                    fromLanguage = englishLanguage.code,
                    toLanguage = spanishLanguage.code,
                    options = null,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(expectedTranslationStatus in onTranslationsActionUpdatedCalls)
            verify {
                browserScreenStore.dispatch(
                    PageTranslationStatusUpdated(expectedTranslationStatus),
                )
            }
        }

    @Test
    fun `GIVEN isTranslationsEnabled is false WHEN translation status isTranslated THEN inform translation is not possible`() =
        runTest {
            every { browserScreenStore.dispatch(any()) } just runs
            every { appStore.dispatch(any()) } just runs

            val expectedTranslationStatus = PageTranslationStatus(
                isTranslationPossible = false,
                isTranslated = false,
                isTranslateProcessing = false,
            )

            // Set to an isTranslated state
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab.copy(translationsState = TranslationsState(isTranslated = true))),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(
                        isEngineSupported = true,
                        isTranslationsEnabled = false,
                    ),
                ),
            )

            val binding = TranslationsBinding(
                browserStore = browserStore,
                browserScreenStore = browserScreenStore,
                appStore = appStore,
                onTranslationStatusUpdate = onTranslationsActionUpdated,
                onShowTranslationsDialog = {},
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(expectedTranslationStatus in onTranslationsActionUpdatedCalls)
            verify {
                browserScreenStore.dispatch(
                    PageTranslationStatusUpdated(expectedTranslationStatus),
                )
            }
        }

    @Test
    fun `GIVEN translationState WHEN translation status isExpectedTranslate THEN inform about translation changes`() =
        runTest {
            every { browserScreenStore.dispatch(any()) } just runs
            every { appStore.dispatch(any()) } just runs

            val expectedTranslationStatus = PageTranslationStatus(
                isTranslationPossible = true,
                isTranslated = false,
                isTranslateProcessing = false,
            )
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(isEngineSupported = true),
                ),
            )
            val appState: AppState = mockk()
            every { appState.snackbarState } returns None(TranslationInProgress(""))
            every { appStore.state } returns appState
            every { appStore.dispatch(any()) } just runs
            every { browserScreenStore.dispatch(any()) } just runs

            val binding = TranslationsBinding(
                browserStore = browserStore,
                browserScreenStore = browserScreenStore,
                appStore = appStore,
                onTranslationStatusUpdate = onTranslationsActionUpdated,
                onShowTranslationsDialog = {},
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            browserStore.dispatch(
                TranslationsAction.TranslateExpectedAction(
                    tabId = tabId,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(expectedTranslationStatus in onTranslationsActionUpdatedCalls)
            verify {
                browserScreenStore.dispatch(
                    PageTranslationStatusUpdated(expectedTranslationStatus),
                )
            }
            verify(atLeast = 1) { appStore.dispatch(SnackbarAction.SnackbarDismissed) }
        }

    @Test
    fun `GIVEN isTranslationsEnabled is false WHEN translation status isExpectedTranslate THEN inform translation is not possible`() =
        runTest {
            every { browserScreenStore.dispatch(any()) } just runs
            every { appStore.dispatch(any()) } just runs

            val expectedTranslationStatus = PageTranslationStatus(
                isTranslationPossible = false,
                isTranslated = false,
                isTranslateProcessing = false,
            )

            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(
                        isEngineSupported = true,
                        isTranslationsEnabled = false,
                    ),
                ),
            )

            val binding = TranslationsBinding(
                browserStore = browserStore,
                browserScreenStore = browserScreenStore,
                appStore = appStore,
                onTranslationStatusUpdate = onTranslationsActionUpdated,
                onShowTranslationsDialog = {},
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            // isExpectedTranslate signals the engine thinks the user may want to translate
            browserStore.dispatch(
                TranslationsAction.TranslateExpectedAction(
                    tabId = tabId,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(expectedTranslationStatus in onTranslationsActionUpdatedCalls)
            verify {
                browserScreenStore.dispatch(
                    PageTranslationStatusUpdated(expectedTranslationStatus),
                )
            }
        }

    @Test
    fun `GIVEN translationState WHEN translation status is not isExpectedTranslate or isTranslated THEN inform about translation changes`() =
        runTest {
            every { browserScreenStore.dispatch(any()) } just runs
            every { appStore.dispatch(any()) } just runs

            val expectedTranslationStatus = PageTranslationStatus(
                isTranslationPossible = false,
                isTranslated = false,
                isTranslateProcessing = false,
            )
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                ),
            )
            val appState: AppState = mockk()
            every { appState.snackbarState } returns None(TranslationInProgress(""))
            every { appStore.state } returns appState
            every { appStore.dispatch(any()) } just runs
            every { browserScreenStore.dispatch(any()) } just runs

            val binding = TranslationsBinding(
                browserStore = browserStore,
                browserScreenStore = browserScreenStore,
                appStore = appStore,
                onTranslationStatusUpdate = onTranslationsActionUpdated,
                onShowTranslationsDialog = {},
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(expectedTranslationStatus in onTranslationsActionUpdatedCalls)
            verify {
                browserScreenStore.dispatch(
                    PageTranslationStatusUpdated(expectedTranslationStatus),
                )
            }
            verify { appStore.dispatch(SnackbarAction.SnackbarDismissed) }
        }

    @Test
    fun `GIVEN translationState WHEN translation state isOfferTranslate is true THEN offer to translate the current page`() =
        runTest {
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(isEngineSupported = true),
                ),
            )

            val binding = TranslationsBinding(
                browserStore = browserStore,
                onTranslationStatusUpdate = onTranslationsActionUpdated,
                onShowTranslationsDialog = onShowTranslationsDialog,
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            browserStore.dispatch(
                TranslationsAction.TranslateOfferAction(
                    tabId = tab.id,
                    isOfferTranslate = true,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            assertEquals(1, onShowTranslationsDialogCount)
        }

    @Test
    fun `GIVEN store dependencies set WHEN translation state isOfferTranslate is true THEN offer to translate the current page`() =
        runTest {
            every { browserScreenStore.dispatch(any()) } just runs
            every { appStore.dispatch(any()) } just runs

            val currentDestination: NavDestination = mockk()
            every { currentDestination.id } returns R.id.browserFragment
            val navController: NavController = mockk(relaxUnitFun = true)
            every { navController.currentDestination } returns currentDestination
            every { navController.navigate(any<Int>()) } just runs
            val expectedNavigation =
                BrowserFragmentDirections.actionBrowserFragmentToTranslationsDialogFragment()
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(isEngineSupported = true),
                ),
            )

            val binding = spyk(
                TranslationsBinding(
                    browserStore = browserStore,
                    browserScreenStore = browserScreenStore,
                    appStore = appStore,
                    navController = navController,
                    onTranslationStatusUpdate = onTranslationsActionUpdated,
                    onShowTranslationsDialog = onShowTranslationsDialog,
                    mainDispatcher = testDispatcher,
                ),
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            browserStore.dispatch(
                TranslationsAction.TranslateOfferAction(
                    tabId = tab.id,
                    isOfferTranslate = true,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            assertEquals(0, onShowTranslationsDialogCount)
            verify { binding.recordTranslationStartTelemetry() }
            verify(atLeast = 1) { appStore.dispatch(SnackbarAction.SnackbarDismissed) }
            verify { navController.navigate(expectedNavigation) }
        }

    @Test
    fun `GIVEN translationState WHEN readerState is active THEN inform about translation changes`() =
        runTest {
            every { browserScreenStore.dispatch(any()) } just runs
            every { appStore.dispatch(any()) } just runs

            val expectedTranslationStatus = PageTranslationStatus(
                isTranslationPossible = false,
                isTranslated = false,
                isTranslateProcessing = false,
            )
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
                browserScreenStore = browserScreenStore,
                appStore = appStore,
                onTranslationStatusUpdate = onTranslationsActionUpdated,
                onShowTranslationsDialog = onShowTranslationsDialog,
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(expectedTranslationStatus in onTranslationsActionUpdatedCalls)
        }

    @Test
    fun `GIVEN translationState WHEN translation state isOfferTranslate is false THEN don't offer to translate the current page`() =
        runTest {
            every { appStore.dispatch(any()) } just runs

            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(isEngineSupported = true),
                ),
            )

            val binding = spyk(
                TranslationsBinding(
                    browserStore = browserStore,
                    onTranslationStatusUpdate = onTranslationsActionUpdated,
                    onShowTranslationsDialog = onShowTranslationsDialog,
                    mainDispatcher = testDispatcher,
                ),
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            browserStore.dispatch(
                TranslationsAction.TranslateOfferAction(
                    tabId = tab.id,
                    isOfferTranslate = false,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            assertEquals(0, onShowTranslationsDialogCount)
            verify(exactly = 0) { binding.recordTranslationStartTelemetry() }
            verify(exactly = 0) { appStore.dispatch(SnackbarAction.SnackbarDismissed) }
        }

    @Test
    fun `GIVEN isTranslationsEnabled is false WHEN isOfferTranslate is true THEN don't offer to translate the current page`() =
        runTest {
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(
                        isEngineSupported = true,
                        isTranslationsEnabled = false,
                    ),
                ),
            )

            val binding = spyk(
                TranslationsBinding(
                    browserStore = browserStore,
                    onTranslationStatusUpdate = onTranslationsActionUpdated,
                    onShowTranslationsDialog = onShowTranslationsDialog,
                    mainDispatcher = testDispatcher,
                ),
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            // isOfferTranslate signals the engine wants to show the bottom sheet
            browserStore.dispatch(
                TranslationsAction.TranslateOfferAction(
                    tabId = tab.id,
                    isOfferTranslate = true,
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            assertEquals(0, onShowTranslationsDialogCount)
            verify(exactly = 0) { binding.recordTranslationStartTelemetry() }
        }

    @Test
    fun `GIVEN translationState WHEN translation state has an error THEN don't offer to translate the current page`() =
        runTest {
            every { appStore.dispatch(any()) } just runs

            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(tab),
                    selectedTabId = tabId,
                    translationEngine = TranslationsBrowserState(
                        isEngineSupported = true,
                    ),
                ),
            )

            val binding = spyk(
                TranslationsBinding(
                    browserStore = browserStore,
                    onTranslationStatusUpdate = onTranslationsActionUpdated,
                    onShowTranslationsDialog = onShowTranslationsDialog,
                    mainDispatcher = testDispatcher,
                ),
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            browserStore.dispatch(
                TranslationsAction.TranslateExpectedAction(
                    tabId = tabId,
                ),
            )

            browserStore.dispatch(
                TranslationsAction.TranslateOfferAction(
                    tabId = tab.id,
                    isOfferTranslate = false,
                ),
            )

            browserStore.dispatch(
                TranslationsAction.TranslateExceptionAction(
                    tabId,
                    TranslationOperation.TRANSLATE,
                    TranslationError.CouldNotTranslateError(null),
                ),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            assertEquals(1, onShowTranslationsDialogCount)
            verify(exactly = 0) { binding.recordTranslationStartTelemetry() }
            verify(exactly = 0) { appStore.dispatch(SnackbarAction.SnackbarDismissed) }
        }
}
