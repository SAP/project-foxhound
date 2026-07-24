/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.share

import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.EngineAction
import mozilla.components.browser.state.engine.EngineMiddleware
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.Engine
import mozilla.components.concept.engine.EngineSession
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.Events
import org.mozilla.fenix.R
import org.mozilla.fenix.browser.StandardSnackbarError
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.recordEventInNimbus
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.mozilla.geckoview.GeckoSession
import org.robolectric.RobolectricTestRunner
import java.io.IOException

@RunWith(RobolectricTestRunner::class)
class SaveToPDFMiddlewareTest {
    private lateinit var appStore: AppStore

    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    // Only ERROR_PRINT_SETTINGS_SERVICE_NOT_AVAILABLE is available for testing
    class MockGeckoPrintException : GeckoSession.GeckoPrintException()

    private lateinit var middleware: SaveToPDFMiddleware
    private val testDispatcher = StandardTestDispatcher()
    private val scope = CoroutineScope(testDispatcher)

    @Before
    fun setup() {
        every { testContext.recordEventInNimbus(any()) } just Runs
        middleware = SaveToPDFMiddleware(context = testContext, scope)
        appStore = mockk(relaxed = true)
        every { testContext.components.appStore } returns appStore
    }

    @Test
    fun `GIVEN a save to pdf request WHEN it fails unexpectedly THEN unknown failure telemetry is sent AND a snackbar error is shown`() =
        runTest(testDispatcher) {
            val exceptionToThrow = RuntimeException("reader save to pdf failed")
            val mockEngineSession: EngineSession = mockk<EngineSession>().apply {
                every {
                    checkForPdfViewer(any(), any())
                } answers {
                    secondArg<(Throwable) -> Unit>().invoke(exceptionToThrow)
                }
            }
            val browserStore = BrowserStore(
                middleware = listOf(middleware),
                initialState = BrowserState(
                    tabs = listOf(
                        createTab(
                            url = "https://mozilla.org",
                            id = "14",
                            engineSession = mockEngineSession,
                        ),
                    ),
                ),
            )
            browserStore.dispatch(
                EngineAction.SaveToPdfExceptionAction("14", exceptionToThrow),
            )
            testScheduler.advanceUntilIdle()
            val response = Events.saveToPdfFailure.testGetValue()?.firstOrNull()
            assertNotNull(response)
            val reason = response?.extra?.get("reason")
            assertEquals("unknown", reason)
            val source = response?.extra?.get("source")
            assertEquals("unknown", source)
            verify {
                appStore.dispatch(
                    AppAction.UpdateStandardSnackbarErrorAction(
                        StandardSnackbarError(
                            testContext.getString(R.string.unable_to_save_to_pdf_error),
                        ),
                    ),
                )
            }
        }

    @Test
    fun `GIVEN a save to pdf request WHEN it fails due to io THEN io failure telemetry is sent AND a snackbar error is shown`() =
        runTest(testDispatcher) {
            val exceptionToThrow = IOException()
            val mockEngineSession: EngineSession = mockk<EngineSession>().apply {
                every {
                    checkForPdfViewer(any(), any())
                } answers {
                    secondArg<(Throwable) -> Unit>().invoke(exceptionToThrow)
                }
            }
            val browserStore = BrowserStore(
                middleware = listOf(middleware),
                initialState = BrowserState(
                    tabs = listOf(
                        createTab(
                            url = "https://mozilla.org",
                            id = "14",
                            engineSession = mockEngineSession,
                        ),
                    ),
                ),
            )
            browserStore.dispatch(EngineAction.SaveToPdfExceptionAction("14", exceptionToThrow))
            testScheduler.advanceUntilIdle()
            val response = Events.saveToPdfFailure.testGetValue()?.firstOrNull()
            assertNotNull(response)
            val reason = response?.extra?.get("reason")
            assertEquals("io_error", reason)
            val source = response?.extra?.get("source")
            assertEquals("unknown", source)
            verify {
                appStore.dispatch(
                    AppAction.UpdateStandardSnackbarErrorAction(
                        StandardSnackbarError(
                            testContext.getString(R.string.unable_to_save_to_pdf_error),
                        ),
                    ),
                )
            }
        }

    @Test
    fun `GIVEN a save to pdf request WHEN it fails due to print exception THEN print exception failure telemetry is sent AND a snackbar error is shown`() =
        runTest(testDispatcher) {
            val exceptionToThrow = MockGeckoPrintException()
            val mockEngineSession: EngineSession = mockk<EngineSession>().apply {
                every {
                    checkForPdfViewer(any(), any())
                } answers {
                    secondArg<(Throwable) -> Unit>().invoke(exceptionToThrow)
                }
            }
            val browserStore = BrowserStore(
                middleware = listOf(middleware),
                initialState = BrowserState(
                    tabs = listOf(
                        createTab(
                            url = "https://mozilla.org",
                            id = "14",
                            engineSession = mockEngineSession,
                        ),
                    ),
                ),
            )
            browserStore.dispatch(EngineAction.SaveToPdfExceptionAction("14", exceptionToThrow))
            testScheduler.advanceUntilIdle()
            val response = Events.saveToPdfFailure.testGetValue()?.firstOrNull()
            assertNotNull(response)
            val reason = response?.extra?.get("reason")
            assertEquals("no_settings_service", reason)
            val source = response?.extra?.get("source")
            assertEquals("unknown", source)
            verify {
                appStore.dispatch(
                    AppAction.UpdateStandardSnackbarErrorAction(
                        StandardSnackbarError(
                            testContext.getString(R.string.unable_to_save_to_pdf_error),
                        ),
                    ),
                )
            }
        }

    @Test
    fun `GIVEN a save to pdf request WHEN it completes THEN completed telemetry is sent`() =
        runTest(testDispatcher) {
            val mockEngineSession: EngineSession = mockk<EngineSession>().apply {
                every {
                    checkForPdfViewer(any(), any())
                } answers {
                    firstArg<(Boolean) -> Unit>().invoke(false)
                }
            }
            val browserStore = BrowserStore(
                middleware = listOf(middleware),
                initialState = BrowserState(
                    tabs = listOf(
                        createTab(
                            url = "https://mozilla.org",
                            id = "14",
                            engineSession = mockEngineSession,
                        ),
                    ),
                ),
            )
            browserStore.dispatch(EngineAction.SaveToPdfCompleteAction("14"))
            testScheduler.advanceUntilIdle()
            val response = Events.saveToPdfCompleted.testGetValue()
            assertNotNull(response)
            val source = response?.firstOrNull()?.extra?.get("source")
            assertEquals("non-pdf", source)
        }

    @Test
    fun `GIVEN a save to pdf request WHEN it the action begins THEN tapped telemetry is sent`() =
        runTest(testDispatcher) {
            val mockEngineSession: EngineSession = mockk<EngineSession>().apply {
                every {
                    checkForPdfViewer(any(), any())
                } answers {
                    firstArg<(Boolean) -> Unit>().invoke(false)
                }

                every { requestPdfToDownload() } just Runs
            }
            val engineMiddleware = EngineMiddleware.create(
                mockk<Engine>(),
                this,
            )
            val browserStore = BrowserStore(
                middleware = listOf(middleware) + engineMiddleware,
                initialState = BrowserState(
                    tabs = listOf(
                        createTab(
                            url = "https://mozilla.org",
                            id = "14",
                            engineSession = mockEngineSession,
                        ),
                    ),
                ),
            )
            browserStore.dispatch(EngineAction.SaveToPdfAction("14"))
            testScheduler.advanceUntilIdle()
            val response = Events.saveToPdfTapped.testGetValue()
            assertNotNull(response)
            val source = response?.firstOrNull()?.extra?.get("source")
            assertEquals("non-pdf", source)
        }

    @Test
    fun `GIVEN a save as pdf exception THEN should calculate the correct failure reason for telemetry`() = runTest(testDispatcher) {
        val noSettingsService = middleware.telemetryErrorReason(MockGeckoPrintException())
        assertEquals("no_settings_service", noSettingsService)
        val ioException = middleware.telemetryErrorReason(IOException())
        assertEquals("io_error", ioException)
        val other = middleware.telemetryErrorReason(Exception())
        assertEquals("unknown", other)
    }

    @Test
    fun `GIVEN a save as pdf page type THEN should calculate the correct page source for telemetry`() = runTest(testDispatcher) {
        assertEquals("pdf", middleware.telemetrySource(isPdfViewer = true))
        assertEquals("non-pdf", middleware.telemetrySource(isPdfViewer = false))
        assertEquals("unknown", middleware.telemetrySource(isPdfViewer = null))
    }

    @Test
    fun `GIVEN a print request WHEN it fails unexpectedly THEN unknown failure telemetry is sent AND a snackbar error is shown`() = runTest(testDispatcher) {
        val exceptionToThrow = RuntimeException("No Print Spooler")
        val mockEngineSession: EngineSession = mockk<EngineSession>().apply {
            every {
                checkForPdfViewer(any(), any())
            } answers {
                secondArg<(Throwable) -> Unit>().invoke(exceptionToThrow)
            }
        }
        val browserStore = BrowserStore(
            middleware = listOf(middleware),
            initialState = BrowserState(
                tabs = listOf(
                    createTab(
                        url = "https://mozilla.org",
                        id = "14",
                        engineSession = mockEngineSession,
                    ),
                ),
            ),
        )
        browserStore.dispatch(
            EngineAction.PrintContentExceptionAction("14", true, exceptionToThrow),
        )
        testScheduler.advanceUntilIdle()
        val response = Events.printFailure.testGetValue()?.firstOrNull()
        assertNotNull(response)
        val reason = response?.extra?.get("reason")
        assertEquals("unknown", reason)
        val source = response?.extra?.get("source")
        assertEquals("unknown", source)
        verify {
            appStore.dispatch(
                AppAction.UpdateStandardSnackbarErrorAction(
                    StandardSnackbarError(
                        testContext.getString(R.string.unable_to_print_page_error),
                    ),
                ),
            )
        }
    }

    @Test
    fun `GIVEN a print request WHEN it fails due to print exception THEN print exception failure telemetry is sent AND a snackbar error is shown`() = runTest(testDispatcher) {
        val exceptionToThrow = MockGeckoPrintException()
        val mockEngineSession: EngineSession = mockk<EngineSession>().apply {
            every {
                checkForPdfViewer(any(), any())
            } answers {
                secondArg<(Throwable) -> Unit>().invoke(exceptionToThrow)
            }
        }
        val browserStore = BrowserStore(
            middleware = listOf(middleware),
            initialState = BrowserState(
                tabs = listOf(
                    createTab(
                        url = "https://mozilla.org",
                        id = "14",
                        engineSession = mockEngineSession,
                    ),
                ),
            ),
        )
        browserStore.dispatch(EngineAction.PrintContentExceptionAction("14", true, exceptionToThrow))
        testScheduler.advanceUntilIdle()
        val response = Events.printFailure.testGetValue()?.firstOrNull()
        assertNotNull(response)
        val reason = response?.extra?.get("reason")
        assertEquals("no_settings_service", reason)
        val source = response?.extra?.get("source")
        assertEquals("unknown", source)
        verify {
            appStore.dispatch(
                AppAction.UpdateStandardSnackbarErrorAction(
                    StandardSnackbarError(
                        testContext.getString(R.string.unable_to_print_page_error),
                    ),
                ),
            )
        }
    }

    @Test
    fun `GIVEN a print request WHEN it completes THEN completed telemetry is sent`() = runTest(testDispatcher) {
        val mockEngineSession: EngineSession = mockk<EngineSession>().apply {
            every {
                checkForPdfViewer(any(), any())
            } answers {
                firstArg<(Boolean) -> Unit>().invoke(true)
            }
        }
        val browserStore = BrowserStore(
            middleware = listOf(middleware),
            initialState = BrowserState(
                tabs = listOf(
                    createTab(
                        url = "https://mozilla.org",
                        id = "14",
                        engineSession = mockEngineSession,
                    ),
                ),
            ),
        )
        browserStore.dispatch(EngineAction.PrintContentCompletedAction("14"))
        testScheduler.advanceUntilIdle()
        val response = Events.printCompleted.testGetValue()
        assertNotNull(response)
        val source = response?.firstOrNull()?.extra?.get("source")
        assertEquals("pdf", source)
    }

    @Test
    fun `GIVEN a print request WHEN it the action begins THEN tapped telemetry is sent`() = runTest(testDispatcher) {
        val mockEngineSession: EngineSession = mockk<EngineSession>().apply {
            every {
                checkForPdfViewer(any(), any())
            } answers {
                firstArg<(Boolean) -> Unit>().invoke(false)
            }

            every { requestPrintContent() } just Runs
        }
        val engineMiddleware = EngineMiddleware.create(
            mockk<Engine>(),
            this,
        )
        val browserStore = BrowserStore(
            middleware = listOf(middleware) + engineMiddleware,
            initialState = BrowserState(
                tabs = listOf(
                    createTab(
                        url = "https://mozilla.org",
                        id = "14",
                        engineSession = mockEngineSession,
                    ),
                ),
            ),
        )
        browserStore.dispatch(EngineAction.PrintContentAction("14"))
        testScheduler.advanceUntilIdle()
        val response = Events.printTapped.testGetValue()
        assertNotNull(response)
        val source = response?.firstOrNull()?.extra?.get("source")
        assertEquals("non-pdf", source)
        verify { testContext.recordEventInNimbus("print_tapped") }
    }
}
